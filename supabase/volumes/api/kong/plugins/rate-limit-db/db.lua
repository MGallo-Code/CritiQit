-- Database Connection Pooling Module (Version 3.0 - Production)
--
-- PURPOSE:
--   Maintains persistent PostgreSQL connections for rate limiting queries.
--   One connection per Kong worker (not per request) to minimize connection overhead.
--
-- ARCHITECTURE:
--   - Connection pool: Keyed by "host:port:database" (e.g., "db:5432:postgres")
--   - Worker isolation: Each Kong worker process has its own pool
--   - Connection reuse: Connections are tested before reuse (SELECT 1)
--   - Graceful recovery: Stale connections are replaced automatically
--
-- PERFORMANCE:
--   - Connection establishment: ~10-50ms (only happens once per worker)
--   - Connection reuse: ~1ms (negligible overhead)
--   - Worker model: Kong typically runs 1-4 worker processes
--
-- FAILURE MODES:
--   - Stale connection: Detected via pcall(pg:query("SELECT 1")), reconnects automatically
--   - Database down: Returns nil, error (handler.lua fails open)
--   - Connection leak: Workers close connections on exit
--
-- DEBUGGING:
--   Enable debug logs to see connection lifecycle:
--   - "Creating new database connection" (first request in worker)
--   - "Reusing pooled database connection" (subsequent requests)
--   - "Pooled connection stale, creating new one" (connection died)
--
-- PRODUCTION CONSIDERATIONS:
--   - Monitor PostgreSQL connection count (should be ~workers * routes)
--   - Set PostgreSQL max_connections appropriately
--   - Connection limit: max_connections > (kong_workers * num_routes)
--
local pgmoon = require("pgmoon")

local _M = {}
local connection_pool = {}  -- Keyed by "host:port:database"

-- Gets or creates a PostgreSQL connection for this worker
-- Returns: pg connection object or nil, error
-- This is the main entry point called by handler.lua
function _M.get_connection(conf)
  -- Check if connection exists and is alive
  local key = conf.db_host .. ":" .. conf.db_port .. ":" .. conf.db_name

  if connection_pool[key] then
    local pg = connection_pool[key]
    -- Test connection is still alive with a simple query
    -- pcall catches any errors (connection closed, network issue, etc.)
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

-- Closes all pooled connections (called during Kong shutdown)
-- Gracefully disconnects all PostgreSQL connections
-- Uses pcall to prevent errors during shutdown
function _M.close_all()
  for key, pg in pairs(connection_pool) do
    kong.log.debug("[rate-limit-db] Closing pooled connection: ", key)
    pcall(function() pg:disconnect() end)
  end
  connection_pool = {}
end

return _M
