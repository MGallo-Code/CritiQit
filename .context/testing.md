# CritiQit Testing Strategy

> **Last Updated**: 2025-12-26
> **Purpose**: Comprehensive testing plan ensuring quality without redundancy
> **Philosophy**: Test each concern at the lowest cost layer that provides confidence

---

## Testing Pyramid

```
                    ┌─────────────┐
                    │     E2E     │  Few, critical user journeys
                    │  Playwright │  (10-20 tests)
                    ├─────────────┤
                    │ Integration │  API contracts, auth flows
                    │   Vitest    │  (30-50 tests)
                    ├─────────────┤
                    │  Component  │  UI behavior, form logic
                    │   Vitest    │  (50-100 tests)
                    ├─────────────┤
                    │    Unit     │  Pure functions, utilities
                    │   Vitest    │  (100+ tests)
                    ├─────────────┤
                    │  Database   │  RLS policies, functions
                    │   pgTAP     │  (50-100 tests)
                    └─────────────┘
```

**Principle**: Test at the lowest layer that catches the bug. Don't duplicate coverage.

---

## Layer Responsibilities

### What Each Layer Tests (No Overlap)

| Layer | Tests | Does NOT Test |
|-------|-------|---------------|
| **Database (pgTAP)** | RLS policies, SQL functions, constraints, triggers | API behavior, UI |
| **Unit (Vitest)** | Pure functions, validation logic, parsers, formatters | Components, API calls |
| **Component (Vitest + RTL)** | Component rendering, user interactions, state changes | Real API, navigation |
| **Integration (Vitest)** | API contracts, auth flows against real backend | UI, browser behavior |
| **E2E (Playwright)** | Critical user journeys, cross-browser, mobile | Everything else |

---

## 1. Database Tests (pgTAP)

**Location**: `supabase/tests/`
**Runner**: pgTAP extension + pg_prove (via Docker)
**Priority**: HIGHEST (security-critical)
**Status**: IMPLEMENTED (profiles RLS, storage RLS)

### Running Tests

```bash
# Run all database tests
cd supabase && ./db test

# Run tests with fresh database (recommended for CI)
./db test --fresh --yes

# Run specific test file manually
docker compose exec db psql -U supabase_admin -d postgres -f /tests/rls/profiles.test.sql
```

### Implementation Details

- **pgTAP Extension**: Installed automatically in test-runner container via `CREATE EXTENSION IF NOT EXISTS pgtap`
- **Test Isolation**: Each test file runs in a transaction (BEGIN/ROLLBACK) for complete isolation
- **Test Fixtures**: Seeded test users in `tests/fixtures/test-users.sql` with known UUIDs
- **Docker Overlay**: `docker-compose.test.yml` extends main compose.yml with test-runner service
- **CLI Integration**: `./db test` command runs tests via Docker, supports `--fresh` for clean DB state

### What to Test

#### RLS Policies (Critical)

| Table | Policy | Test Cases | Status |
|-------|--------|------------|--------|
| `profiles` | SELECT public | Anyone can read any profile | ✅ IMPLEMENTED |
| `profiles` | INSERT own | User can only create own profile | ✅ IMPLEMENTED |
| `profiles` | UPDATE own | User can only update own profile | ✅ IMPLEMENTED |
| `profiles` | UPDATE own | User CANNOT update other profiles | ✅ IMPLEMENTED |
| `profiles` | UPDATE own | WITH CHECK prevents ownership hijacking | ✅ IMPLEMENTED |
| `profiles` | DELETE own | User can only delete own profile | ✅ IMPLEMENTED |
| `rate_limits` | Service only | Users cannot read rate_limits | ✅ IMPLEMENTED |
| `rate_limits` | Service only | Users cannot write rate_limits | ✅ IMPLEMENTED |
| `rate_limits` | Service only | Service role CAN access | ✅ IMPLEMENTED |
| `storage.objects` | SELECT public | Anyone can read avatars bucket | ✅ IMPLEMENTED |
| `storage.objects` | INSERT own | User can upload to own path (UUID.jpg) | ✅ IMPLEMENTED |
| `storage.objects` | INSERT own | User CANNOT upload to other user path | ✅ IMPLEMENTED |
| `storage.objects` | INSERT own | Filename must match {owner_id}.jpg pattern | ✅ IMPLEMENTED |
| `storage.objects` | UPDATE own | User can update own files | ✅ IMPLEMENTED |
| `storage.objects` | UPDATE own | User CANNOT update other user files | ✅ IMPLEMENTED |
| `storage.objects` | UPDATE own | WITH CHECK prevents invalid filename changes | ✅ IMPLEMENTED |
| `storage.objects` | DELETE own | User can delete own files | ✅ IMPLEMENTED |
| `storage.objects` | DELETE own | User CANNOT delete other user files | ✅ IMPLEMENTED |

