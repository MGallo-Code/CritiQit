# CritiQit Project Context

> **📋 See [project.md](./project.md) for project structure, tech stack, and specialized documentation links**
>
> **📚 See [sessions.md](./sessions.md) for detailed session history**
>
> **🤖 See [agents-guide.md](./agents-guide.md) for custom agent system documentation**

Last updated: 2025-11-16 18:30

---

## 🎯 Current Goals

1. **Component Library Development**: Build CritiQit-specific UI components (star rating, movie cards)
2. **Mobile Testing**: Verify design system implementation on real devices (iOS/Android)
3. **Security Testing**: Run `/audit` command for comprehensive vulnerability scanning
4. **Feature Development**: Begin building core review/critique functionality
5. **Ongoing**: Maintain design system consistency and document patterns

## 📋 Immediate Next Steps

- [ ] **High Priority**: Test on real mobile devices (iOS auto-zoom prevention, touch targets, responsive layout)
- [ ] **High Priority**: Build star rating component (first CritiQit-specific UI component)
- [ ] **High Priority**: Create movie card component (grid + list variants per design system)
- [ ] **Medium Priority**: Run `/audit` security command to scan for vulnerabilities
- [ ] **Medium Priority**: Add light mode link color (fix WCAG AA for light mode)
- [ ] **Low Priority**: Extract Textarea component for consistency
- [ ] **Low Priority**: Test color blindness simulation (verify curtain + star-yellow accessibility)

## 🔄 Recent Context (Last 2-3 Sessions)

**Session 7 (2025-11-16)**: Major visual polish session implementing royal red curtain background with theatrical drape pattern across all pages. Applied design system to dashboard and profile pages (85% compliance). Created dynamic avatar-based gradient extraction using Canvas API for personalized profile headers. Built reusable `.link-gold` utility class (11.07:1 contrast, WCAG AAA in dark mode). Removed 3 redundant layout divs. Improved card styling with proper opacity and shadows. Responsive profile layout with avatar overlapping gradient 50% on mobile and desktop. All changes WCAG AA compliant with zero breaking changes. Production-ready quality.

**Session 6 (2025-11-14)**: Configured Tailwind with complete movie theater design system and applied it to authentication pages. Added all CSS variables (warm-red, star-yellow, rating colors, backgrounds, borders, text) to globals.css. Extended Tailwind config with custom colors, spacing, and typography. Used design-reviewer agent to audit auth pages, finding 12+ issues. Implemented quick wins: fixed touch targets (36px→44px WCAG AA), prevented iOS auto-zoom (16px font minimum), replaced hardcoded colors with design system semantics, rewrote FormError with proper ARIA, rebuilt OAuth panel with Button component. Fixed 9 TypeScript build errors (optional searchParams, null checks, JWT Claims interface). Auth flow now 95% design system compliant, WCAG AA accessible, mobile-optimized. Build succeeds with zero errors.

**Session 5 (2025-11-14)**: Major infrastructure session establishing comprehensive security and design systems. Created 4 security auditor agents (frontend, backend, infrastructure) with security coordinator for orchestration. Built complete design system with movie theater aesthetic (deep red curtains + pastel yellow stars) including color palette, typography, spacing, rating systems, and accessibility standards (WCAG AAA). Created design-reviewer agent for quality assurance. Enhanced all implementation agents with production security standards. Optimized all agents for LLM comprehension using IF-THEN logic. Completely rewrote README.md. Created `/audit` and `/implement` commands. Added security tracking files.

## 🚧 Known Issues & Blockers

None blocking production. Design system implementation complete for auth, dashboard, and profile pages. Royal red curtain background applied globally. Ready for component library and feature development.

**Work Ready for Implementation:**
- Component library specifications ready (star rating, movie cards, badges)
- Security audit system created but not yet tested with real codebase
- Auth components (PasswordRequirements, AuthDivider) ready for extraction

**Minor Improvements (Low Priority):**
- Light mode link contrast (star-yellow ~3:1, need 4.5:1 for WCAG AA)
- Profile avatar border weight (4px could be 2px for subtlety)
- Loading skeleton states (currently just "Loading..." text)
- Avatar upload UI (avatar displays but no upload mechanism visible)

## ⚡ Important Notes for Next Session

- **Complete Design System Available**: See `.context/design-system.md` for full specifications (colors, typography, spacing, components, accessibility)
- **Movie Theater Aesthetic**: Deep red hsl(355 70% 45%) + pastel yellow hsl(45 85% 75%) for warm, inviting brand
- **Royal Red Curtain**: Global `.bg-curtain-folds` background with vertical theater drape pattern (45-50% saturation)
- **Dynamic Profile Gradients**: Canvas API extracts dominant color from user avatars, creates personalized gradients
- **Link Styling System**: `.link-gold` utility class (star-yellow, always underlined, 11.07:1 contrast in dark mode)
- **Layout Consistency**: Every div must justify semantic, styling, or functional purpose (removed 3 redundant divs)
- **Security Audit System Ready**: Use `/audit` command for comprehensive vulnerability scanning across all layers
- **4 Security Auditors**: Frontend (XSS, secrets, auth bypass), Backend (SQL injection, RLS bypass), Infrastructure (exposed ports, weak secrets), Coordinator (orchestration)
- **Design Reviewer Agent**: Validates components against design system, ensures accessibility and brand consistency
- **All Agents Optimized**: IF-THEN decision logic for better LLM reliability, production standards embedded
- **Feature Implementation**: Use `/implement` command for features spanning frontend and backend
- **Agent Authority**: full-stack-integrator is now "Production-Quality Gatekeeper" with decision-making power
- **Security Mindset Separation**: Security auditors (critical) vs implementation agents (constructive) have clean separation

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
