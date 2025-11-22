# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**
>
> **🤖 See [agents-guide.md](./agents-guide.md) for custom agent system documentation**

Last updated: 2025-11-20 04:45

---

## 🎯 Current Goals

1. **Component Library Development**: Build CritiQit-specific UI components (star rating, movie cards)
2. **Avatar Upload Testing**: Comprehensive end-to-end testing of production-ready avatar upload feature
3. **Mobile Testing**: Verify design system and avatar upload on real devices (iOS/Android)
4. **Security Testing**: Run `/audit` command for comprehensive vulnerability scanning
5. **Ongoing**: Maintain design system consistency and document patterns

## 📋 Immediate Next Steps

- [ ] **High Priority**: Test avatar upload flow end-to-end (validation, upload, retrieval, error scenarios, HEIC files)
- [ ] **High Priority**: Verify rate limiting with countdown timer (test hitting limits)
- [ ] **High Priority**: Mobile testing for avatar upload (file picker, touch targets, iOS/Android, HEIC support)
- [ ] **High Priority**: Build star rating component (first CritiQit-specific UI component)
- [ ] **Medium Priority**: Create movie card component (grid + list variants per design system)
- [ ] **Medium Priority**: Run `/audit` security command to scan for vulnerabilities
- [ ] **Low Priority**: Add light mode link color (fix WCAG AA for light mode)

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 9 (2025-11-20)**: Short focused session improving OTP input styling and implementing global golden focus outline system. Replaced default blue borders with movie theater design system colors (warm-red and star-yellow). Created global CSS rules for consistent golden focus outlines on all form inputs (theme-aware: bright gold in dark mode, darker gold in light mode). User tested and refined visual balance.