#### SQL Functions

| Function | Test Cases |
|----------|------------|
| `handle_new_user()` | Creates profile on signup |
| `handle_new_user()` | Generates temporary username |
| `handle_new_user()` | Pulls OAuth metadata |
| `check_rate_limit()` | Returns allowed=true under limit |
| `check_rate_limit()` | Returns allowed=false over limit |
| `check_rate_limit()` | Respects all time windows (sec/min/hr/day) |
| `check_rate_limit()` | Resets expired windows |
| `check_rate_limit()` | Atomic under concurrent calls |
| `generate_usernames()` | Returns 10 unique suggestions |
| `generate_usernames()` | Excludes reserved names |
| `generate_usernames()` | All suggestions are available |
| `check_username_available()` | Rejects invalid format |
| `check_username_available()` | Rejects reserved names |
| `check_username_available()` | Case-insensitive check |
| `check_username_available()` | Returns available for valid names |

#### Constraints

| Constraint | Test Cases |
|------------|------------|
| `profiles.username` | Rejects < 3 chars |
| `profiles.username` | Rejects > 35 chars |
| `profiles.username` | Rejects special characters |
| `profiles.username` | Enforces uniqueness (case-insensitive) |
| `profiles.avatar_preset_index` | Rejects negative values |
| `rate_limits` composite key | Enforces uniqueness |

### Test File Structure

```
supabase/tests/
├── fixtures/
│   └── test-users.sql           # ✅ Seeded test users (4 users with known UUIDs)
├── rls/
│   ├── profiles.test.sql        # ✅ Profile RLS policies (13 tests)
│   └── storage.test.sql         # ✅ Storage RLS policies (10 tests)
├── functions/                   # TODO: Not yet implemented
│   ├── handle-new-user.test.sql
│   ├── check-rate-limit.test.sql
│   ├── generate-usernames.test.sql
│   └── check-username-available.test.sql
└── constraints/                 # TODO: Not yet implemented
    └── profiles.test.sql        # Column constraints
```

**Docker Test Environment:**
```
supabase/
├── docker-compose.test.yml      # ✅ Test overlay (extends compose.yml)
└── db                           # ✅ CLI tool with 'test' command
```

### NOT Tested Here

- API response formats (Integration layer)
- HTTP status codes (Integration layer)
- Frontend validation (Component layer)
- User flows (E2E layer)

---

## 2. Unit Tests (Vitest)

**Location**: `frontend/__tests__/lib/`
**Runner**: Vitest
**Priority**: HIGH (logic correctness)

### What to Test

#### Error Parsing (`lib/parse-auth-error.ts`)

| Function | Test Cases |
|----------|------------|
| `parseAuthError()` | Maps known Supabase error codes |
| `parseAuthError()` | Returns user-friendly messages |
| `parseAuthError()` | Handles unknown errors gracefully |
| `parseEdgeFunctionError()` | Parses JSON body from FunctionsHttpError |
| `parseEdgeFunctionError()` | Handles non-JSON responses |
| `isRateLimitError()` | Identifies rate limit errors |
| `isRateLimitError()` | Rejects non-rate-limit errors |

