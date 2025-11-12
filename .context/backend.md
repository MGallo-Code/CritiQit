# CritiQit Backend Documentation

This file documents Supabase backend architecture, patterns, and operational procedures.

---

## Overview

CritiQit uses a **self-hosted Supabase instance** running in Docker containers, NOT Supabase's cloud platform. This gives full control over the database, storage, and authentication services.

**Key Difference**: Self-hosted means we manage the entire stack through Docker Compose and have direct database access, unlike cloud-hosted Supabase projects.

---

## Architecture

### Docker Services

Located in `supabase/compose.yml`, the stack includes:
- **PostgreSQL**: Main database (port 5432)
- **Studio**: Supabase Studio UI (port 8000)
- **Auth**: Authentication service (GoTrue)
- **Rest**: PostgREST API
- **Realtime**: WebSocket service
- **Storage**: Object storage service
- **Kong**: API Gateway (version 3.9) with custom rate limiting plugin
- **Analytics**: (Optional) Logflare/analytics

### Directory Structure

```
supabase/
├── compose.yml              # Docker Compose configuration
├── config.toml             # Supabase CLI configuration
├── .env                    # Environment variables (not committed)
├── migrations/             # Database migrations
│   ├── 20250818043251_add_user_profiles.sql
│   └── 20251112000000_create_rate_limiting.sql
├── email-templates/        # Email HTML templates
├── dev/                    # Development files
├── volumes/               # Docker volumes (persistent data)
│   ├── functions/         # Edge functions
│   └── api/              # Kong configuration
│       ├── kong.yml      # Kong declarative config
│       └── kong/         # Kong custom plugins
│           └── plugins/
│               └── rate-limit-db/  # Rate limiting plugin
│                   ├── handler.lua
│                   └── schema.lua
├── reset-hard-db.sh       # Complete database reset
├── reset-soft-db.sh       # Soft database reset
├── restart-db.sh          # Restart containers
└── upload-templates.sh    # Upload email templates to storage
```

---

## Database

### Schema

**`public.profiles`**
```sql
CREATE TABLE public.profiles (
  "id" uuid PRIMARY KEY REFERENCES auth.users(id),
  "username" TEXT UNIQUE CHECK (char_length(username) >= 3 AND char_length(username) <= 35),
  "full_name" TEXT CHECK (char_length(full_name) >= 3 AND char_length(full_name) <= 100),
  "bio" TEXT CHECK (char_length(bio) <= 800),
  "avatar_url" TEXT CHECK (char_length(avatar_url) <= 2048),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE
);
```

### Triggers

**Auto-create profile on user signup:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
begin
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'User_' || substr(md5(new.email || NOW()::text), 1, 10)
  );
  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Key Details:**
- Trigger creates profile automatically on user creation
- Generates temporary username: `User_` + 10-char hash
- Pulls `full_name` and `avatar_url` from OAuth metadata if available
- Uses `SECURITY DEFINER` to bypass RLS during trigger execution

---

## Row Level Security (RLS)

### Profile Table Policies

```sql
-- Anyone can view profiles
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  TO public
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile."
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
```

### Storage Policies (Avatars Bucket)

```sql
-- Public read access
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars'::text);

-- Users can upload to their folder
CREATE POLICY "Users can upload an avatar to their own folder."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    (bucket_id = 'avatars'::text) AND (owner = auth.uid())
  );

-- Users can update their own avatars
CREATE POLICY "Users can update their own avatars."
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ((bucket_id = 'avatars'::text) AND (owner = auth.uid()))
  WITH CHECK ((bucket_id = 'avatars'::text) AND (owner = auth.uid()));

-- Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars."
  ON storage.objects FOR DELETE
  TO authenticated
  USING ((bucket_id = 'avatars'::text) AND (owner = auth.uid()));
```

### RLS Best Practices

**USING vs WITH CHECK:**
- `USING`: Controls which rows are visible for the operation (applies to SELECT, UPDATE, DELETE)
- `WITH CHECK`: Controls which rows can be inserted/modified (applies to INSERT, UPDATE)
- For UPDATE policies, you often need BOTH

**Common Pattern:**
```sql
-- UPDATE policy structure
CREATE POLICY "policy_name"
  ON table_name FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)      -- Can only see/modify own rows
  WITH CHECK (auth.uid() = user_id); -- Can only set user_id to own ID
```

---

## Kong API Gateway

### Overview

Kong 3.9 acts as the API gateway for all Supabase services, handling authentication, routing, and rate limiting.

**Configuration:**
- Declarative config file: `supabase/volumes/api/kong.yml`
- Format version: 3.0
- Mode: DB-less (configuration from YAML file)
- Custom plugins: `bundled,rate-limit-db`

