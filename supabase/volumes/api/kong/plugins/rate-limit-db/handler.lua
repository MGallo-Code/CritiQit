-- Kong Rate Limiting Plugin with PostgreSQL Backend (Version 3.0 - Production)
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

local function escape_literal(str)
  if not str then
    return "NULL"
  end
  -- Simple SQL escaping - replace single quotes
  return "'" .. tostring(str):gsub("'", "''") .. "'"
end

-- Single rate limit check function (used by composite checks)
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

-- Composite check function - performs all checks in sequence
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

function RateLimitHandler:access(conf)
  -- Service role bypass
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
    -- Set rate limit headers based on result
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