#### Validation (`lib/validation/`)

| Function | Test Cases |
|----------|------------|
| `validateUsername()` | Accepts valid usernames |
| `validateUsername()` | Rejects too short/long |
| `validateUsername()` | Rejects invalid characters |
| `validateEmail()` | Accepts valid emails |
| `validateEmail()` | Rejects malformed emails |
| `validatePassword()` | Enforces minimum length |

#### Utilities (`lib/utils.ts`)

| Function | Test Cases |
|----------|------------|
| `cn()` | Merges class names correctly |
| `cn()` | Handles conditional classes |
| `formatDate()` | Formats dates consistently |
| `rgbToHsl()` | Converts colors correctly |
| `hslToString()` | Outputs valid CSS |

#### Avatar Helpers (`lib/avatar/`)

| Function | Test Cases |
|----------|------------|
| `getPresetPosition()` | Returns correct sprite position |
| `getPresetPosition()` | Handles edge indices (0, 9) |
| `buildAvatarUrl()` | Includes cache-busting param |
| `buildAvatarUrl()` | Handles null gracefully |

### Test File Structure

```
frontend/__tests__/
├── lib/
│   ├── parse-auth-error.test.ts
│   ├── validation/
│   │   ├── username.test.ts
│   │   ├── email.test.ts
│   │   └── password.test.ts
│   ├── utils.test.ts
│   └── avatar/
│       └── helpers.test.ts
```

### NOT Tested Here

- React components (Component layer)
- API calls (Integration layer)
- Browser behavior (E2E layer)

---

## 3. Component Tests (Vitest + React Testing Library)

**Location**: `frontend/__tests__/components/`
**Runner**: Vitest + @testing-library/react + jsdom
**Priority**: HIGH (UI correctness)

### What to Test

#### Form Components

| Component | Test Cases |
|-----------|------------|
| `LoginForm` | Renders email and password fields |
| `LoginForm` | Disables submit when loading |
| `LoginForm` | Shows error message on failure |
| `LoginForm` | Calls onSubmit with form data |
| `SignUpForm` | Renders Turnstile widget |
| `SignUpForm` | Validates password confirmation |
| `ProfileForm` | Pre-fills existing data |
| `ProfileForm` | Toggles edit mode |
| `ProfileForm` | Shows optimistic update |
| `ProfileForm` | Reverts on cancel |

#### Error Display

| Component | Test Cases |
|-----------|------------|
| `FormError` | Renders error message |
| `FormError` | Shows countdown for rate limits |
| `FormError` | Updates countdown every second |
| `FormError` | Shows "try again" at zero |
| `FormError` | Applies warning style for rate limits |
| `FormError` | Applies error style for other errors |

#### Avatar Components

| Component | Test Cases |
|-----------|------------|
| `AvatarPickerModal` | Opens on trigger click |
| `AvatarPickerModal` | Shows preset and upload tabs |
| `AvatarPickerModal` | Selects preset on click |
| `AvatarPickerModal` | Shows crop UI after file select |
| `AvatarPickerModal` | Calls onSave with selection |
| `AvatarDisplay` | Shows preset sprite correctly |
| `AvatarDisplay` | Shows custom URL with cache bust |
| `AvatarDisplay` | Falls back on error |

#### UI Primitives

| Component | Test Cases |
|-----------|------------|
| `Button` | Renders variants correctly |
| `Button` | Shows loading spinner |
| `Button` | Forwards click handler |
| `Input` | Renders with label |
| `Input` | Shows error state |
| `OTPInput` | Accepts 6 digits |
| `OTPInput` | Auto-advances focus |
| `OTPInput` | Handles paste |

### Test File Structure

