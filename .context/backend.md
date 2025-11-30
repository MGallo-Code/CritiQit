# CritiQit Backend Documentation

> **Last Updated**: 2025-11-29
> **Architecture**: Self-hosted Supabase on Docker
> **Purpose**: Essential backend infrastructure reference for AI agents

---

## 🚨 CRITICAL RULES - READ FIRST

### Database Management Rule

**⚠️ NEVER USE SUPABASE CLI COMMANDS DIRECTLY**

```bash
# ❌ FORBIDDEN
supabase start | supabase stop | supabase db reset | supabase db push | supabase db pull
```

**✅ ALWAYS USE THE `./db` CLI TOOL**

```bash
cd supabase/
./db start          # Start containers
./db stop           # Stop containers
./db restart        # Restart containers
./db reset hard     # Nuclear reset (destroys all data, freshly applies migrations)
./db reset soft     # Soft reset (preserves volumes)
./db seed           # Upload seed data
./db status         # Check system health
./db migrate        # Apply new migrations
./db help           # Show all commands
```

**Why:** Direct CLI commands bypass safety scripts, corrupt state, and don't source environment correctly. No exceptions.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Management](#database-management-db-cli-tool)
3. [Database Schema](#database-schema)
4. [Kong API Gateway & Rate Limiting](#kong-api-gateway--rate-limiting)
5. [Storage System](#storage-system)
6. [Authentication](#authentication--authorization)
7. [Edge Functions](#edge-functions)
8. [Common Workflows](#development-workflows)

---

## Architecture Overview

### System Design

**Self-hosted Supabase** (NOT Supabase Cloud) running 12 Docker containers in `supabase/compose.yml`:

| Service | Port | Purpose |
|---------|------|---------|
| **db** | 5432 | PostgreSQL 15.8.1 |
| **kong** | 8000/8443 | API gateway with custom rate limiting |
| **auth** | 9999 | GoTrue authentication |
| **rest** | 3000 | PostgREST auto-generated API |
| **storage** | 5000 | Object storage (avatars, email templates) |
| **imgproxy** | 5001 | Image transformations |
| **meta** | 8080 | Database introspection (Studio) |
| **functions** | 9000 | Deno edge functions |
| **studio** | Internal | Admin dashboard |
| **analytics** | 4000 | Logging (Logflare) |
| **vector** | 9001 | Log aggregation |
| **supavisor** | 5432/6543 | Connection pooler |

**Realtime service disabled** - Not needed for CritiQit (reduces resources, battery drain, complexity).

### Data Flow

```
Client → Cloudflare → Kong (:8000)
  ├─ JWT Validation
  ├─ Rate Limiting (3-tier: IP/content/user)
  └─ Routes to:
      ├─ GoTrue (auth)
      ├─ PostgREST (database API)
      ├─ Storage (files)
      └─ Edge Functions (Deno)
  ↓
Supavisor (connection pooler)
  ↓
PostgreSQL + RLS policies
```

### File Structure

```
supabase/
├── db                            # CLI tool (ALWAYS use this)
├── compose.yml                   # 12 Docker services
├── .env                          # Secrets (not committed)
├── migrations/                   # Database migrations
├── seed/                         # Email templates
└── volumes/
    ├── db/data/                  # PostgreSQL data
    ├── api/kong.yml              # Kong config (1008 lines)
    ├── api/kong/plugins/         # Custom rate-limit-db plugin
    └── functions/                # Edge functions (Deno)
```

### Key Ports

- `8000/8443` - Kong (external API gateway)
- `5432/6543` - Supavisor (connection pooler)
- Internal: Services use Docker DNS (`http://auth:9999`)

---

## Database Management (`db` CLI Tool)

Executable bash script at `supabase/db` - unified interface for ALL database operations.

### Commands

```bash
./db start           # Start all containers
./db stop            # Stop containers (preserves data)
./db restart         # Restart (reloads .env)

./db reset hard      # DESTRUCTIVE: Destroys all data, reapplies migrations, uploads seeds
./db reset soft      # Preserves volumes, drops schema only

./db seed            # Upload email templates (idempotent)
./db clean           # Delete email templates from storage
./db migrate         # Apply new migrations only (⚠️ doesn't re-run existing)
./db status          # Container status + recent migrations
./db help            # Interactive menu if no args
```

### Key Behaviors

- **Hard Reset**: `down -v` → delete `volumes/db/data` → start → wait 10s → migrate → seed
- **Soft Reset**: `supabase db reset` (faster, preserves storage volumes)
- **Migrate**: Only applies NEW files - use `reset hard` to test changes to existing migrations
- **Seed**: Uses `SERVICE_ROLE_KEY`, skips existing files
- **Auto-navigation**: Runs from anywhere, navigates to `supabase/` internally

---

## Database Schema

### Tables

#### `public.profiles`

User profile information.

**Key Columns:**
- `id` - UUID FK to auth.users (CASCADE DELETE)
- `username` - UNIQUE, regex `^[a-zA-Z0-9_]{3,35}$`, case-insensitive
- `username_is_temporary` - Flags auto-generated usernames (triggers UI prompt)
- `full_name`, `bio`, `avatar_url` - Optional profile fields
- `avatar_preset_index` - SMALLINT (0+), references frontend spritesheet frame
- `avatar_background_color` - HEX color for preset avatar background
- `created_at`, `updated_at` - Timestamps

**Indexes:** `profiles_username_lower_idx` (GIN on `lower(username)`)

**Trigger:** `on_auth_user_created` creates profile on signup with temp username `User_{10_char_hash}`

#### `public.rate_limits`

Kong plugin backend for distributed rate limiting.

**Key Columns:**
- `identifier` + `identifier_type` (user/ip/email/username/token) + `endpoint` - UNIQUE composite
- `count_per_*` - Four sliding windows (second/minute/hour/day)
- `reset_*` - Expiry timestamps for each window

**Indexes:** `(identifier, identifier_type, endpoint)` + `reset_*` timestamps

**Pattern:** Atomic UPSERT for concurrent Kong workers

### Functions

All use `SECURITY DEFINER` (bypass RLS) + `SET search_path TO ''` (injection prevention).

#### `handle_new_user()`

Trigger on `auth.users INSERT` - creates profile with temp username `User_{10_char_hash}`, sets `username_is_temporary=true`, pulls OAuth metadata if available.

#### `check_rate_limit(p_identifier, p_identifier_type, p_endpoint, p_limits)`

Atomic rate limit check + increment. Returns `jsonb`:
- `{"allowed": true, "current": {...}}` - Request allowed
- `{"allowed": false, "limit_hit": "hour", "reset_at": "...", "current": {...}}` - Rate limited

**Logic:** UPSERT → check expired windows → compare limits → increment → return status

#### `generate_usernames()`

Returns 10 PascalCase username suggestions (e.g., `["BrightPanda", "SwiftFalcon", ...]`).

**Algorithm:** Adaptive pool (20→50→80→100) batch-validated in single query. ~600 adjectives × ~200 nouns = 120k combinations. Blocks 45 reserved names (admin, api, system, etc.).

#### `check_username_available(username_input)`

Returns `{"available": bool, "error": "invalid_format|too_short|too_long|reserved|taken"}`.

Validates regex `^[a-zA-Z0-9_]{3,35}$`, checks reserved list, queries `profiles_username_lower_idx` (case-insensitive).

#### `cleanup_old_rate_limits()`

Deletes rate_limits records older than 7 days. Run manually or via cron (not automated yet).

### Storage Buckets

> **Note**: Avatar presets are served as a CSS spritesheet from frontend (`public/avatars/presets.png`), not from Supabase storage. Only custom user uploads use the `avatars` bucket.

#### `avatars` (public, 5MB limit, JPEG only for user uploads)

- **User avatars**: `{uuid}.jpg` - RLS allows authenticated users INSERT/UPDATE/DELETE own file (JPEG only)
- **Public read**: Anyone can view (GET)
- **Atomic upsert**: Requires both INSERT + UPDATE policies
- **Allowed MIME types**: `image/jpeg` only

#### `email-templates` (public read, service_role write)

- `confirmation.html` - Email verification template
- GoTrue fetches and populates variables (`{{ .ConfirmationURL }}`)
- Service role only for modifications

### Row Level Security (RLS)

**Profiles:**
- SELECT: Public read (`USING (true)`)
- INSERT/UPDATE/DELETE: Authenticated users, own records only (`auth.uid() = id`)

**Rate Limits:**
- ALL: Service role only (`USING (true)`) - Users never access directly

**Storage Objects:**
- See [Storage Buckets](#storage-buckets) above
- **CRITICAL**: Storage RLS behaves differently than table RLS (see below)

#### CRITICAL: Storage RLS vs Table RLS

**Storage RLS uses `owner_id` field, NOT `auth.uid()`**

```sql
-- ❌ WRONG - auth.uid() returns NULL for storage operations
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- ✅ CORRECT - Use owner_id field set by storage service
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (owner_id = (storage.foldername(name))[1]);
```

**Why:** Supabase storage service runs as service account, not as authenticated user. It sets `owner_id` (text) field but doesn't populate JWT claims, so `auth.uid()` returns NULL.

**Key Differences:**
1. **Field**: Storage uses `owner_id` (text), tables use `auth.uid()` (uuid)
2. **JWT Claims**: Storage service doesn't set claims, `auth.uid()` is NULL
3. **Metadata**: Metadata fields (like `mimetype`) are NULL at INSERT time - use bucket-level `allowed_mime_types` instead
4. **Best Practice**: Separate buckets for different file types cleaner than complex RLS on single bucket

#### CRITICAL: UPDATE Policy Pattern

```sql
-- ✅ CORRECT - Both USING and WITH CHECK
CREATE POLICY "..." ON table FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)       -- Can only SEE own rows
  WITH CHECK (auth.uid() = user_id); -- Can only SET to own ID

-- ❌ WRONG - Missing WITH CHECK allows ownership hijacking
CREATE POLICY "..." ON table FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
```

**Why both:** `USING` filters visible rows, `WITH CHECK` validates new values. Without both, users can reassign ownership.

### Migrations

**Location:** `supabase/migrations/`

**Applied:**
1. `20250818043251_add_user_profiles.sql` - Profiles, storage buckets, RLS
2. `20251112000000_create_rate_limiting.sql` - Rate limit infrastructure
3. `20251120000000_add_username_picker_functions.sql` - Username generation
4. `20251129040001_add_avatar_presets.sql` - Avatar preset fields (avatar_preset_index, avatar_background_color)

**CRITICAL Patterns:**

```sql
-- ✅ Idempotent (safe to re-run)
CREATE TABLE IF NOT EXISTS ...;
INSERT ... ON CONFLICT (id) DO NOTHING;

-- ✅ Secure functions
CREATE FUNCTION ... SECURITY DEFINER SET search_path TO '';

-- ❌ NOT idempotent (fails on re-run)
CREATE TABLE ...;  -- No IF NOT EXISTS
INSERT ...;        -- No ON CONFLICT
```

**Test:** Always `./db reset hard --yes` to verify migrations work from scratch.

---

## Kong API Gateway & Rate Limiting

Kong 3.9 (declarative mode, `volumes/api/kong.yml` 1008 lines) with custom `rate-limit-db` plugin (priority 900, after JWT validation @ 1003).

### Three-Tier Rate Limiting

| Tier | Identifier | Use Case | Example Limits |
|------|------------|----------|----------------|
| **1: IP** | `CF-Connecting-IP` → `X-Real-IP` → `X-Forwarded-For` | DoS protection (OAuth, public storage) | 100/min, 1000/hr |
| **2: Content** | Request body fields (email/username/token) + IP fallback | Credential attacks (signup, login, password reset) | Signup: 10/hr per email, 50/hr per IP |
| **3: User** | JWT `sub` claim + IP fallback | Authenticated abuse (REST API, avatar uploads) | Avatar: 5/hr, REST: 100/min |

### Key Behaviors

- **Composite checks**: Multiple checks per route run sequentially (fail-fast on first 429)
- **Service role bypass**: `apikey` or `Authorization` header matching `SERVICE_ROLE_KEY` → no limits
- **Fail-open**: Database errors → allow request (prevents cascading failures)
- **Content extraction**: Parses JSON body, extracts first non-empty field from `fields` array
- **IP priority**: `CF-Connecting-IP` > `X-Real-IP` > `X-Forwarded-For` > Kong fallback
- **Critical fix**: Content-based prevents service_role bypass (Edge Functions rate limited by email, not bypassed)

### Plugin Files (`volumes/api/kong/plugins/rate-limit-db/`)

- **handler.lua** - Priority 900, checks service_role bypass → gets DB connection → loops checks → returns 429 or allows
- **extractors.lua** - IP (CF-Connecting-IP → X-Real-IP → X-Forwarded-For), JWT sub claim, request body fields, service_role detection
- **db.lua** - Connection pool (one per Kong worker), `SELECT 1` health check, auto-reconnect
- **schema.lua** - Validates check types, fields, limits, credentials

### 429 Response

```json
{
  "message": "Rate limit exceeded",
  "identifier_type": "email",
  "limit_hit": "hour",
  "retry_after": "2025-11-26T15:00:00Z"
}
```

**Frontend:** Parse `retry_after`, show countdown timer, disable form until expiry.

### CRITICAL: Kong Path Routing

```yaml
# ❌ WRONG - Path duplication
services:
  - url: http://storage:5000/storage/v1/object/public  # Includes path
routes:
  - paths: [/storage/v1/object/public]
    strip_path: false  # Results in double path

# ✅ CORRECT - Base URL + strip_path
services:
  - url: http://storage:5000/  # Base only
routes:
  - paths: [/storage/v1/object/public]
    strip_path: true  # External: /storage/.../foo.jpg → Forwarded: /foo.jpg
```

---

## Storage System

**URL Patterns:**
- Public: `/storage/v1/object/public/{bucket}/{filepath}`
- Authenticated: `/storage/v1/object/{bucket}/{filepath}` (requires JWT)

### CRITICAL Patterns

**1. Atomic Upsert (prevents data loss):**
```javascript
// ❌ WRONG - Delete then upload (if upload fails, file lost)
await supabase.storage.from('avatars').remove([path]);
await supabase.storage.from('avatars').upload(path, file);

// ✅ CORRECT - Atomic (replaces only on success)
await supabase.storage.from('avatars').upload(path, file, { upsert: true });
```
**Requires:** Both INSERT + UPDATE RLS policies

**2. Cache Busting:**
```javascript
const url = `${avatarUrl}?version=${Date.now()}`;  // Force refresh
```

**3. Error Messages:**
- ❌ "RLS policy violation" ✅ "Unable to upload. Please try again."

**Errors:** 400 (Kong routing), 403 (RLS), 413 (>5MB), 415 (not JPEG)

---

## Authentication & Authorization

**Providers:**
- Email/Password: AWS SES SMTP, custom templates from storage, OTP + CAPTCHA verification via Edge Function
- Google OAuth: Auto-confirmed, extracts `full_name` + `avatar_url` from `raw_user_meta_data`
- Anonymous: Disabled

**JWT:** HS256, 1-hour expiry, roles (`anon`, `authenticated`, `service_role`)

**CAPTCHA:** Cloudflare Turnstile (TEST KEY: `1x0000000000000000000000000000000AA` - change for production)

**Roles:**
- `anon` - Public read on profiles/storage
- `authenticated` - CRUD own profile, upload own avatar, call username functions
- `service_role` - Bypasses ALL RLS + rate limits (NEVER expose to clients)

**Auth Helpers:**
- `auth.uid()` - Returns user UUID or NULL
- `auth.role()` - Returns role name

---

## Edge Functions

**Location:** `supabase/volumes/functions/`

**Main Router (`main/index.ts`):** Entry point, parses path, creates workers, forwards requests. `verify_jwt=false` in config (functions verify individually).

**OTP Verification (`verify-otp-securely/index.ts`):** Verifies CAPTCHA + OTP. Uses `SERVICE_ROLE_KEY` for admin client. Returns 200 (success) or 400/403/500 (errors).

**Shared CORS (`_shared/cors.ts`):** `Access-Control-Allow-Origin: *` + standard headers

---

## Common Workflows

**After Git Pull:**
```bash
./db migrate    # New migrations
./db restart    # Changed .env
./db reset hard # Major changes
```

**Testing Migrations:**
```bash
./db reset hard  # Test from scratch
./db status      # Verify applied
```

---

## Why Realtime is Disabled

Realtime service (WebSocket subscriptions) intentionally disabled for CritiQit.

**Reasons:** Not needed (no live feeds), reduces resources/battery, simpler architecture

**Still Works:** Auth (`onAuthStateChange` is local), token refresh (HTTP), DB queries (PostgREST), storage (HTTP), profile updates (visibility-change refresh)

---

## Related Documentation

- [project.md](./project.md) - Project overview
- [frontend.md](./frontend.md) - Frontend details
- [design-system.md](./design-system.md) - Design system
- [sessions.md](./sessions.md) - Session history
