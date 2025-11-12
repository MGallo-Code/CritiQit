-- Database connection pooling module
local pgmoon = require("pgmoon")

local _M = {}
local connection_pool = {}

function _M.get_connection(conf)
  -- Check if connection exists and is alive
  local key = conf.db_host .. ":" .. conf.db_port .. ":" .. conf.db_name

  if connection_pool[key] then
    local pg = connection_pool[key]
    -- Test connection is still alive with a simple query
    local ok, result = pcall(function()
      return pg:query("SELECT 1")
    end)

    if ok and result then
      kong.log.debug("[rate-limit-db] Reusing pooled database connection")
      return pg
    else
      kong.log.debug("[rate-limit-db] Pooled connection stale, creating new one")
      -- Try to disconnect gracefully
      pcall(function() pg:disconnect() end)
      connection_pool[key] = nil
    end
  end

  -- Create new connection
  kong.log.debug("[rate-limit-db] Creating new database connection")
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

  -- Store in pool
  connection_pool[key] = pg
  kong.log.debug("[rate-limit-db] Database connection established and pooled")
  return pg
end

function _M.close_all()
  for key, pg in pairs(connection_pool) do
    kong.log.debug("[rate-limit-db] Closing pooled connection: ", key)
    pcall(function() pg:disconnect() end)
  end
  connection_pool = {}
end

return _M