```
frontend/__tests__/
├── components/
│   ├── auth/
│   │   ├── login-form.test.tsx
│   │   ├── sign-up-form.test.tsx
│   │   └── profile-form.test.tsx
│   ├── ui/
│   │   ├── form-error.test.tsx
│   │   ├── button.test.tsx
│   │   ├── input.test.tsx
│   │   └── otp-input.test.tsx
│   └── avatar/
│       ├── avatar-picker-modal.test.tsx
│       └── avatar-display.test.tsx
```

### Mocking Strategy

```typescript
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn(),
    })),
  }),
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
```

### NOT Tested Here

- Real API responses (Integration layer)
- Full page navigation (E2E layer)
- Cross-browser rendering (E2E layer)

---

## 4. Integration Tests (Vitest)

**Location**: `tests/api/`
**Runner**: Vitest
**Requires**: Docker stack running
**Priority**: MEDIUM-HIGH (API contracts)

### What to Test

#### Authentication

| Endpoint | Test Cases |
|----------|------------|
| POST `/auth/v1/signup` | Creates user with valid data |
| POST `/auth/v1/signup` | Rejects weak password |
| POST `/auth/v1/signup` | Rejects duplicate email |
| POST `/auth/v1/token` | Returns JWT for valid creds |
| POST `/auth/v1/token` | Returns 400 for invalid creds |
| POST `/auth/v1/token` | Does NOT reveal if email exists |
| POST `/auth/v1/logout` | Invalidates session |
| POST `/auth/v1/recover` | Sends recovery email |
| GET `/auth/v1/user` | Returns user with valid JWT |
| GET `/auth/v1/user` | Returns 401 without JWT |

#### Profiles (PostgREST)

| Endpoint | Test Cases |
|----------|------------|
| GET `/rest/v1/profiles` | Returns public profiles |
| GET `/rest/v1/profiles?id=eq.X` | Returns specific profile |
| PATCH `/rest/v1/profiles?id=eq.X` | Updates own profile |
| PATCH `/rest/v1/profiles?id=eq.X` | Rejects update to other profile |
| POST `/rest/v1/rpc/check_username_available` | Returns availability |
| POST `/rest/v1/rpc/generate_usernames` | Returns 10 suggestions |

#### Storage

| Endpoint | Test Cases |
|----------|------------|
| POST `/storage/v1/object/avatars/{id}.jpg` | Uploads with valid JWT |
| POST `/storage/v1/object/avatars/{id}.jpg` | Rejects wrong user path |
| POST `/storage/v1/object/avatars/{id}.jpg` | Rejects non-JPEG |
| POST `/storage/v1/object/avatars/{id}.jpg` | Rejects > 5MB |
| GET `/storage/v1/object/public/avatars/{id}.jpg` | Returns file publicly |
| DELETE `/storage/v1/object/avatars/{id}.jpg` | Deletes own file |
| DELETE `/storage/v1/object/avatars/{id}.jpg` | Rejects other user file |

#### Rate Limiting

| Endpoint | Test Cases |
|----------|------------|
| POST `/auth/v1/signup` | Rate limits by IP |
| POST `/auth/v1/signup` | Rate limits by email |
| POST `/auth/v1/signup` | Different IPs have separate buckets |
| POST `/storage/v1/object/avatars/*` | Rate limits by user |
| Any rate-limited | Returns 429 with retry_after |
| Any rate-limited | Returns identifier_type |
| Service role requests | Bypass rate limits |

#### Edge Functions

| Endpoint | Test Cases |
|----------|------------|
| POST `/functions/v1/verify-otp-securely` | Verifies valid OTP |
| POST `/functions/v1/verify-otp-securely` | Rejects invalid OTP |
| POST `/functions/v1/verify-otp-securely` | Rejects invalid CAPTCHA |
| POST `/functions/v1/verify-otp-securely` | Rate limited by email |

### Test File Structure

