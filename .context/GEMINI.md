# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**

Last updated: 2025-11-27 05:15

---

## ⚠️ When in Doubt

**If you're uncertain about something:**
- ✅ Ask clarifying questions
- ✅ Say "I don't know" or "I'm not sure"
- ✅ Admit if you can't do something
- ✅ Search documentation before guessing
- ❌ Don't make up information
- ❌ Don't assume implementation details you haven't verified

**It's always better to ask than to assume incorrectly.**

---

## 🎯 Current Goals

1. **Documentation System Refinement**: Trim bloated sessions.md, test new concise format
2. **Component Library Development**: Build CritiQit-specific UI components (star rating, movie cards)
3. **Avatar Upload Testing**: Comprehensive end-to-end testing of production-ready avatar upload feature
4. **Mobile Testing**: Verify design system and avatar upload on real devices (iOS/Android)
5. **Ongoing**: Maintain design system consistency and document patterns

## 📋 Immediate Next Steps

- [ ] **High Priority**: Trim sessions.md (keep last 3-5 sessions in detail, condense older entries to summary only)
- [ ] **High Priority**: Test avatar upload flow end-to-end (validation, upload, retrieval, error scenarios, HEIC files)
- [ ] **High Priority**: Verify rate limiting with countdown timer (test hitting limits)
- [ ] **High Priority**: Mobile testing for avatar upload (file picker, touch targets, iOS/Android, HEIC support)
- [ ] **Medium Priority**: Build star rating component (first CritiQit-specific UI component)
- [ ] **Medium Priority**: Create movie card component (grid + list variants per design system)
- [ ] **Low Priority**: Add light mode link color (fix WCAG AA for light mode)

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 10 (2025-11-27)**: Major documentation architecture overhaul. Streamlined agent files by separating behavior (WHO/HOW) from technical details (WHAT/WHY), reducing backend-dev by 54% and frontend-dev by 36%. Established orchestrator/specialist pattern with 🎯 ORCHESTRATOR MODE headers. Updated session-manager to enforce concise entries (max 20 lines). Added "When in Doubt" guidance to all files to prevent hallucinations.

**Session 9 (2025-11-20)**: Short focused session implementing global golden focus outline system. Replaced default blue borders with movie theater design colors (warm-red and star-yellow). Created theme-aware focus states (bright gold in dark mode, darker gold in light mode). User testing refined visual balance.

