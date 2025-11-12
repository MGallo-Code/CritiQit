---
description: Finalize and close the current coding session. Updates all context files (CLAUDE.md, GEMINI.md, AGENTS.md), completes the session entry in sessions.md, updates specialized docs if needed, and generates a commit message suggestion. Use this when you're done working for the day or completing a significant milestone.
---

Invoke the session-manager agent in FINALIZE MODE to complete the session documentation.

**Mode**: finalize
**What it updates**: All context files (sessions.md, CLAUDE.md, GEMINI.md, AGENTS.md, and specialized files as needed)

Instructions for session-manager agent:

You are running in **FINALIZE MODE** - this is the complete session closure workflow.

## Your Task

Execute your full workflow as documented in your agent file:

### Task 1: Finalize sessions.md
- Complete the current session entry (if it exists) OR create a new one
- Ensure all accomplishments are captured
- Document all technical decisions
- List all lessons learned
- Note any known issues or technical debt
- Provide specific, actionable next steps
- List commits if any were made

### Task 2: Update Main LLM Context Files
Make CLAUDE.md, GEMINI.md, and AGENTS.md **byte-for-byte identical**:
- Update "Last updated" timestamp
- Revise "Current Goals" based on session progress
- Update "Immediate Next Steps" with concrete tasks
- Refresh "Recent Context" (2-4 sentences covering last 2-3 sessions)
- Update "Known Issues & Blockers"
- Update "Important Notes for Next Session"

### Task 3: Update Specialized Context Files (if applicable)
Only update if the session introduced relevant changes:
- **project.md** - Cross-workspace patterns, lessons, infrastructure
- **backend.md** - Database, RLS, storage, auth patterns
- **frontend.md** - Components, routing, state management, UI patterns

### Task 4: Generate Commit Message
Provide a commit message suggestion for the documentation changes:
```
docs: [concise description]

[Optional second line with context]
```

## Approach
1. Review all changes made during the session
2. Ask clarifying questions if needed
3. Execute all four tasks
4. Present updates clearly
5. Provide commit message
6. Ask if adjustments are needed

**Communication**:
Start by saying: "I'll finalize the session documentation and update all context files."
End by providing the commit message and asking: "Would you like me to create the commit, or would you prefer to do it yourself?"
