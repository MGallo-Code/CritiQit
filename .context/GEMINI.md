# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**

Last updated: 2025-12-03

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

1. **Mobile Testing Priority**: Test complete onboarding and avatar flows on real iOS/Android devices
2. **Component Library Development**: Build CritiQit-specific UI components (star rating, movie cards)
3. **Code Cleanup**: Remove unused components and deprecated files
4. **Documentation Maintenance**: Keep sessions.md concise, update specialized docs with lessons
5. **Ongoing**: Maintain design system consistency and document patterns

## 📋 Immediate Next Steps

- [ ] **High Priority**: Delete unused `preset-avatar-picker-modal.tsx` file
- [ ] **High Priority**: Test unified avatar modal on real iOS/Android devices
- [ ] **High Priority**: Test complete onboarding flow (username + avatar selection)
- [ ] **Medium Priority**: Build star rating component (first CritiQit-specific UI component)
- [ ] **Medium Priority**: Create movie card component (grid + list variants per design system)
- [ ] **Low Priority**: Add light mode link color (fix WCAG AA for light mode)

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 15 (2025-12-03)**: Refactored onboarding flow and created unified avatar picker modal. Renamed /protected/username/ to /protected/onboarding/ across all files. Built tabbed modal combining preset selection and custom upload. Enhanced UX with top-aligned modal positioning, responsive button layouts, and increased base font size for better readability.

**Session 14 (2025-11-29)**: Migrated avatar preset system from Supabase storage to frontend CSS spritesheet for better performance. Created automated spritesheet generation with ImageMagick, changed database from TEXT IDs to SMALLINT index, removed avatar-presets bucket entirely.

**Session 13 (2025-11-29)**: Fixed critical avatar upload RLS policy violations by switching from auth.uid() to owner_id field. Reorganized storage with separate avatar-presets bucket. Simplified preset system with hardcoded TypeScript array.

## 🚧 Known Issues & Blockers

**Technical Debt:**
- Unused `preset-avatar-picker-modal.tsx` file needs deletion (replaced by unified AvatarPickerModal)

**Testing Needed:**
- Unified avatar modal end-to-end testing on real mobile devices
- Complete onboarding flow (username + avatar) on iOS/Android
- Rate limiting verification with countdown timer
- HEIC file upload testing on iOS Safari
- Preset avatar spritesheet performance testing

**Minor Improvements (Low Priority):**
- Light mode link contrast (star-yellow ~3:1, need 4.5:1 for WCAG AA)
- Loading skeleton states (currently just "Loading..." text)

## ⚡ Important Notes for Next Session

- **Unified Avatar Modal**: AvatarPickerModal combines preset selection + custom upload in tabbed interface (mobile: Drawer, desktop: Dialog)
- **Onboarding Path**: Now `/protected/onboarding/` (renamed from /protected/username/)
- **Modal Positioning**: Use top-aligned (top-[5%]) instead of centered to prevent layout shifts on tab changes
- **Spritesheet System Ready**: CSS sprites replace Supabase storage, single HTTP request, auto-generated from JSON
- **Avatar Preset Index**: Now SMALLINT (0-9) instead of TEXT ID, database enforces non-negative constraint
- **Spritesheet Build**: Run `npm run sprites` to regenerate from source PNGs in `frontend/assets/avatar-presets/`
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
