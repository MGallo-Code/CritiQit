# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**

Last updated: 2025-11-29 04:52

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

1. **Avatar System Complete**: Production-ready avatar upload and preset system fully functional
2. **Component Library Development**: Build CritiQit-specific UI components (star rating, movie cards)
3. **Mobile Testing**: Verify design system and avatar features on real devices (iOS/Android)
4. **Documentation Maintenance**: Keep sessions.md concise, update specialized docs with lessons
5. **Ongoing**: Maintain design system consistency and document patterns

## 📋 Immediate Next Steps

- [ ] **High Priority**: Test complete avatar flow on real iOS/Android devices (HEIC files, upload, presets)
- [ ] **High Priority**: Verify end-to-end avatar upload (success, failure, rate limiting countdown)
- [ ] **Medium Priority**: Build star rating component (first CritiQit-specific UI component)
- [ ] **Medium Priority**: Create movie card component (grid + list variants per design system)
- [ ] **Low Priority**: Consider sprite sheet for preset avatars (performance optimization as count grows)
- [ ] **Low Priority**: Add light mode link color (fix WCAG AA for light mode)

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 13 (2025-11-29)**: Fixed critical avatar upload RLS policy violations by switching from `auth.uid()` to `owner_id` field. Reorganized storage architecture with separate `avatar-presets` bucket for PNG presets. Simplified preset system with hardcoded TypeScript array instead of RPC. Removed debug logging from 8 components. Key lesson: Supabase storage service RLS behaves fundamentally different than table RLS.

**Session 12 (2025-11-28)**: Implemented storage-based preset avatars using transparent PNGs with CSS compositing. Built database management tools with `./db clean` command and idempotent upload scripts. Enhanced RLS policies with role-based MIME type validation (JPEG for users, PNG for service_role).

**Session 11 (2025-11-28)**: Implemented professional avatar image cropping with react-image-crop (circular 1:1 overlay, mobile gestures, canvas-based execution). Fixed username picker UX and CurrentUserProvider logout bug. Enhanced frontend.md with Architecture Constraints documenting disabled realtime.

## 🚧 Known Issues & Blockers

None! Avatar upload and preset system fully working and production-ready.

**Work Ready for Implementation:**
- Component library specifications ready (star rating, movie cards, badges)
- Security audit system created but not yet tested with real codebase
- Auth components (PasswordRequirements, AuthDivider) ready for extraction

**Testing Needed:**
- Avatar upload end-to-end testing on real mobile devices
- Rate limiting verification with countdown timer
- HEIC file upload testing on iOS Safari

**Minor Improvements (Low Priority):**
- Light mode link contrast (star-yellow ~3:1, need 4.5:1 for WCAG AA)
- Loading skeleton states (currently just "Loading..." text)
- Sprite sheet for preset avatars (performance optimization)

## ⚡ Important Notes for Next Session

- **Avatar System Production-Ready**: Upload, presets, and RLS all working correctly
- **Storage RLS Pattern**: Use `owner_id` (text) field, NOT `auth.uid()` - storage service doesn't set JWT claims
- **Separate Buckets Pattern**: Dedicated buckets cleaner than complex RLS for different file types
- **Hardcoded Configs Win**: Simple TypeScript arrays better than dynamic RPCs for static data
- **Metadata Not Available at INSERT**: Can't validate metadata in INSERT policies, rely on bucket settings
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
