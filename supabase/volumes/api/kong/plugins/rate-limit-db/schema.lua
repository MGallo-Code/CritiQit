local typedefs = require "kong.db.schema.typedefs"

-- Check definition for composite mode
local check_def = {
  type = "record",
  required = true,
  fields = {
    { type = { type = "string", required = true, one_of = { "ip", "user", "content" } } },
    { fields = { type = "array", elements = { type = "string" } } },  -- For content type
    { limits = {
      type = "record",
      fields = {
        { second = { type = "number", gt = 0 } },
        { minute = { type = "number", gt = 0 } },
        { hour = { type = "number", gt = 0 } },
        { day = { type = "number", gt = 0 } },
      },
      entity_checks = {
        { at_least_one_of = { "second", "minute", "hour", "day" } },
      },
    }},
  },
}

return {
  name = "rate-limit-db",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
      type = "record",
      fields = {
        -- Composite mode checks array
        { checks = { type = "array", elements = check_def, required = true } },

        -- Database configuration
        { db_host = { type = "string", required = true, default = "db" } },
        { db_port = { type = "number", required = true, default = 5432 } },
        { db_name = { type = "string", required = true, default = "postgres" } },
        { db_user = { type = "string", required = true, default = "supabase_admin" } },
        { db_password = { type = "string", required = true } },

        -- Service role bypass
        { service_role_key = { type = "string" } },

        -- Response configuration
        { hide_client_headers = { type = "boolean", default = false } },
        { error_code = { type = "number", default = 429 } },
        { error_message = { type = "string", default = "Rate limit exceeded" } },
      },
      custom_validator = function(config)
        -- Validate checks array
        if not config.checks then
          return false, "must specify 'checks' array with at least one check"
        end

        -- Handle both table and userdata (Kong's internal representation)
        local check_count = 0
        local check_iter

        -- Try to iterate safely
        if type(config.checks) == "table" then
          check_iter = pairs
        else
          -- For userdata, try metamethod
          local mt = getmetatable(config.checks)
          if mt and mt.__pairs then
            check_iter = mt.__pairs
          else
            -- Skip validation if we can't iterate
            return true
          end
        end

        for i, check in check_iter(config.checks) do
          check_count = check_count + 1
          if check.type == "content" then
            local fields = check.fields
            if not fields or (type(fields) == "table" and #fields == 0) then
              return false, "check #" .. i .. ": 'fields' must be specified for content type checks"
            end
          end
        end

        return true
      end,
    }},
  },
}
