Read and load the project context from `.context/CLAUDE.md` to understand:
- Current project goals and priorities
- Recent work and momentum
- Known issues and blockers
- Immediate next steps (Check for IN PROGRESS sessions with outstanding goals)

Then reference specialized documentation as needed:
- `.context/project.md` - Tech stack, architecture, lessons learned
- `.context/backend.md` - Supabase/PostgreSQL details, RLS policies, CLI patterns
- `.context/frontend.md` - Next.js structure, component patterns, auth flows
- `.context/sessions.md` - Detailed session history (if deeper context needed)

Project structure:
- Monorepo: `frontend/` (Next.js) + `supabase/` (backend)
- Domains: `critiqit.io` (frontend), `api.critiqit.io` (backend)
- Development: localhost:3001 (frontend), localhost:8000 (backend)

Important reminders:
- Never expose actual environment variable values
- Always note which workspace is affected (frontend/supabase/root)
- Capture lessons learned during work
- Use `@session-manager` agent when finishing a session
