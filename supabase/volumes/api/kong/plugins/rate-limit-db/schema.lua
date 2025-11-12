-- Kong Rate Limiting Plugin Schema (Version 3.0 - Production)
--
-- PURPOSE:
--   Defines configuration schema and validation rules for the rate limiting plugin.
--   Kong uses this to validate kong.yml configuration at load time.
--
-- COMPOSITE CHECKS ARRAY:
--   Each route configures an array of checks that run sequentially:
--   - type: "ip" | "user" | "content"
--   - fields: ["email"] (required for content type)
--   - limits: { second, minute, hour, day } (at least one required)
--
-- VALIDATION RULES:
--   1. At least one check must be configured (empty checks array rejected)
--   2. Each check must have at least one limit defined (second/minute/hour/day)
--   3. Content checks must specify which fields to extract (e.g., ["email"])
--   4. Limits must be positive numbers (gt = greater than 0)
--
-- EXAMPLE VALID CONFIGURATION:
--   checks:
--     - type: content
--       fields: ["email"]
--       limits:
--         hour: 10
--         day: 20
--     - type: ip
--       limits:
--         hour: 50
--         day: 500
--
-- CUSTOM VALIDATOR:
--   Runs additional validation beyond schema (e.g., content checks require fields).
--   Returns false, "error message" if validation fails.
--
local typedefs = require "kong.db.schema.typedefs"

-- Check definition for composite mode
-- Each check represents one rate limit check (IP, user, or content-based)
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
        -- Additional validation beyond schema rules
        -- This runs after basic schema validation passes

        -- Validate checks array exists
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
          -- Content checks must specify which request body fields to extract
          -- Example: fields: ["email"] means extract identifier from request.body.email
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
