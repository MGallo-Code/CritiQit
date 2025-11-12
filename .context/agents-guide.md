# CritiQit Custom Agents Guide

This document explains the custom Claude Code agents configured for the CritiQit project.

---

## Overview

CritiQit uses specialized agents to handle different aspects of the codebase efficiently. The agent system follows an **orchestration pattern** where specialist agents focus on specific domains, and an integration agent coordinates complex cross-workspace features.

## Agent Architecture

```
┌─────────────────────────────────────┐
│   full-stack-integrator             │
│   (Orchestrator)                    │
│   - Plans end-to-end features       │
│   - Coordinates between workspaces  │
│   - Ensures type safety             │
└───────┬─────────────────────┬───────┘
        │                     │
        ▼                     ▼
┌───────────────┐     ┌───────────────┐
│ frontend-dev  │     │ backend-dev   │
│ (Specialist)  │     │ (Specialist)  │
│ - Next.js     │     │ - Supabase    │
│ - React       │     │ - PostgreSQL  │
│ - UI/UX       │     │ - RLS         │
└───────────────┘     └───────────────┘
        │                     │
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
         ┌─────────────────┐
         │ session-manager  │
         │ (Documentation) │
         └─────────────────┘
```

---

## Specialist Agents

### 1. Frontend Development Agent

**File**: `.claude/agents/frontend-dev.md`
**Name**: `frontend-dev`
**Color**: Blue
**Model**: Sonnet

**Domain**:
- `frontend/` workspace only
- Next.js 15 with App Router
- React 19 components
- Tailwind CSS + Radix UI
- Client-side Supabase integration

**When to use**:
- Building/modifying React components
- Creating pages and layouts
- Implementing forms and validation
- Styling with Tailwind CSS
- Client-side state management
- Frontend auth flows

**Invocation examples**:
```bash
@frontend-dev Create a new comment form component with validation
@frontend-dev Update the profile page styling to match the new design
@frontend-dev Add dark mode support to the dashboard
```

**What it defers**:
- Database schema changes → backend-dev
- RLS policies → backend-dev
- End-to-end feature planning → full-stack-integrator

---

### 2. Backend Development Agent

**File**: `.claude/agents/backend-dev.md`
**Name**: `backend-dev`
**Color**: Green
**Model**: Sonnet

**Domain**:
- `supabase/` workspace only
- Self-hosted Supabase
- PostgreSQL database
- Row Level Security (RLS)
- Storage configuration
- Database migrations

**When to use**:
- Creating/modifying database tables
- Writing RLS policies
- Configuring storage buckets
- Creating database migrations
- Running Supabase CLI operations
- Auth configuration

**Invocation examples**:
```bash
@backend-dev Add a comments table with user_id foreign key
@backend-dev Create RLS policies for the comments table
@backend-dev Add a new storage bucket for post images
```

**What it defers**:
- UI components → frontend-dev
- Form implementation → frontend-dev
- End-to-end feature planning → full-stack-integrator

---

## Orchestrator Agent

### 3. Full-Stack Integration Agent

**File**: `.claude/agents/full-stack-integrator.md`
**Name**: `full-stack-integrator`
**Color**: Purple
**Model**: Sonnet

**Domain**:
- Cross-workspace coordination
- End-to-end feature implementation
- API contract design
- Type safety verification

**When to use**:
- Implementing complete features (e.g., "Add commenting system")
- Auth flows spanning frontend + backend
- New data models with corresponding UI
- Rate limiting across both workspaces
- Type safety verification
- Coordinating breaking changes

**How it works**:
1. **Analyzes** the feature request and reads context
2. **Consults** frontend-dev and backend-dev agents in parallel (asks for recommendations)
3. **Reviews** specialist recommendations and resolves conflicts
4. **Plans** the integrated approach with unified types and API contracts
5. **Delegates** implementation tasks to specialist agents
6. **Coordinates** execution (parallel or sequential as needed)
7. **Verifies** type safety, API alignment, and end-to-end integration

**Invocation examples**:
```bash
@full-stack-integrator Implement a commenting system with CRUD operations
@full-stack-integrator Add rate limiting to all Supabase API calls
@full-stack-integrator Create a new post submission flow with image uploads
```

