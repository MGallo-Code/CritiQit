# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**
>
> **🤖 See [agents-guide.md](./agents-guide.md) for custom agent system documentation**

Last updated: 2025-11-11 21:45

---

## 🎯 Current Goals

1. **Development Workflow**: Test and refine the new custom agent system with real feature implementations
2. **Security & Production Readiness**: Implement rate limiting wrappers around Supabase API calls to prevent abuse
3. **Code Quality**: Standardize error handling patterns across authentication flows
4. **Ongoing**: Document development patterns and maintain context for cross-session continuity

## 📋 Immediate Next Steps

- [ ] **High Priority**: Test agent system with a real feature implementation (use full-stack-integrator)
- [ ] **High Priority**: Implement rate limiting wrappers for all Supabase client calls
- [ ] **Medium Priority**: Refine agent consultation prompts based on real usage patterns
- [ ] **Medium Priority**: Review and standardize error handling in auth components
- [ ] **Low Priority**: Create example workflows in agents-guide.md

## 🔄 Recent Context (Last 2-3 Sessions)

Created comprehensive custom agent system for orchestrating development work. The system includes frontend-dev, backend-dev, and full-stack-integrator agents with a consultation-first pattern that improves architecture quality. Also implemented dual-mode session management (UPDATE for incremental notes, FINALIZE for complete closure). User profile functionality is complete with avatar upload, username, full name, and bio fields.

## 🚧 Known Issues & Blockers

- **Critical**: No rate limiting on Supabase calls - security risk for production
- **Important**: Using test Turnstile captcha key - must switch to production key before launch
- **Minor**: Cannot delete users who own storage objects - needs cascade deletion strategy

## ⚡ Important Notes for Next Session

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
