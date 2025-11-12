-- Kong Rate Limiting Plugin with PostgreSQL Backend (Version 3.0 - Production)
--
-- PURPOSE:
--   Three-tier distributed rate limiting to prevent API abuse across multiple attack vectors:
--   - Tier 1 (IP):      Baseline protection for anonymous/OAuth endpoints (100/min, 1000/hr)
--   - Tier 2 (Content): Email-based protection + IP fallback for signup/login (10/email/hr)
--   - Tier 3 (User):    JWT sub claim protection for authenticated endpoints (100/user/min)
--
-- ARCHITECTURE:
--   - Composite checks: Multiple checks run sequentially in fail-fast mode
--   - Database-backed: PostgreSQL for distributed rate limiting across Kong workers
--   - Connection pooling: Single persistent connection per worker (see db.lua)
--   - Service role bypass: Internal services using service_role_key skip all rate limiting
--   - Fail-open policy: If database connection fails, requests are ALLOWED to prevent outages
--
-- SECURITY MODEL:
--   - SQL injection: All inputs escaped via escape_literal() before database queries
--   - RLS policies: rate_limits table only accessible to supabase_admin role
--   - Priority 900: Runs after auth plugins (key-auth: 1003, acl: 950) but before app logic
--   - Client headers: Exposes X-RateLimit-* headers to help clients implement backoff strategies
--
-- COMPOSITE CHECKS (Sequential Execution):
--   Checks are executed in order. If ANY check fails, the request is blocked with 429.
--   Example: Signup endpoint runs both email check AND IP check:
--     1. Check email rate (10/hr) - if exceeded, block immediately
--     2. Check IP rate (50/hr) - if exceeded, block immediately
--     3. If both pass, allow request through
--
-- PERFORMANCE:
--   - Database queries: Single SELECT + UPDATE per check (~5-10ms overhead per check)
--   - Index usage: Queries use (identifier, identifier_type, endpoint) composite index
--   - Worker isolation: Each Kong worker maintains its own connection pool
--
-- FAIL-OPEN RATIONALE:
--   If PostgreSQL becomes unavailable, requests are ALLOWED rather than blocked.
--   This prevents cascading failures and maintains API availability.
--   All errors are logged for monitoring/alerting.
--
-- DEBUGGING:
--   Enable debug logs: Set Kong log level to 'debug' in kong.conf
--   Watch rate limit checks in real-time: tail -f logs/error.log | grep rate-limit-db
--
-- PRODUCTION CONSIDERATIONS:
--   - Monitor database connection pool health
--   - Set up alerts for fail-open events (database connection failures)
--   - Review rate limit violations in rate_limits table for attack patterns
--   - Adjust limits based on legitimate user behavior patterns
--
local db_module = require("kong.plugins.rate-limit-db.db")
local extractors = require("kong.plugins.rate-limit-db.extractors")
local cjson = require("cjson.safe")

local RateLimitHandler = {
  VERSION = "3.0.0",  -- Production version with composite checks only
  PRIORITY = 900, -- Run after auth (key-auth: 1003, acl: 950) but before most plugins
}

function RateLimitHandler:init_worker()
  kong.log.info("[rate-limit-db] Plugin v", self.VERSION, " initialized in worker")
end

-- SQL string escaping to prevent injection attacks
-- PostgreSQL uses single quotes for string literals, so we escape them by doubling
-- Example: "user@example.com" -> "'user@example.com'"
--          "O'Brien" -> "'O''Brien'"
local function escape_literal(str)
  if not str then
    return "NULL"
  end
  -- Simple SQL escaping - replace single quotes with double single quotes
  return "'" .. tostring(str):gsub("'", "''") .. "'"
end

-- Executes a single rate limit check against the database
-- Uses check_rate_limit() PostgreSQL function which atomically:
--   1. Fetches current counts for all time windows
--   2. Increments counters if under limit
--   3. Returns allowed/denied status with metadata
-- Returns: result table with {allowed, current, limits, reset_at, ...} or nil, err
local function check_single_rate_limit(pg, identifier, identifier_type, endpoint, limits)
  -- Build the SQL query
  local query = string.format([[
    SELECT * FROM check_rate_limit(
      %s::text,
      %s::text,
      %s::text,
      %s::integer,
      %s::integer,
      %s::integer,
      %s::integer
    );
  ]],
    escape_literal(identifier),
    escape_literal(identifier_type),
    escape_literal(endpoint),
    limits.second or "NULL",
    limits.minute or "NULL",
    limits.hour or "NULL",
    limits.day or "NULL"
  )

  kong.log.debug("[rate-limit-db] Executing rate limit query: ", query)

  local result, err = pg:query(query)
  if not result then
    kong.log.err("[rate-limit-db] Rate limit query failed: ", err)
    return nil, err
  end

  if #result == 0 then
    kong.log.err("[rate-limit-db] Rate limit query returned no results")
    return nil, "No results from rate limit check"
  end

  -- Parse the JSONB result
  local raw_result = result[1].check_rate_limit
  kong.log.debug("[rate-limit-db] Raw result from DB: ", raw_result, " (type: ", type(raw_result), ")")

  -- If it's already a table, return it directly
  if type(raw_result) == "table" then
    return raw_result
  end

  -- If it's a string, decode it
  if type(raw_result) == "string" then
    local rate_limit_result, err = cjson.decode(raw_result)
    if not rate_limit_result then
      kong.log.err("[rate-limit-db] Failed to decode JSON: ", err)
      return nil, "Failed to decode rate limit result"
    end
    return rate_limit_result
  end

  kong.log.err("[rate-limit-db] Unexpected result type: ", type(raw_result))
  return nil, "Unexpected result type"
