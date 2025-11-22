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

### ⚠️ CRITICAL: Migration Rules

**NEVER run `supabase db reset` or `supabase db push` directly!**

**ALWAYS use the provided shell scripts:**
- `reset-hard-db.sh` - Complete database reset (drops everything, reapplies migrations)
- `reset-soft-db.sh` - Soft reset (preserves some data)

**Why:** Direct `supabase` CLI commands bypass safety checks, proper initialization, and can corrupt the database state.

**Correct workflow:**
```bash
cd supabase/
./reset-hard-db.sh   # For testing migration changes
./reset-soft-db.sh   # For preserving data during reset
```

**NEVER do:**
```bash
supabase db reset    # ❌ FORBIDDEN
supabase db push     # ❌ FORBIDDEN
```

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

**Implementation:** Custom Kong plugin (`rate-limit-db`) with three-tier rate limiting architecture

**Location:** `supabase/volumes/api/kong/plugins/rate-limit-db/`
- `handler.lua` - Plugin logic with content-based extraction
- `schema.lua` - Configuration schema

**Database:**
- Table: `public.rate_limits`
- Supported identifier types: `user`, `ip`, `email`, `username`, `token`, `custom`
- Function: `check_rate_limit()` - JSONB-returning stored procedure
- Migration: `20251112000000_create_rate_limiting.sql`

#### Three-Tier Architecture

**Tier 1: IP-Based Rate Limiting**
- **Purpose**: DoS protection for public anonymous operations
- **Identifier**: IP address (Cloudflare-aware: CF-Connecting-IP, X-Real-IP, X-Forwarded-For)
- **Applied to**: OAuth endpoints (`/auth/v1/authorize`, `/auth/v1/callback`), public storage reads
- **Limits**: Generous (100-200 requests/minute per IP)

**Tier 2: Content-Based Rate Limiting**
- **Purpose**: Prevent credential attacks, brute force, account enumeration
- **Identifier**: Request body fields (email, username, token) with IP fallback
- **Applied to**: Signup, login, OTP verification, password reset, resend email
- **Limits**: Strict (3-10 requests/hour per email address, 50 requests/hour per IP fallback)
- **Critical**: Closes service_role key bypass vulnerability for Edge Functions

**Tier 3: User-Based Rate Limiting**
- **Purpose**: Prevent API abuse from authenticated users
- **Identifier**: JWT sub claim (user ID from Authorization header)
- **Applied to**: Authenticated REST, authenticated storage, authenticated auth operations
- **Limits**: Moderate (60-100 requests/minute per user ID)

#### Configuration Examples

**Tier 1 (IP-based):**
```yaml
- name: rate-limit-db
  config:
    identifier_strategy: ip
    minute: 100
    hour: 1000
    db_host: db
    db_port: 5432
    db_name: postgres
    db_user: supabase_admin
    db_password: $POSTGRES_PASSWORD
```

**Tier 2 (Content-based with fallback):**
```yaml
- name: rate-limit-db
  config:
    identifier_strategy: content
    content_identifier_fields: ["email"]
    content_identifier_type: email
    hour: 5          # Strict: 5 signups per hour per email
    day: 10
    fallback_by_ip: true
    fallback_limits:
      hour: 50       # Fallback: 50 signups per hour per IP
    db_host: db
    db_port: 5432
    db_name: postgres
    db_user: supabase_admin
    db_password: $POSTGRES_PASSWORD
```

**Tier 3 (User-based with IP fallback):**
```yaml
- name: rate-limit-db
  config:
    identifier_strategy: user
    minute: 100
    hour: 5000
    fallback_by_ip: true
    fallback_limits:
      minute: 100    # For unauthenticated (anon key) requests
    db_host: db
    db_port: 5432
    db_name: postgres
    db_user: supabase_admin
    db_password: $POSTGRES_PASSWORD
```

**Current State (as of Session 4, 2025-11-12):**
- Status: Production-ready, security audited, comprehensively documented
- Version: Kong plugin v3.0.0 (composite-only, legacy mode removed)
- Configuration: Per-route rate limiting in `kong.yml` with inline documentation
- Kong log level: info (production-safe, no sensitive data exposure)
- Service role bypass: Fixed (passes key via plugin config, not environment)
- GraphQL endpoint: Protected with rate limiting (60/user/min, 100/IP/min)
- Analytics endpoint: Protected with rate limiting (60/IP/min, 1000/IP/hour)
- Signup limits: Relaxed to 10/hour, 20/day (balances security with usability)
- Documentation: 400+ lines of inline comments explaining WHY behind every decision

**Plugin Priority:**
- Priority: 900
- Runs after auth plugins (key-auth: 1003, acl: 950)
- Service role key bypasses ALL rate limiting

**Architecture Rationale:**
- **Single unified plugin** instead of 3 separate plugins
- **Per-route configuration** allows different tiers for different endpoints
- **Backward compatible** with existing `identifier_strategy: user` default
- **Fail-open design** - allows requests if body parsing or DB connection fails
- **Content extraction uses pcall** to gracefully handle errors

**Important Notes:**
- pgmoon returns JSONB as Lua tables (not JSON strings)
- pgmoon returns NULL as userdata (not nil) - always type-check before using values
- Request body parsing uses `kong.request.get_body()` wrapped in `pcall()`
- Content identifier extraction tries fields in order, falls back to IP if configured
- Service role key bypasses rate limiting entirely (passed via plugin config, not environment variable)
- os.getenv() doesn't work reliably in Kong Lua runtime - always pass config via plugin fields
- Kong log level set to info (debug exposes sensitive data like passwords and tokens)

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

### Storage Best Practices

**Atomic Upsert Operations (Session 8):**
- Always use `upsert: true` for file uploads instead of delete-then-upload patterns
- Prevents race condition where user loses data if upload fails after delete
- Example: Avatar upload with `upsert: true` preserves existing avatar on upload failure
- Requires BOTH INSERT and UPDATE RLS policies for atomic upsert to work
- Pattern:
  ```javascript
  const { data, error } = await supabase.storage
    .from('bucket')
    .upload('path/to/file.jpg', file, {
      upsert: true  // Atomic operation: replace only on success
    });
  ```

**Fail-Safe Philosophy:**
- Design storage operations to preserve existing data on failure
- Ask: "What happens if this step fails?" when designing multi-step operations
- Single atomic operations are safer than multi-step sequences
- Delete operations should be last step, not first

**Kong Path Routing for Storage (Session 8):**
- Always use `strip_path: true` with base upstream URLs to avoid path duplication
- Pattern: External request `/storage/v1/object/public/avatars/foo.jpg` → Kong strips `/storage/v1/object/public` → forwards `/avatars/foo.jpg` to `http://storage:5000/`
- Test both upload (POST) and retrieval (GET) when changing routing configuration
- 400 errors often indicate path duplication or mismatched routing configuration

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