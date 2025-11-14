# Security Exceptions (Debug/Development Only)

Issues deferred for production but needed for development.

**⚠️ CRITICAL: THESE MUST BE RESOLVED BEFORE PRODUCTION DEPLOYMENT**

This file tracks security vulnerabilities that are temporarily acceptable in the development environment but MUST be fixed before deploying to production.

---

## Active Exceptions

*No active exceptions yet*

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
