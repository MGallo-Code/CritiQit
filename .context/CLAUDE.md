# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**
>
> **🤖 See [agents-guide.md](./agents-guide.md) for custom agent system documentation**

Last updated: 2025-11-12 23:00

---

## 🎯 Current Goals

1. **Security & Production Readiness**: Three-tier rate limiting implemented - test frontend integration and tune limits for production
2. **Development Workflow**: Test and refine the custom agent system with real feature implementations
3. **Code Quality**: Standardize error handling patterns across authentication flows
4. **Ongoing**: Document development patterns and maintain context for cross-session continuity

## 📋 Immediate Next Steps

- [ ] **High Priority**: Test frontend rate limit error handling in dev environment (verify countdown timer and form disabling)
- [ ] **High Priority**: Revert Kong log level from debug to info for production readiness
- [ ] **High Priority**: Test agent system with a real feature implementation (use full-stack-integrator)
- [ ] **Medium Priority**: Monitor rate limit hits during development to validate limits are appropriate
- [ ] **Medium Priority**: Create git commit for three-tier rate limiting implementation
- [ ] **Low Priority**: Add monitoring/alerting for 429 responses (Prometheus/Grafana)

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 3 (2025-11-12 23:00)**: Implemented production-ready three-tier rate limiting architecture. Refactored Kong plugin to support IP-based, content-based, and user-based strategies. Closed critical service_role bypass vulnerability with content-based rate limiting on Edge Functions. Applied per-route rate limits (signup: 5/hour, login: 10/hour, reset: 3/hour). Implemented frontend error handling with live countdown timers, form disabling, and dark mode support. System now prevents credential stuffing, brute force, account enumeration, and DoS attacks.

**Session 2**: Implemented initial Kong rate limiting with PostgreSQL backend. Upgraded from Kong 2.8.1 to 3.9, debugged plugin execution issues (required authentication for access phase), and verified enforcement working correctly with database tracking.

## 🚧 Known Issues & Blockers

- **Important**: Kong log level set to debug - must revert to info for production
- **Important**: Frontend rate limit error handling not tested in live dev environment yet
- **Important**: Using test Turnstile captcha key - must switch to production key before launch
- **Minor**: Rate limits are starting points - need to monitor real traffic and tune accordingly
- **Minor**: Cannot delete users who own storage objects - needs cascade deletion strategy

## ⚡ Important Notes for Next Session

- **Three-Tier Rate Limiting**: Kong plugin supports ip/content/user strategies with per-route configuration
- **Content-Based Strategy**: Extracts email/username/token from request body BEFORE proxy - closes service_role bypass
- **Frontend Error Handling**: Use parseAuthError() for direct calls (sync), parseEdgeFunctionError() for Edge Functions (async!)
- **FormError Component**: Automatically detects rate limits, shows countdown timer, supports dark mode
- **Testing Pattern**: Must test with proper authentication - key-auth runs first (priority 1003) before custom plugins
- New agent system available: Use /agents/full-stack-integrator for features spanning frontend and backend
- Agents use consultation-first pattern: specialists provide recommendations before planning
- Backend is self-hosted Supabase in Docker (not cloud-hosted)
- Always use --debug flag with supabase CLI commands due to SSL issues
- RLS policies distinguish between USING (read) and WITH CHECK (write) - critical for security

---

## 📂 Project Structure Quick Reference

- **Frontend**: `frontend/` (Next.js workspace)
- **Backend**: `supabase/` (Supabase + PostgreSQL)
- **Custom Agents**: `.claude/agents/` (frontend-dev, backend-dev, full-stack-integrator, session-manager)
- **Domains**:
  - Frontend: `critiqit.io` (dev: localhost:3001)
  - Backend: `api.critiqit.io` (dev: localhost:8000)

For detailed information:
- Agent system usage → [agents-guide.md](./agents-guide.md)
- Backend details → [backend.md](./backend.md)
- Frontend details → [frontend.md](./frontend.md)
- Lessons & gotchas → [project.md](./project.md)