**Delegation patterns**:
- **Parallel**: Independent frontend/backend tasks
- **Sequential**: Backend first (defines API), then frontend (consumes API)
- **Coordinated**: Ensures types and contracts match

---

## Documentation Agent

### 4. Session Manager Agent

**File**: `.claude/agents/session-manager.md`
**Name**: `session-manager`
**Color**: Red
**Model**: Sonnet

**Domain**:
- `.context/` directory
- Session documentation
- Context file synchronization

**Operating modes**:

#### UPDATE MODE (via `/update-session`)
- Updates only `sessions.md` with incremental progress
- Use mid-session to capture work before moving on
- Does NOT finalize context files

#### FINALIZE MODE (via `/save-session`)
- Updates all context files (sessions.md, CLAUDE.md, GEMINI.md, AGENTS.md)
- Updates specialized files if needed (project.md, backend.md, frontend.md)
- Generates commit message suggestion
- Use at end of session

**Invocation examples**:
```bash
/update-session    # Mid-session documentation
/save-session      # End-of-session finalization
```

---

## Slash Commands

### `/update-session`

**Purpose**: Incrementally document current progress without finalizing the session.

**What it does**:
- Invokes `session-manager` agent in UPDATE MODE
- Updates only `.context/sessions.md`
- Captures accomplishments, decisions, lessons so far
- Marks work as [IN PROGRESS]

**Use when**:
- You've completed a significant chunk of work
- You want to document before switching tasks
- You need to capture lessons learned mid-session

**Output**:
- Updated sessions.md entry
- Reminder to use `/save-session` when fully done

---

### `/save-session`

**Purpose**: Finalize and close the current coding session with complete documentation.

**What it does**:
- Invokes `session-manager` agent in FINALIZE MODE
- Updates all context files:
  - `sessions.md` (completes entry)
  - `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` (synchronized)
  - Specialized files if applicable (project.md, backend.md, frontend.md)
- Generates commit message suggestion

**Use when**:
- You're done working for the day
- You've completed a significant milestone
- You're ready to commit documentation changes

**Output**:
- Fully updated context files
- Commit message suggestion
- Offer to create commit (optional)

---

### `/load`

**Purpose**: Load project context at the start of a session.

**What it does**:
- Reads `.context/CLAUDE.md` for current state
- Shows current goals and priorities
- Displays known issues and blockers
- Reviews immediate next steps

**Use when**:
- Starting a new coding session
- Need reminder of project state
- Want to see priorities

---

## Usage Patterns

### Pattern 1: Simple Frontend Task

```bash
# User request
"Update the login form styling"

# Best approach
@frontend-dev Update the login form styling to match the new design system
```

**Why**: Single-workspace task, frontend-only concern.

---

### Pattern 2: Simple Backend Task

```bash
# User request
"Add an index to the user_id column in comments table"

# Best approach
@backend-dev Add an index to the user_id column in comments table for better query performance
```

**Why**: Single-workspace task, backend-only concern.

---

### Pattern 3: End-to-End Feature

```bash
# User request
"Implement a commenting system"

# Best approach
@full-stack-integrator Implement a commenting system with:
- Comments table with RLS policies
- CRUD API operations
- Comment form and list components
- Real-time updates
```

**Why**: Spans both workspaces, needs coordination, type safety matters.

**What happens**:
1. Integration agent **consults** both specialists in parallel:
   - Asks frontend-dev: "Best approach for commenting UI?"
   - Asks backend-dev: "Best schema for comments?"
2. **Reviews** recommendations and creates integrated plan
3. **Delegates** to backend-dev: Create table, RLS, CRUD (with agreed schema)
4. **Waits** for backend completion, extracts types
5. **Delegates** to frontend-dev: Create components using backend types
6. **Verifies** types and API contracts align perfectly
7. **Confirms** end-to-end functionality works

---

### Pattern 4: Mid-Session Documentation

```bash
# Scenario: Just finished implementing comments backend
/update-session

# Agent captures progress so far
# User continues with frontend work

# Later, when fully done
/save-session

# Agent finalizes all documentation
```

**Why**: Captures progress incrementally, finalizes at end.

---

### Pattern 5: Session Start → Work → Session End

