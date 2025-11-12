-- Kong Rate Limiting Plugin with PostgreSQL Backend
local pgmoon = require("pgmoon")
local cjson = require("cjson.safe")

local RateLimitHandler = {
  VERSION = "1.0.0",
  PRIORITY = 900, -- Run after auth (key-auth: 1003, acl: 950) but before most plugins
}

function RateLimitHandler:init_worker()
  kong.log.info("[rate-limit-db] Plugin initialized in worker")
end

local function escape_literal(str)
  if not str then
    return "NULL"
  end
  -- Simple SQL escaping - replace single quotes
  return "'" .. tostring(str):gsub("'", "''") .. "'"
end

local function connect_to_db(conf)
  local pg = pgmoon.new({
    host = conf.db_host,
    port = conf.db_port,
    database = conf.db_name,
    user = conf.db_user,
    password = conf.db_password,
  })

  local ok, err = pg:connect()
  if not ok then
    kong.log.err("[rate-limit-db] Failed to connect to database: ", err)
    return nil, err
  end

  return pg
end

local function get_user_id_from_jwt()
  -- Try to extract user ID from JWT token
  local authorization = kong.request.get_header("authorization")
  if not authorization then
    return nil
  end

  -- Check if it's a Bearer token
  if not authorization:match("^Bearer ") then
    return nil
  end

  -- Extract JWT payload
  local token = authorization:sub(8) -- Remove "Bearer "
  local parts = {}
  for part in token:gmatch("[^.]+") do
    table.insert(parts, part)
  end

  if #parts ~= 3 then
    return nil
  end

  -- Decode base64 payload (part 2)
  local payload = parts[2]
  -- Add padding if needed
  local padding = 4 - (#payload % 4)
  if padding < 4 then
    payload = payload .. string.rep("=", padding)
  end

  local decoded = ngx.decode_base64(payload)
  if not decoded then
    return nil
  end

  -- Parse JSON
  local payload_table = cjson.decode(decoded)
  if not payload_table then
    return nil
  end

  -- Return 'sub' claim (user ID)
  return payload_table.sub
end

local function get_client_ip()
  -- Try Cloudflare header first
  local cf_ip = kong.request.get_header("cf-connecting-ip")
  if cf_ip then
    return cf_ip
  end

  -- Try X-Real-IP
  local real_ip = kong.request.get_header("x-real-ip")
  if real_ip then
    return real_ip
  end

  -- Try X-Forwarded-For (take first IP)
  local forwarded = kong.request.get_header("x-forwarded-for")
  if forwarded then
    return forwarded:match("^([^,]+)")
  end

  -- Fallback to Kong's method
  return kong.client.get_forwarded_ip()
end

local function check_rate_limit(pg, identifier, identifier_type, endpoint, limits)
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

local function set_rate_limit_headers(conf, result)
  if conf.hide_client_headers then
    return
  end

  -- Set standard rate limit headers
  if result.current then
    if result.current.minute then
      kong.response.set_header("X-RateLimit-Limit-Minute", tostring(conf.minute or 0))
      kong.response.set_header("X-RateLimit-Remaining-Minute",
        tostring(math.max(0, (conf.minute or 0) - result.current.minute)))
    end

    if result.current.hour then
      kong.response.set_header("X-RateLimit-Limit-Hour", tostring(conf.hour or 0))
      kong.response.set_header("X-RateLimit-Remaining-Hour",
        tostring(math.max(0, (conf.hour or 0) - result.current.hour)))
    end

    if result.current.day then
      kong.response.set_header("X-RateLimit-Limit-Day", tostring(conf.day or 0))
      kong.response.set_header("X-RateLimit-Remaining-Day",
        tostring(math.max(0, (conf.day or 0) - result.current.day)))
    end
  end

  if result.reset_at and type(result.reset_at) == "string" then
    kong.response.set_header("X-RateLimit-Reset", result.reset_at)
  end
end

function RateLimitHandler:access(conf)
  kong.log.info("[rate-limit-db] Access phase - checking rate limits")

  -- Check if service role (bypass rate limiting)
  local api_key = kong.request.get_header("apikey")
  local service_role_key = os.getenv("SUPABASE_SERVICE_KEY")

  if api_key == service_role_key then
    kong.log.debug("[rate-limit-db] Service role detected - bypassing rate limit")
    return
  end

  -- Connect to database
  local pg, err = connect_to_db(conf)
  if not pg then
    -- Fail open: allow request if DB connection fails
    kong.log.err("[rate-limit-db] Database connection failed, allowing request: ", err)
    return
  end

  -- Get identifiers
  local user_id = get_user_id_from_jwt()
  local client_ip = get_client_ip()
  local endpoint = kong.request.get_path()

  kong.log.info("[rate-limit-db] Rate limit check - User: ", user_id or "none", " IP: ", client_ip, " Endpoint: ", endpoint)

  -- Determine which checks to perform
  local should_check_user = user_id and conf.limit_authenticated_by_user
  local should_check_ip = conf.limit_anonymous_by_ip

  local limits = {
    second = conf.second,
    minute = conf.minute,
    hour = conf.hour,
    day = conf.day,
  }

  -- Check user-based rate limit (if authenticated)
  if should_check_user then
    local result, err = check_rate_limit(pg, user_id, "user", endpoint, limits)

    if not result then
      kong.log.err("[rate-limit-db] User rate limit check failed: ", err)
      -- Fail open
      pg:keepalive()
      return
    end

    set_rate_limit_headers(conf, result)

    if not result.allowed then
      pg:keepalive()

      local retry_after = "60"
      if result.reset_at then
        local reset_time = ngx.parse_http_time(result.reset_at)
        if reset_time then
          retry_after = tostring(math.max(1, reset_time - ngx.time()))
        end
      end

      kong.response.set_header("Retry-After", retry_after)

      kong.log.warn("[rate-limit-db] BLOCKED - User rate limit exceeded: ", user_id, " on ", endpoint)

      return kong.response.exit(conf.error_code, {
        message = conf.error_message,
        limit_hit = result.limit_hit,
        retry_after = tonumber(retry_after),
      })
    end
  end

  -- Check IP-based rate limit (always for anonymous, optional for authenticated)
  if should_check_ip and (not user_id or should_check_user) then
    local result, err = check_rate_limit(pg, client_ip, "ip", endpoint, limits)

    if not result then
      kong.log.err("[rate-limit-db] IP rate limit check failed: ", err)
      -- Fail open
      pg:keepalive()
      return
    end

    set_rate_limit_headers(conf, result)

    if not result.allowed then
      pg:keepalive()

      local retry_after = "60"
      if result.reset_at then
        local reset_time = ngx.parse_http_time(result.reset_at)
        if reset_time then
          retry_after = tostring(math.max(1, reset_time - ngx.time()))
        end
      end

      kong.response.set_header("Retry-After", retry_after)

      kong.log.warn("[rate-limit-db] BLOCKED - IP rate limit exceeded: ", client_ip, " on ", endpoint)

      return kong.response.exit(conf.error_code, {
        message = conf.error_message,
        limit_hit = result.limit_hit,
        retry_after = tonumber(retry_after),
      })
    end
  end

  -- Close database connection
  pg:keepalive()

  kong.log.debug("[rate-limit-db] Rate limit check passed")
end

return RateLimitHandler
