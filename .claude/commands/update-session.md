---
description: Incrementally update the current session documentation. Use this mid-session to capture progress, lessons learned, or technical decisions before moving to the next task. Only updates sessions.md without finalizing the full context files.
---

Invoke the session-manager agent in UPDATE MODE to incrementally document the current session.

**Mode**: update
**What it updates**: Only `.context/sessions.md`
**What it preserves**: CLAUDE.md, GEMINI.md, AGENTS.md remain unchanged

Instructions for session-manager agent:

You are running in **UPDATE MODE** - this is an incremental session update, not a final closure.

## Your Task

Update ONLY the `.context/sessions.md` file with current progress. DO NOT update CLAUDE.md, GEMINI.md, AGENTS.md, or specialized context files yet.

### If this is the first update of the session:
1. Create a new session entry at the TOP of sessions.md
2. Use the current timestamp for the session header
3. Fill in what's been accomplished so far
4. Mark sections as [IN PROGRESS] where appropriate

### If you're updating an existing session entry:
1. Find the most recent session entry (at the top)
2. Append new accomplishments to the Accomplishments section
3. Add new technical decisions if any were made
4. Add new lessons learned
5. Update "Next Steps" to reflect current state

### What to capture:
- ✅ Accomplishments so far in this session
- ✅ Technical decisions made and why
- ✅ Lessons learned (gotchas, patterns discovered)
- ✅ Work in progress (mark clearly)
- ✅ Known issues encountered
- ✅ Next steps from here

### What NOT to do:
- ❌ Do NOT finalize the session entry
- ❌ Do NOT update CLAUDE.md, GEMINI.md, AGENTS.md
- ❌ Do NOT update specialized context files (backend.md, frontend.md, project.md)
- ❌ Do NOT generate commit message
- ❌ Do NOT mark the session as complete

### Approach:
1. Review recent work (check git status, recent changes)
2. Ask user for any key decisions or lessons to capture
3. Update sessions.md with progress so far
4. Confirm update with user
5. Tell user to use /save-session when fully done

**Communication**:
Start by saying: "I'll update the current session documentation with your progress so far."
End by saying: "Session updated! Use /save-session when you're ready to close out the session completely."
