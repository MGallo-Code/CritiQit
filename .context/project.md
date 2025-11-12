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
- No rate limiting implemented yet - critical for production

**Realtime:**
- Profile table has realtime publication enabled
- Be mindful of subscription overhead if scaling

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

CritiQit uses a custom agent orchestration system for complex development tasks. The system is located in `.claude/agents/` and includes specialized agents for different aspects of the monorepo.

### Available Agents

**Frontend Developer (Blue)** - `frontend-dev.md`
- Next.js and React specialist
- Handles UI components, routing, state management
- Expertise in TypeScript, Tailwind, Radix UI

**Backend Developer (Green)** - `backend-dev.md`
- Supabase and PostgreSQL specialist
- Handles database schema, RLS policies, auth, storage
- Expertise in SQL, migrations, edge functions

**Full-Stack Integrator (Purple)** - `full-stack-integrator.md`
- Orchestrates features spanning frontend and backend
- Uses consultation-first pattern: asks specialists for recommendations before planning
- Synthesizes unified API contracts and type definitions
- Delegates implementation to appropriate specialists

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

## Related Documentation

- **Agent system guide**: [agents-guide.md](./agents-guide.md)
- **Backend specifics**: [backend.md](./backend.md)
- **Frontend specifics**: [frontend.md](./frontend.md)
- **Session history**: [sessions.md](./sessions.md)
- **LLM context files**: [CLAUDE.md](./CLAUDE.md), [GEMINI.md](./GEMINI.md), [AGENTS.md](./AGENTS.md)