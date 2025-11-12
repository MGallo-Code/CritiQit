local typedefs = require "kong.db.schema.typedefs"

return {
  name = "rate-limit-db",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          -- Time window limits
          { second = { type = "number", gt = 0 }, },
          { minute = { type = "number", gt = 0 }, },
          { hour = { type = "number", gt = 0 }, },
          { day = { type = "number", gt = 0 }, },

          -- Database configuration
          { db_host = { type = "string", default = "db" }, },
          { db_port = { type = "number", default = 5432 }, },
          { db_name = { type = "string", default = "postgres" }, },
          { db_user = { type = "string", default = "supabase_admin" }, },
          { db_password = { type = "string", required = true }, },

          -- Rate limiting strategy
          { limit_anonymous_by_ip = { type = "boolean", default = true }, },
          { limit_authenticated_by_user = { type = "boolean", default = true }, },

          -- Response configuration
          { hide_client_headers = { type = "boolean", default = false }, },
          { error_code = { type = "number", default = 429 }, },
          { error_message = { type = "string", default = "Rate limit exceeded" }, },
        },
        custom_validator = function(config)
          -- At least one time window must be configured
          if not (config.second or config.minute or config.hour or config.day) then
            return false, "at least one limit (second, minute, hour, day) must be configured"
          end
          return true
        end,
      },
    },
  },
}
