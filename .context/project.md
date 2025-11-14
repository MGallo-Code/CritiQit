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
├── frontend/           # Next.js workspace (yarn workspace)
├── supabase/          # Self-hosted Supabase backend (not a workspace)
└── .context/          # Documentation and context files
```

**Important**: Only `frontend/` is a yarn workspace. The `supabase/` directory operates independently with Docker Compose.

### Domain Configuration

**Production Domains:**
- Frontend: `critiqit.io`
- Backend: `api.critiqit.io`

**Development (via Cloudflare Tunnels):**
- Frontend: `critiqit.io` → `localhost:3001`
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
- **Realtime**: Supabase Realtime (profile table subscriptions enabled)
- **Edge Functions**: Cloudflare Turnstile verification function
- **Extensions**: pgjwt for JWT handling

### DevOps & Tools
- **Containerization**: Docker Compose
- **Tunneling**: Cloudflare cloudflared
- **Package Manager**: Yarn (workspaces)
- **Version Control**: Git

---

## Database Schema

### Tables

**`public.profiles`**
- `id` (uuid, PK, FK to auth.users)
- `username` (text, unique, 3-35 chars)
- `full_name` (text, 3-100 chars)
- `bio` (text, max 800 chars)
- `avatar_url` (text, max 2048 chars)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Storage Buckets

**`avatars`** (public)
- User profile avatars
- RLS policies for user-owned uploads/updates/deletes

**`email-templates`** (public)
- Email templates for auth flows
- Admin and service_role upload access

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
yarn dev
# Runs on localhost:3001 with Turbopack
```

### Database Management Scripts

Located in `supabase/`:
- **`reset-hard-db.sh`**: Complete database reset with migrations
- **`reset-soft-db.sh`**: Soft reset preserving some data
- **`restart-db.sh`**: Restart Docker containers
- **`upload-templates.sh`**: Upload email templates to storage

### Supabase CLI Usage

Always use these patterns:
```bash
cd supabase  # Must be in supabase directory
supabase db reset --debug --db-url [connection-string]
supabase db push --debug --db-url [connection-string]
```

**Critical**: Use `supabase_admin` user, NOT default `postgres` user (permission issues).

---

## Key Lessons & Gotchas

### Supabase Backend

**CLI Authentication:**
- Always use `--db-url` with full connection string
- Use `supabase_admin` as database user (postgres user has permission issues)
- Always include `--debug` flag due to SSL issues

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
- Profile table has realtime publication enabled
- Be mindful of subscription overhead if scaling

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

### Overview

CritiQit uses a custom agent orchestration system for complex development tasks. The system is located in `.claude/agents/` and includes specialized agents for different aspects of the monorepo. All agents follow production-quality standards emphasizing clarity over cleverness, efficiency by default, and intuitive design.

### Available Agents

**Frontend Developer (Blue)** - `frontend-dev.md`
- Next.js and React specialist
- Handles UI components, routing, state management
- Expertise in TypeScript, Tailwind, Radix UI
- Follows production standards: clarity over cleverness, efficiency by default, intuitive design

**Backend Developer (Green)** - `backend-dev.md`
- Supabase and PostgreSQL specialist
- Handles database schema, RLS policies, auth, storage
- Expertise in SQL, migrations, edge functions
- Follows production standards: security-first, self-documenting code, fail-safe defaults

**Full-Stack Integrator (Purple)** - `full-stack-integrator.md`
- Orchestrates features spanning frontend and backend
- Uses consultation-first pattern: asks specialists for recommendations before planning
- Synthesizes unified API contracts and type definitions
- Delegates implementation to appropriate specialists
- Performs security audits and architectural reviews

**Session Manager (Red)** - `session-manager.md`
- Handles session documentation in two modes:
  - UPDATE: Incremental session notes during work
  - FINALIZE: Complete session closure with full documentation

### Usage Pattern

For features requiring both frontend and backend work:

1. Invoke `full-stack-integrator` agent
2. Agent consults `frontend-dev` and `backend-dev` in parallel
3. Agent synthesizes recommendations into unified plan
4. Agent delegates implementation tasks to specialists
5. Specialists execute work sequentially if dependencies exist

For frontend-only or backend-only work, invoke the appropriate specialist directly.

### Key Innovation: Consultation-First

The integrator doesn't assume what the architecture should be. Instead, it:
- Asks both specialists for their recommendations in parallel
- Identifies conflicts or mismatches in their proposals
- Synthesizes a unified API contract with explicit types
- Ensures type safety and architectural consistency up front

This prevents rework and ensures domain expertise is applied from the start.

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
- Create slash commands for common complex workflows (`/audit`, `/implement`)
- Reduces cognitive load and ensures consistent execution
- Streamlines multi-agent orchestration
- Better than always invoking agents manually

---

## Related Documentation

- **Design system**: [design-system.md](./design-system.md)
- **Agent system guide**: [agents-guide.md](./agents-guide.md)
- **Backend specifics**: [backend.md](./backend.md)
- **Frontend specifics**: [frontend.md](./frontend.md)
- **Session history**: [sessions.md](./sessions.md)
- **LLM context files**: [CLAUDE.md](./CLAUDE.md), [GEMINI.md](./GEMINI.md), [AGENTS.md](./AGENTS.md)