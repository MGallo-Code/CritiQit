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

          -- Identifier strategy (NEW - determines which tier)
          { identifier_strategy = {
              type = "string",
              default = "user",
              one_of = { "user", "ip", "content" }
            }
          },

          -- Content-based identifier configuration (NEW)
          { content_identifier_fields = {
              type = "array",
              elements = { type = "string" },
              default = {}
            }
          },
          { content_identifier_type = {
              type = "string",
              default = "custom"
            }
          },

          -- Fallback configuration (NEW)
          { fallback_by_ip = {
              type = "boolean",
              default = false
            }
          },
          { fallback_limits = {
              type = "record",
              fields = {
                { second = { type = "number", gt = 0 }, },
                { minute = { type = "number", gt = 0 }, },
                { hour = { type = "number", gt = 0 }, },
                { day = { type = "number", gt = 0 }, },
              },
              default = {}
            }
          },

          -- Legacy rate limiting strategy (kept for backward compatibility)
          { limit_anonymous_by_ip = { type = "boolean", default = true }, },
          { limit_authenticated_by_user = { type = "boolean", default = true }, },

          -- Response configuration
          { hide_client_headers = { type = "boolean", default = false }, },
          { error_code = { type = "number", default = 429 }, },
          { error_message = { type = "string", default = "Rate limit exceeded" }, },
        },
        custom_validator = function(config)
          -- At least one time window must be configured (primary or fallback)
          local has_primary = config.second or config.minute or config.hour or config.day
          local has_fallback = config.fallback_limits and (
            config.fallback_limits.second or
            config.fallback_limits.minute or
            config.fallback_limits.hour or
            config.fallback_limits.day
          )

          if not (has_primary or has_fallback) then
            return false, "at least one limit (second, minute, hour, day) must be configured in primary or fallback_limits"
          end

          -- If content strategy, content_identifier_fields must be set
          if config.identifier_strategy == "content" and #config.content_identifier_fields == 0 then
            return false, "content_identifier_fields must be specified when identifier_strategy is 'content'"
          end

          return true
        end,
      },
    },
  },
}