**Session 8 (2025-11-20)**: Avatar upload feature complete and production-ready after comprehensive debugging. Fixed PostgreSQL corruption, Next.js version mismatch, Kong path routing causing 400 errors, critical race condition in upload flow (changed from delete-then-upload to atomic upsert), and HEIC image upload crash (Safari's auto-conversion to JPEG was crashing Web Workers). Improved error messages (removed technical jargon). Restored production rate limits (5/hour, 20/day).

**Session 7 (2025-11-16)**: Visual polish implementing royal red curtain background with theatrical drape pattern. Applied design system to dashboard and profile pages (85% compliance). Created dynamic avatar-based gradient extraction using Canvas API. Built `.link-gold` utility class (11.07:1 contrast, WCAG AAA). Removed redundant layout divs. Responsive profile layout with 50% avatar overlap.

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

## ⚡ Important Notes for Next Session

- **⚠️ CRITICAL: Database Migration Rule** - NEVER run `supabase db reset` or `supabase db push` directly. ALWAYS use `./reset-hard-db.sh` or `./reset-soft-db.sh` scripts in the supabase/ directory. Direct CLI commands bypass safety checks and can corrupt the database.
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

### Type Safety Requirements

**1. TypeScript Everywhere**
- NEVER use `any` type (use `unknown` if truly unknown)
- Define explicit interfaces for all data structures
- Ensure backend schema matches frontend types EXACTLY
- Use strict TypeScript configuration
- No type casting hacks (`as any`)

**2. API Contracts**
- Define TypeScript interfaces BEFORE implementation
- Document all fields with types and constraints
- Specify all possible error codes
- Include nullability explicitly (`string | null`)
- Version API interfaces when making breaking changes

**3. Cross-Layer Type Consistency**
- Backend database types → TypeScript interfaces
- TypeScript interfaces → Frontend component props
- Verify types match at integration points
- Use code generation if maintaining manually becomes error-prone

### Performance Requirements

**1. Database Efficiency**
- Add indexes for all common query patterns
- Avoid N+1 queries (use JOINs, not loops)
- Implement pagination (50-100 items per page)
- Use connection pooling for high-traffic endpoints
- Profile queries before deploying

**2. Frontend Performance**
- Use server components by default (Next.js App Router)
- Lazy load heavy components
- Minimize bundle size (analyze with `next build`)
- Optimize images (next/image component)
- Implement loading states (prevent janky UX)

**3. Scalability**
- Design for 10,000+ concurrent users
- No unbounded loops or recursion
- Set resource limits on containers
- Implement caching where appropriate
- Test with realistic load

### Code Quality Standards

**1. Clarity Over Cleverness**
- Code should be immediately understandable
- Variable names explain purpose (`isSubmitting` not `flag`)
- Functions do one thing well (single responsibility)
- Comments explain WHY, not WHAT
- No clever tricks that save 2 lines but cost 10 minutes of understanding

**2. Error Handling Everywhere**
- Handle ALL error cases (not just happy path)
- Provide fallbacks for failures
- Log errors for debugging (server-side)
- Display helpful messages to users
- Fail securely (deny access when unsure)

**3. Testing Requirements**
- Test with malicious inputs (security testing)
- Test error cases (not just success)
- Test edge cases (empty state, max length, null values)
- Test cross-browser compatibility (Chrome, Firefox, Safari)
- Test mobile responsive design

**4. Production Mindset**
- Think: "How could this be exploited?"
- Think: "What happens at 2am when this breaks?"
- Think: "Can this scale to 10,000 users?"
- NEVER assume users will behave normally
- NEVER assume "it'll probably be fine"

### Architecture Principles

**1. Defense in Depth**
- Multiple layers of security (frontend, backend, database)
- Each layer assumes others might fail
- Example: Validate input on all three layers

**2. Fail Securely**
- When in doubt, deny access
- On error, default to safe state
- Log security-relevant failures
- Don't leak information in errors

**3. Least Privilege**
- Give minimum permissions necessary
- Users access only their own data (RLS)
- Service accounts have specific scopes
- Regular security audits

**4. Explicit Over Implicit**
- Make security decisions visible in code
- Document WHY security choices were made
- No "security through obscurity"
- Clear error messages (without leaking details)

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

### Code Review Checklist

Before committing ANY code:
- [ ] All user input validated on frontend, backend, and database
- [ ] No secrets exposed or hardcoded
- [ ] No XSS vulnerabilities (no unsafe HTML rendering)
- [ ] No SQL injection risks (parameterized queries only)
- [ ] RLS policies tested (if database changes)
- [ ] Error handling implemented (all error cases)
- [ ] Loading states shown (no janky UX)
- [ ] TypeScript types explicit (no `any`)
- [ ] Rate limiting handled (frontend gracefully handles 429)
- [ ] Mobile responsive (test on small screens)
- [ ] Dark mode works (if applicable)
- [ ] No console.log with sensitive data
- [ ] Performance acceptable (no N+1 queries, no memory leaks)

### Common Vulnerabilities to Avoid

**OWASP Top 10:**
1. Broken Access Control → RLS policies + auth checks
2. Cryptographic Failures → Proper secrets management
3. Injection → Parameterized queries + input validation
4. Insecure Design → Security by design, not afterthought
5. Security Misconfiguration → Proper Kong/Docker config
6. Vulnerable Components → Regular `npm audit`, dependency updates
7. Auth Failures → Strong passwords, rate limiting, secure tokens
8. Data Integrity Failures → Validate inputs, use constraints
9. Logging Failures → Log security events, not sensitive data
10. SSRF → Validate external URLs, restrict network access

### Project-Specific Patterns

**CritiQit Conventions:**
- Three-tier rate limiting (IP, content, user) via Kong plugin
- RLS policies on ALL user data tables
- httpOnly cookies for JWT storage (NOT localStorage)
- Server-side auth checks via middleware
- Inline documentation explains WHY decisions were made
- Self-documenting code preferred over separate docs
- Idempotent database migrations (can run multiple times)
- Connection pooling for database-connected services

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
- **Custom Agents**: `.claude/agents/` (7 agents: frontend-dev, backend-dev, full-stack-integrator, session-manager, 4 security auditors)
- **Domains**:
  - Frontend: `critiqit.io` (dev: localhost:3001)
  - Backend: `api.critiqit.io` (dev: localhost:8000)

For detailed information:
- Agent system usage → [agents-guide.md](./agents-guide.md)
- Design system specs → [design-system.md](./design-system.md)
- Backend details → [backend.md](./backend.md)
- Frontend details → [frontend.md](./frontend.md)
- Lessons & gotchas → [project.md](./project.md)