```
tests/
├── api/
│   ├── setup.ts                 # Test setup, client creation
│   ├── auth/
│   │   ├── signup.test.ts
│   │   ├── login.test.ts
│   │   └── recovery.test.ts
│   ├── profiles/
│   │   ├── read.test.ts
│   │   ├── update.test.ts
│   │   └── rpc.test.ts
│   ├── storage/
│   │   ├── upload.test.ts
│   │   └── access.test.ts
│   ├── rate-limiting/
│   │   ├── ip-limits.test.ts
│   │   ├── user-limits.test.ts
│   │   └── content-limits.test.ts
│   └── functions/
│       └── verify-otp.test.ts
```

### NOT Tested Here

- Database internals (pgTAP layer)
- UI rendering (Component layer)
- Browser behavior (E2E layer)

---

## 5. E2E Tests (Playwright)

**Location**: `frontend/e2e/`
**Runner**: Playwright
**Requires**: Full stack running
**Priority**: MEDIUM (critical journeys only)

### Philosophy

E2E tests are expensive (slow, flaky, hard to debug). Only test:
1. **Critical user journeys** that generate revenue or trust
2. **Cross-browser issues** that can't be caught elsewhere
3. **Mobile-specific behavior** (touch, responsive)

### What to Test

#### Critical Journeys (Must Pass)

| Journey | Steps | Why Critical |
|---------|-------|--------------|
| **New User Signup** | Signup → Verify email → Complete onboarding → Profile | Core acquisition flow |
| **Returning User Login** | Login → View profile → Edit → Save | Core retention flow |
| **Password Recovery** | Forgot → Email → Reset → Login | Trust & security |
| **OAuth Login** | Google button → Callback → Profile | Alternative auth path |

#### Mobile-Specific

| Test | Devices | Why |
|------|---------|-----|
| Profile edit button clickable | iPhone 13, Pixel 5 | Session 16 overflow-hidden fix |
| Touch targets >= 44px | Mobile Safari, Chrome | Accessibility compliance |
| Avatar picker drawer works | Mobile Safari | Drawer vs Dialog UX |
| Form inputs don't zoom | iOS Safari | Viewport meta behavior |

#### Cross-Browser

| Test | Browsers | Why |
|------|----------|-----|
| Avatar upload works | Safari, Chrome, Firefox | HEIC conversion, Web Workers |
| OTP input paste works | Safari, Chrome | Clipboard API differences |
| Gradient extraction works | Safari, Chrome | Canvas CORS handling |

#### Error Handling

| Test | Scenario | Why |
|------|----------|-----|
| Rate limit countdown | Trigger 429, verify timer | UX for blocked users |
| Network error recovery | Simulate offline, retry | Graceful degradation |
| Session expiry | Wait for token expiry, verify redirect | Security + UX |

### Test File Structure

```
frontend/e2e/
├── playwright.config.ts
├── fixtures/
│   ├── auth.fixture.ts          # Authenticated page helper
│   └── test-avatar.jpg          # Test upload file
├── support/
│   ├── test-users.ts            # User constants
│   └── commands.ts              # Custom helpers
├── tests/
│   ├── journeys/
│   │   ├── new-user-signup.spec.ts
│   │   ├── returning-user-login.spec.ts
│   │   ├── password-recovery.spec.ts
│   │   └── oauth-login.spec.ts
│   ├── mobile/
│   │   ├── profile-edit.spec.ts
│   │   ├── touch-targets.spec.ts
│   │   └── avatar-picker.spec.ts
│   ├── cross-browser/
│   │   ├── avatar-upload.spec.ts
│   │   └── otp-input.spec.ts
│   └── error-handling/
│       ├── rate-limiting.spec.ts
│       └── network-errors.spec.ts
```

### NOT Tested Here

- Every form field validation (Component layer)
- Every API response (Integration layer)
- Every RLS policy (pgTAP layer)
- Visual styling (Manual review + design-reviewer agent)

---

## 6. Test Data Management

### Seeded Test Users

