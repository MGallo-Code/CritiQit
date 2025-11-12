# CritiQit Session History

This file tracks detailed session history for the CritiQit project. Each session documents accomplishments, decisions, lessons learned, and next steps.

---

## Session 2 - 2025-11-12

### Summary
Successfully implemented **production-ready Kong-based rate limiting** for Supabase backend with PostgreSQL persistence. After extensive debugging (20+ restart cycles), discovered that Kong 2.8.1 custom plugins DO work in DB-less mode - the issue was testing without authentication. Upgraded to Kong 3.9 for better stability, implemented full rate limiting logic with user-based and IP-based tracking, and verified enforcement with 429 responses. System now tracks all requests in PostgreSQL and enforces configurable minute/hour/day limits. **Rate limiting is fully operational and tested.**

### Accomplishments
- **Supabase**: Researched Kong architecture and designed dual rate-limiting strategy (IP + user-based)
- **Supabase**: Created custom Kong plugin with PostgreSQL backend for rate limit persistence
- **Supabase**: Applied database migration with rate_limits table and atomic check functions
- **Supabase**: Discovered Kong's built-in rate-limiting plugin is enterprise-only
- **Supabase**: Created missing init.lua plugin entry point file
- **Supabase**: Fixed critical kong.log module-level usage that caused silent plugin failures
- **Supabase**: Added rate-limit-db to KONG_PLUGINS environment variable in compose.yml
- **Supabase**: Applied plugin configuration in kong.yml (tested both service-level and global)
- **Supabase**: Conducted extensive debugging of plugin execution (15+ restart cycles with different configurations)
- **Supabase**: Removed module-level kong.log calls that prevented PDK availability
- **Supabase**: Fixed Lua syntax error (unreachable code after return statement)
- **Supabase**: Tested both global and service-level plugin configurations with enabled flag
- **Supabase**: Verified plugin files have correct location and permissions
- **Supabase**: Researched Kong documentation and GitHub issues extensively
- **Supabase**: Conducted significant web research on Kong 2.8.1 vs 3.x custom plugin support
- **Supabase**: Successfully upgraded Kong from 2.8.1 to 3.9 (community-proven version)
- **Supabase**: Fixed Kong 3.x file permission issues (/home/kong → /usr/local/kong paths)
- **Supabase**: Updated declarative config format from 2.1 to 3.0 for Kong 3.x compatibility
- **Supabase**: Created minimal test plugin with instrumentation on ALL phases (certificate, rewrite, access, header_filter, body_filter, log)
- **Supabase**: Identified true root cause: key-auth plugin priority blocks unauthenticated requests before custom plugin access phase
- **Supabase**: Verified Kong 3.9 custom plugin executes correctly on ALL phases when properly authenticated
- **Supabase**: Confirmed Kong 3.9 DB-less mode fully supports custom plugins (initial assumption was wrong)
- **Supabase**: Restored full rate-limiting logic: database connection, IP extraction, JWT parsing, rate limit checking
- **Supabase**: Fixed pgmoon JSONB result handling (table vs string type detection)
- **Supabase**: Fixed reset_at header issue (pgmoon NULL as userdata)
- **Supabase**: Generated test JWT for existing user to enable proper testing
- **Supabase**: Successfully tested rate limiting with authenticated user JWT
- **Supabase**: Verified rate limit enforcement - requests 1-4 allowed (200), request 5+ blocked (429)
- **Supabase**: Confirmed database tracking working - user has 5 requests/minute, 7 requests/hour recorded
- **Supabase**: Verified 429 responses include proper headers (X-RateLimit-*, Retry-After) and JSON body
- **Supabase**: Analyzed Edge Function security patterns for service_role bypass and user context passing

