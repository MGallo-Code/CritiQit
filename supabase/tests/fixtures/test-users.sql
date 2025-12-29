-- Test user fixtures for pgTAP tests
-- These users are created with known UUIDs for predictable testing

BEGIN;

-- Insert test users into auth.users table
-- Note: In production, passwords are hashed by GoTrue, but for testing we use dummy hashes
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES
  -- User A: Primary test user
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'user-a@test.local',
    '$2a$10$dummyhashfortest',
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Test User A"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  -- User B: For cross-user RLS testing
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'user-b@test.local',
    '$2a$10$dummyhashfortest',
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Test User B"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  -- Rate Limited User: Pre-exhausted rate limits
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'rate-limited@test.local',
    '$2a$10$dummyhashfortest',
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Rate Limited User"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  -- OAuth User: Has OAuth metadata
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'oauth@test.local',
    '$2a$10$dummyhashfortest',
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "OAuth User", "avatar_url": "https://example.com/avatar.jpg", "provider": "google"}'::jsonb,
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- The handle_new_user() trigger should automatically create profiles for these users
-- Wait briefly for trigger to complete
SELECT pg_sleep(0.1);

-- Verify profiles were created
DO $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
  );

  IF profile_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 profiles to be created by trigger, got %', profile_count;
  END IF;
END $$;

-- Update some profiles to have non-temporary usernames for testing
UPDATE public.profiles
SET
  username = 'test_user_a',
  username_is_temporary = false
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.profiles
SET
  username = 'test_user_b',
  username_is_temporary = false
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Setup rate limit data for rate-limited user
INSERT INTO public.rate_limits (
  identifier,
  identifier_type,
  endpoint,
  count_per_hour,
  count_per_day,
  reset_hour,
  reset_day
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'user',
  '/storage/v1/object/avatars',
  5,  -- At limit
  20, -- At limit
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '1 day'
)
ON CONFLICT (identifier, identifier_type, endpoint) DO NOTHING;

COMMIT;
