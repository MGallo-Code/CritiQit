---
name: audit
description: Finalize and close the current coding session. Updates all context files (CLAUDE.md, GEMINI.md, AGENTS.md), completes the session entry in sessions.md, updates specialized docs if needed, and generates a commit message suggestion. Use this when you're done working for the day or completing a significant milestone.
slash_command: /audit
---

Initiate a comprehensive security audit of the CritiQit codebase.

Launch the **security-coordinator** agent to perform a full security audit of:
- Frontend (Next.js, React, client-side code)
- Backend (Supabase, PostgreSQL, RLS policies, Kong)
- Infrastructure (Docker, environment variables, secrets)

The security coordinator will:
1. Spawn three specialized security auditors in parallel
2. Synthesize their findings into a unified report
3. Present vulnerabilities categorized by severity (Critical/High/Medium/Low/Info)
4. Allow you to decide on each finding:
   - **Handle**: Fix this issue now
   - **Debug Exception**: Need this for development, fix before production
   - **Ignore**: Suppress this finding (with justification)
5. Orchestrate fixes for issues you choose to handle
6. Update security tracking files (.context/security-exceptions.md, .context/security-ignore.md)

**Usage:**
```
/audit              # Full audit (all three areas)
/audit frontend     # Frontend only
/audit backend      # Backend only
/audit infra        # Infrastructure only
```

**Expected Duration:** 15-30 minutes for full audit

**Mindset:** The security auditors are **ruthlessly critical** and assume code is vulnerable until proven secure. This is by design - better to find issues now than in production.
