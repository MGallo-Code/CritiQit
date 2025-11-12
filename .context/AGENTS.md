# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**
>
> **🤖 See [agents-guide.md](./agents-guide.md) for custom agent system documentation**

Last updated: 2025-11-12 22:30

---

## 🎯 Current Goals

1. **Development Workflow**: Test and refine the new custom agent system with real feature implementations
2. **Security & Production Readiness**: ✅ Kong rate limiting implemented - configure per-service limits for production
3. **Code Quality**: Standardize error handling patterns across authentication flows
4. **Ongoing**: Document development patterns and maintain context for cross-session continuity

## 📋 Immediate Next Steps

- [ ] **High Priority**: Configure service-level rate limits in Kong (auth-v1, rest-v1, storage-v1, etc.)
- [ ] **High Priority**: Test agent system with a real feature implementation (use full-stack-integrator)
- [ ] **Medium Priority**: Implement user-aware rate limiting in Edge Functions using service_role
- [ ] **Medium Priority**: Refine agent consultation prompts based on real usage patterns
- [ ] **Medium Priority**: Review and standardize error handling in auth components
- [ ] **Low Priority**: Create example workflows in agents-guide.md

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 2 (2025-11-12)**: Successfully implemented Kong-based rate limiting with PostgreSQL backend. Upgraded from Kong 2.8.1 to 3.9, debugged plugin execution (key insight: access phase requires authentication), fixed pgmoon JSONB handling, and achieved production-ready enforcement (5/min, 100/hour, 1000/day limits). Currently configured globally for testing - needs service-level configuration.

**Session 1**: Created comprehensive custom agent system for orchestrating development work. The system includes frontend-dev, backend-dev, and full-stack-integrator agents with a consultation-first pattern that improves architecture quality. Also implemented dual-mode session management (UPDATE for incremental notes, FINALIZE for complete closure). User profile functionality is complete with avatar upload, username, full name, and bio fields.

## 🚧 Known Issues & Blockers

- **Important**: Kong rate limiting currently global - needs service-level configuration with different limits per endpoint
- **Important**: Kong log level set to debug - revert to info for production
- **Important**: Using test Turnstile captcha key - must switch to production key before launch
- **Minor**: Cannot delete users who own storage objects - needs cascade deletion strategy

## ⚡ Important Notes for Next Session

- **Rate Limiting**: Kong 3.9 custom plugin working in DB-less mode (priority 900, after auth plugins)
- **Testing Auth**: Always test Kong plugins with proper authentication - key-auth runs first (priority 1003)
- **pgmoon**: Returns JSONB as Lua tables (not strings) and NULL as userdata (not nil) - check types before using
- **JWT Testing**: Use /tmp/generate_jwt.js pattern for testing without captcha bypass
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