| User | ID | Email | Purpose |
|------|----|----|---------|
| User A | `11111111-...` | `user-a@test.local` | Primary test user |
| User B | `22222222-...` | `user-b@test.local` | Cross-user RLS tests |
| Rate Limited | `33333333-...` | `rate-limited@test.local` | Pre-exhausted limits |
| New User | (none) | `new-user@test.local` | Signup flow tests |
| OAuth User | `44444444-...` | `oauth@test.local` | Google OAuth tests |

### Test Data Isolation

```
┌─────────────────────────────────────────────────────────────┐
│ docker-compose.test.yml                                     │
├─────────────────────────────────────────────────────────────┤
│ Extends compose.yml with:                                   │
│ - test-users.sql seed                                       │
│ - test-runner service                                       │
│ - Predictable JWT_SECRET                                    │
│ - Fresh database per run (down -v)                          │
└─────────────────────────────────────────────────────────────┘
```

### Reset Strategy

| Scope | Command | When |
|-------|---------|------|
| Full reset | `docker compose down -v && up` | Between test suites |
| Database only | `./db reset hard` | Between integration runs |
| Per-test | `BEGIN; ... ROLLBACK;` | Within pgTAP tests |

---

## 7. CI/CD Pipeline

### Test Stages

```yaml
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Lint &     │    │   Unit &     │    │ Integration  │    │     E2E      │
│   Typecheck  │ -> │  Component   │ -> │    Tests     │ -> │    Tests     │
│   (30s)      │    │   (1-2min)   │    │   (3-5min)   │    │   (5-10min)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       v                   v                   v                   v
   No Docker           No Docker          Docker Stack        Full Stack
   Required            Required            Required            Required
```

### Fail-Fast Strategy

1. **Lint + Typecheck** - Fastest, catches syntax/type errors
2. **Unit + Component** - Fast, catches logic/UI bugs
3. **Integration** - Medium, catches API contract issues
4. **E2E** - Slowest, catches journey-breaking bugs

If any stage fails, subsequent stages don't run.

### Branch Strategy

| Branch | Tests Run | E2E Browsers |
|--------|-----------|--------------|
| Feature branch | Lint, Unit, Component | None |
| `dev` | All | Chromium only |
| `main` | All | All browsers + mobile |
| Pre-release tag | All + performance | All browsers + mobile |

---

## 8. Coverage Expectations

### Minimum Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Database (RLS) | 100% | Security-critical, must cover all policies |
| Database (Functions) | 90% | Core logic, high value |
| Unit (Utilities) | 90% | Pure functions, easy to test |
| Component (Forms) | 80% | User interaction, high value |
| Component (UI primitives) | 70% | Lower risk, shadcn patterns |
| Integration (Auth) | 90% | Security-critical |
| Integration (Storage) | 80% | File handling edge cases |
| E2E | N/A | Journey count, not coverage |

### Coverage Tracking

```bash
# Unit + Component coverage
npm run test:coverage

# Database function coverage (manual tracking)
# Track in this document's function tables

# E2E is journey-based, not coverage-based
```

---

## 9. Tools & Configuration

### Package Installation

```bash
# Frontend testing
cd frontend
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event \
  @playwright/test

# Database testing (in postgres container)
CREATE EXTENSION IF NOT EXISTS pgtap;
```

### Configuration Files

| File | Purpose |
|------|---------|
| `frontend/vitest.config.ts` | Unit + Component test config |
| `frontend/e2e/playwright.config.ts` | E2E test config |
| `supabase/tests/pgtap.conf` | pgTAP runner config |
| `docker-compose.test.yml` | Test environment overlay |

---

## 10. Running Tests

### Quick Reference

