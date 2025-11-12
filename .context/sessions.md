# CritiQit Session History

This file tracks detailed session history for the CritiQit project. Each session documents accomplishments, decisions, lessons learned, and next steps.

---

## Session 0 - 2025-11-11 19:30

### Summary
Context documentation system initialized for CritiQit monorepo. The project has user authentication and profile management working, with a self-hosted Supabase backend and Next.js frontend. This session establishes the documentation structure for future development continuity.

### Accomplishments
- **Root**: Initialized comprehensive context documentation system (.context/)
- **Root**: Documented existing project structure, tech stack, and architecture
- **Root**: Catalogued lessons learned from initial development phases
- **Root**: Established session tracking methodology

### Technical Decisions
- **Context System Structure**: Created centralized documentation in .context/ with specialized files (backend.md, frontend.md, project.md) linked from main LLM context files. This allows detailed documentation while keeping main context files concise.
- **Monorepo Workspace Attribution**: All session entries will specify which workspace (Frontend/Supabase/Root) was affected to maintain clarity in the monorepo structure.
- **Development Domains**: Using Cloudflare tunnels to map localhost:3001 → critiqit.io and localhost:8000 → api.critiqit.io for consistent development URLs.

### Dependencies Changed
None (documenting existing state)

### Environment Variables Changed
None (documenting existing state)

### Lessons Learned
- **Supabase CLI Authentication**: Always use --db-url with connection string and supabase_admin user. The default postgres user has permission issues.
- **RLS Policy Gotcha**: Critical difference between USING (controls which rows are visible) and WITH CHECK (controls which rows can be modified). Mixing these up causes subtle security issues.
- **Storage Bucket URLs**: Public buckets use different URLs for GET (../public/${bucket}/${filepath}) vs POST (../${bucket}/${filepath}).
- **Image Caching**: Storage bucket images cache aggressively. Use ?version=number query parameter to bypass cache.
- **Migration Simplicity**: Keep migrations simple - avoid complex functions. Let migrations only create tables and policies.
- **Cloudflare Tunnels**: Can connect any localhost port to a domain, enabling consistent development URLs across machines.
- **Supabase Debug Flag**: SSL issues require --debug flag for supabase db reset and supabase db push to work.

### Known Issues / Technical Debt
- **Rate Limiting**: No rate limiting wrappers around Supabase calls yet. This is a security concern for production.
- **Captcha Configuration**: Using custom testing key for Turnstile captcha. Need to restore actual production key before launch.
- **Storage Deletion Restriction**: Cannot delete users who own storage objects. Need cascade deletion strategy.

### Next Steps
- [ ] **High Priority**: Implement rate limiting wrappers for Supabase API calls
- [ ] **Medium Priority**: Review and standardize error handling across auth flows
- [ ] **Medium Priority**: Document component patterns and conventions in frontend.md
- [ ] **Low Priority**: Create migration for cascade deletion of user-owned storage objects

### Commits
- 1f687d8 - Refactor frontend web project structure
- 0a1d8e5 - Update .gitignore
- b6122d5 - Fix all redirects, should be functional now.
- b2a726f - Add profile form with functionality for updating basic profile details.
- cfae2bc - Update user provider to also store user id, bio, full_name
- c3c23e7 - Add bio to user profile interface
- 40f1f60 - Update user provider to remove duplicate requests!
- 6f8d31e - Limit which auth change events trigger a user/profile reload in provider
- d2ff9f0 - Update migrations script to be more consistent.
- 180e69d - Update migration to add avatar_url from oauth providers
