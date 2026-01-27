# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**

Last updated: 2025-12-30

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

1. **Security Testing Priority**: Expand pgTAP test coverage for database constraints and functions
2. **Mobile Testing**: Test complete profile page and avatar flows on real iOS/Android devices
3. **Component Library Development**: Build CritiQit-specific UI components (star rating, movie cards)
4. **Code Quality**: Maintain comprehensive test suite and security best practices
5. **Ongoing**: Document security patterns and maintain design system consistency

## 📋 Immediate Next Steps

- [ ] **High Priority**: Continue building test coverage for database constraints and functions
- [ ] **High Priority**: Document security audit findings and resolution patterns in backend.md
- [ ] **High Priority**: Test repositioned Edit/Save buttons on real iOS/Android devices
- [ ] **Medium Priority**: Test complete profile flow (edit mode, avatar changes, save)
- [ ] **Medium Priority**: Build star rating component (first CritiQit-specific UI component)

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 18 (2025-12-30)**: Security audit of pgTAP suite fixed three critical vulnerabilities: avatar_url injection in OAuth signup, missing WITH CHECK on profile updates, and function permission bypass. Optimized test infrastructure with pre-built Docker image (3min→3sec). Added 12 security tests, total 78 passing.

**Session 17 (2025-12-29)**: Implemented pgTAP testing infrastructure with docker-compose overlay, test fixtures, and RLS validation. Fixed critical storage RLS vulnerability allowing unauthorized file modifications. Created comprehensive testing strategy document.

**Session 16 (2025-12-11)**: Repositioned Edit/Save buttons with absolute positioning (desktop) and standard flow (mobile). Fixed overflow-hidden click bug. Optimized avatar spritesheet 75% (672KB→169KB). Completed design system cleanup audit.

## 🚧 Known Issues & Blockers

**Testing Needed:**
- Profile page Edit/Save button positioning on real mobile devices
- Complete profile edit flow end-to-end (especially mobile)
- Avatar upload and preset selection after button repositioning
- HEIC file upload testing on iOS Safari
- Rate limiting verification with countdown timer

**Minor Improvements (Low Priority):**
- Light mode link contrast (star-yellow ~3:1, need 4.5:1 for WCAG AA)
- Loading skeleton states (currently just "Loading..." text)

## ⚡ Important Notes for Next Session

- **Function Permission Security**: REVOKE FROM PUBLIC doesn't affect named Supabase roles - must explicitly revoke from anon, authenticated individually
- **pgTAP Test Performance**: Pre-built Dockerfile.test with pg_prove eliminates 3min dependency install, tests run in ~3sec
- **WITH CHECK Pattern**: Always use both USING (row visibility) and WITH CHECK (value validation) in UPDATE policies
- **OAuth Security**: Don't copy user-controlled fields (avatar_url) from OAuth metadata - prevents tracking pixels and injection
- **Profile Button Positioning**: Desktop uses absolute positioning (top-right of gradient), mobile uses standard flow (above logout footer)
- **overflow-hidden Gotcha**: Removing from Card fixed button click bug - stacking context prevented clicks on absolutely positioned elements
- **Spritesheet Optimization**: Run `npm run sprites` regenerates with PNG8+interlacing automatically (75% size reduction)
- **Unified Avatar Modal**: AvatarPickerModal combines preset selection + custom upload in tabbed interface (mobile: Drawer, desktop: Dialog)
- **Onboarding Path**: Now `/protected/onboarding/` (renamed from /protected/username/)
- **Modal Positioning**: Use top-aligned (top-[5%]) instead of centered to prevent layout shifts on tab changes
- **Spritesheet System Ready**: CSS sprites replace Supabase storage, single HTTP request, auto-generated from JSON
- **Avatar Preset Index**: Now SMALLINT (0-9) instead of TEXT ID, database enforces non-negative constraint
- **Storage RLS Pattern**: Use `owner_id` (text) field, NOT `auth.uid()` - storage service doesn't set JWT claims
- **Avatar Cropping Implemented**: react-image-crop with 1:1 circular overlay, mobile gestures
- **Frontend Architecture Constraints**: Realtime is DISABLED - must manually refresh user state after logout/updates
- **Agent Invocation Pattern**: full-stack-integrator returns plans to main context; main context delegates using Task tool
- **Documentation System**: Sessions.md entries max 20 lines, lessons go in specialized files
- **Production Rate Limits Active**: 5 avatar uploads/hour, 20/day per user
- **HEIC/Safari Image Processing**: Disable Web Workers (`useWebWorker: false`) to prevent crashes
- **Complete Design System**: See `.context/design-system.md` for full specifications

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
- ALWAYS verify `auth.uid()` in table RLS policies (but NOT storage RLS - use `owner_id`)
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
- Storage RLS uses `owner_id` field, NOT `auth.uid()`

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

**Use full-stack-integrator agent when:**
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