```bash
# All unit + component tests
cd frontend && npm test

# Specific test file
npm test -- parse-auth-error.test.ts

# With coverage
npm run test:coverage

# Watch mode (development)
npm run test:watch

# Database tests (requires stack)
cd supabase && ./db test

# Integration tests (requires stack)
npm run test:api

# E2E tests
npm run test:e2e

# E2E with UI (debugging)
npm run test:e2e:ui

# E2E record new test
npm run test:e2e:codegen

# Full CI pipeline locally
npm run test:ci
```

### Docker Commands

```bash
# RECOMMENDED: Use ./db CLI tool
cd supabase
./db test                    # Run tests with current DB state
./db test --fresh            # Reset DB and run tests (recommended)
./db test --fresh --yes      # Skip confirmation prompt

# Manual Docker commands (if needed)
docker compose -f compose.yml -f docker-compose.test.yml run --rm test-runner

# Teardown (fresh state)
docker compose -f compose.yml -f docker-compose.test.yml down -v
```

### Implementation Notes (2025-12-26)

**What's Implemented:**
- ✅ pgTAP infrastructure with Docker overlay
- ✅ Test fixtures with 4 seeded users (known UUIDs)
- ✅ 13 RLS policy tests for `profiles` table
- ✅ 10 RLS policy tests for `storage.objects` (avatars bucket)
- ✅ `./db test` command with `--fresh` option for clean state
- ✅ Transaction-based test isolation (BEGIN/ROLLBACK)

**Test Coverage:**
- ✅ Profiles: SELECT (public), INSERT (own), UPDATE (own + WITH CHECK), DELETE (own)
- ✅ Rate Limits: Service role only (read/write blocked for users)
- ✅ Storage: SELECT (public), INSERT (own path validation), UPDATE (own + WITH CHECK), DELETE (own)

**Security Fix Discovered (2025-12-26):**
pgTAP tests revealed a **security vulnerability** in storage RLS policies:
- Original UPDATE/DELETE policies only validated filename format (`name = owner_id || '.jpg'`)
- This allowed ANY authenticated user to modify ANY avatar file
- Fixed in original migration `20250818043251_add_user_profiles.sql`
- Policies now properly check `owner_id = auth.uid()::text`

**RLS Behavior Note:**
- RLS with no matching policy returns **0 rows**, not a permission error
- Tests should use `ok(COUNT(*) = 0, ...)` not `throws_ok(...)`
- Only INSERT/UPDATE WITH CHECK violations throw errors

**Key Patterns Tested:**
1. **Storage RLS now uses `auth.uid()`** - Fixed to properly check ownership
2. **UPDATE policies need BOTH USING and WITH CHECK** - Prevents ownership hijacking
3. **Filename validation** - Enforces {UUID}.jpg pattern for avatars
4. **Cross-user protection** - Users cannot access/modify other users' data

**TODO for Future:**
- [ ] SQL function tests (handle_new_user, check_rate_limit, generate_usernames, check_username_available)
- [ ] Constraint tests (username format, length, uniqueness)
- [ ] Trigger tests (profile creation on signup)
- [ ] CI/CD integration (run tests in GitHub Actions)

**Running Tests:**
```bash
# From project root
cd supabase && ./db test --fresh --yes

# Expected output:
# 🧪 Running pgTAP tests...
# /tests/rls/profiles.test.sql .. ok
# /tests/rls/storage.test.sql ... ok
# All tests successful.
# ✅ All tests passed!
```

---

## 11. Maintenance

### Adding New Tests

1. Identify which layer should test the behavior
2. Check the "NOT Tested Here" section to avoid duplication
3. Add test to appropriate file/directory
4. Update coverage expectations if needed

### Quarterly Review

- [ ] Review flaky tests, fix or remove
- [ ] Update test user seeds for new features
- [ ] Audit E2E tests for journey relevance
- [ ] Update coverage targets based on codebase changes
- [ ] Review CI timing, optimize slow tests

---

## Related Documentation

- [backend.md](./backend.md) - RLS policies, functions to test
- [frontend.md](./frontend.md) - Components, patterns to test
- [project.md](./project.md) - Architecture context