end

-- Executes multiple rate limit checks in sequence (fail-fast)
-- Each check extracts its own identifier (IP, user ID, email, etc.)
-- If ANY check fails, the request is immediately blocked with 429
-- If a check can't extract its identifier (e.g., no JWT present), it's skipped with a warning
-- This allows fallback patterns: try user-based, fall back to IP-based
-- Returns: true if all checks passed, or false + result metadata if any check failed
local function perform_composite_checks(pg, endpoint, checks)
  for i, check in ipairs(checks) do
    local identifier, identifier_type

    -- Extract identifier based on check type
    if check.type == "ip" then
      identifier = extractors.get_client_ip()
      identifier_type = "ip"

    elseif check.type == "user" then
      identifier = extractors.get_user_id_from_jwt()
      identifier_type = "user"

    elseif check.type == "content" then
      local field_name
      identifier, field_name = extractors.get_content_identifier(check.fields or {"email"})
      identifier_type = field_name or "content"
    end

    -- If no identifier, skip this check (log warning)
    -- This allows fallback patterns: e.g., try user-based (might fail if no JWT), fall back to IP-based
    if not identifier then
      kong.log.warn("[rate-limit-db] Check #", i, " (", check.type, "): no identifier found, skipping")
      goto continue
    end

    kong.log.info("[rate-limit-db] Check #", i, " - Type: ", check.type,
                  " Identifier: ", identifier, " Endpoint: ", endpoint)

    -- Check rate limit
    local result, err = check_single_rate_limit(pg, identifier, identifier_type, endpoint, check.limits)

    if err then
      -- Fail open on error
      kong.log.err("[rate-limit-db] Check #", i, " error: ", err)
      goto continue
    end

    if result and result.allowed == false then
      -- Rate limit exceeded, return result with metadata
      kong.log.warn("[rate-limit-db] Check #", i, " BLOCKED - Rate limit exceeded: ",
                    identifier_type, "=", identifier)
      return false, result
    end

    kong.log.debug("[rate-limit-db] Check #", i, " passed")

    ::continue::
  end

  -- All checks passed
  kong.log.debug("[rate-limit-db] All composite checks passed")
  return true
end

-- Main plugin execution phase (runs for every request)
-- This is where Kong calls our plugin during request processing
-- Phase order: 1. key-auth (1003), 2. acl (950), 3. rate-limit-db (900), 4. app logic
function RateLimitHandler:access(conf)
  -- Service role bypass: Internal services (using service_role_key) skip all rate limiting
  -- This allows backend services to make unlimited API calls without hitting rate limits
  if extractors.is_service_role(conf.service_role_key) then
    kong.log.debug("[rate-limit-db] Service role request, bypassing rate limiting")
    return
  end

  -- Get database connection (uses pooling)
  local pg, err = db_module.get_connection(conf)
  if not pg then
    -- Fail open: allow request if DB connection fails
    kong.log.err("[rate-limit-db] Database connection failed, failing open: ", err)
    return
  end

  local endpoint = kong.request.get_path()

  kong.log.info("[rate-limit-db] Using COMPOSITE mode with ", #conf.checks, " checks")

  local allowed, result = perform_composite_checks(pg, endpoint, conf.checks)

  if not allowed and result then
    -- Rate limit exceeded - build informative 429 response
    -- Set rate limit headers based on result (unless hide_client_headers=true)
    -- Headers help clients implement exponential backoff and retry logic
    if not conf.hide_client_headers then
      if result.current then
        for window, count in pairs(result.current) do
          local limit_name = "X-RateLimit-Limit-" .. window:gsub("^%l", string.upper)
          local remaining_name = "X-RateLimit-Remaining-" .. window:gsub("^%l", string.upper)

          -- Try to find the limit from the failed check
          if result.limits and result.limits[window] then
            kong.response.set_header(limit_name, tostring(result.limits[window]))
            kong.response.set_header(remaining_name,
              tostring(math.max(0, result.limits[window] - count)))
          end
        end
      end
      if result.reset_at then
        kong.response.set_header("X-RateLimit-Reset", result.reset_at)
      end
    end

    -- Calculate retry_after
    local retry_after = 60
    if result.reset_at then
      local reset_time = ngx.parse_http_time(result.reset_at)
      if reset_time then
        retry_after = math.max(1, reset_time - ngx.time())
      end
    end
    kong.response.set_header("Retry-After", tostring(retry_after))

    -- Return 429
    return kong.response.exit(conf.error_code, {
      message = conf.error_message,
      identifier_type = result.identifier_type,
      limit_hit = result.limit_hit,
      retry_after = retry_after,
    })
  end

  -- All checks passed
  kong.log.debug("[rate-limit-db] All checks passed")
end

return RateLimitHandler
