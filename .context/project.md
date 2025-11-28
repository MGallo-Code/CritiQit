# CritiQit Project Overview

This file contains high-level project information, tech stack details, and lessons learned that span both frontend and backend.

---

## Project Description

CritiQit is a critique and review platform built as a monorepo with a self-hosted Supabase backend and Next.js frontend. The platform enables user authentication, profile management, and is designed to scale for review/critique functionality.

---

## Architecture & Infrastructure

### Monorepo Structure

```
CritiQit/
├── frontend/           # Next.js app (managed with npm)
├── supabase/          # Self-hosted Supabase backend (Docker Compose)
└── .context/          # Documentation and context files
```

**Important**: Use npm for all package management. The `supabase/` directory operates independently with Docker Compose.

### Domain Configuration

**Production Domains:**
- Frontend: `critiqit.io`
- Backend: `api.critiqit.io`

**Development (via Cloudflare Tunnels):**
- Frontend: `critiqit.io` → `localhost:3000`
- Backend: `api.critiqit.io` → `localhost:8000`

The Cloudflare tunnel setup allows consistent domain usage across development and production, eliminating CORS issues and providing a production-like environment locally.

---

## Tech Stack

### Frontend (`frontend/`)
- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19
- **Styling**: Tailwind CSS with tailwindcss-animate
- **UI Components**: Radix UI primitives (@radix-ui/react-*)
- **Icons**: Lucide React, React Icons
- **Theme**: next-themes for dark/light mode
- **Backend Client**: @supabase/ssr, @supabase/supabase-js
- **Security**: @marsidev/react-turnstile (Cloudflare Turnstile captcha)
- **Type Safety**: TypeScript
- **Dev Server**: Turbopack (--turbopack flag)

### Backend (`supabase/`)
- **Platform**: Self-hosted Supabase (Docker Compose)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage (public buckets for avatars)
- **Auth**: Supabase Auth with OAuth providers
- **API Gateway**: Kong 3.9 with custom three-tier rate limiting plugin
- **Realtime**: Disabled (not needed for CritiQit - reduces resources and complexity)
- **Edge Functions**: Deno-based (OTP verification, etc.)
- **Extensions**: pgjwt for JWT handling

### DevOps & Tools
- **Containerization**: Docker Compose (development + production)
- **Tunneling**: Cloudflare cloudflared (free SSL + CDN + DDoS protection)
- **Package Manager**: npm (NOT yarn - always use npm)
- **Version Control**: Git

### Deployment Philosophy

**CritiQit prioritizes cost-effective, self-hosted infrastructure over managed platforms.**

**Core Principles:**
1. **Cost Predictability**: Fixed monthly costs ($5-20/month) vs unpredictable bandwidth charges
2. **Full Control**: Direct access to logs, metrics, configuration, and troubleshooting
3. **Learning Value**: DevOps experience with production-ready infrastructure
4. **Professional Quality**: Production-grade security and scalability at fraction of cost
5. **No Vendor Lock-In**: Complete portability and infrastructure ownership

**Why NOT Vercel/Managed Platforms:**
- Vercel: $200-400/month at scale due to bandwidth costs ($40 per 100GB overage)
- Managed platforms charge for convenience, not resources
- CritiQit's lightweight design doesn't justify managed platform costs
- Self-hosting teaches valuable DevOps skills for engineering career

**Infrastructure Stack (Production):**
- **VPS**: Hetzner Cloud (€4.15/month for 2GB RAM) or DigitalOcean ($6/month)
- **Frontend**: Docker container running Next.js with `output: 'standalone'` (~150MB image)
- **Backend**: Self-hosted Supabase via Docker Compose (existing setup)
- **CDN**: Cloudflare Tunnel provides free SSL, DDoS protection, unlimited bandwidth, caching
- **Monitoring**: Cloudflare Analytics (free) + Docker logs

**Total Monthly Cost**: ~$5-20/month for complete stack
- VPS: €4-8/month (depending on RAM)
- Cloudflare: $0/month (free tier covers everything)
- Domain: ~$15/year (separate)

