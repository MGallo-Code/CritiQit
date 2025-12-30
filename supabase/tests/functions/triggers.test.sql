-- ============================================================================
-- TRIGGER TESTS
-- ============================================================================
-- Tests for database triggers that execute automatically on data changes.
-- These tests verify business logic that runs outside of direct user control.
--
-- Coverage:
--   - handle_new_user(): Profile creation on user signup
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(5);

-- ============================================================================
-- handle_new_user() Trigger Tests
-- ============================================================================
-- This trigger fires AFTER INSERT on auth.users and creates a corresponding
-- profile record with a temporary username.

-- Clean up any existing test data from previous runs
DELETE FROM public.profiles WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);
DELETE FROM auth.users WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- Test 1: Trigger creates profile automatically on user creation
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
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'trigger-test-1@test.local',
  '$2a$10$test',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
);

SELECT ok(
  (SELECT COUNT(*) FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111') = 1,
  'handle_new_user() creates profile on user signup'
);

-- Test 2: Generated username follows User_XXXXXXXXXX format
SELECT ok(
  (SELECT username FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111') ~ '^User_[a-f0-9]{10}$',
  'Generated username matches User_XXXXXXXXXX format (10 hex chars)'
);

-- Test 3: Temporary username flag is set to true
SELECT ok(
  (SELECT username_is_temporary FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111') = true,
  'username_is_temporary is set to true for auto-generated username'
);

-- Test 4: Profile inherits metadata from auth.users when provided
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role,
  raw_user_meta_data
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'trigger-test-2@test.local',
  '$2a$10$test',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '{"full_name": "Test User", "avatar_url": "https://example.com/avatar.jpg"}'::jsonb
);

SELECT ok(
  (SELECT full_name FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222') = 'Test User',
  'Profile inherits full_name from auth.users raw_user_meta_data'
);

-- Test 5: Each user gets a unique temporary username
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
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'trigger-test-3@test.local',
  '$2a$10$test',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
);

SELECT ok(
  (SELECT username FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111')
    != (SELECT username FROM public.profiles WHERE id = '33333333-3333-3333-3333-333333333333'),
  'Each user receives a unique temporary username'
);

-- ============================================================================
-- Cleanup and Finish
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
