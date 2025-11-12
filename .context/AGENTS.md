# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**

Last updated: 2025-11-11 19:30

---

## 🎯 Current Goals

1. **Security & Production Readiness**: Implement rate limiting wrappers around Supabase API calls to prevent abuse
2. **Code Quality**: Standardize error handling patterns across authentication flows
3. **Ongoing**: Document development patterns and maintain context for cross-session continuity

## 📋 Immediate Next Steps

- [ ] **High Priority**: Implement rate limiting wrappers for all Supabase client calls
- [ ] **Medium Priority**: Review and standardize error handling in auth components
- [ ] **Medium Priority**: Document component patterns and state management conventions in frontend.md
- [ ] **Low Priority**: Create database migration for cascade deletion of user-owned storage objects

## 🔄 Recent Context (Last 2-3 Sessions)

This is the initial context setup. User profile functionality is complete with avatar upload, username, full name, and bio fields. Authentication flows include login, signup, password reset, and OAuth providers. The app uses a self-hosted Supabase backend with RLS policies and a Next.js 15 frontend with App Router.

## 🚧 Known Issues & Blockers

- **Critical**: No rate limiting on Supabase calls - security risk for production
- **Important**: Using test Turnstile captcha key - must switch to production key before launch
- **Minor**: Cannot delete users who own storage objects - needs cascade deletion strategy

## ⚡ Important Notes for Next Session

- Backend is self-hosted Supabase in Docker (not cloud-hosted)
- Always use --debug flag with supabase CLI commands due to SSL issues
- User provider deduplicates requests to avoid unnecessary API calls
- RLS policies distinguish between USING (read) and WITH CHECK (write) - critical for security

---

## 📂 Project Structure Quick Reference

- **Frontend**: `frontend/` (Next.js workspace)
- **Backend**: `supabase/` (Supabase + PostgreSQL)
- **Domains**:
  - Frontend: `critiqit.io` (dev: localhost:3001)
  - Backend: `api.critiqit.io` (dev: localhost:8000)

For detailed information:
- Backend details → [backend.md](./backend.md)
- Frontend details → [frontend.md](./frontend.md)
- Lessons & gotchas → [project.md](./project.md)
