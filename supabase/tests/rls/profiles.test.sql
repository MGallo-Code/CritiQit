-- pgTAP tests for profiles table RLS policies
-- Tests that Row Level Security policies correctly restrict access

BEGIN;

-- Load pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan the number of tests
SELECT plan(13);

-- ============================================================================
-- Test Setup: Create ALL test users as superuser FIRST
-- ============================================================================

-- Create all test users needed for this test file
-- This must be done before any role switching since auth.users requires superuser
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
) VALUES
  -- Alice: Primary test user
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'alice@test.local',
    '$2a$10$test',
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Bob: For cross-user RLS tests
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'bob@test.local',
    '$2a$10$test',
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- Charlie: For INSERT policy tests
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'charlie@test.local',
    '$2a$10$test',
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  ),
  -- David: For INSERT failure tests
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'david@test.local',
    '$2a$10$test',
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Wait for trigger to create profiles
SELECT pg_sleep(0.1);

-- Update profiles with known usernames
UPDATE public.profiles
SET username = 'alice', username_is_temporary = false
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

UPDATE public.profiles
SET username = 'bob', username_is_temporary = false
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Delete Charlie and David's auto-created profiles for INSERT tests
DELETE FROM public.profiles WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
DELETE FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- ============================================================================
-- SELECT Policy Tests: "Public profiles are viewable by everyone"
-- ============================================================================

-- Test 1: Anon users can read any profile
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT ok(
  (SELECT COUNT(*) FROM public.profiles WHERE username IN ('alice', 'bob')) = 2,
  'Anon users can read all profiles (SELECT public)'
);

RESET ROLE;

-- Test 2: Authenticated users can read any profile
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

SELECT ok(
  (SELECT COUNT(*) FROM public.profiles WHERE username IN ('alice', 'bob')) = 2,
  'Authenticated users can read all profiles (SELECT public)'
);

RESET ROLE;

-- ============================================================================
-- INSERT Policy Tests: "Users can insert their own profile"
-- ============================================================================

-- Test 3: User can insert own profile
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc')::text, true);

-- Charlie inserts his own profile (auth.user already exists, profile was deleted above)
INSERT INTO public.profiles (id, username, username_is_temporary)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'charlie', false);

SELECT ok(
  (SELECT COUNT(*) FROM public.profiles WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 1,
  'User can insert own profile (INSERT own)'
);

RESET ROLE;

-- Test 4: User cannot insert profile for different user
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

-- Alice tries to insert David's profile
SELECT throws_ok(
  $$INSERT INTO public.profiles (id, username, username_is_temporary)
    VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'david', false)$$,
  '42501',  -- Insufficient privilege error code
  NULL,
  'User cannot insert profile for different user'
);

RESET ROLE;

-- ============================================================================
-- UPDATE Policy Tests: "Users can update own profile"
-- ============================================================================

-- Test 5: User can update own profile
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

UPDATE public.profiles
SET bio = 'Updated by Alice'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT ok(
  (SELECT bio FROM public.profiles WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 'Updated by Alice',
  'User can update own profile (UPDATE own)'
);

RESET ROLE;

-- Test 6: User cannot update other user's profile
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

-- Alice tries to update Bob's profile - should silently do nothing (USING clause filters)
UPDATE public.profiles
SET bio = 'Alice trying to update Bob'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT ok(
  (SELECT bio FROM public.profiles WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') IS NULL,
  'User cannot update other user profile (UPDATE own protection)'
);

RESET ROLE;

-- Test 7: UPDATE policy has WITH CHECK clause (prevents ownership hijacking)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

-- Alice tries to change her own ID to Bob's ID (ownership hijacking attempt)
SELECT throws_ok(
  $$UPDATE public.profiles SET id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',  -- Insufficient privilege error code
  NULL,
  'User cannot hijack ownership via UPDATE (WITH CHECK protection)'
);

RESET ROLE;

-- ============================================================================
-- DELETE Policy Tests: "Users can delete their own profile"
-- ============================================================================

-- Test 8: User can delete own profile
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc')::text, true);

DELETE FROM public.profiles WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT ok(
  (SELECT COUNT(*) FROM public.profiles WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 0,
  'User can delete own profile (DELETE own)'
);

RESET ROLE;

-- Test 9: User cannot delete other user's profile
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

-- Alice tries to delete Bob's profile - should silently do nothing
DELETE FROM public.profiles WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT ok(
  (SELECT COUNT(*) FROM public.profiles WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 1,
  'User cannot delete other user profile (DELETE own protection)'
);

RESET ROLE;

-- ============================================================================
-- Rate Limits Table Protection Tests
-- ============================================================================

-- First, add test data as service_role so we can verify it's hidden from users
SET ROLE service_role;
INSERT INTO public.rate_limits (identifier, identifier_type, endpoint)
VALUES ('rls-test-data', 'ip', '/rls-test')
ON CONFLICT (identifier, identifier_type, endpoint) DO NOTHING;
RESET ROLE;

-- Test 10: Authenticated users cannot read rate_limits (RLS returns 0 rows, not error)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

SELECT ok(
  (SELECT COUNT(*) FROM public.rate_limits WHERE identifier = 'rls-test-data') = 0,
  'Authenticated users cannot read rate_limits (RLS hides all rows)'
);

RESET ROLE;

-- Test 11: Authenticated users cannot write to rate_limits
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text, true);

SELECT throws_ok(
  $$INSERT INTO public.rate_limits (identifier, identifier_type, endpoint)
    VALUES ('user-attempt', 'ip', '/test')$$,
  '42501',  -- Insufficient privilege error code
  NULL,
  'Authenticated users cannot write to rate_limits (service role only)'
);

RESET ROLE;

-- Test 12: Anon users cannot read rate_limits (RLS returns 0 rows, not error)
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT ok(
  (SELECT COUNT(*) FROM public.rate_limits WHERE identifier = 'rls-test-data') = 0,
  'Anon users cannot read rate_limits (RLS hides all rows)'
);

RESET ROLE;

-- Test 13: Service role CAN access rate_limits
SET ROLE service_role;

SELECT ok(
  (SELECT COUNT(*) FROM public.rate_limits WHERE identifier = 'rls-test-data') = 1,
  'Service role can read rate_limits (service role only policy allows)'
);

-- Cleanup test data
DELETE FROM public.rate_limits WHERE identifier = 'rls-test-data';

RESET ROLE;

-- ============================================================================
-- Finish tests
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
