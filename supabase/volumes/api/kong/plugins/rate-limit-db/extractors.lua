-- Identifier Extraction Module (Version 3.0 - Production)
--
-- PURPOSE:
--   Extracts rate limiting identifiers from HTTP requests:
--   - IP addresses (from headers like CF-Connecting-IP, X-Real-IP, X-Forwarded-For)
--   - User IDs (from JWT Authorization header, sub claim)
--   - Content identifiers (from request body, e.g., email field)
--   - Service role detection (bypasses rate limiting for internal services)
--
-- SECURITY CONSIDERATIONS:
--   1. IP Extraction: Prioritizes Cloudflare/proxy headers to get real client IP
--      - CF-Connecting-IP (Cloudflare)
--      - X-Real-IP (nginx reverse proxy)
--      - X-Forwarded-For (standard proxy header, takes first IP)
--      - Fallback: kong.client.get_forwarded_ip()
--
--   2. JWT Extraction: Parses Authorization header without signature verification
--      - Why no verification? Kong's key-auth plugin runs BEFORE us (priority 1003)
--      - We trust key-auth to validate the JWT signature
--      - We only extract the sub claim for rate limiting
--
--   3. Content Extraction: Reads request body to extract identifiers
--      - Uses Kong's kong.request.get_body() (already parsed)
--      - No body size limits (Kong handles this upstream)
--      - Returns nil if body is not JSON or field not found
--
--   4. Service Role Detection: Checks for service_role_key in headers
--      - Allows internal services to bypass rate limiting
--      - Checks both apikey and Authorization headers
--
-- FAILURE MODES:
--   - All functions return nil if identifier cannot be extracted
--   - handler.lua skips rate limit checks when identifier is nil
--   - This allows fallback patterns: try user, fall back to IP
--
-- CLOUDFLARE INTEGRATION:
--   If using Cloudflare, CF-Connecting-IP header contains the true client IP.
--   Without this, attackers behind Cloudflare could share the same IP (Cloudflare's).
--
-- DEBUGGING:
--   Log extracted identifiers: Check handler.lua logs for "Identifier: X"
--
local cjson = require("cjson.safe")

local _M = {}

-- Extracts the client's real IP address, handling proxies and CDNs
-- Priority order: CF-Connecting-IP > X-Real-IP > X-Forwarded-For > Kong's fallback
-- Returns: IP address string or "unknown"
function _M.get_client_ip()
  -- Check Cloudflare header first (most reliable if using Cloudflare)
  local cf_ip = kong.request.get_header("CF-Connecting-IP")
  if cf_ip then
    return cf_ip
  end

  -- Check X-Real-IP (set by nginx reverse proxy)
  local real_ip = kong.request.get_header("X-Real-IP")
  if real_ip then
    return real_ip
  end

  -- Check X-Forwarded-For (standard proxy header, comma-separated list)
  -- Take the first IP (original client) not the last (final proxy)
  local forwarded = kong.request.get_header("X-Forwarded-For")
  if forwarded then
    local ip = forwarded:match("^([^,]+)")
    if ip then
      return ip:match("^%s*(.-)%s*$") -- trim whitespace
    end
  end

  -- Fallback to Kong's built-in IP detection
  return kong.client.get_forwarded_ip() or "unknown"
end

-- Extracts user ID (sub claim) from JWT Authorization header
-- Does NOT verify signature (key-auth plugin handles that before us)
-- Returns: user ID string or nil if no JWT or parsing fails
-- JWT format: "Bearer eyJhbGc...header.eyJzdWI...payload.signature"
function _M.get_user_id_from_jwt()
  local authorization = kong.request.get_header("authorization")
  if not authorization then
    return nil
  end

  -- Check for Bearer token format
  if not authorization:match("^Bearer ") then
    return nil
  end

  -- Extract token (remove "Bearer " prefix)
  local token = authorization:sub(8)

  -- Split JWT into parts (header.payload.signature)
  local parts = {}
  for part in token:gmatch("[^%.]+") do
    table.insert(parts, part)
  end

  if #parts < 2 then
    return nil  -- Invalid JWT format
  end

  -- Decode payload (second part)
  local payload_b64 = parts[2]

  -- Add base64 padding if needed (base64 requires length divisible by 4)
  local padding = 4 - (#payload_b64 % 4)
  if padding < 4 then
    payload_b64 = payload_b64 .. string.rep("=", padding)
  end

  -- Base64 decode
  local payload_json = ngx.decode_base64(payload_b64)
  if not payload_json then
    return nil
  end

  -- JSON decode
  local payload = cjson.decode(payload_json)
  if not payload then
    return nil
  end

  -- Extract sub claim (user ID)
  return payload.sub
end

-- Extracts identifier from request body (e.g., email field for signup/login)
-- Iterates through specified fields and returns the first non-empty value
-- Returns: identifier string, field name or nil if not found
-- Example: fields=["email"] extracts request.body.email
function _M.get_content_identifier(fields)
  -- Try to get request body (Kong has already parsed it)
  -- pcall protects against body parsing errors
  local ok, body = pcall(kong.request.get_body)
  if not ok or not body then
    return nil
  end

  -- Ensure body is a table (JSON parsed correctly)
  if type(body) ~= "table" then
    return nil
  end

  -- Extract identifier from specified fields (in order)
  -- Returns first non-empty field found
  for _, field in ipairs(fields) do
    local value = body[field]
    if value and type(value) == "string" and value ~= "" then
      return value, field  -- Return both value and field name
    end
  end

  return nil
end

-- Checks if the request is from an internal service (service_role_key)
-- Internal services bypass ALL rate limiting (unlimited API access)
-- Checks both apikey and Authorization headers
-- Returns: true if service role detected, false otherwise
function _M.is_service_role(service_role_key)
  if not service_role_key then
    -- Try environment variable as fallback
    service_role_key = os.getenv("SUPABASE_SERVICE_KEY")
  end

  if not service_role_key then
    kong.log.debug("[rate-limit-db] No service role key configured - service role bypass disabled")
    return false
  end

  -- Check apikey header (Supabase client library uses this)
  local apikey = kong.request.get_header("apikey")
  if apikey == service_role_key then
    kong.log.info("[rate-limit-db] Service role detected via apikey header")
    return true
  end

  -- Check Authorization header (alternative method)
  local authorization = kong.request.get_header("authorization")
  if authorization then
    local token = authorization:match("^Bearer%s+(.+)$")
    if token == service_role_key then
      kong.log.info("[rate-limit-db] Service role detected via Authorization header")
      return true
    end
  end

  return false
end

return _M
