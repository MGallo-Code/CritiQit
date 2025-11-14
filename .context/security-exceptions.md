# Security Exceptions (Debug/Development Only)

Issues deferred for production but needed for development.

**⚠️ CRITICAL: THESE MUST BE RESOLVED BEFORE PRODUCTION DEPLOYMENT**

This file tracks security vulnerabilities that are temporarily acceptable in the development environment but MUST be fixed before deploying to production.

---

## Active Exceptions

### [CRITICAL] Production Secrets in Development Environment

- **Date Added:** 2025-11-14
- **Finding ID:** CRITICAL-1
- **Justification:** Development environment needs working credentials for testing. These are development/sandbox credentials, not production credentials.
- **Files:**
  - `supabase/.env` (OpenAI API key, AWS SES credentials, Google OAuth secret)
  - `frontend/.env.local` (Supabase keys)
- **Description:** Real API credentials present in development .env files for OpenAI, AWS SES, and Google OAuth.
- **Attack Vector:** Laptop compromise, backup exposure, or accidental git commit could expose credentials leading to unauthorized API usage, email spam, and OAuth flow hijacking.
- **Fix Required Before Production:**
  1. Create separate production credentials (different from dev)
  2. Use platform-managed secrets (Docker secrets, Kubernetes secrets, or cloud provider secret manager)
  3. Rotate all credentials used in development
  4. Create `.env.example` files with placeholders
  5. Document secret management process in README
- **Status:** Active

---

### [CRITICAL] PostgreSQL Port Exposed to All Network Interfaces

- **Date Added:** 2025-11-14
- **Finding ID:** CRITICAL-2
- **Justification:** May be needed temporarily for debugging database connections from external tools (TablePlus, pgAdmin, etc.)
- **File:** `supabase/compose.yml:507-508`
- **Description:** PostgreSQL database exposed on port 5432 to 0.0.0.0 (all network interfaces) via Supavisor pooler, allowing external access to database.
- **Attack Vector:** Attacker on same network or internet (if deployed without firewall) can directly connect to PostgreSQL, bypassing all API security layers (RLS, Kong, rate limiting).
- **Fix Required Before Production:**
  1. Bind PostgreSQL to localhost only: `127.0.0.1:5432:5432` in compose.yml
  2. Or: Update `.env` with `POSTGRES_PORT=127.0.0.1:5432`
  3. Verify no external connections possible
  4. Document that DB access requires SSH tunnel or Docker exec
  5. **NOTE:** User explicitly requested to shelf this for potential debugging use
- **Status:** Active

---

### [CRITICAL] Cloudflare Turnstile Test Key in Use

- **Date Added:** 2025-11-14
- **Finding ID:** CRITICAL-3
- **Justification:** Test key allows development without captcha friction. Intentional for local development.
- **Files:**
  - `supabase/.env:103` (SECURITY_CAPTCHA_SECRET)
  - `frontend/.env.local:11` (NEXT_PUBLIC_TURNSTILE_SITE_KEY)
- **Description:** Turnstile configured with test key `1x00000000000000000000AA` which always passes, effectively disabling captcha protection.
- **Attack Vector:** Bots can bypass captcha checks, create unlimited accounts, spam signups despite rate limiting, and automate abuse of all protected endpoints.
- **Fix Required Before Production:**
  1. Uncomment production Turnstile keys in both .env files
  2. Remove or comment out test keys
  3. Add environment validation on startup (fail if test key detected in production)
  4. Test captcha flow in staging environment before production
- **Status:** Active

---

### [HIGH] Database Password in Docker Environment Variables

- **Date Added:** 2025-11-14
- **Finding ID:** HIGH-1
- **Justification:** Acceptable for development. PostgreSQL password needs to be accessible to multiple containers for self-hosted Supabase setup.
- **File:** `supabase/.env:6`
- **Description:** PostgreSQL password stored in plaintext in .env file and passed to 10+ containers via environment variables.
- **Attack Vector:** Docker host compromise, docker inspect, or accidental logging exposes password allowing full database admin access.
- **Fix Required Before Production:**
  1. Use Docker secrets (docker secret create) or external secret manager
  2. Rotate database password to strong random value
  3. Consider certificate-based authentication
  4. Limit password visibility to necessary containers only