### Rate Limiting Plugin

**Implementation:** Custom Kong plugin (`rate-limit-db`) with PostgreSQL backend

**Location:** `supabase/volumes/api/kong/plugins/rate-limit-db/`
- `handler.lua` - Plugin logic (298 lines)
- `schema.lua` - Configuration schema

**Database:**
- Table: `public.rate_limits`
- Function: `check_rate_limit()` - JSONB-returning stored procedure
- Migration: `20251112000000_create_rate_limiting.sql`

**Features:**
- User-based rate limiting (extracted from JWT `sub` claim)
- IP-based rate limiting (Cloudflare-aware)
- Per-endpoint tracking
- Service role bypass (SUPABASE_SERVICE_KEY)
- Configurable time windows: second, minute, hour, day
- Standard rate limit headers (X-RateLimit-*)
- Retry-After header on 429 responses

**Configuration Options:**
```yaml
plugins:
  - name: rate-limit-db
    config:
      # Time window limits (at least one required)
      minute: 60
      hour: 1000
      day: 10000

      # Database connection
      db_host: db
      db_port: 5432
      db_name: postgres
      db_user: supabase_admin
      db_password: $POSTGRES_PASSWORD

      # Strategy
      limit_anonymous_by_ip: true
      limit_authenticated_by_user: true

      # Response
      hide_client_headers: false
      error_code: 429
      error_message: "Rate limit exceeded"
```

**Current State (as of 2025-11-12):**
- Status: Production-ready, currently configured globally for testing
- Test limits: 5/min, 100/hour, 1000/day
- Kong log level: debug (should be info for production)
- TODO: Move to service-level configuration with appropriate limits per service

**Plugin Priority:**
- Priority: 900
- Runs after auth plugins (key-auth: 1003, acl: 950)
- Ensures only authenticated requests are rate-limited

**Important Notes:**
- pgmoon returns JSONB as Lua tables (not JSON strings)
- pgmoon returns NULL as userdata (not nil) - always type-check before using values
- Access phase only runs for authenticated requests (key-auth rejects unauthenticated first)
- Service role key bypasses rate limiting entirely

**Testing Authenticated Requests:**

Generate JWT token for testing without captcha:
```javascript
// /tmp/generate_jwt.js pattern
const crypto = require('crypto');
const jwtSecret = process.env.JWT_SECRET;
const userId = 'user-uuid-from-db';

const payload = {
  aud: 'authenticated',
  sub: userId,
  role: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  // ... other claims
};

// HMAC HS256 signature
const header = base64url({alg: 'HS256', typ: 'JWT'});
const encodedPayload = base64url(payload);
const signature = crypto.createHmac('sha256', jwtSecret)
  .update(header + '.' + encodedPayload)
  .digest('base64url');

const jwt = header + '.' + encodedPayload + '.' + signature;
```

---

## Storage

### Buckets

**`avatars` (public bucket)**
- Stores user profile images
- Public read access
- User-owned write/update/delete
- URL pattern: `${API_URL}/storage/v1/object/public/avatars/${filepath}`

**`email-templates` (public bucket)**
- Email HTML templates for auth flows
- Service role upload access
- Used by auth service for transactional emails

### Storage URL Patterns

**GET (public read):**
```
${API_EXTERNAL_URL}/storage/v1/object/public/${bucket}/${filepath}
```

**POST/PUT/DELETE (authenticated operations):**
```
${API_EXTERNAL_URL}/storage/v1/object/${bucket}/${filepath}
```

**Cache Busting:**
- Storage responses cache aggressively
- Add `?version={timestamp}` to URLs to bypass cache
- Example: `avatar.jpg?version=1699123456`

### Known Storage Issues

**Cannot delete users with storage objects:**
- Supabase prevents user deletion if they own any storage objects
- Workaround options:
  1. Delete all user-owned objects before deleting user
  2. Implement cascade deletion in migration
  3. Transfer ownership before deletion

---

## Authentication

### Providers Configured
- Email/Password
- OAuth providers (configuration in compose.yml)

### Auth Flows
- Sign up with email confirmation
- Password reset with email verification
- OAuth sign-in
- Magic link (if enabled)

### Security
- Uses Cloudflare Turnstile for bot protection
- JWT tokens with configurable expiration
- Refresh token rotation

---

## Supabase CLI Operations

### General Patterns

**Always run from `supabase/` directory:**
```bash
cd supabase
```

**Always use `--debug` and `--db-url`:**
```bash
supabase db reset --debug --db-url "postgresql://supabase_admin:password@host:5432/postgres"
supabase db push --debug --db-url "postgresql://supabase_admin:password@host:5432/postgres"
```

