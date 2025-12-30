-- ============================================================================
-- USERNAME VALIDATION TESTS
-- ============================================================================
-- Tests for check_username_available() function which validates custom
-- usernames during onboarding.
--
-- Coverage:
--   - Format validation (alphanumeric + underscore only)
--   - Length constraints (3-35 characters)
--   - Reserved name rejection
--   - Case-insensitive uniqueness
--   - Whitespace handling
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(15);

-- ============================================================================
-- Setup: Create test user with known username
-- ============================================================================

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'username-test@test.local',
  '$2a$10$test',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Set a permanent username for collision testing
UPDATE public.profiles
SET username = 'TakenUsername', username_is_temporary = false
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ============================================================================
-- Valid Username Tests
-- ============================================================================

-- Test 1: Valid alphanumeric username returns available
SELECT ok(
  (SELECT (check_username_available('ValidUser123'))->>'available')::boolean = true,
  'Valid alphanumeric username is available'
);

-- Test 2: Valid username with underscores returns available
SELECT ok(
  (SELECT (check_username_available('valid_user_name'))->>'available')::boolean = true,
  'Valid username with underscores is available'
);

-- Test 3: Minimum length (3 chars) is accepted
SELECT ok(
  (SELECT (check_username_available('abc'))->>'available')::boolean = true,
  'Minimum length username (3 chars) is available'
);

-- Test 4: Maximum length (35 chars) is accepted
SELECT ok(
  (SELECT (check_username_available('abcdefghijklmnopqrstuvwxyz123456789'))->>'available')::boolean = true,
  'Maximum length username (35 chars) is available'
);

-- ============================================================================
-- Invalid Format Tests
-- ============================================================================

-- Test 5: Username with spaces rejected
SELECT ok(
  (SELECT (check_username_available('user name'))->>'error') = 'invalid_format',
  'Username with spaces returns invalid_format error'
);

-- Test 6: Username with special characters rejected
SELECT ok(
  (SELECT (check_username_available('user@name!'))->>'error') = 'invalid_format',
  'Username with special characters returns invalid_format error'
);

-- Test 7: Username with hyphens rejected (only underscores allowed)
SELECT ok(
  (SELECT (check_username_available('user-name'))->>'error') = 'invalid_format',
  'Username with hyphens returns invalid_format error'
);

-- ============================================================================
-- Length Constraint Tests
-- ============================================================================

-- Test 8: Too short (2 chars) rejected
SELECT ok(
  (SELECT (check_username_available('ab'))->>'error') = 'too_short',
  'Username under 3 chars returns too_short error'
);

-- Test 9: Too long (36 chars) rejected
SELECT ok(
  (SELECT (check_username_available('abcdefghijklmnopqrstuvwxyz1234567890'))->>'error') = 'too_long',
  'Username over 35 chars returns too_long error'
);

-- ============================================================================
-- Reserved Name Tests
-- ============================================================================

-- Test 10: System reserved name rejected
SELECT ok(
  (SELECT (check_username_available('admin'))->>'error') = 'reserved',
  'Reserved name "admin" returns reserved error'
);

-- Test 11: Product reserved name rejected
SELECT ok(
  (SELECT (check_username_available('critiqit'))->>'error') = 'reserved',
  'Reserved name "critiqit" returns reserved error'
);

-- Test 12: Reserved names are case-insensitive
SELECT ok(
  (SELECT (check_username_available('ADMIN'))->>'error') = 'reserved',
  'Reserved name check is case-insensitive'
);

-- ============================================================================
-- Uniqueness Tests
-- ============================================================================

-- Test 13: Taken username returns error
SELECT ok(
  (SELECT (check_username_available('TakenUsername'))->>'error') = 'taken',
  'Already registered username returns taken error'
);

-- Test 14: Case-insensitive uniqueness check
SELECT ok(
  (SELECT (check_username_available('takenusername'))->>'error') = 'taken',
  'Username uniqueness check is case-insensitive'
);

-- Test 15: Whitespace is trimmed before validation
SELECT ok(
  (SELECT (check_username_available('  TakenUsername  '))->>'error') = 'taken',
  'Whitespace is trimmed before uniqueness check'
);

-- ============================================================================
-- Cleanup and Finish
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