- **Status:** Active

---

### [HIGH] JWT Secret Exposure Risk

- **Date Added:** 2025-11-14
- **Finding ID:** HIGH-2
- **Justification:** Acceptable for development. JWT secret needs to be shared across Supabase services for authentication.
- **File:** `supabase/.env:7`
- **Description:** JWT_SECRET used for signing authentication tokens stored in plaintext. Compromise allows complete authentication bypass and service_role token generation.
- **Attack Vector:** Attacker with JWT_SECRET can forge valid JWTs for any user, impersonate any user, bypass all auth checks, and generate service_role tokens (god mode).
- **Fix Required Before Production:**
  1. Generate new extremely strong JWT secret (64+ character random string)
  2. Store in secure secret manager
  3. Rotate JWT_SECRET periodically
  4. Monitor for unusual JWT patterns
  5. Ensure JWT expiry is short (currently 3600s = 1 hour, which is good)
- **Status:** Active

---

### [MEDIUM] Analytics Port Exposed to Host

- **Date Added:** 2025-11-14
- **Finding ID:** MEDIUM-1
- **Justification:** May be useful for accessing Logflare dashboard during development for monitoring and debugging.
- **File:** `supabase/compose.yml:370-371`
- **Description:** Supabase Analytics (Logflare) exposed on port 4000 to all network interfaces, potentially allowing unauthorized access to logs and metrics.
- **Attack Vector:** Logs may contain sensitive information (user IDs, errors). Attacker can analyze traffic patterns and user behavior for targeted attacks.
- **Fix Required Before Production:**
  1. Remove port exposure entirely (analytics should be internal-only)
  2. Access analytics only through Kong Gateway with authentication
  3. If direct access needed: bind to 127.0.0.1:4000
  4. Add authentication to analytics endpoint
- **Status:** Active

---

### [MEDIUM] SMTP Credentials in Environment File

- **Date Added:** 2025-11-14
- **Finding ID:** MEDIUM-2
- **Justification:** Acceptable for development. AWS SES credentials needed for testing email flows (signup, password reset, etc.)
- **File:** `supabase/.env:84-85`
- **Description:** AWS SES SMTP credentials (SMTP_USER, SMTP_PASS) stored in plaintext. Compromise allows unauthorized email sending from critiqit.io domain.
- **Attack Vector:** Email spam, phishing campaigns using your domain, AWS SES account suspension, reputation damage, and AWS billing charges.
- **Fix Required Before Production:**
  1. Rotate AWS SES credentials
  2. Use IAM roles instead of static credentials (if deployed to AWS)
  3. Store credentials in secret manager
  4. Monitor AWS SES sending metrics for anomalies
  5. Implement email sending limits and rate tracking
- **Status:** Active

<!-- Example format:
### [SEVERITY] Issue Title

- **Date Added:** YYYY-MM-DD
- **Justification:** Why this exception is needed for development
- **File:** path/to/file:line
- **Description:** Brief description of the vulnerability
- **Attack Vector:** How this could be exploited
- **Fix Required:** What needs to be done before production
- **Status:** Active / Resolved
- **Resolution Notes:** (when resolved) How it was fixed
-->

---

## Resolved Exceptions

*No resolved exceptions yet*

<!-- Resolved exceptions will be moved here for historical reference -->

---

## Reminders

**Before Production Deployment:**
1. Review all active exceptions
2. Verify each is truly resolved
3. Run `/audit` to confirm no critical issues remain
4. Update this file to mark exceptions as resolved
5. Document lessons learned

**Periodic Review:**
- Review this file weekly during active development
- Prioritize resolving Critical and High severity exceptions
- Consider if any exceptions can be resolved early
- Update justifications if circumstances change

---

## Usage

This file is automatically maintained by the `security-coordinator` agent when you run `/audit` and choose "Debug Exception" for a finding.

**When to use Debug Exception:**
- ✅ Port exposed to localhost for debugging
- ✅ Debug logging temporarily enabled
- ✅ Test secrets used instead of production secrets
- ✅ Container running as root for development tools
- ❌ NOT for critical vulnerabilities without strong justification

**Remember:** Debug exceptions are NOT a way to defer security work indefinitely. They are temporary accommodations for development workflows.
