# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**
>
> **🤖 See [agents-guide.md](./agents-guide.md) for custom agent system documentation**

Last updated: 2025-11-12

---

## 🎯 Current Goals

1. **Production Readiness**: Three-tier rate limiting is production-ready - test frontend UI and monitor limits
2. **Agent System Testing**: Test custom agent system with real feature implementation
3. **Code Quality**: Maintain production-quality standards across all development
4. **Ongoing**: Document patterns and maintain context for cross-session continuity

## 📋 Immediate Next Steps

- [ ] **High Priority**: Test frontend rate limit UI in browser (verify countdown timer, form disabling)
- [ ] **High Priority**: Monitor rate limit hits in production to validate limits
- [ ] **Medium Priority**: Test agent system with real feature (user profile editing, avatar upload)
- [ ] **Low Priority**: Add Prometheus/Grafana monitoring for 429 responses

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 4 (2025-11-12)**: Production cleanup and documentation. Removed 168 lines of legacy code from Kong plugin (v3.0.0), fixed critical security issues (Kong log level exposure, service role bypass), added rate limiting to GraphQL and Analytics endpoints, relaxed overly restrictive signup limits, added 400+ lines of production-quality inline documentation. Enhanced all agent files with production standards. System is production-ready.

**Session 3**: Implemented three-tier rate limiting (IP, content, user strategies). Closed service_role bypass with content-based limiting. Added frontend countdown timers and error handling. Applied per-route limits.

## 🚧 Known Issues & Blockers

None blocking production. System is production-ready and secure.

**Optional improvements:**
- Frontend rate limit UI not visually tested yet (code implemented)
- Rate limits are starting points (monitor and tune based on real traffic)
- Using test Turnstile key (switch to production before launch)

## ⚡ Important Notes for Next Session

- **Rate Limiting is Production-Ready**: Kong plugin v3.0.0, all security issues fixed, comprehensive inline documentation
- **Service Role Bypass Fixed**: Now passes key via plugin config (not environment variable)
- **Log Level Fixed**: Changed from debug to info (prevents sensitive data exposure)
- **GraphQL & Analytics Protected**: Added rate limiting to previously unprotected endpoints
- **Documentation Strategy**: Self-documenting code with inline comments (explains WHY, not WHAT)
- **Agent Production Standards**: All agents enhanced with clarity over cleverness principles
- New agent system available: Use /agents/full-stack-integrator for features spanning frontend and backend

## 📝 Git Commit Guidelines

**Format**: Single sentence, no co-authoring unless explicitly requested

**Good Examples:**
- "Add production-quality standards and code examples to all agent instruction files"
- "Implement three-tier rate limiting with Kong plugin and PostgreSQL backend"
- "Fix service role bypass vulnerability in rate limiting"

**Bad Examples:**
- Multi-paragraph commit messages with detailed explanations
- Including "🤖 Generated with Claude Code" footer (unless user asks)
- "Co-Authored-By: Claude" (unless user asks)

**When to include attribution:**
- Only when user explicitly requests it
- Default is clean, concise commits

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
