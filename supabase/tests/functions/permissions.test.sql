-- ============================================================================
-- FUNCTION PERMISSION TESTS
-- ============================================================================
-- Tests that database functions are only callable by authorized roles.
-- Prevents privilege escalation if GRANT statements are accidentally changed.
--
-- Coverage:
--   - Anon cannot call authenticated-only functions
--   - Authenticated cannot call service_role-only functions
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(6);

-- ============================================================================
-- Setup: Create test user
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
  '77777777-7777-7777-7777-777777777777',
  '00000000-0000-0000-0000-000000000000',
  'permissions-test@test.local',
  '$2a$10$test',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Anon Cannot Call Authenticated Functions
-- ============================================================================

-- Test 1: Anon cannot call generate_usernames()
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT throws_ok(
  $$SELECT generate_usernames()$$,
  '42501',
  NULL,
  'Anon users cannot call generate_usernames()'
);

RESET ROLE;

-- Test 2: Anon cannot call check_username_available()
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT throws_ok(
  $$SELECT check_username_available('testuser')$$,
  '42501',
  NULL,
  'Anon users cannot call check_username_available()'
);

RESET ROLE;

-- ============================================================================
-- Authenticated Cannot Call Service Role Functions
-- ============================================================================

-- Test 3: Authenticated cannot call check_rate_limit()
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', '77777777-7777-7777-7777-777777777777')::text, true);

SELECT throws_ok(
  $$SELECT check_rate_limit('test', 'user', '/test', 10, 100, 1000, 10000)$$,
  '42501',
  NULL,
  'Authenticated users cannot call check_rate_limit()'
);

RESET ROLE;

-- Test 4: Authenticated cannot call cleanup_old_rate_limits()
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', '77777777-7777-7777-7777-777777777777')::text, true);

SELECT throws_ok(
  $$SELECT cleanup_old_rate_limits()$$,
  '42501',
  NULL,
  'Authenticated users cannot call cleanup_old_rate_limits()'
);

RESET ROLE;

-- ============================================================================
-- Anon Cannot Call Service Role Functions
-- ============================================================================

-- Test 5: Anon cannot call check_rate_limit()
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT throws_ok(
  $$SELECT check_rate_limit('test', 'user', '/test', 10, 100, 1000, 10000)$$,
  '42501',
  NULL,
  'Anon users cannot call check_rate_limit()'
);

RESET ROLE;

-- Test 6: Anon cannot call cleanup_old_rate_limits()
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT throws_ok(
  $$SELECT cleanup_old_rate_limits()$$,
  '42501',
  NULL,
  'Anon users cannot call cleanup_old_rate_limits()'
);

RESET ROLE;

-- ============================================================================
-- Cleanup and Finish
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