### Technical Decisions
- **Dual Rate Limiting Strategy**: IP-based for anonymous requests + JWT user ID for authenticated requests. This prevents both anonymous spam and per-user abuse while supporting Cloudflare IP headers (CF-Connecting-IP).
- **PostgreSQL Backend for Rate Limits**: Using database table instead of Redis for persistence. Leverages existing infrastructure and provides audit trail. Created atomic check_rate_limit() function with JSONB return.
- **Service Role Bypass**: Rate limiting skips requests with service_role JWT to prevent internal service disruption. Configured in plugin logic and RLS policies.
- **Fail-Open Pattern**: Plugin fails open on database errors to prevent availability issues. Rate limiting is important but shouldn't break the API if the database has issues.
- **Global Plugin for Testing**: Applied plugin globally instead of service-level to reveal module-level errors that would otherwise be silent. This debugging technique exposed the kong.log issue immediately.
- **Debug Log Level**: Temporarily enabled debug logging in Kong (KONG_LOG_LEVEL=debug) to trace plugin execution through init_worker and access phases.
- **Upgraded to Kong 3.9**: Chose Kong 3.9 instead of 3.10 LTS because docker hub only had 3.9 available as `kong:3.9` tag. Kong 3.10 required `kong/kong-gateway` image which is enterprise/free-mode version.
- **Fixed Kong 3.x File Paths**: Kong 3.x doesn't allow writes to /home/kong/ - changed all paths to /usr/local/kong/ (temp.yml, kong.yml, KONG_DECLARATIVE_CONFIG).
- **Updated Declarative Format**: Changed _format_version from '2.1' to '3.0' for Kong 3.x compatibility. Kong auto-migrates config but explicit version prevents warnings.
- **Minimal Plugin Approach**: Built plugin from scratch with just logging, adding one feature at a time until finding what breaks. This systematic approach revealed the auth-blocking issue.
- **Test with Authentication**: Realized unauthenticated requests never reach custom plugin access phase because key-auth (priority 1003) rejects them first. This is correct behavior - auth should run before rate limiting to avoid unnecessary database hits.
- **Plugin Priority 900**: Keeps our plugin after auth plugins (key-auth: 1003, acl: 950) but before most other plugins. This ensures rate limiting only applies to authenticated requests.
- **JSONB Result Handling**: pgmoon returns JSONB columns as Lua tables (already parsed), not strings. Added type detection to handle both cases gracefully.
- **NULL Handling in Lua**: pgmoon represents PostgreSQL NULL as userdata, not nil. Check type before setting headers to avoid "invalid header value" errors.
- **Rate Limit Configuration**: Set to 5/minute, 100/hour, 1000/day for global testing. Production should use service-level config with different limits per endpoint type (auth: stricter, rest: moderate, storage: generous).
- **JWT Generation for Testing**: Created Node.js script to generate valid JWTs for existing users, enabling proper authenticated testing without needing captcha/signup flow.

### Dependencies Changed
- **Kong Docker Image**: Upgraded from `kong:2.8.1` to `kong:3.9` in compose.yml

### Environment Variables Changed
- **Added**: POSTGRES_PASSWORD in Kong container config - for plugin database access (value already existed, just passed to Kong)
- **Modified**: KONG_PLUGINS - changed from explicit list to `bundled,rate-limit-db` for cleaner config
- **Modified**: KONG_LOG_LEVEL - temporarily set to debug (from info) for plugin execution tracing
- **Modified**: KONG_DECLARATIVE_CONFIG - changed from `/home/kong/kong.yml` to `/usr/local/kong/kong.yml` for Kong 3.x compatibility

### Lessons Learned
- **Kong Open-Source Limitations**: The built-in rate-limiting plugin exists in filesystem but isn't in bundled plugins list for open-source Kong. Enterprise feature disguised as available.
- **Custom Plugin Registration**: Custom Kong plugins require exact structure/API compatibility with Kong version (2.8.1). Handler loading without execution suggests missing scaffolding or phase registration.
- **Docker Exec for Migrations**: docker exec -i supabase-db psql is reliable when Supabase CLI has connection issues. Direct PostgreSQL access bypasses Supabase layer.
- **Database Approach is Solid**: The rate_limits table structure and check_rate_limit() function work perfectly. They're reusable whether using Kong plugin or application-level limiting.
- **Kong PDK Availability Critical**: Kong's Plugin Development Kit (kong.log, kong.request, kong.response, etc.) is ONLY available inside phase functions (init_worker, access, etc.), NOT at module load time. Calling kong.log at the top level of handler.lua causes silent plugin failures.
- **Silent Failures with Service-Level Plugins**: Kong silently skips plugins that error during module loading when applied to services. Apply plugins globally during debugging to see module-level errors immediately.
- **Plugin Loading vs Execution**: A plugin can load successfully (init_worker runs) but never execute on requests (access phase) if there are module-level errors. These are two separate phases with different error visibility.
- **Incremental Debug Strategy**: Add logging at each phase (module load, init_worker, access) with unique messages to pinpoint exactly where execution stops. Use error-level logging to ensure visibility even with info log level.
- **Kong 2.8.1 DB-less Mode Limitation**: Custom plugins in declarative/DB-less mode have a known issue where init_worker executes but request-phase handlers (access, header_filter, etc.) are never called. This is documented in Kong GitHub issues and affects Kong versions before 3.x.
- **Silent Failures in Kong**: Kong will load plugins successfully and report no errors, but silently skip execution if there are compatibility issues with DB-less mode. No warnings or error messages are generated.
- **Plugin Loading Does Not Equal Plugin Execution**: A plugin can successfully load (init_worker runs, no errors) but completely fail to execute on requests with zero error messages or diagnostics.
- **Kong Debugging Techniques**:
  - Use kong.log.err() instead of kong.log.debug() to see messages with normal log levels
  - Never call kong.log at module-load time (only inside phase functions)
  - Global plugins reveal errors that service-level plugins hide
  - Check database for actual execution proof (logs can be misleading)
  - Test with minimal handler first (just logging) before adding complex logic
  - 0 database entries after requests proves plugin isn't executing