**Session 8 (2025-11-20)**: Avatar upload feature complete and production-ready after comprehensive debugging. Fixed PostgreSQL corruption, Next.js version mismatch, Kong path routing causing 400 errors, critical race condition in upload flow (changed from delete-then-upload to atomic upsert), and HEIC image upload crash (Safari's auto-conversion to JPEG was crashing Web Workers).

## 🚧 Known Issues & Blockers

None! Avatar upload feature complete and production-ready. All critical bugs resolved.

**Work Ready for Implementation:**
- Component library specifications ready (star rating, movie cards, badges)
- Security audit system created but not yet tested with real codebase
- Auth components (PasswordRequirements, AuthDivider) ready for extraction

**Testing Needed:**
- Avatar upload end-to-end testing (success, failure, edge cases, HEIC files)
- Rate limiting verification with countdown timer
- Mobile testing on real iOS/Android devices (especially HEIC uploads)

**Minor Improvements (Low Priority):**
- Light mode link contrast (star-yellow ~3:1, need 4.5:1 for WCAG AA)
- Loading skeleton states (currently just "Loading..." text)
- Sessions.md bloat (118KB, needs trimming to last 3-5 sessions in detail)

## ⚡ Important Notes for Next Session

- **Documentation System Updated**: Agent files now streamlined with references to context files for technical details
- **Session Entry Format**: New concise format enforced (max 20 lines, no code snippets, lessons go in specialized files)
- **Orchestrator Pattern**: full-stack-integrator uses 🎯 ORCHESTRATOR MODE header when delegating to specialists
- **"When in Doubt" Added**: All agent and context files now encourage asking questions over guessing
- **Avatar Upload Production-Ready**: Atomic upsert operations prevent data loss on failure
- **Kong Path Routing Pattern**: Use `strip_path: true` with base URLs to avoid duplication (e.g., `http://storage:5000/` not `http://storage:5000/storage/v1/object/public`)
- **Atomic Storage Operations**: Always use `upsert: true` instead of delete-then-upload patterns to prevent race conditions
- **HEIC/Safari Image Processing**: Disable Web Workers (`useWebWorker: false`) in browser-image-compression to prevent crashes with Safari's HEIC-to-JPEG conversions
- **Error Message Philosophy**: User-friendly messages without technical jargon (no "RLS violation" or "mime type validation")
- **Complete Design System**: See `.context/design-system.md` for full specifications
- **Security Audit System**: Use `/audit` command for vulnerability scanning
- **Feature Implementation**: Use `/implement` command for features spanning frontend and backend
- **Production Rate Limits Active**: 5 avatar uploads/hour, 20/day per user

## 🎯 Production-Ready Development Standards

**PROJECT SCOPE**: Building for thousands of concurrent users. Every line of code must be production-ready, secure, and scalable.

### Security Requirements (Non-Negotiable)

**1. Input Validation**
- ALWAYS validate on frontend (UX) AND backend (security) AND database (constraints)
- NEVER trust user input
- Frontend validation improves UX but provides ZERO security
- Backend validation is mandatory for all user input
- Database constraints are the final defense

**2. Authentication & Authorization**
- Frontend checks auth for UI/UX (show/hide elements)
- Backend enforces auth for security (RLS policies, middleware)
- NEVER rely on client-side auth checks alone
- ALWAYS verify `auth.uid()` in RLS policies
- NEVER expose service_role key to clients

**3. XSS Prevention**
- Use React's built-in escaping (default behavior)
- NEVER use `dangerouslySetInnerHTML` without DOMPurify sanitization
- Validate URLs before using in `href` or `src` attributes
- Escape user-generated content in ALL contexts

**4. SQL Injection Prevention**
- ALWAYS use parameterized queries
- NEVER concatenate user input into SQL
- Use `$1, $2, $3` parameters in PL/pgSQL functions
- Validate inputs in SECURITY DEFINER functions

**5. Secret Management**
- NEVER commit secrets to git (.env files in .gitignore)
- NEVER hardcode API keys, passwords, or tokens
- NEVER expose service_role key in client code
- Only use `NEXT_PUBLIC_*` for truly public values
- Rotate secrets regularly (JWT secrets, database passwords)

**6. Row Level Security (RLS)**
- Enable RLS on EVERY table with user data
- Default deny, explicitly allow
- Use BOTH `USING` and `WITH CHECK` on UPDATE policies
- Test policies with malicious user scenarios
- NEVER use `USING (true)` - that's no security

**7. Error Handling**
- Frontend: User-friendly messages ("Unable to save changes")
- Backend: Detailed logging (server-side only)
- NEVER expose stack traces to users
- NEVER leak implementation details in errors
- Use generic messages for auth failures (prevent user enumeration)

**8. Rate Limiting**
- Backend enforces rate limits (Kong plugin)
- Frontend handles 429 responses gracefully
- Show countdown timers when rate limited
- Disable form submissions during rate limit period
- NEVER spam requests on error

### When to Use Agents vs Direct Implementation

**Use `/implement` (full-stack-integrator) when:**
- Feature spans frontend AND backend
- Requires database schema changes
- Needs type safety coordination
- Involves security considerations across layers
- Complexity requires architectural planning

**Use specialized agents directly when:**
- Frontend-only changes (UI, components, styling)
- Backend-only changes (migrations, RLS policies)
- Infrastructure changes (Docker, Kong config)
- Design quality review (use design-reviewer)

**Implement directly (without agents) when:**
- Simple bug fixes (typos, styling tweaks)
- Quick updates to existing patterns
- Changes localized to 1-2 files
- No architectural decisions needed

**Use `/audit` regularly:**
- Before major feature launches
- After implementing auth/security features
- Weekly during active development
- Before production deployments
- When adding third-party integrations

---

## 📂 Project Structure Quick Reference

- **Frontend**: `frontend/` (Next.js workspace)
- **Backend**: `supabase/` (Supabase + PostgreSQL)
- **Custom Agents**: `.claude/agents/` (9 agents: frontend-dev, backend-dev, full-stack-integrator, session-manager, design-reviewer, 4 security auditors)
- **Domains**:
  - Frontend: `critiqit.io` (dev: localhost:3000)
  - Backend: `api.critiqit.io` (dev: localhost:8000)

For detailed information:
- Design system specs → [design-system.md](./design-system.md)
- Backend details → [backend.md](./backend.md)
- Frontend details → [frontend.md](./frontend.md)
- Lessons & gotchas → [project.md](./project.md)
