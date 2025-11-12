-- Identifier extraction module
local cjson = require("cjson.safe")

local _M = {}

function _M.get_client_ip()
  -- Check Cloudflare header first
  local cf_ip = kong.request.get_header("CF-Connecting-IP")
  if cf_ip then
    return cf_ip
  end

  -- Check X-Real-IP
  local real_ip = kong.request.get_header("X-Real-IP")
  if real_ip then
    return real_ip
  end

  -- Check X-Forwarded-For (take first IP)
  local forwarded = kong.request.get_header("X-Forwarded-For")
  if forwarded then
    local ip = forwarded:match("^([^,]+)")
    if ip then
      return ip:match("^%s*(.-)%s*$") -- trim whitespace
    end
  end

  -- Fallback to remote address
  return kong.client.get_forwarded_ip() or "unknown"
end

function _M.get_user_id_from_jwt()
  local authorization = kong.request.get_header("authorization")
  if not authorization then
    return nil
  end

  if not authorization:match("^Bearer ") then
    return nil
  end

  local token = authorization:sub(8)
  local parts = {}
  for part in token:gmatch("[^%.]+") do
    table.insert(parts, part)
  end

  if #parts < 2 then
    return nil
  end

  local payload_b64 = parts[2]
  -- Add padding if needed
  local padding = 4 - (#payload_b64 % 4)
  if padding < 4 then
    payload_b64 = payload_b64 .. string.rep("=", padding)
  end

  local payload_json = ngx.decode_base64(payload_b64)
  if not payload_json then
    return nil
  end

  local payload = cjson.decode(payload_json)
  if not payload then
    return nil
  end

  return payload.sub
end

function _M.get_content_identifier(fields)
  -- Try to get request body
  local ok, body = pcall(kong.request.get_body)
  if not ok or not body then
    return nil
  end

  -- Ensure body is a table
  if type(body) ~= "table" then
    return nil
  end

  -- Extract identifier from specified fields
  for _, field in ipairs(fields) do
    local value = body[field]
    if value and type(value) == "string" and value ~= "" then
      return value, field
    end
  end

  return nil
end

function _M.is_service_role(service_role_key)
  if not service_role_key then
    -- Try environment variable as fallback
    service_role_key = os.getenv("SUPABASE_SERVICE_KEY")
  end

  if not service_role_key then
    kong.log.debug("[rate-limit-db] No service role key configured - service role bypass disabled")
    return false
  end

  local apikey = kong.request.get_header("apikey")
  if apikey == service_role_key then
    kong.log.info("[rate-limit-db] Service role detected via apikey header")
    return true
  end

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