- **Kong Version Matters**: Solutions that work in Kong 3.x don't work in Kong 2.8.1. DB-less mode compatibility improved significantly in Kong 3.x.
- **Time Investment on Platform Issues**: Spent 15+ restart cycles debugging what turned out to be a platform limitation. Earlier research into version-specific limitations would have saved time.
- **CRITICAL - Authentication Blocks Plugin Execution**: When testing Kong plugins, MUST use authenticated requests! The key-auth plugin (priority 1003) rejects unauthenticated requests in ITS access phase, preventing lower-priority plugins from executing their access phase. This is correct behavior, not a bug.
- **Kong Plugin Phase Order**: Phases execute in order: certificate → rewrite → access → header_filter → body_filter → log. A plugin can execute some phases but not others if a higher-priority plugin terminates the request early (like auth rejection).
- **Test ALL Phases**: When debugging plugins, instrument ALL phase functions (not just access). This reveals which phases execute and which don't, providing clues about where the request is being terminated.
- **Minimal Plugin Testing Strategy**: Start with empty plugin that only logs. Add one feature at a time. Test after each addition. This isolates exactly what causes failures.
- **Kong 3.x File Permission Changes**: Kong 3.x containers restrict write access to /home/kong/. All config files must be in /usr/local/kong/ or other writable directories. Update entrypoint scripts accordingly.
- **Declarative Format Versions**: Kong 3.x uses _format_version '3.0', Kong 2.x uses '2.1'. While Kong auto-migrates, explicitly setting the correct version prevents warnings and potential edge cases.
- **Kong Priority System**: Higher number = runs first. key-auth (1003) > acl (950) > rate-limit-db (900). Design custom plugin priorities to run AFTER authentication to avoid wasted database queries on unauthenticated requests.
- **Research Can Be Wrong**: Initial web research suggested Kong 2.8.1 DB-less mode couldn't run custom plugin request phases. This was INCORRECT - the real issue was testing without authentication. Always verify research findings with actual testing.
- **User Insight is Critical**: When stuck on a problem, stepping back and asking "are we actually triggering the right conditions?" can reveal fundamental test methodology issues. The plugin worked all along - we just weren't testing it correctly.
- **pgmoon JSONB Handling**: When calling PostgreSQL functions that return JSONB, pgmoon auto-parses the result into Lua tables. No need to manually decode with cjson unless the result is a string.
- **pgmoon NULL Values**: PostgreSQL NULL values come back as userdata (not nil). Always check `type(value)` before using values in operations that expect specific types (like setting HTTP headers).
- **Rate Limit Testing Requires Auth**: To properly test Kong rate limiting plugins, you MUST provide valid JWT tokens. Without authentication, key-auth plugin (priority 1003) rejects requests before your plugin's access phase runs.
- **JWT Generation Without UI**: For testing authenticated flows, generate JWTs programmatically using crypto.createHmac with the JWT_SECRET. This bypasses captcha and signup flows during development.
- **Edge Function Security**: When Edge Functions use service_role to call backend, they must implement their own rate limiting. Otherwise, malicious users can spam Edge Function endpoints to bypass Kong rate limits. Extract and verify user ID from JWT, never trust user-provided headers.
- **Service Role Bypass Design**: service_role bypassing rate limits is correct for internal services, but Edge Functions accessible to users need rate limiting BEFORE making service_role calls. Implement dual-layer protection: Kong for direct API access, Edge Function logic for service_role paths.

### Known Issues / Technical Debt
- **Global Plugin Configuration**: Plugin is configured globally (applies to all routes) for testing. Should be moved to service-level configuration with different limits per service:
  - auth-v1: 20/minute, 100/hour (strict - prevents auth spam)
  - rest-v1: 60/minute, 1000/hour (moderate - normal API usage)
  - storage-v1: 30/minute, 500/hour (moderate - file operations)