```bash
# 1. Start session
/load

# 2. Work on tasks (using agents as needed)
@full-stack-integrator Implement rate limiting
# ... agent works ...

@frontend-dev Fix styling issues in dashboard
# ... agent works ...

# 3. Mid-way documentation (optional)
/update-session

# 4. More work
@backend-dev Add cascade delete for user storage objects

# 5. End session
/save-session

# 6. Commit documentation
git add .context/
git commit -m "docs: add session N with rate limiting and fixes"
```

---

## Agent Selection Guide

Use this flowchart to decide which agent to invoke:

```
Is it an end-to-end feature spanning frontend + backend?
├─ YES → Use @full-stack-integrator
└─ NO
    ├─ Is it frontend work (UI, components, styling)?
    │   └─ YES → Use @frontend-dev
    │
    ├─ Is it backend work (database, RLS, migrations)?
    │   └─ YES → Use @backend-dev
    │
    └─ Is it documentation/session work?
        ├─ Mid-session → Use /update-session
        └─ End session → Use /save-session
```

---

## Best Practices

### 1. Trust the Specialists
- Don't micromanage - let agents do what they're specialized for
- Provide clear requirements and constraints
- Let agents make technical decisions within their domain

### 2. Use the Orchestrator for Coordination
- Don't manually coordinate frontend/backend yourself
- Let `full-stack-integrator` plan and delegate
- It ensures type safety and API alignment

### 3. Document Incrementally
- Use `/update-session` after significant milestones
- Capture lessons learned while fresh in mind
- Use `/save-session` at actual end of session

### 4. Be Specific
- Give clear, actionable tasks to agents
- Provide context (why this is needed)
- Specify any constraints or requirements

### 5. Review Agent Output
- Agents are powerful but not perfect
- Review generated code and decisions
- Provide feedback if something isn't right

---

## Tips & Tricks

### Running Agents in Parallel

When tasks are independent, the integration agent runs specialists in parallel:

```bash
@full-stack-integrator Add bio field to profiles
# Backend-dev and frontend-dev run simultaneously
```

### Sequential Delegation

For dependent tasks, integration agent runs sequentially:

```bash
@full-stack-integrator Implement comment reactions
# 1. backend-dev creates reactions table (wait)
# 2. frontend-dev creates reaction buttons (uses backend types)
```

### Direct Invocation vs Main Conversation

**Direct invocation** (`@agent-name`):
- Spawns a sub-agent
- Returns result when done
- Good for focused, delegated tasks

**Main conversation**:
- No @ prefix
- I (main Claude) handle it directly
- Good for simple questions, coordination

---

## Troubleshooting

### Agent doesn't seem to understand context

**Solution**: Agents read `.context/` files on initialization. Ensure context files are up to date with `/save-session`.

### Integration agent isn't delegating

**Possible cause**: Task might be too simple. Integration agent only delegates when needed.

### Agents conflict or duplicate work

**Rare**: If this happens, the integration agent should coordinate. Report if you see this pattern.

### Session-manager missing information

**Solution**: Provide clarification when asked. The agent gathers context from git changes but may need your input on decisions/rationale.

---

## File Locations

**Agents**:
- `.claude/agents/frontend-dev.md`
- `.claude/agents/backend-dev.md`
- `.claude/agents/full-stack-integrator.md`
- `.claude/agents/session-manager.md`

**Commands**:
- `.claude/commands/load.md`
- `.claude/commands/update-session.md`
- `.claude/commands/save-session.md`

**Context Files**:
- `.context/CLAUDE.md` (main context, identical to GEMINI.md and AGENTS.md)
- `.context/sessions.md` (detailed session history)
- `.context/project.md` (project structure and tech stack)
- `.context/backend.md` (Supabase/PostgreSQL specifics)
- `.context/frontend.md` (Next.js/React specifics)
- `.context/agents-guide.md` (this file)

---

## Future Additions

Consider adding these agents as the project grows:

- **testing-agent**: Specialized in writing tests, test patterns, coverage
- **security-agent**: Focus on security audits, vulnerability scanning, RLS validation
- **performance-agent**: Optimization, profiling, bundle analysis
- **devops-agent**: Deployment, CI/CD, infrastructure

---

## Related Documentation

- **Project overview**: [project.md](./project.md)
- **Backend details**: [backend.md](./backend.md)
- **Frontend details**: [frontend.md](./frontend.md)
- **Session history**: [sessions.md](./sessions.md)
- **Main context**: [CLAUDE.md](./CLAUDE.md)
