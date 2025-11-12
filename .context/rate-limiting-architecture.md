# Three-Tier Rate Limiting Architecture for CritiQit

**Document Version:** 1.0
**Date:** 2025-11-12
**Status:** Architecture Design (Awaiting Approval for Implementation)

---

## Executive Summary

This document proposes a comprehensive three-tier rate limiting architecture for CritiQit's self-hosted Supabase backend using Kong API Gateway 3.9 with PostgreSQL-backed custom plugins.

**Critical Security Issue Addressed:**
- Edge Functions use service_role key internally, bypassing Kong authentication
- This creates a rate limiting vulnerability where unauthenticated requests can bypass IP-based rate limits
- Solution: Content-based rate limiting that extracts identifiers from request bodies

**Architectural Approach:**
- **Refactor existing plugin** rather than create 3 separate plugins
- **Single unified plugin** (`rate-limit-db`) with configurable modes
- **Per-route configuration** to apply different tiers to different endpoints
- **Backward compatible** with existing implementation

---

## Table of Contents

1. [Endpoint Analysis](#1-endpoint-analysis)
2. [Three-Tier Architecture Design](#2-three-tier-architecture-design)
3. [Kong Routing Architecture](#3-kong-routing-architecture)
4. [Plugin Implementation Strategy](#4-plugin-implementation-strategy)
5. [Database Schema Changes](#5-database-schema-changes)
6. [Testing & Validation Plan](#6-testing--validation-plan)
7. [Implementation Task Breakdown](#7-implementation-task-breakdown)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Endpoint Analysis

### 1.1 Auth Service Endpoints (GoTrue)

#### Tier 2: Content-Based Rate Limiting (Strict)

| Endpoint | Method | Body Fields | Purpose | Rate Limit Strategy |
|----------|--------|-------------|---------|---------------------|
| `/auth/v1/signup` | POST | `email`, `password` | User registration | Email + IP fallback: 5/hour per email, 50/hour per IP |
| `/auth/v1/token?grant_type=password` | POST | `email`, `password` | Login | Email + IP fallback: 10/hour per email, 50/hour per IP |
| `/auth/v1/recover` | POST | `email` | Password reset request | Email + IP fallback: 3/hour per email, 30/hour per IP |
| `/auth/v1/verify` | POST | `email`, `token` | Email verification (if used directly) | Email + IP fallback: 10/hour per email, 50/hour per IP |
| `/auth/v1/resend` | POST | `email` | Resend verification email | Email + IP fallback: 3/hour per email, 30/hour per IP |

**Note:** Login endpoint uses `token?grant_type=password`, not a dedicated `/login` route.

#### Tier 1: IP-Based Rate Limiting (Generous)

| Endpoint | Method | Auth Required | Purpose | Rate Limit Strategy |
|----------|--------|---------------|---------|---------------------|
| `/auth/v1/authorize` | GET | No | OAuth authorization start | IP: 100/minute per IP |
| `/auth/v1/callback` | GET | No | OAuth callback | IP: 100/minute per IP |

#### Tier 3: User-Based Rate Limiting (Moderate)

| Endpoint | Method | Auth Required | Purpose | Rate Limit Strategy |
|----------|--------|---------------|---------|---------------------|
| `/auth/v1/user` | GET | Yes | Get current user | User ID: 100/minute per user |
| `/auth/v1/user` | PUT | Yes | Update user metadata | User ID: 20/minute per user |
| `/auth/v1/logout` | POST | Yes | Sign out | User ID: 10/minute per user |
| `/auth/v1/token?grant_type=refresh_token` | POST | Yes | Refresh token | User ID: 100/minute per user |

**Current Issue:** The `auth-v1-all` route catches everything, making per-endpoint limits impossible.

### 1.2 Edge Functions

#### Tier 2: Content-Based Rate Limiting (Strict)

| Function | Endpoint | Body Fields | Purpose | Rate Limit Strategy |
|----------|----------|-------------|---------|---------------------|
| `verify-otp-securely` | POST `/functions/v1/verify-otp-securely` | `email`, `token`, `captchaToken` | OTP verification with Turnstile | Email + IP fallback: 10/hour per email, 50/hour per IP |

**Critical Security Issue:**
- This function accepts unauthenticated requests
- Uses service_role key internally to call `supabase.auth.verifyOtp()`
- Bypasses Kong's key-auth plugin
- **Must** have content-based rate limiting on `email` field

#### No Rate Limiting (Service Role)

| Function | Endpoint | Auth Required | Purpose | Note |
|----------|----------|---------------|---------|------|
| `main` | POST `/functions/v1/*` | Yes (JWT) | Function router | Already authenticated, uses Tier 3 |

### 1.3 REST API Endpoints (PostgREST)

#### Tier 3: User-Based Rate Limiting (Moderate)

| Operation | Endpoint Pattern | Auth Required | Rate Limit Strategy |
|-----------|------------------|---------------|---------------------|
| SELECT (read) | GET `/rest/v1/*` | Yes | User ID: 100/minute per user |
| INSERT (create) | POST `/rest/v1/*` | Yes | User ID: 60/minute per user |
| UPDATE (modify) | PATCH `/rest/v1/*` | Yes | User ID: 60/minute per user |
| DELETE (remove) | DELETE `/rest/v1/*` | Yes | User ID: 30/minute per user |

**Note:** Public reads (with anon key) should fall back to IP-based rate limiting.

### 1.4 Storage Endpoints

#### Tier 1: IP-Based Rate Limiting (Generous)

| Operation | Endpoint Pattern | Auth Required | Purpose | Rate Limit Strategy |
|-----------|------------------|---------------|---------|---------------------|
| GET public files | GET `/storage/v1/object/public/*` | No | Public file downloads | IP: 200/minute per IP |

#### Tier 3: User-Based Rate Limiting (Moderate)

| Operation | Endpoint Pattern | Auth Required | Purpose | Rate Limit Strategy |
|-----------|------------------|---------------|---------|---------------------|
| Upload file | POST `/storage/v1/object/*` | Yes | File uploads | User ID: 20/minute per user |
| Update file | PUT `/storage/v1/object/*` | Yes | File updates | User ID: 20/minute per user |
| Delete file | DELETE `/storage/v1/object/*` | Yes | File deletions | User ID: 30/minute per user |

**Current Issue:** Storage has NO rate limiting at all in current kong.yml.

### 1.5 Realtime Endpoints

#### Tier 3: User-Based Rate Limiting (Moderate)

| Operation | Endpoint Pattern | Auth Required | Purpose | Rate Limit Strategy |
|-----------|------------------|---------------|---------|---------------------|
| WebSocket connection | WS `/realtime/v1/*` | Yes | Real-time subscriptions | User ID: 10 connections/minute per user |
| REST API | GET/POST `/realtime/v1/api/*` | Yes | Realtime REST operations | User ID: 60/minute per user |

---

## 2. Three-Tier Architecture Design

### 2.1 Unified Plugin Approach

**Decision:** Refactor existing `rate-limit-db` plugin rather than create 3 separate plugins.

**Rationale:**
1. **Code reuse:** All tiers use same PostgreSQL backend and base logic
2. **Configuration flexibility:** Single plugin with different config per route
3. **Maintainability:** One codebase to debug and enhance
4. **Backward compatibility:** Existing global configuration still works

### 2.2 Tier Definitions

#### Tier 1: IP-Based Rate Limiting
- **Plugin Mode:** `identifier_strategy = "ip"`
- **Purpose:** Basic DoS protection for public anonymous operations
- **Identifier:** IP address only (CF-Connecting-IP, X-Real-IP, X-Forwarded-For)
- **Limits:** Generous (100-200 requests/minute per IP)
- **Applied To:** OAuth endpoints, public storage reads

#### Tier 2: Content-Based Rate Limiting
- **Plugin Mode:** `identifier_strategy = "content"`
- **Purpose:** Prevent credential attacks, brute force, account enumeration
- **Identifier:** Request body fields (email, username, token) + IP fallback
- **Configuration:**
  ```yaml
  identifier_strategy: content
  content_identifier_fields: ["email"]  # or ["username"], ["token"], etc.
  content_identifier_type: email  # for tracking/logging
  ```
- **Limits:** Strict per identifier
  - 3-10 requests/hour per email address
  - 10-20 requests/hour per username
  - 3-5 requests/10min per token prefix (first 8 chars)
  - 50 requests/hour per IP (fallback when body field missing)
- **Applied To:** Signup, login, OTP verification, password reset, resend email

#### Tier 3: User-Based Rate Limiting
- **Plugin Mode:** `identifier_strategy = "user"` (default, existing behavior)
- **Purpose:** Prevent API abuse from authenticated users
- **Identifier:** JWT sub claim (user ID from Authorization header)
- **Limits:** Moderate (60-100 requests/minute per user ID)
- **Applied To:** Authenticated REST, authenticated storage, authenticated auth operations

### 2.3 Service Role Bypass

**Requirement:** Service role key must bypass ALL rate limiting.

**Implementation:** Already implemented in current plugin (line 202-208 of handler.lua):
```lua
local api_key = kong.request.get_header("apikey")
local service_role_key = os.getenv("SUPABASE_SERVICE_KEY")
if api_key == service_role_key then
  kong.log.debug("[rate-limit-db] Service role detected - bypassing rate limit")
  return
end
```

**Critical:** This must remain in the refactored plugin.

---

## 3. Kong Routing Architecture

### 3.1 Current Issues with kong.yml

1. **Too broad routes:**
   - `auth-v1-all` catches `/auth/v1/*` - cannot apply per-endpoint limits
   - `functions-v1-all` catches `/functions/v1/*` - cannot rate limit specific functions
   - `storage-v1-all` catches `/storage/v1/*` - no rate limiting at all
   - `rest-v1-all` catches `/rest/v1/*` - cannot differentiate read vs write

2. **Missing rate limiting:**
   - OAuth endpoints have only CORS (no rate limiting)
   - Storage has no rate limiting
   - Functions have no rate limiting

3. **Security gaps:**
   - Edge Functions can be called with service_role key without content-based limits
   - No protection against email enumeration attacks
   - No protection against brute force login attempts

### 3.2 Proposed Kong Routing Architecture

**Strategy:** Split broad routes into specific routes, apply appropriate rate limiting plugin configuration to each.

#### 3.2.1 Auth Service Routes (Refactored)

```yaml
services:
  # Tier 2: Content-based rate limiting (auth operations with email/password)
  - name: auth-v1-signup
    url: http://auth:9999/signup
    routes:
      - name: auth-v1-signup
        strip_path: true
        paths:
          - /auth/v1/signup
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: content
          content_identifier_fields: ["email"]
          content_identifier_type: email
          hour: 5          # 5 signups per hour per email
          day: 10          # 10 signups per day per email
          fallback_by_ip: true
          fallback_limits:
            hour: 50       # 50 signups per hour per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  - name: auth-v1-token
    url: http://auth:9999/token
    routes:
      - name: auth-v1-token
        strip_path: true
        paths:
          - /auth/v1/token
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: content
          content_identifier_fields: ["email"]
          content_identifier_type: email
          hour: 10         # 10 login attempts per hour per email
          day: 100         # 100 login attempts per day per email
          fallback_by_ip: true
          fallback_limits:
            hour: 50       # 50 login attempts per hour per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  - name: auth-v1-recover
    url: http://auth:9999/recover
    routes:
      - name: auth-v1-recover
        strip_path: true
        paths:
          - /auth/v1/recover
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: content
          content_identifier_fields: ["email"]
          content_identifier_type: email
          hour: 3          # 3 password resets per hour per email
          day: 10          # 10 password resets per day per email
          fallback_by_ip: true
          fallback_limits:
            hour: 30       # 30 password resets per hour per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  - name: auth-v1-verify
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-verify
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          deny:
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: content
          content_identifier_fields: ["email"]
          content_identifier_type: email
          hour: 10         # 10 verifications per hour per email
          day: 50          # 50 verifications per day per email
          fallback_by_ip: true
          fallback_limits:
            hour: 50       # 50 verifications per hour per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  - name: auth-v1-resend
    url: http://auth:9999/resend
    routes:
      - name: auth-v1-resend
        strip_path: true
        paths:
          - /auth/v1/resend
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: content
          content_identifier_fields: ["email"]
          content_identifier_type: email
          hour: 3          # 3 resends per hour per email
          day: 10          # 10 resends per day per email
          fallback_by_ip: true
          fallback_limits:
            hour: 30       # 30 resends per hour per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  # Tier 1: IP-based rate limiting (OAuth)
  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors
      - name: rate-limit-db
        config:
          identifier_strategy: ip
          minute: 100      # 100 callbacks per minute per IP
          hour: 1000       # 1000 callbacks per hour per IP
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors
      - name: rate-limit-db
        config:
          identifier_strategy: ip
          minute: 100      # 100 auth requests per minute per IP
          hour: 1000       # 1000 auth requests per hour per IP
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  # Tier 3: User-based rate limiting (authenticated auth operations)
  - name: auth-v1-user
    url: http://auth:9999/user
    routes:
      - name: auth-v1-user
        strip_path: true
        paths:
          - /auth/v1/user
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          deny:
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 100      # 100 user operations per minute per user
          hour: 1000       # 1000 user operations per hour per user
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  - name: auth-v1-logout
    url: http://auth:9999/logout
    routes:
      - name: auth-v1-logout
        strip_path: true
        paths:
          - /auth/v1/logout
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 10       # 10 logouts per minute per user
          hour: 100        # 100 logouts per hour per user
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  # Catch-all for any remaining auth endpoints (lower priority)
  - name: auth-v1-remaining
    url: http://auth:9999/
    routes:
      - name: auth-v1-remaining
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 60       # 60 requests per minute per user
          hour: 1000       # 1000 requests per hour per user
          fallback_by_ip: true
          fallback_limits:
            minute: 100    # 100 requests per minute per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false
```

**Note on Route Precedence:** Kong matches routes in order of specificity. More specific paths like `/auth/v1/signup` will match before the catch-all `/auth/v1/` route.

#### 3.2.2 Edge Functions Routes

```yaml
services:
  # Tier 2: Content-based rate limiting (OTP verification)
  - name: functions-v1-verify-otp-securely
    url: http://functions:9000/verify-otp-securely
    routes:
      - name: functions-v1-verify-otp-securely
        strip_path: true
        paths:
          - /functions/v1/verify-otp-securely
    plugins:
      - name: cors
      - name: rate-limit-db
        config:
          identifier_strategy: content
          content_identifier_fields: ["email"]
          content_identifier_type: email
          hour: 10         # 10 OTP verifications per hour per email
          day: 50          # 50 OTP verifications per day per email
          fallback_by_ip: true
          fallback_limits:
            hour: 50       # 50 OTP verifications per hour per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  # Tier 3: User-based rate limiting (authenticated functions)
  - name: functions-v1-authenticated
    url: http://functions:9000/
    routes:
      - name: functions-v1-authenticated
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 60       # 60 function calls per minute per user
          hour: 1000       # 1000 function calls per hour per user
          fallback_by_ip: true
          fallback_limits:
            minute: 100    # 100 function calls per minute per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false
```

**Note:** The `verify-otp-securely` route must come BEFORE the catch-all authenticated route.

#### 3.2.3 Storage Routes

```yaml
services:
  # Tier 1: IP-based rate limiting (public reads)
  - name: storage-v1-public-read
    url: http://storage:5000/object/public
    routes:
      - name: storage-v1-public-read
        strip_path: false
        paths:
          - /storage/v1/object/public/
        methods:
          - GET
    plugins:
      - name: cors
      - name: rate-limit-db
        config:
          identifier_strategy: ip
          minute: 200      # 200 downloads per minute per IP
          hour: 5000       # 5000 downloads per hour per IP
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  # Tier 3: User-based rate limiting (authenticated storage operations)
  - name: storage-v1-authenticated
    url: http://storage:5000/
    routes:
      - name: storage-v1-authenticated
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 20       # 20 storage operations per minute per user
          hour: 500        # 500 storage operations per hour per user
          fallback_by_ip: true
          fallback_limits:
            minute: 50     # 50 storage operations per minute per IP (fallback)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false
```

**Note:** Storage manages its own authentication, so we don't apply key-auth plugin here.

#### 3.2.4 REST API Routes

```yaml
services:
  # Tier 3: User-based rate limiting (authenticated REST operations)
  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: true
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 100      # 100 REST operations per minute per user
          hour: 5000       # 5000 REST operations per hour per user
          fallback_by_ip: true
          fallback_limits:
            minute: 100    # 100 REST operations per minute per IP (fallback for anon)
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false
```

**Note:** We keep this as a single route since REST operations are already behind authentication and RLS policies provide fine-grained access control.

#### 3.2.5 Realtime Routes (Unchanged)

```yaml
services:
  # Tier 3: User-based rate limiting
  - name: realtime-v1-ws
    url: http://realtime-dev.supabase-realtime:4000/socket
    protocol: ws
    routes:
      - name: realtime-v1-ws
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 10       # 10 WS connections per minute per user
          hour: 100        # 100 WS connections per hour per user
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false

  - name: realtime-v1-rest
    url: http://realtime-dev.supabase-realtime:4000/api
    protocol: http
    routes:
      - name: realtime-v1-rest
        strip_path: true
        paths:
          - /realtime/v1/api
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
      - name: rate-limit-db
        config:
          identifier_strategy: user
          minute: 60       # 60 realtime API calls per minute per user
          hour: 1000       # 1000 realtime API calls per hour per user
          db_host: db
          db_port: 5432
          db_name: postgres
          db_user: supabase_admin
          db_password: $POSTGRES_PASSWORD
          hide_client_headers: false
```

### 3.3 Handling Existing Global Plugin

**Recommendation:** Remove the global `rate-limit-db` plugin after implementing per-route configuration.

```yaml
# REMOVE THIS AFTER TESTING:
# plugins:
#   - name: rate-limit-db
#     enabled: true
#     config:
#       minute: 5
#       hour: 100
#       day: 1000
#       ...
```

**Migration Strategy:**
1. Keep global plugin during development and testing
2. Once per-route configs are verified, disable global plugin: `enabled: false`
3. Test thoroughly to ensure no gaps in coverage
4. Remove global plugin configuration entirely once confident

---

## 4. Plugin Implementation Strategy

### 4.1 Plugin Architecture Decision

**Decision:** Refactor existing `rate-limit-db` plugin to support multiple identifier strategies.

**Rationale:**
- Single codebase for all three tiers
- Reuse existing database connection logic, escape functions, error handling
- Backward compatible: existing `identifier_strategy: user` (default) maintains current behavior
- Configurable per-route without code duplication

### 4.2 Plugin Configuration Schema Changes

**File:** `supabase/volumes/api/kong/plugins/rate-limit-db/schema.lua`

**New fields to add:**

```lua
-- Identifier strategy (determines which tier)
{ identifier_strategy = {
    type = "string",
    default = "user",
    one_of = { "user", "ip", "content" }
  }
},

-- Content-based identifier configuration
{ content_identifier_fields = {
    type = "array",
    elements = { type = "string" },
    default = {}
  }
},
{ content_identifier_type = {
    type = "string",
    default = "custom"
  }
},

-- Fallback configuration for content strategy
{ fallback_by_ip = {
    type = "boolean",
    default = false
  }
},
{ fallback_limits = {
    type = "record",
    fields = {
      { second = { type = "number", gt = 0 }, },
      { minute = { type = "number", gt = 0 }, },
      { hour = { type = "number", gt = 0 }, },
      { day = { type = "number", gt = 0 }, },
    },
    default = {}
  }
},
```

**Full updated schema:**

```lua
local typedefs = require "kong.db.schema.typedefs"

return {
  name = "rate-limit-db",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          -- Time window limits (primary limits)
          { second = { type = "number", gt = 0 }, },
          { minute = { type = "number", gt = 0 }, },
          { hour = { type = "number", gt = 0 }, },
          { day = { type = "number", gt = 0 }, },

          -- Database configuration
          { db_host = { type = "string", default = "db" }, },
          { db_port = { type = "number", default = 5432 }, },
          { db_name = { type = "string", default = "postgres" }, },
          { db_user = { type = "string", default = "supabase_admin" }, },
          { db_password = { type = "string", required = true }, },

          -- Identifier strategy (NEW)
          { identifier_strategy = {
              type = "string",
              default = "user",
              one_of = { "user", "ip", "content" }
            }
          },

          -- Content-based identifier configuration (NEW)
          { content_identifier_fields = {
              type = "array",
              elements = { type = "string" },
              default = {}
            }
          },
          { content_identifier_type = {
              type = "string",
              default = "custom"
            }
          },

          -- Fallback configuration (NEW)
          { fallback_by_ip = {
              type = "boolean",
              default = false
            }
          },
          { fallback_limits = {
              type = "record",
              fields = {
                { second = { type = "number", gt = 0 }, },
                { minute = { type = "number", gt = 0 }, },
                { hour = { type = "number", gt = 0 }, },
                { day = { type = "number", gt = 0 }, },
              },
              default = {}
            }
          },

          -- Legacy configuration (keep for backward compatibility)
          { limit_anonymous_by_ip = { type = "boolean", default = true }, },
          { limit_authenticated_by_user = { type = "boolean", default = true }, },

          -- Response configuration
          { hide_client_headers = { type = "boolean", default = false }, },
          { error_code = { type = "number", default = 429 }, },
          { error_message = { type = "string", default = "Rate limit exceeded" }, },
        },
        custom_validator = function(config)
          -- At least one time window must be configured (primary or fallback)
          local has_primary = config.second or config.minute or config.hour or config.day
          local has_fallback = config.fallback_limits and (
            config.fallback_limits.second or
            config.fallback_limits.minute or
            config.fallback_limits.hour or
            config.fallback_limits.day
          )

          if not (has_primary or has_fallback) then
            return false, "at least one limit (second, minute, hour, day) must be configured in primary or fallback_limits"
          end

          -- If content strategy, content_identifier_fields must be set
          if config.identifier_strategy == "content" and #config.content_identifier_fields == 0 then
            return false, "content_identifier_fields must be specified when identifier_strategy is 'content'"
          end

          return true
        end,
      },
    },
  },
}
```

### 4.3 Plugin Handler Logic Changes

**File:** `supabase/volumes/api/kong/plugins/rate-limit-db/handler.lua`

**New functions to add:**

```lua
local function get_request_body()
  -- Read request body (only works in access phase before proxying)
  local body, err = kong.request.get_body()
  if not body then
    kong.log.debug("[rate-limit-db] Failed to get request body: ", err)
    return nil
  end
  return body
end

local function extract_content_identifier(conf)
  -- Extract identifier from request body based on configured fields
  local body = get_request_body()

  if not body then
    kong.log.debug("[rate-limit-db] No request body available for content-based rate limiting")
    return nil
  end

  -- Try each configured field in order
  for _, field in ipairs(conf.content_identifier_fields) do
    local value = body[field]
    if value and type(value) == "string" and value ~= "" then
      kong.log.debug("[rate-limit-db] Extracted content identifier from field '", field, "': ", value)
      return value
    end
  end

  kong.log.debug("[rate-limit-db] No content identifier found in body fields: ", table.concat(conf.content_identifier_fields, ", "))
  return nil
end
```

**Modified `access` function:**

```lua
function RateLimitHandler:access(conf)
  kong.log.info("[rate-limit-db] Access phase - strategy: ", conf.identifier_strategy)

  -- Check if service role (bypass rate limiting)
  local api_key = kong.request.get_header("apikey")
  local service_role_key = os.getenv("SUPABASE_SERVICE_KEY")

  if api_key == service_role_key then
    kong.log.debug("[rate-limit-db] Service role detected - bypassing rate limit")
    return
  end

  -- Connect to database
  local pg, err = connect_to_db(conf)
  if not pg then
    -- Fail open: allow request if DB connection fails
    kong.log.err("[rate-limit-db] Database connection failed, allowing request: ", err)
    return
  end

  local endpoint = kong.request.get_path()
  local identifier, identifier_type

  -- Determine identifier based on strategy
  if conf.identifier_strategy == "user" then
    -- Tier 3: User-based (existing logic)
    identifier = get_user_id_from_jwt()
    identifier_type = "user"

    if not identifier then
      kong.log.debug("[rate-limit-db] No user ID found, rate limiting not applied")
      pg:keepalive()
      return
    end

  elseif conf.identifier_strategy == "ip" then
    -- Tier 1: IP-based
    identifier = get_client_ip()
    identifier_type = "ip"

  elseif conf.identifier_strategy == "content" then
    -- Tier 2: Content-based
    identifier = extract_content_identifier(conf)
    identifier_type = conf.content_identifier_type

    if not identifier and conf.fallback_by_ip then
      -- Fallback to IP if content identifier not found
      kong.log.debug("[rate-limit-db] Content identifier not found, falling back to IP")
      identifier = get_client_ip()
      identifier_type = "ip"
    end

    if not identifier then
      kong.log.warn("[rate-limit-db] No identifier found for content-based rate limiting and no fallback configured")
      pg:keepalive()
      return
    end
  end

  kong.log.info("[rate-limit-db] Rate limit check - Strategy: ", conf.identifier_strategy,
                " Type: ", identifier_type, " Identifier: ", identifier, " Endpoint: ", endpoint)

  -- Determine which limits to use (primary or fallback)
  local limits
  if conf.identifier_strategy == "content" and identifier_type == "ip" and conf.fallback_by_ip then
    -- Use fallback limits for IP when content identifier not found
    limits = {
      second = conf.fallback_limits.second,
      minute = conf.fallback_limits.minute,
      hour = conf.fallback_limits.hour,
      day = conf.fallback_limits.day,
    }
    kong.log.debug("[rate-limit-db] Using fallback limits for IP")
  else
    -- Use primary limits
    limits = {
      second = conf.second,
      minute = conf.minute,
      hour = conf.hour,
      day = conf.day,
    }
    kong.log.debug("[rate-limit-db] Using primary limits")
  end

  -- Check rate limit
  local result, err = check_rate_limit(pg, identifier, identifier_type, endpoint, limits)

  if not result then
    kong.log.err("[rate-limit-db] Rate limit check failed: ", err)
    -- Fail open
    pg:keepalive()
    return
  end

  set_rate_limit_headers(conf, result)

  if not result.allowed then
    pg:keepalive()

    local retry_after = "60"
    if result.reset_at then
      local reset_time = ngx.parse_http_time(result.reset_at)
      if reset_time then
        retry_after = tostring(math.max(1, reset_time - ngx.time()))
      end
    end

    kong.response.set_header("Retry-After", retry_after)

    kong.log.warn("[rate-limit-db] BLOCKED - Rate limit exceeded: ", identifier_type, "=", identifier, " on ", endpoint)

    return kong.response.exit(conf.error_code, {
      message = conf.error_message,
      identifier_type = identifier_type,
      limit_hit = result.limit_hit,
      retry_after = tonumber(retry_after),
    })
  end

  -- Close database connection
  pg:keepalive()

  kong.log.debug("[rate-limit-db] Rate limit check passed")
end
```

### 4.4 Code Structure Summary

**Files to modify:**
1. `schema.lua` - Add new configuration fields
2. `handler.lua` - Add content extraction logic, refactor access phase

**New functions:**
- `get_request_body()` - Read POST body using `kong.request.get_body()`
- `extract_content_identifier(conf)` - Extract identifier from body based on configured fields

**Modified functions:**
- `access(conf)` - Refactor to support three strategies with unified logic

**Unchanged:**
- `connect_to_db()` - Database connection logic
- `get_user_id_from_jwt()` - JWT parsing logic (used by user strategy)
- `get_client_ip()` - IP extraction logic (used by ip strategy and fallback)
- `check_rate_limit()` - Database query logic
- `set_rate_limit_headers()` - Response header logic

**Error Handling:**
- Fail open: If DB connection fails or body parsing fails, allow request
- Graceful fallback: If content identifier not found and fallback configured, use IP

---

## 5. Database Schema Changes

### 5.1 Current Schema Analysis

**File:** `supabase/migrations/20251112000000_create_rate_limiting.sql`

**Current `rate_limits` table:**

```sql
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifier (user ID or IP address)
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('user', 'ip')),

  -- Endpoint being tracked
  endpoint text NOT NULL,

  -- Counters for different time windows
  count_per_second integer DEFAULT 0,
  count_per_minute integer DEFAULT 0,
  count_per_hour integer DEFAULT 0,
  count_per_day integer DEFAULT 0,

  -- Window reset timestamps
  reset_second timestamp with time zone DEFAULT now(),
  reset_minute timestamp with time zone DEFAULT now(),
  reset_hour timestamp with time zone DEFAULT now(),
  reset_day timestamp with time zone DEFAULT now(),

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Unique constraint: one row per identifier+endpoint combination
  UNIQUE(identifier, identifier_type, endpoint)
);
```

### 5.2 Required Changes

**Change:** Update `identifier_type` CHECK constraint to support additional types.

**Current constraint:**
```sql
CHECK (identifier_type IN ('user', 'ip'))
```

**New constraint:**
```sql
CHECK (identifier_type IN ('user', 'ip', 'email', 'username', 'token', 'custom'))
```

**Rationale:**
- `email` - For email-based rate limiting (signup, login, password reset)
- `username` - For username-based rate limiting (if needed)
- `token` - For token-based rate limiting (if needed)
- `custom` - For any other custom identifier type

### 5.3 Migration Script

**File:** `supabase/migrations/20251112000001_update_rate_limiting_identifier_types.sql`

```sql
-- Migration: Update rate limiting identifier types
-- Date: 2025-11-12

-- Drop the existing CHECK constraint
ALTER TABLE public.rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_identifier_type_check;

-- Add new CHECK constraint with additional identifier types
ALTER TABLE public.rate_limits
  ADD CONSTRAINT rate_limits_identifier_type_check
  CHECK (identifier_type IN ('user', 'ip', 'email', 'username', 'token', 'custom'));

-- No data migration needed - existing 'user' and 'ip' values remain valid
```

**Note:** This is a non-breaking change. Existing data with `identifier_type` of 'user' or 'ip' remains valid.

### 5.4 Database Schema Decision

**Decision:** Use the same `rate_limits` table for all three tiers.

**Rationale:**
1. **Unified tracking:** All rate limits share the same structure (identifier + endpoint + time windows)
2. **Simplified queries:** Same `check_rate_limit()` function works for all tiers
3. **Index efficiency:** Same indexes cover all use cases
4. **No data duplication:** Single source of truth for rate limit state
5. **Easy cleanup:** Single `cleanup_old_rate_limits()` function

**Alternative considered:** Separate tables per tier (e.g., `rate_limits_user`, `rate_limits_ip`, `rate_limits_content`)

**Why rejected:**
- Code duplication (3x the functions, 3x the indexes)
- More complex cleanup logic
- Harder to maintain consistency
- No performance benefit (identifier_type is indexed)

---

## 6. Testing & Validation Plan

### 6.1 Test Environment Setup

**Prerequisites:**
1. Supabase backend running (`cd supabase && docker compose up`)
2. Kong log level set to `debug` for detailed logging
3. Access to PostgreSQL to inspect `rate_limits` table
4. Valid JWT tokens for authenticated requests

**Helpful commands:**

```bash
# Watch Kong logs
docker compose logs -f kong

# Watch PostgreSQL rate_limits table
docker compose exec db psql -U supabase_admin -d postgres -c "SELECT * FROM public.rate_limits ORDER BY updated_at DESC LIMIT 10;"

# Generate JWT token for testing (save to /tmp/generate_jwt.js)
node /tmp/generate_jwt.js
```

### 6.2 Tier 1: IP-Based Rate Limiting Tests

#### Test 1.1: OAuth Authorize - IP Rate Limiting

**Endpoint:** `GET /auth/v1/authorize`

**Expected Limits:** 100/minute per IP

**Test Commands:**

```bash
# Test 1: Single request (should succeed)
curl -v "http://localhost:8000/auth/v1/authorize?provider=github" \
  -H "CF-Connecting-IP: 192.168.1.100"

# Expected: 200 OK
# Expected headers: X-RateLimit-Limit-Minute: 100, X-RateLimit-Remaining-Minute: 99

# Test 2: Burst of 101 requests from same IP (last should be rate limited)
for i in {1..101}; do
  curl -s "http://localhost:8000/auth/v1/authorize?provider=github" \
    -H "CF-Connecting-IP: 192.168.1.100" \
    -o /dev/null -w "Request $i: %{http_code}\n"
done

# Expected: First 100 return 200, request 101 returns 429
# Expected on 429: Retry-After header present

# Test 3: Different IP should not be rate limited
curl -v "http://localhost:8000/auth/v1/authorize?provider=github" \
  -H "CF-Connecting-IP: 192.168.1.101"

# Expected: 200 OK
```

#### Test 1.2: Public Storage Read - IP Rate Limiting

**Endpoint:** `GET /storage/v1/object/public/avatars/test.jpg`

**Expected Limits:** 200/minute per IP

**Test Commands:**

```bash
# Test 1: Single request (should succeed)
curl -v "http://localhost:8000/storage/v1/object/public/avatars/test.jpg" \
  -H "CF-Connecting-IP: 192.168.1.200"

# Expected: 200 OK (or 404 if file doesn't exist)
# Expected headers: X-RateLimit-Limit-Minute: 200

# Test 2: Burst of 201 requests from same IP
for i in {1..201}; do
  curl -s "http://localhost:8000/storage/v1/object/public/avatars/test.jpg" \
    -H "CF-Connecting-IP: 192.168.1.200" \
    -o /dev/null -w "Request $i: %{http_code}\n"
done

# Expected: First 200 succeed, request 201 returns 429
```

### 6.3 Tier 2: Content-Based Rate Limiting Tests

#### Test 2.1: Signup - Email Rate Limiting

**Endpoint:** `POST /auth/v1/signup`

**Expected Limits:** 5/hour per email, 50/hour per IP (fallback)

**Test Commands:**

```bash
# Test 1: Single signup with email (should succeed)
curl -v -X POST "http://localhost:8000/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.10" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Expected: 200 OK
# Expected headers: X-RateLimit-Limit-Hour: 5

# Test 2: 6 signups with same email from different IPs (6th should be rate limited)
for i in {1..6}; do
  curl -s -X POST "http://localhost:8000/auth/v1/signup" \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: 192.168.1.$i" \
    -d '{"email": "test@example.com", "password": "password123"}' \
    -w "Signup $i: %{http_code}\n"
done

# Expected: First 5 return 200, signup 6 returns 429
# This proves email-based rate limiting works across different IPs

# Test 3: Signup with different email from same IP should succeed
curl -v -X POST "http://localhost:8000/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.10" \
  -d '{"email": "different@example.com", "password": "password123"}'

# Expected: 200 OK (different email, not rate limited)

# Test 4: Request without email field should fall back to IP
curl -v -X POST "http://localhost:8000/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.20" \
  -d '{"password": "password123"}'

# Expected: 400 Bad Request (missing email), but should still track IP rate limit
# Check rate_limits table for IP-based entry
```

#### Test 2.2: Login - Email Rate Limiting

**Endpoint:** `POST /auth/v1/token?grant_type=password`

**Expected Limits:** 10/hour per email, 50/hour per IP (fallback)

**Test Commands:**

```bash
# Test 1: Single login attempt (should succeed or fail auth, but not rate limited)
curl -v -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.30" \
  -d '{"email": "attacker@example.com", "password": "wrongpassword"}'

# Expected: 400 Bad Request (invalid credentials), NOT 429
# Expected headers: X-RateLimit-Limit-Hour: 10

# Test 2: 11 login attempts with same email (brute force attack simulation)
for i in {1..11}; do
  curl -s -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: 192.168.1.$i" \
    -d '{"email": "attacker@example.com", "password": "wrongpassword"}' \
    -w "Login attempt $i: %{http_code}\n"
done

# Expected: First 10 return 400 (bad credentials), attempt 11 returns 429 (rate limited)
# This proves we're protecting against credential stuffing attacks

# Test 3: Login with different email from same IP should succeed
curl -v -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.30" \
  -d '{"email": "legitimate@example.com", "password": "password123"}'

# Expected: 400 (bad credentials) or 200 (if account exists), NOT 429
```

#### Test 2.3: OTP Verification - Email Rate Limiting

**Endpoint:** `POST /functions/v1/verify-otp-securely`

**Expected Limits:** 10/hour per email, 50/hour per IP (fallback)

**Test Commands:**

```bash
# Test 1: Single OTP verification (should succeed or fail, but not rate limited)
curl -v -X POST "http://localhost:8000/functions/v1/verify-otp-securely" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.40" \
  -d '{
    "req_type": "signup",
    "email": "otp-test@example.com",
    "token": "123456",
    "captchaToken": "fake-turnstile-token"
  }'

# Expected: 400 or 403 (invalid token/captcha), NOT 429
# Expected headers: X-RateLimit-Limit-Hour: 10

# Test 2: 11 OTP verifications with same email (OTP brute force simulation)
for i in {1..11}; do
  curl -s -X POST "http://localhost:8000/functions/v1/verify-otp-securely" \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: 192.168.1.$i" \
    -d '{
      "req_type": "signup",
      "email": "otp-test@example.com",
      "token": "123456",
      "captchaToken": "fake-turnstile-token"
    }' \
    -w "OTP attempt $i: %{http_code}\n"
done

# Expected: First 10 return 400/403, attempt 11 returns 429
# This is CRITICAL - closes the service_role bypass vulnerability

# Test 3: OTP verification without email should fall back to IP
curl -v -X POST "http://localhost:8000/functions/v1/verify-otp-securely" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.40" \
  -d '{
    "req_type": "signup",
    "token": "123456",
    "captchaToken": "fake-turnstile-token"
  }'

# Expected: 400 (missing email), but should track IP rate limit
```

#### Test 2.4: Password Reset - Email Rate Limiting

**Endpoint:** `POST /auth/v1/recover`

**Expected Limits:** 3/hour per email, 30/hour per IP (fallback)

**Test Commands:**

```bash
# Test 1: Single password reset request (should succeed)
curl -v -X POST "http://localhost:8000/auth/v1/recover" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.50" \
  -d '{"email": "reset-test@example.com"}'

# Expected: 200 OK
# Expected headers: X-RateLimit-Limit-Hour: 3

# Test 2: 4 password reset requests with same email (account enumeration attack)
for i in {1..4}; do
  curl -s -X POST "http://localhost:8000/auth/v1/recover" \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: 192.168.1.$i" \
    -d '{"email": "reset-test@example.com"}' \
    -w "Reset attempt $i: %{http_code}\n"
done

# Expected: First 3 return 200, attempt 4 returns 429
# This prevents attackers from spamming password reset emails

# Test 3: Password reset with different email should succeed
curl -v -X POST "http://localhost:8000/auth/v1/recover" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.50" \
  -d '{"email": "different-reset@example.com"}'

# Expected: 200 OK (different email, not rate limited)
```

### 6.4 Tier 3: User-Based Rate Limiting Tests

#### Test 3.1: Authenticated REST Operations

**Endpoint:** `GET /rest/v1/profiles`

**Expected Limits:** 100/minute per user

**Test Commands:**

```bash
# Generate JWT token first (see 6.1)
JWT_TOKEN="eyJhbGc..."  # Replace with actual token

# Test 1: Single authenticated request (should succeed)
curl -v "http://localhost:8000/rest/v1/profiles?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: 200 OK
# Expected headers: X-RateLimit-Limit-Minute: 100

# Test 2: Burst of 101 requests with same user token
for i in {1..101}; do
  curl -s "http://localhost:8000/rest/v1/profiles?select=*" \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -o /dev/null -w "Request $i: %{http_code}\n"
done

# Expected: First 100 return 200, request 101 returns 429

# Test 3: Request with different user token should not be rate limited
JWT_TOKEN_2="eyJhbGc..."  # Different user
curl -v "http://localhost:8000/rest/v1/profiles?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN_2"

# Expected: 200 OK (different user, not rate limited)
```

#### Test 3.2: Authenticated Storage Operations

**Endpoint:** `POST /storage/v1/object/avatars/test-upload.jpg`

**Expected Limits:** 20/minute per user

**Test Commands:**

```bash
JWT_TOKEN="eyJhbGc..."  # Replace with actual token

# Test 1: Single file upload (should succeed)
curl -v -X POST "http://localhost:8000/storage/v1/object/avatars/test-upload.jpg" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@test-image.jpg"

# Expected: 200 OK
# Expected headers: X-RateLimit-Limit-Minute: 20

# Test 2: Burst of 21 upload attempts
for i in {1..21}; do
  curl -s -X POST "http://localhost:8000/storage/v1/object/avatars/test-$i.jpg" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@test-image.jpg" \
    -o /dev/null -w "Upload $i: %{http_code}\n"
done

# Expected: First 20 succeed (or fail with RLS policy), upload 21 returns 429
```

#### Test 3.3: Authenticated User Operations

**Endpoint:** `GET /auth/v1/user`

**Expected Limits:** 100/minute per user

**Test Commands:**

```bash
JWT_TOKEN="eyJhbGc..."  # Replace with actual token

# Test 1: Single user fetch (should succeed)
curl -v "http://localhost:8000/auth/v1/user" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: 200 OK
# Expected headers: X-RateLimit-Limit-Minute: 100

# Test 2: Burst of 101 user fetch requests
for i in {1..101}; do
  curl -s "http://localhost:8000/auth/v1/user" \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -o /dev/null -w "User fetch $i: %{http_code}\n"
done

# Expected: First 100 return 200, request 101 returns 429
```

### 6.5 Service Role Bypass Tests

#### Test 5.1: Service Role Should Bypass Rate Limiting

**Purpose:** Verify service role key bypasses ALL rate limiting

**Test Commands:**

```bash
SERVICE_ROLE_KEY="eyJhbGc..."  # Replace with actual service_role key

# Test 1: Make 200 requests with service_role key (should all succeed)
for i in {1..200}; do
  curl -s "http://localhost:8000/rest/v1/profiles?select=*" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -o /dev/null -w "Service role request $i: %{http_code}\n"
done

# Expected: All 200 return 200, NONE return 429
# This proves service role bypasses rate limiting

# Test 2: Check database - should have NO entries for service role
docker compose exec db psql -U supabase_admin -d postgres -c \
  "SELECT * FROM public.rate_limits WHERE identifier LIKE '%service%';"

# Expected: 0 rows (service role not tracked)
```

### 6.6 Edge Case Tests

#### Test 6.1: Malformed Request Body

**Test:** Request with invalid JSON body

```bash
curl -v -X POST "http://localhost:8000/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.60" \
  -d 'invalid json'

# Expected: Should fall back to IP-based rate limiting (fail open behavior)
# Expected: 400 Bad Request (invalid JSON), NOT 500 Internal Server Error
```

#### Test 6.2: Missing Request Body

**Test:** POST request with no body

```bash
curl -v -X POST "http://localhost:8000/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.61"

# Expected: Should fall back to IP-based rate limiting
# Expected: 400 Bad Request (missing body), NOT 429 or 500
```

#### Test 6.3: Database Connection Failure

**Test:** Stop PostgreSQL and verify fail-open behavior

```bash
# Stop database
docker compose stop db

# Make request (should succeed due to fail-open)
curl -v "http://localhost:8000/rest/v1/profiles?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: Should proxy request (fail open), check Kong logs for DB error

# Restart database
docker compose start db
```

#### Test 6.4: Empty Email Field

**Test:** Request with empty string email

```bash
curl -v -X POST "http://localhost:8000/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 192.168.1.62" \
  -d '{"email": "", "password": "password123"}'

# Expected: Should fall back to IP-based rate limiting
# Expected: 400 Bad Request (invalid email)
```

### 6.7 Database Verification

After running tests, verify rate limit entries in database:

```bash
# View all rate limit entries
docker compose exec db psql -U supabase_admin -d postgres -c \
  "SELECT identifier_type, identifier, endpoint, count_per_minute, count_per_hour, reset_hour
   FROM public.rate_limits
   ORDER BY updated_at DESC
   LIMIT 20;"

# Expected output should show:
# - identifier_type: 'email', 'ip', 'user' based on tests
# - identifier: actual email addresses, IP addresses, user IDs
# - endpoint: various endpoints tested
# - count_per_*: counters incremented correctly

# View rate limit entries grouped by type
docker compose exec db psql -U supabase_admin -d postgres -c \
  "SELECT identifier_type, COUNT(*) as total_entries, SUM(count_per_hour) as total_requests
   FROM public.rate_limits
   GROUP BY identifier_type;"

# Expected: Counts for 'email', 'ip', 'user' based on tests run
```

### 6.8 Test Results Documentation Template

For each test, document results in this format:

```markdown
### Test [Number]: [Name]

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Local/Staging/Production]

**Test Steps:**
1. [Step 1]
2. [Step 2]
...

**Expected Result:**
[Description]

**Actual Result:**
[Description]

**Status:** ✅ PASS / ❌ FAIL

**Notes:**
[Any observations, issues, or deviations]

**Kong Logs:**
```
[Relevant log excerpts]
```

**Database State:**
```
[Relevant rate_limits table rows]
```
```

---

## 7. Implementation Task Breakdown

### Phase 1: Database Schema Update (Low Risk)

**Task 1.1: Create Migration**
- **File:** `supabase/migrations/20251112000001_update_rate_limiting_identifier_types.sql`
- **Work:** Add new identifier types to CHECK constraint
- **Estimated Time:** 15 minutes
- **Dependencies:** None
- **Risk:** Low (non-breaking change)

**Task 1.2: Apply Migration**
- **Command:** `cd supabase && supabase db push --debug --db-url "..."`
- **Verification:** Check constraint updated, existing data intact
- **Estimated Time:** 5 minutes
- **Dependencies:** Task 1.1
- **Risk:** Low (can rollback if needed)

**Deliverable:** Database schema supports email, username, token, custom identifier types

---

### Phase 2: Plugin Schema Update (Low Risk)

**Task 2.1: Update schema.lua**
- **File:** `supabase/volumes/api/kong/plugins/rate-limit-db/schema.lua`
- **Work:** Add new configuration fields (identifier_strategy, content_identifier_fields, etc.)
- **Estimated Time:** 30 minutes
- **Dependencies:** None
- **Risk:** Low (backward compatible, defaults maintain existing behavior)

**Task 2.2: Test Schema Validation**
- **Work:** Restart Kong, verify schema loads without errors
- **Command:** `cd supabase && docker compose restart kong`
- **Verification:** Kong starts successfully, logs show plugin loaded
- **Estimated Time:** 10 minutes
- **Dependencies:** Task 2.1
- **Risk:** Low (can revert schema.lua if issues)

**Deliverable:** Plugin schema supports three-tier configuration

---

### Phase 3: Plugin Handler Update (Medium Risk)

**Task 3.1: Add Request Body Parsing**
- **File:** `supabase/volumes/api/kong/plugins/rate-limit-db/handler.lua`
- **Work:** Implement `get_request_body()` and `extract_content_identifier()` functions
- **Estimated Time:** 45 minutes
- **Dependencies:** None
- **Risk:** Medium (body parsing can fail, must handle gracefully)

**Task 3.2: Refactor Access Phase**
- **File:** `supabase/volumes/api/kong/plugins/rate-limit-db/handler.lua`
- **Work:** Update `access()` function to support three strategies
- **Estimated Time:** 1.5 hours
- **Dependencies:** Task 3.1
- **Risk:** Medium (core plugin logic, must test thoroughly)

**Task 3.3: Add Fallback Logic**
- **File:** `supabase/volumes/api/kong/plugins/rate-limit-db/handler.lua`
- **Work:** Implement fallback to IP when content identifier not found
- **Estimated Time:** 30 minutes
- **Dependencies:** Task 3.2
- **Risk:** Low (enhances robustness)

**Task 3.4: Test Plugin Handler**
- **Work:** Restart Kong, verify plugin loads and logs correctly
- **Command:** `cd supabase && docker compose restart kong`
- **Verification:** Kong starts, no Lua errors in logs
- **Estimated Time:** 15 minutes
- **Dependencies:** Tasks 3.1, 3.2, 3.3
- **Risk:** Medium (can cause Kong to fail to start)

**Deliverable:** Plugin handler supports three-tier rate limiting with fallback

---

### Phase 4: Kong Routing Configuration (High Risk)

**Task 4.1: Backup Current kong.yml**
- **Command:** `cp supabase/volumes/api/kong.yml supabase/volumes/api/kong.yml.backup`
- **Estimated Time:** 1 minute
- **Dependencies:** None
- **Risk:** None (safety measure)

**Task 4.2: Refactor Auth Routes**
- **File:** `supabase/volumes/api/kong.yml`
- **Work:** Split `auth-v1-all` into specific routes (signup, token, recover, verify, resend, etc.)
- **Estimated Time:** 1 hour
- **Dependencies:** Phase 2, Phase 3
- **Risk:** High (can break auth flows if routes misconfigured)

**Task 4.3: Add Edge Functions Routes**
- **File:** `supabase/volumes/api/kong.yml`
- **Work:** Add specific route for `verify-otp-securely`, update catch-all route
- **Estimated Time:** 30 minutes
- **Dependencies:** Phase 2, Phase 3
- **Risk:** Medium (can break OTP verification)

**Task 4.4: Add Storage Routes**
- **File:** `supabase/volumes/api/kong.yml`
- **Work:** Split storage into public read vs authenticated operations
- **Estimated Time:** 30 minutes
- **Dependencies:** Phase 2, Phase 3
- **Risk:** Medium (can break storage uploads/downloads)

**Task 4.5: Update REST Routes**
- **File:** `supabase/volumes/api/kong.yml`
- **Work:** Update REST route configuration with rate limiting
- **Estimated Time:** 15 minutes
- **Dependencies:** Phase 2, Phase 3
- **Risk:** Low (REST already has catch-all route)

**Task 4.6: Disable Global Plugin**
- **File:** `supabase/volumes/api/kong.yml`
- **Work:** Set global `rate-limit-db` plugin to `enabled: false`
- **Estimated Time:** 2 minutes
- **Dependencies:** Tasks 4.2, 4.3, 4.4, 4.5
- **Risk:** Medium (must ensure per-route plugins cover all endpoints)

**Task 4.7: Apply Kong Configuration**
- **Command:** `cd supabase && docker compose restart kong`
- **Verification:** Kong starts, routes load correctly
- **Estimated Time:** 5 minutes
- **Dependencies:** Tasks 4.2-4.6
- **Risk:** High (can break entire API gateway)

**Deliverable:** Kong routing architecture implements three-tier rate limiting

---

### Phase 5: Testing & Validation (Critical)

**Task 5.1: Tier 1 Tests (IP-Based)**
- **Work:** Run all Tier 1 tests from Section 6.2
- **Estimated Time:** 1 hour
- **Dependencies:** Phase 4
- **Risk:** None (testing only)

**Task 5.2: Tier 2 Tests (Content-Based)**
- **Work:** Run all Tier 2 tests from Section 6.3
- **Estimated Time:** 2 hours
- **Dependencies:** Phase 4
- **Risk:** None (testing only)

**Task 5.3: Tier 3 Tests (User-Based)**
- **Work:** Run all Tier 3 tests from Section 6.4
- **Estimated Time:** 1 hour
- **Dependencies:** Phase 4
- **Risk:** None (testing only)

**Task 5.4: Service Role Bypass Tests**
- **Work:** Run service role bypass tests from Section 6.5
- **Estimated Time:** 30 minutes
- **Dependencies:** Phase 4
- **Risk:** None (testing only)

**Task 5.5: Edge Case Tests**
- **Work:** Run edge case tests from Section 6.6
- **Estimated Time:** 1 hour
- **Dependencies:** Phase 4
- **Risk:** None (testing only)

**Task 5.6: Database Verification**
- **Work:** Verify rate_limits table entries match expected patterns
- **Estimated Time:** 30 minutes
- **Dependencies:** Tasks 5.1-5.5
- **Risk:** None (verification only)

**Task 5.7: Document Test Results**
- **Work:** Create test results document with outcomes
- **Estimated Time:** 1 hour
- **Dependencies:** Tasks 5.1-5.6
- **Risk:** None (documentation only)

**Deliverable:** Comprehensive test results proving three-tier rate limiting works

---

### Phase 6: Production Tuning (Low Risk)

**Task 6.1: Adjust Rate Limits**
- **File:** `supabase/volumes/api/kong.yml`
- **Work:** Fine-tune rate limits based on test results and expected traffic
- **Estimated Time:** 30 minutes
- **Dependencies:** Phase 5
- **Risk:** Low (can always adjust)

**Task 6.2: Reduce Kong Log Level**
- **File:** `supabase/volumes/api/kong.yml` (or compose.yml)
- **Work:** Change Kong log level from `debug` to `info`
- **Estimated Time:** 5 minutes
- **Dependencies:** Phase 5
- **Risk:** None (just reduces log verbosity)

**Task 6.3: Remove Global Plugin**
- **File:** `supabase/volumes/api/kong.yml`
- **Work:** Delete global `rate-limit-db` plugin configuration entirely
- **Estimated Time:** 2 minutes
- **Dependencies:** Task 6.1
- **Risk:** Low (already disabled in Task 4.6)

**Task 6.4: Update Documentation**
- **Files:** `.context/backend.md`, `.context/CLAUDE.md`
- **Work:** Document three-tier rate limiting architecture, configuration patterns
- **Estimated Time:** 1 hour
- **Dependencies:** Phase 5
- **Risk:** None (documentation only)

**Deliverable:** Production-ready three-tier rate limiting system

---

### Total Estimated Time

- **Phase 1:** 20 minutes
- **Phase 2:** 40 minutes
- **Phase 3:** 3 hours
- **Phase 4:** 2.5 hours
- **Phase 5:** 6 hours
- **Phase 6:** 2 hours

**Total:** ~14 hours of focused work

**Recommended Schedule:**
- Day 1: Phases 1-3 (database, plugin code)
- Day 2: Phase 4 (Kong routing)
- Day 3: Phase 5 (testing)
- Day 4: Phase 6 (production tuning, documentation)

---

## 8. Risk Assessment

### 8.1 Technical Risks

#### Risk 1: Kong Fails to Start

**Probability:** Medium
**Impact:** Critical
**Scenario:** Invalid kong.yml syntax or Lua errors in plugin handler

**Mitigation:**
- Always backup kong.yml before changes
- Test Lua syntax with `luac -p handler.lua` before deploying
- Validate kong.yml syntax with Kong's declarative config validator
- Keep Kong logs open during changes to catch errors immediately
- Have rollback plan ready (restore from backup, restart Kong)

**Rollback:**
```bash
cp supabase/volumes/api/kong.yml.backup supabase/volumes/api/kong.yml
cd supabase && docker compose restart kong
```

#### Risk 2: Rate Limiting Breaks Auth Flows

**Probability:** Medium
**Impact:** High
**Scenario:** Legitimate users unable to signup/login due to overly strict limits

**Mitigation:**
- Start with generous limits during testing
- Monitor Kong logs for 429 responses
- Test with multiple real user scenarios (signup, login, password reset)
- Implement graceful error messages on frontend
- Have override mechanism (service role bypass already implemented)

**Rollback:**
```bash
# Temporarily disable rate limiting by removing plugin from routes
# OR increase limits in kong.yml and restart Kong
```

#### Risk 3: Request Body Parsing Fails

**Probability:** Low
**Impact:** Medium
**Scenario:** Plugin crashes on certain request body formats

**Mitigation:**
- Fail open: If body parsing fails, fall back to IP-based rate limiting
- Wrap body parsing in pcall() to catch Lua errors
- Test with various content types (JSON, form-data, empty body)
- Log parsing failures for debugging

**Example fail-safe code:**
```lua
local ok, body = pcall(kong.request.get_body)
if not ok or not body then
  kong.log.warn("[rate-limit-db] Body parsing failed, falling back to IP: ", body)
  -- Use IP-based rate limiting
end
```

#### Risk 4: Database Performance Degradation

**Probability:** Low
**Impact:** Medium
**Scenario:** High traffic causes rate_limits table to grow too large, slowing queries

**Mitigation:**
- Indexes already in place (identifier + identifier_type + endpoint)
- Cleanup function removes old entries (7 days)
- Monitor query performance with EXPLAIN ANALYZE
- Consider partitioning table by date if needed
- PostgreSQL connection pooling via pgmoon

**Monitoring:**
```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('public.rate_limits'));

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM check_rate_limit('test@example.com', 'email', '/auth/v1/signup', NULL, NULL, 5, NULL);
```

#### Risk 5: Route Precedence Issues

**Probability:** Medium
**Impact:** Medium
**Scenario:** Kong matches wrong route due to route precedence

**Mitigation:**
- List specific routes BEFORE catch-all routes in kong.yml
- Test each endpoint explicitly to verify correct route matches
- Use Kong's request logging to see which route was matched
- Document route precedence in kong.yml with comments

**Verification:**
```bash
# Check which route was matched (look for "route" in response headers or logs)
curl -v "http://localhost:8000/auth/v1/signup"
# Kong logs will show: [route] auth-v1-signup matched
```

### 8.2 Security Risks

#### Risk 6: Rate Limit Bypass

**Probability:** Low
**Impact:** Critical
**Scenario:** Attacker finds way to bypass rate limiting

**Attack Vectors:**
- Service role key leaked (bypass built into plugin)
- IP spoofing (Cloudflare headers forged)
- Request body manipulation (empty fields, nested objects)
- Multiple accounts to bypass user-based limits

**Mitigation:**
- Never expose service role key
- Trust only Cloudflare-set headers (CF-Connecting-IP)
- Validate request body structure before extraction
- Implement account-level detection (future: track by device fingerprint)
- Monitor for anomalous patterns (many accounts from same IP)

#### Risk 7: Denial of Service via Database

**Probability:** Low
**Impact:** High
**Scenario:** Attacker spams endpoints to fill rate_limits table

**Mitigation:**
- Fail open if DB connection fails (attacker can't DOS DB to bypass limits)
- Cleanup function removes old entries
- Database resource limits (max connections, statement timeout)
- Monitor database size and query performance

#### Risk 8: Account Enumeration

**Probability:** Medium
**Impact:** Medium
**Scenario:** Attacker uses rate limiting response times to enumerate accounts

**Mitigation:**
- Always return same response time whether account exists or not
- Rate limit by email/username regardless of account existence
- Don't reveal why rate limit was hit (don't say "email exists")
- Generic error messages: "Rate limit exceeded"

### 8.3 Operational Risks

#### Risk 9: False Positives

**Probability:** Medium
**Impact:** Medium
**Scenario:** Legitimate users rate limited due to shared IPs (NAT, corporate networks)

**Mitigation:**
- Use content-based rate limiting for auth flows (not IP-only)
- Set generous IP-based fallback limits
- Monitor 429 response rates
- Provide clear error messages with retry time
- Implement exponential backoff on frontend

**Example error message:**
```json
{
  "message": "Too many requests. Please try again in 5 minutes.",
  "retry_after": 300,
  "limit_hit": "hour"
}
```

#### Risk 10: Configuration Drift

**Probability:** Medium
**Impact:** Low
**Scenario:** Local and production configs diverge, causing unexpected behavior

**Mitigation:**
- Store kong.yml in version control
- Use environment variables for sensitive values ($POSTGRES_PASSWORD)
- Document all configuration changes in git commits
- Test configuration changes locally before production
- Use same Kong version in local and production

### 8.4 Risk Matrix

| Risk | Probability | Impact | Priority | Mitigation Status |
|------|-------------|--------|----------|-------------------|
| Kong Fails to Start | Medium | Critical | P0 | ✅ Backup + Rollback Plan |
| Rate Limiting Breaks Auth | Medium | High | P0 | ✅ Testing + Monitoring |
| Request Body Parsing Fails | Low | Medium | P1 | ✅ Fail-Open Design |
| Database Performance | Low | Medium | P1 | ✅ Indexes + Cleanup |
| Route Precedence Issues | Medium | Medium | P1 | ✅ Testing + Documentation |
| Rate Limit Bypass | Low | Critical | P0 | ✅ Security Review |
| DoS via Database | Low | High | P1 | ✅ Fail-Open + Limits |
| Account Enumeration | Medium | Medium | P1 | ✅ Consistent Timing |
| False Positives | Medium | Medium | P2 | ✅ Content-Based Limits |
| Configuration Drift | Medium | Low | P2 | ✅ Version Control |

**Priority Definitions:**
- **P0 (Critical):** Must be addressed before production deployment
- **P1 (High):** Should be addressed during implementation
- **P2 (Medium):** Can be addressed post-deployment with monitoring

---

## 9. Open Questions & Decisions Needed

### Question 1: Production Rate Limits

**Context:** The limits proposed in this document are starting points.

**Question:** What are the expected traffic patterns for production?

**Need to determine:**
- Average authenticated users per day
- Peak concurrent users
- Average API requests per user per minute
- Expected signup/login rate

**Recommendation:** Start with proposed limits, monitor for 1 week, adjust based on real data.

### Question 2: Cloudflare Turnstile Verification

**Context:** Current implementation uses test Turnstile key.

**Question:** Should we implement Turnstile verification for all Tier 2 endpoints, or only signup/login?

**Options:**
1. Only signup/login (less friction, still secure)
2. All Tier 2 endpoints (maximum security, more user friction)

**Current implementation:** Turnstile only on signup, login, password reset, OTP verification

**Recommendation:** Keep current implementation (Turnstile on auth flows only).

### Question 3: Rate Limit Storage Duration

**Context:** Cleanup function removes entries older than 7 days.

**Question:** Is 7 days appropriate, or should we keep rate limit history longer for analytics?

**Trade-offs:**
- Longer retention = Better analytics, larger database
- Shorter retention = Smaller database, faster queries

**Recommendation:** Keep 7 days for rate limiting, export to analytics DB if needed for long-term analysis.

### Question 4: Monitoring & Alerting

**Context:** This design doesn't include monitoring/alerting infrastructure.

**Question:** What monitoring do we want for rate limiting?

**Potential metrics:**
- 429 response rate by endpoint
- Top rate-limited IPs/users
- Rate limit table size
- Database query performance

**Recommendation:** Add monitoring in separate phase after deployment.

---

## 10. Conclusion & Next Steps

### Summary

This architecture design provides a comprehensive three-tier rate limiting system for CritiQit's self-hosted Supabase backend:

1. **Tier 1 (IP-Based):** Protects public endpoints from DoS attacks
2. **Tier 2 (Content-Based):** Prevents credential attacks and account enumeration
3. **Tier 3 (User-Based):** Prevents API abuse from authenticated users

**Key architectural decisions:**
- Refactor existing `rate-limit-db` plugin (not create 3 separate plugins)
- Single PostgreSQL table for all tiers (no schema split)
- Fail-open design (availability over strict enforcement)
- Service role bypass preserved (critical for internal operations)

**Critical security issue addressed:**
- Content-based rate limiting on Edge Functions closes service_role bypass vulnerability

### Approval Required

Before implementation, need approval on:
1. Overall three-tier architecture approach
2. Proposed rate limits (can be adjusted during testing)
3. Kong routing structure (split broad routes into specific routes)
4. Plugin refactoring strategy (single plugin vs multiple plugins)
5. Database schema changes (additional identifier types)
6. Testing plan scope and duration

### Next Steps After Approval

1. **Backend-dev:** Implement database migration + plugin code changes (Phases 1-3)
2. **Backend-dev:** Implement Kong routing changes (Phase 4)
3. **Full-stack-integrator:** Coordinate testing across all tiers (Phase 5)
4. **Backend-dev:** Production tuning and documentation (Phase 6)
5. **Frontend-dev:** Update error handling to gracefully display 429 errors with retry time

### Success Criteria

This implementation will be considered successful when:
- ✅ All three tiers enforce rate limits correctly
- ✅ Service role key bypasses all rate limiting
- ✅ Content-based rate limiting prevents email enumeration attacks
- ✅ OTP verification rate limiting closes service_role bypass vulnerability
- ✅ False positive rate is acceptable (< 1% of legitimate requests)
- ✅ Database query performance is acceptable (< 10ms per rate check)
- ✅ Kong routing precedence works correctly (no wrong-route matches)
- ✅ Fail-open behavior works (DB failures don't break API)
- ✅ Comprehensive documentation enables future maintenance

---

**Document Status:** READY FOR REVIEW
**Awaiting:** User approval to proceed with implementation
**Estimated Implementation Time:** 14 hours over 4 days