**Cost Comparison:**
- Self-Hosted Stack: $5-20/month (fixed)
- Vercel (at 1M visitors): $200-400/month (variable, unpredictable)
- Savings: ~$180-380/month ($2,160-4,560/year)

**Cloudflare Tunnel Replaces:**
- Vercel Edge Network ($0 cost)
- SSL/TLS certificates (Let's Encrypt integration)
- DDoS protection (automatic)
- CDN caching for static assets (unlimited bandwidth)
- Web Application Firewall (basic)

**Deployment Options:**
1. **Docker Compose** (recommended): Uncomment frontend service in `supabase/compose.yml`
2. **Standalone Docker**: Build and run frontend container separately
3. **Direct Node.js**: Run `npm run build && npm start` on VPS

**Resource Requirements:**
- Minimum (1,000 users): 2GB RAM, 2 CPU cores
- Recommended (10,000 users): 4GB RAM, 4 CPU cores
- Scaling: Horizontal with load balancer beyond 10k users

**Design Decisions Impacted by Self-Hosting:**
- Next.js `output: 'standalone'` for minimal production build
- No Vercel-specific features (Edge Functions, Edge Middleware variants)
- Image optimization uses Next.js built-in (works self-hosted)
- All services colocated or on separate VPS (no serverless functions)
- Direct Docker access for logs, metrics, debugging

---

## Database Schema

**See [backend.md](./backend.md) for complete database schema, RLS policies, and storage configuration.**

---

## Development Workflow

### Starting the Application

**Backend (Supabase):**
```bash
cd supabase
docker compose up -d
```

**Frontend:**
```bash
cd frontend
npm run dev
# Runs on localhost:3000 with Turbopack
```

### Database Management (./db CLI Tool)

**⚠️ CRITICAL: Always use `./db` CLI tool, NEVER direct Supabase commands**

Located at `supabase/db`:
```bash
cd supabase/
./db start          # Start containers
./db stop           # Stop containers
./db restart        # Restart (reloads .env)
./db reset hard     # Complete reset (DESTRUCTIVE - ask user first)
./db reset soft     # Soft reset preserving volumes
./db seed           # Upload seed data
./db status         # Check health
./db migrate        # Apply new migrations
./db help           # Show all commands
```

**Why:** Direct Supabase CLI commands bypass safety checks, corrupt state, and don't source environment correctly.

---

## Key Lessons & Gotchas

### Supabase Backend

**Database Management:**
- ⚠️ ALWAYS use `./db` CLI tool, NEVER direct Supabase commands
- Run from `supabase/` directory (or use `./db` which auto-navigates)
- Ask user before `./db reset hard` (DESTRUCTIVE)

**RLS Policies:**
- `USING` clause: Controls which rows are visible (SELECT operations)
- `WITH CHECK` clause: Controls which rows can be modified (INSERT/UPDATE/DELETE)
- Mixing these up creates subtle security vulnerabilities

**Storage:**
- Public bucket URLs differ by operation:
  - GET: `${API_EXTERNAL_URL}/storage/v1/object/public/${bucket}/${filepath}`
  - POST: `${API_EXTERNAL_URL}/storage/v1/object/${bucket}/${filepath}`
- Images cache aggressively - use `?version=number` query param to bypass
- **Cannot delete users who own storage objects** - need cascade deletion strategy

**Migrations:**
- Keep migrations simple - no complex functions
- Let migrations only create tables, policies, and basic triggers
- Avoid "fancy function shit" that breaks on subsequent runs

**Configuration:**
- Enable features through environment variables in `compose.yml`
- Don't rely on GUI for configuration changes

### Frontend

**User Provider Pattern:**
- `CurrentUserProvider` deduplicates requests using a ref-based promise cache
- Only syncs on specific auth events: SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED
- Syncs on tab visibility change to keep stale tabs fresh
- Initial user can be passed from server to avoid flash of loading state

**Domain Setup:**
- Cloudflare tunnels connect localhost to production domains
- Run `cloudflared tunnel` to map any port to any domain
- Eliminates CORS issues in development

### General

**Security:**
- Using test Turnstile captcha key for development
- Must restore production key before launch
- Three-tier rate limiting implemented (IP-based, content-based, user-based)
- Rate limiting prevents credential stuffing, brute force, account enumeration, and DoS attacks

**Realtime:**
- Intentionally disabled for CritiQit (not needed, reduces resources/battery/complexity)
- Auth state changes still work (`onAuthStateChange` is local to client)
- Profile updates use visibility-change refresh pattern instead

### Cross-Workspace Integration

**Error Handling Consistency:**
- Frontend must handle different error structures from different backend sources
- Direct Supabase auth calls: Synchronous errors with .message and .status properties
- Edge Function calls: Asynchronous errors requiring await error.context.json()
- Created dual parsing utilities (parseAuthError vs parseEdgeFunctionError) to handle both patterns
- Lesson: Always verify error structure when integrating new backend services

**Rate Limiting Architecture:**
- Backend: Kong plugin v3.0.0 (production-ready, security audited, 400+ lines inline docs)
- Frontend: Countdown timers and form disabling for rate limit errors
- Content-based rate limiting closes service_role bypass vulnerability
- GraphQL and Analytics endpoints now protected
- Kong log level: info (prevents sensitive data exposure in production)
- Service role bypass fixed (passes key via config, not environment variable)
- Lesson: Production systems need comprehensive inline documentation explaining WHY, not WHAT
- Lesson: Log level security matters - debug logs can expose passwords, emails, and tokens

**Service Role Security:**
- Backend service_role key bypasses all authentication and rate limiting
- Edge Functions using service_role must implement their own protection
- Content-based rate limiting intercepts requests before proxy, closing the gap
- Service role key must be passed via plugin config (os.getenv() doesn't work in Kong Lua)
- Lesson: Understand the full authentication flow including internal service calls when designing security layers
- Lesson: Environment variables are unreliable in Kong plugins - always use plugin config fields

---

## API Reference

### Supabase Management API
- Base URL: `https://api.supabase.com/api/v1`

### Storage Constraints
- Cannot delete users who own storage objects
- Need to implement cascade deletion or transfer ownership

---

## Environment Variables

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key

### Backend (`supabase/.env`)
- Various Supabase service configuration
- JWT secrets
- SMTP settings
- OAuth provider credentials
- Storage configuration

**Security Note**: Never commit actual values. Document variable names and purpose only.

---

## Custom Agent System

CritiQit uses specialized agents located in `.claude/agents/` for complex development tasks:

**Available Agents:**
- `backend-dev` - Supabase, PostgreSQL, RLS, migrations, Kong
- `frontend-dev` - Next.js, React, Tailwind, UI components
- `full-stack-integrator` - Orchestrates features spanning both workspaces
- `session-manager` - Documentation and session tracking
- Security auditors - Vulnerability scanning (frontend, backend, infrastructure)

**Usage:**
- Direct agent invocation - Use Task tool with appropriate agent type
- `/audit` - Security vulnerability scanning

**Architecture Pattern:**
- Agent files (`.claude/agents/`) - WHO/HOW/workflow (behavior and decision logic)
- Context files (`.context/`) - WHAT/WHY/technical (patterns and implementation details)
- Agents reference context docs for technical patterns (no redundancy)

---

---

## Project-Wide Lessons Learned

### Agent System & LLM Optimization

**1. LLM Instruction Format - IF-THEN Logic (Session 5)**
- Prose descriptions are for humans, structured conditionals are for LLMs
- Format: "IF condition THEN action ELSE alternative" improves agent reliability significantly
- Execution protocols with clear role definitions remove ambiguity
- Remove poetic language like "conductor of orchestra" - LLMs need precision, not metaphors
- Example transformation:
  - Before: "You coordinate work between specialists like a conductor leading an orchestra"
  - After: "IF feature spans frontend AND backend THEN consult both specialists in parallel"

**2. Agent Scope Clarity & Mindset Separation (Session 5)**
- Security auditors: Critical mindset, assume everything is vulnerable, find problems
- Implementation agents: Constructive mindset, security-aware but focused on building
- Design reviewers: Quality mindset, provide feedback without implementing
- Clear separation prevents cognitive dissonance and mixed messages
- Can't audit and implement simultaneously without role confusion
- Separate agents allow full commitment to each mindset

**3. Agent Authority Matters (Session 5)**
- Coordinator without authority becomes messenger (not valuable)
- Gatekeeper with decision-making power enforces quality
- Authority must be explicit in agent instructions
- "Architectural Authority" role for full-stack-integrator enables hard decisions
- True synthesis of specialist knowledge vs simple delegation

**4. Documentation Hierarchy (Session 5)**
- README.md: Newcomer onboarding and project overview
- CLAUDE.md/GEMINI.md/AGENTS.md: Session-to-session continuity and immediate context
- design-system.md: Implementation reference and specifications
- backend.md/frontend.md: Deep dives into domain-specific patterns
- sessions.md: Historical record of decisions and lessons
- Specialized files reduce clutter in main context while preserving detail

### Design & Development Standards

**5. Design System Completeness (Session 5)**
- Comprehensive specifications prevent interpretation gaps during implementation
- Include rationale (e.g., "movie theater aesthetic") to aid consistency decisions
- Mobile-first breakpoints crucial for responsive design from start
- Accessibility (WCAG AAA) baked in from beginning, not retrofitted
- Color palette needs semantic names AND values for developer clarity

**6. Production-Ready Documentation (Sessions 4-5)**
- Self-documenting code with inline comments superior to separate architecture docs
- Documentation explains WHY decisions were made, not WHAT code does
- Inline docs stay in sync with code, visible during 2am debugging
- Focus on rationale: "Why this design?" "Why this rate limit?" "Why fail-open?"
- 400+ lines of inline documentation in Kong plugin demonstrates value

### Development Workflow

**7. Command-Based Workflows (Session 5)**
- Create slash commands for common complex workflows (e.g., `/audit`)
- Reduces cognitive load and ensures consistent execution
- Streamlines multi-agent orchestration
- Better than always invoking agents manually

### UI/UX Patterns & Design Implementation

**8. Utility Classes vs Components (Session 7)**
- For simple patterns like styled links, CSS utility classes beat React components
- Zero JS overhead, instant application, globally available in globals.css
- Components add unnecessary complexity for simple styling patterns
- Example: `.link-gold` utility eliminates 150+ characters of repetition

**9. Color Extraction Performance (Session 7)**
- Canvas API color extraction is surprisingly fast (~1ms for 50x50px sampling)
- No performance concerns with real-time extraction
- Always implement graceful CORS fallbacks for external images
- Client-side extraction avoids server processing and enables instant updates

**10. Responsive Layout Simplification (Session 7)**
- Keep consistent overlap ratios across breakpoints (e.g., 50% on mobile and desktop)
- Separate containers for overlapping elements (avatar separate from text)
- Avoid complex different-margin-per-breakpoint approaches
- Simpler structure = easier to maintain and reason about

**11. Layout Div Discipline (Session 7)**
- Redundant divs accumulate easily without vigilance during development
- Establish principle: Every div must justify semantic, styling, or functional purpose
- Question every wrapper div during code review
- Example: Protected layout reduced from 12 lines to 5 lines (58%) by removing unnecessary wrappers

**12. Contrast Testing Across Modes (Session 7)**
- Always test contrast ratios in both dark and light modes
- Colors that work great in one mode may fail WCAG in the other
- Example: Star-yellow achieves 11.07:1 (WCAG AAA) in dark mode but only ~3:1 in light mode
- Prioritize primary mode but document limitations for secondary mode

**13. CSS Variable Theme Tokens (Session 7)**
- Adding colors to CSS variables enables theme adjustments without touching components
- Example: curtain-bg, curtain-highlight, curtain-shadow for easy theme tweaks
- Theme tokens pay dividends for consistency across entire application
- Easier to maintain and adjust than hardcoded values

**14. Saturation Impact on Warmth (Session 7)**
- Low saturation (25%) can look washed out and gray even with correct hue
- 45-50% saturation achieves rich theatrical red while remaining professional
- Saturation dramatically affects warmth perception, not just color intensity
- Test different saturation levels to find balance between impact and professionalism

### API Gateway & Infrastructure

**15. Kong strip_path Routing Behavior (Session 8)**
- `strip_path: false` keeps entire matched path → causes duplication when base URL includes path segments
- `strip_path: true` removes matched prefix → allows clean path transformation between external and internal paths
- Pattern: External request `/storage/v1/object/public/avatars/foo.jpg` → Kong strips `/storage/v1/object/public` → forwards `/avatars/foo.jpg` to `http://storage:5000/`
- Always test both upload (POST) and retrieval (GET) flows when changing API gateway routing
- 400 errors don't always indicate root cause - trace full request path to debug
- Example: Route with `strip_path: false` and URL `http://storage:5000/storage/v1/object/public` causes path duplication: `/storage/v1/object/public/storage/v1/object/public`

### Backend Patterns

**16. Race Conditions in Storage Operations (Session 8)**
- Delete-then-upload patterns create windows where data can be lost on failure
- Atomic upsert operations are safer and simpler (single operation, no failure window)
- Always ask: "What happens if this step fails?" when designing multi-step operations
- User testing catches these issues - Michael identified race condition risk immediately
- Example: Avatar upload changed from delete-then-upload to `upsert: true` to preserve existing avatar on failure
- Requires both INSERT and UPDATE RLS policies for atomic upsert to work

**17. PostgreSQL Control File Corruption (Session 8)**
- "checkpoint request failed" loop indicates corrupted pg_control file
- Resolution: Full database reset with reset-hard-db.sh
- Prevention: Proper Docker volume management and graceful container shutdowns
- Trade-off: Development data loss acceptable vs production recovery complexity

**18. Safari HEIC Image Processing and Web Worker Stability (Session 8)**
- Safari automatically converts HEIC photos to JPEG when selecting from photo library
- Creates temp files like `tempImagesijlJK.jpg` with MIME type `image/jpeg`
- These Safari-converted JPEGs crash Web Worker-based image processing in browser-image-compression
- Solution: Disable Web Workers (`useWebWorker: false`) for more stable main-thread processing
- Trade-off: Slightly slower compression but eliminates page crashes for iOS users
- Detection via file.name pattern necessary since MIME type appears as standard JPEG
- Always wrap createObjectURL and image processing in try-catch for graceful error handling

### Documentation Architecture & Agent System

**19. Agent/Context File Separation Architecture (Session 9)**
- Separate agent behavior (WHO/HOW/workflow) from technical reference (WHAT/WHY/implementation)
- Agent files (`.claude/agents/`) contain: identity, decision logic, workflows, checklists (~300-400 lines)
- Context files (`.context/`) contain: complete technical details, code examples, patterns (as long as needed)
- Benefits: No redundancy, easy maintenance (update tech in context files without touching agents), focused agent instructions
- Orchestrator/specialist pattern: full-stack-integrator uses `🎯 ORCHESTRATOR MODE` header when delegating to specialists
- Specialists recognize the header and complete focused tasks without trying to coordinate across workspaces
- Result: 54% reduction in backend-dev.md (882→404 lines), 36% reduction in frontend-dev.md (711→458 lines), zero information loss

**20. Session Documentation Conciseness (Session 9)**
- sessions.md was bloated (118KB) with implementation details, code snippets, and verbose debugging narratives
- Solution: Keep session entries under 20 lines - just decisions, lessons (1 sentence each), and next steps
- Implementation details belong in code comments or specialized docs, NOT in sessions.md
- Lessons learned go in specialized files (project.md for cross-cutting, backend.md/frontend.md for specific)
- Use criteria: "Would a developer implementing a feature need to know this?" determines placement
- Sessions.md is an index pointing to detailed information, not a textbook containing it
- Updated session-manager agent to enforce this structure and prevent future bloat

---

## Related Documentation

- **Design system**: [design-system.md](./design-system.md)
- **Backend specifics**: [backend.md](./backend.md)
- **Frontend specifics**: [frontend.md](./frontend.md)
- **Session history**: [sessions.md](./sessions.md)
- **LLM context files**: [CLAUDE.md](./CLAUDE.md), [GEMINI.md](./GEMINI.md), [AGENTS.md](./AGENTS.md)