**User Credential:**
- Use `supabase_admin` user, NOT `postgres`
- The `postgres` user has permission issues with self-hosted instances

### Database Reset Scripts

**`reset-hard-db.sh`** (Complete wipe and rebuild):
```bash
./reset-hard-db.sh
```
- Stops containers
- Removes volumes (DELETES ALL DATA)
- Rebuilds from migrations
- Uploads email templates

**`reset-soft-db.sh`** (Preserves volumes):
```bash
./reset-soft-db.sh
```
- Resets database state
- Keeps volume data
- Faster than hard reset

**`restart-db.sh`** (Simple restart):
```bash
./restart-db.sh
```
- Just restarts Docker containers
- No data loss

### Migration Best Practices

1. **Keep migrations simple:**
   - Avoid complex functions
   - Focus on schema changes, policies, and basic triggers
   - Complex logic belongs in application code

2. **Use `on conflict` for idempotence:**
   ```sql
   INSERT INTO storage.buckets (id, name, public)
     VALUES ('avatars', 'avatars', true)
     ON CONFLICT (id) DO NOTHING;
   ```

3. **Always test migrations:**
   - Run `reset-hard-db.sh` to test from scratch
   - Verify all policies work as expected
   - Test both authenticated and public access

---

## Environment Variables

Located in `supabase/.env` (not committed):

### Database
- `POSTGRES_PASSWORD` - PostgreSQL superuser password
- `POSTGRES_DB` - Database name
- `POSTGRES_HOST` - Database host
- `POSTGRES_PORT` - Database port (usually 5432)

### JWT
- `JWT_SECRET` - Secret for signing JWTs
- `JWT_EXPIRY` - Token expiration time
- `ANON_KEY` - Anonymous (public) API key
- `SERVICE_ROLE_KEY` - Service role (admin) API key

### Auth
- `SITE_URL` - Frontend URL for redirects
- `SMTP_*` - Email configuration for auth emails
- OAuth provider credentials (CLIENT_ID, CLIENT_SECRET for each provider)

### Storage
- `STORAGE_BACKEND` - Usually "file" for self-hosted
- Storage access keys

### Configuration
- Various feature flags and service configuration

**Security**: Never commit `.env` file. Only document variable names and purposes.

---

## Realtime

### Publications

The `supabase_realtime` publication includes:
- `public.profiles` table

**Usage:**
Frontend can subscribe to profile changes in real-time. Useful for live updates when users change their profile while others are viewing it.

**Consideration:**
- Each subscription creates a connection
- Monitor connection count if scaling
- Use sparingly for high-traffic features

---

## Edge Functions

### Cloudflare Turnstile Verification

Located in `supabase/volumes/functions/verify-otp-securely/`

Configuration in `config.toml`:
```toml
[functions.cloudflare-turnstile]
enabled = true
verify_jwt = true
import_map = "./functions/cloudflare-turnstile/deno.json"
entrypoint = "./volumes/functions/verify-otp-securely/index.ts"
```

Verifies Turnstile tokens server-side to prevent bot signups/logins.

---

## Monitoring & Debugging

### Viewing Logs

**Docker logs:**
```bash
cd supabase
docker compose logs -f [service_name]
# Examples: kong, auth, rest, storage, db
```

**All services:**
```bash
docker compose logs -f
```

### Supabase Studio

Access at `http://localhost:8000` (or `api.critiqit.io` with tunnel)

Features:
- Table editor
- SQL editor
- Auth user management
- Storage browser
- Database schema viewer
- RLS policy tester

---

## Common Issues & Solutions

### Permission Errors with CLI
**Problem**: `permission denied` errors with supabase CLI
**Solution**: Use `supabase_admin` user instead of `postgres` in connection string

### SSL Certificate Errors
**Problem**: SSL verification failures with supabase CLI
**Solution**: Always include `--debug` flag

### Migration Failures
**Problem**: Migrations fail on subsequent runs
**Solution**:
- Use `ON CONFLICT DO NOTHING` for inserts
- Check for `IF EXISTS` on drops
- Keep migrations idempotent

### Configuration Not Taking Effect
**Problem**: GUI changes not working
**Solution**: Update environment variables in `compose.yml` and restart containers

### Storage Upload Fails
**Problem**: Can't upload to storage bucket
**Solution**:
- Check RLS policies on `storage.objects`
- Verify bucket exists and is public/private as intended
- Check owner field is set correctly in policy

---

## Related Documentation

- **Project overview**: [project.md](./project.md)
- **Frontend details**: [frontend.md](./frontend.md)
- **Session history**: [sessions.md](./sessions.md)