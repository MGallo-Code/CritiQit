-- ============================================================================
-- USERNAME GENERATION TESTS
-- ============================================================================
-- Tests for generate_usernames() function which creates pre-validated
-- username suggestions during onboarding.
--
-- Coverage:
--   - Returns correct JSON structure
--   - Generates expected number of suggestions
--   - All suggestions pass validation rules
--   - No reserved names in output
--   - No duplicates within suggestions
--   - Handles collision scenarios gracefully
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(9);

-- ============================================================================
-- Basic Output Structure Tests
-- ============================================================================

-- Test 1: Returns jsonb with 'suggestions' key
SELECT ok(
  (SELECT generate_usernames() ? 'suggestions'),
  'generate_usernames() returns jsonb with "suggestions" key'
);

-- Test 2: Returns array of suggestions
SELECT ok(
  (SELECT jsonb_typeof(generate_usernames()->'suggestions')) = 'array',
  'suggestions value is an array'
);

-- Test 3: Returns 10 suggestions
SELECT ok(
  (SELECT jsonb_array_length(generate_usernames()->'suggestions')) = 10,
  'Returns exactly 10 username suggestions'
);

-- ============================================================================
-- Username Format Validation Tests
-- ============================================================================

-- Test 4: All suggestions are valid length (3-35 chars)
SELECT ok(
  (SELECT bool_and(
    char_length(suggestion::text) - 2 >= 3  -- subtract 2 for quotes
    AND char_length(suggestion::text) - 2 <= 35
  )
  FROM jsonb_array_elements(generate_usernames()->'suggestions') AS suggestion),
  'All suggestions are between 3 and 35 characters'
);

-- Test 5: All suggestions match valid username format (alphanumeric)
-- Note: PascalCase output means A-Z, a-z, 0-9 only
SELECT ok(
  (SELECT bool_and(
    (suggestion #>> '{}') ~ '^[A-Za-z0-9]+$'
  )
  FROM jsonb_array_elements(generate_usernames()->'suggestions') AS suggestion),
  'All suggestions contain only alphanumeric characters'
);

-- Test 6: All suggestions start with uppercase (PascalCase format)
SELECT ok(
  (SELECT bool_and(
    (suggestion #>> '{}') ~ '^[A-Z]'
  )
  FROM jsonb_array_elements(generate_usernames()->'suggestions') AS suggestion),
  'All suggestions start with uppercase letter (PascalCase)'
);

-- ============================================================================
-- Reserved Name Exclusion Tests
-- ============================================================================

-- Test 7: No reserved names in suggestions
SELECT ok(
  (SELECT NOT bool_or(
    lower(suggestion #>> '{}') = ANY(ARRAY[
      'admin', 'root', 'system', 'api', 'www', 'critiqit', 'moderator'
    ])
  )
  FROM jsonb_array_elements(generate_usernames()->'suggestions') AS suggestion),
  'No reserved names appear in suggestions'
);

-- ============================================================================
-- Uniqueness Tests
-- ============================================================================

-- Test 8: No duplicates within a single batch of suggestions
SELECT ok(
  (SELECT count(DISTINCT suggestion) = count(suggestion)
   FROM jsonb_array_elements(generate_usernames()->'suggestions') AS suggestion),
  'No duplicate usernames within suggestions batch'
);

-- ============================================================================
-- Collision Handling Tests
-- ============================================================================

-- Test 9: Generated suggestions pass check_username_available()
-- This validates the pre-validation logic works correctly
SELECT ok(
  (SELECT bool_and(
    (check_username_available(suggestion #>> '{}'))->>'available' = 'true'
  )
  FROM jsonb_array_elements(generate_usernames()->'suggestions') AS suggestion),
  'All generated suggestions pass check_username_available() validation'
);

-- ============================================================================
-- Cleanup and Finish
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