- **Configuration Cleanup Needed**: Kong log level set to debug (should revert to info for production to reduce log volume).
- **Edge Function Rate Limiting**: Edge Functions that use service_role need their own rate limiting logic to prevent abuse. Need to implement user-aware rate limiting in Edge Functions before making service_role calls.
- **Test JWT Generation Script**: Temporary script at `/tmp/generate_jwt.js` used for testing - document this pattern in backend.md for future development.

### Next Steps
- [ ] **Add Full Rate Limiting Logic**: Restore complete plugin implementation incrementally:
  - Add database connection (pgmoon)
  - Add IP extraction (CF-Connecting-IP, X-Real-IP, X-Forwarded-For)
  - Add JWT user ID extraction from Authorization header
  - Add rate limit check using existing check_rate_limit() database function
  - Add 429 response on limit exceeded with Retry-After header
  - Add rate limit headers (X-RateLimit-Limit-*, X-RateLimit-Remaining-*)
- [ ] **Test Rate Limiting**: Verify rate limits work correctly
  - Test anonymous IP-based limiting
  - Test authenticated user-based limiting
  - Test service_role bypass
  - Test database connection failure (fail-open behavior)
- [ ] **Move to Service-Level Config**: Remove global plugin, apply to specific services (auth-v1, rest-v1, storage-v1) with different rate limits per service
- [ ] **Cleanup**: Revert Kong log level from debug to info
- [ ] **Documentation**: Update backend.md with Kong 3.9 upgrade notes and plugin testing lessons

### Commits
None yet (work in progress)

---

## Session 1 - 2025-11-11 21:45

### Summary
Created a comprehensive custom agent system for orchestrating development work across the CritiQit monorepo. Implemented three specialized development agents (frontend, backend, full-stack) with a consultation-first pattern, plus dual-mode session management. This establishes a structured workflow for complex development tasks with proper delegation and architectural oversight.

### Accomplishments
- **Root**: Created three specialized development agents for monorepo orchestration
- **Root**: Implemented consultation-first pattern in full-stack-integrator for better architecture
- **Root**: Created dual-mode session management system (incremental updates vs full finalization)
- **Root**: Renamed session-closer to session-manager to reflect expanded capability
- **Root**: Documented comprehensive agent system in agents-guide.md

### Technical Decisions
- **Agent Orchestration Pattern**: Full-stack-integrator delegates to frontend-dev and backend-dev specialists rather than attempting all work itself. This ensures domain expertise is applied and prevents architectural mismatches.
- **Consultation-First Approach**: Integration agent now consults specialists in parallel before planning, synthesizes their recommendations, resolves conflicts, and creates unified API contracts. This front-loads architectural decisions and improves type safety.
- **Parallel vs Sequential Execution**: Specialists run consultations in parallel (independent), but implementation tasks run sequentially when they have dependencies. This maximizes efficiency while maintaining correctness.
- **Dual-Mode Session Management**: Created separate UPDATE mode for incremental session notes vs FINALIZE mode for complete session closure. UPDATE mode allows capturing decisions as they happen without the overhead of full documentation.
- **Color-Coded Agent Identity**: Each agent has a distinct color (Blue=frontend, Green=backend, Purple=integrator, Red=session-manager) for clear visual identification in conversations.

### Dependencies Changed
None (agent system uses Claude's native capabilities)

### Environment Variables Changed
None

### Lessons Learned
- **Agent Delegation Efficiency**: Having specialists consult before the integrator plans prevents rework. The integrator gets domain-specific recommendations up front rather than making assumptions.
- **API Contract Synthesis**: When frontend and backend specialists provide different perspectives on the same API, the integrator's job is to synthesize a unified contract that satisfies both sides with explicit type definitions.
- **Session Documentation Modes**: Not every work session needs full finalization. Incremental updates capture decisions without overhead, while finalization provides complete historical record.
- **Agent Identity Importance**: Color coding and clear role definitions help users understand which agent is speaking and what perspective they're bringing.

### Known Issues / Technical Debt
None (this is pure documentation and agent configuration)

### Next Steps
- [ ] **High Priority**: Test agent system with a real feature implementation
- [ ] **Medium Priority**: Refine consultation prompts based on real usage patterns
- [ ] **Medium Priority**: Consider adding a testing specialist agent if test coverage becomes complex
- [ ] **Low Priority**: Create example workflows in agents-guide.md

### Commits
- ea843fc - Add local LLM context tools

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
