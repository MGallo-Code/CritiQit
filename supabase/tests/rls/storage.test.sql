-- pgTAP tests for storage.objects RLS policies (avatars bucket)
-- Tests that Row Level Security correctly restricts file uploads/access

BEGIN;

-- Load pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan the number of tests
SELECT plan(10);

-- ============================================================================
-- Test Setup: Create test users
-- ============================================================================

-- Create test users
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
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000000',
    'user-e@test.local',
    '$2a$10$test',
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '00000000-0000-0000-0000-000000000000',
    'user-f@test.local',
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

-- ============================================================================
-- SELECT Policy Tests: "Avatar images are publicly accessible"
-- ============================================================================

-- First, insert a test file as service_role (bypasses RLS)
SET ROLE service_role;

INSERT INTO storage.objects (
  bucket_id,
  name,
  owner,
  owner_id,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
) VALUES (
  'avatars',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  NOW(),
  NOW(),
  NOW(),
  '{"size": 1024, "mimetype": "image/jpeg"}'::jsonb
)
ON CONFLICT (bucket_id, name) DO NOTHING;

RESET ROLE;

-- Test 1: Anon users can read from avatars bucket
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects
   WHERE bucket_id = 'avatars' AND name = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg') = 1,
  'Anon users can read avatars bucket (public read)'
);

RESET ROLE;

-- Test 2: Authenticated users can read from avatars bucket
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff')::text, true);

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects
   WHERE bucket_id = 'avatars' AND name = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg') = 1,
  'Authenticated users can read avatars bucket (public read)'
);

RESET ROLE;

-- ============================================================================
-- INSERT Policy Tests: "Users can upload avatar as their UUID.jpg"
-- ============================================================================

-- Test 3: User can upload file to own path (UUID.jpg)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff')::text, true);

-- Storage service sets owner_id from JWT sub claim
-- Simulate this by inserting with matching owner_id
INSERT INTO storage.objects (
  bucket_id,
  name,
  owner,
  owner_id,  -- Storage service extracts from JWT
  created_at,
  updated_at,
  last_accessed_at,
  metadata
) VALUES (
  'avatars',
  'ffffffff-ffff-ffff-ffff-ffffffffffff.jpg',  -- Must match owner_id
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  NOW(),
  NOW(),
  NOW(),
  '{"size": 2048, "mimetype": "image/jpeg"}'::jsonb
);

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects
   WHERE bucket_id = 'avatars' AND name = 'ffffffff-ffff-ffff-ffff-ffffffffffff.jpg') = 1,
  'User can upload to own path (INSERT own UUID.jpg)'
);

RESET ROLE;

-- Test 4: User cannot upload file to other user's path
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')::text, true);

-- User E tries to upload using User F's path
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner, owner_id, created_at, updated_at, last_accessed_at, metadata)
    VALUES (
      'avatars',
      'ffffffff-ffff-ffff-ffff-ffffffffffff-fake.jpg',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      NOW(),
      NOW(),
      NOW(),
      '{}'::jsonb
    )$$,
  '42501',  -- Insufficient privilege
  NULL,
  'User cannot upload to other user path (name must match owner_id)'
);

RESET ROLE;

-- Test 5: Filename must be exactly {owner_id}.jpg
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')::text, true);

-- Try to upload with wrong extension
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner, owner_id, created_at, updated_at, last_accessed_at, metadata)
    VALUES (
      'avatars',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.png',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      NOW(),
      NOW(),
      NOW(),
      '{}'::jsonb
    )$$,
  '42501',  -- Insufficient privilege
  NULL,
  'User cannot upload with wrong extension (must be .jpg)'
);

RESET ROLE;

-- ============================================================================
-- UPDATE Policy Tests: "Users can update their own avatar"
-- ============================================================================

-- Test 6: User can update own avatar
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff')::text, true);

UPDATE storage.objects
SET metadata = '{"size": 3072, "mimetype": "image/jpeg", "updated": true}'::jsonb
WHERE bucket_id = 'avatars' AND name = 'ffffffff-ffff-ffff-ffff-ffffffffffff.jpg';

SELECT ok(
  (SELECT metadata->>'updated' FROM storage.objects
   WHERE bucket_id = 'avatars' AND name = 'ffffffff-ffff-ffff-ffff-ffffffffffff.jpg') = 'true',
  'User can update own avatar (UPDATE own)'
);

RESET ROLE;

-- Test 7: User cannot update other user's avatar
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff')::text, true);

-- User F tries to update User E's avatar
UPDATE storage.objects
SET metadata = '{"hacked": true}'::jsonb
WHERE bucket_id = 'avatars' AND name = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg';

SELECT ok(
  (SELECT metadata->>'hacked' FROM storage.objects
   WHERE bucket_id = 'avatars' AND name = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg') IS NULL,
  'User cannot update other user avatar (UPDATE own protection)'
);

RESET ROLE;

-- Test 8: UPDATE WITH CHECK prevents changing to invalid filename
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff')::text, true);

SELECT throws_ok(
  $$UPDATE storage.objects
    SET name = 'ffffffff-ffff-ffff-ffff-ffffffffffff.png'
    WHERE bucket_id = 'avatars' AND name = 'ffffffff-ffff-ffff-ffff-ffffffffffff.jpg'$$,
  '42501',  -- Insufficient privilege
  NULL,
  'User cannot change filename to invalid extension (WITH CHECK protection)'
);

RESET ROLE;

-- ============================================================================
-- DELETE Policy Tests: "Users can delete their own avatar"
-- ============================================================================

-- Test 9: User can delete own avatar
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff')::text, true);

DELETE FROM storage.objects
WHERE bucket_id = 'avatars' AND name = 'ffffffff-ffff-ffff-ffff-ffffffffffff.jpg';

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects
   WHERE bucket_id = 'avatars' AND name = 'ffffffff-ffff-ffff-ffff-ffffffffffff.jpg') = 0,
  'User can delete own avatar (DELETE own)'
);

RESET ROLE;

-- Test 10: User cannot delete other user's avatar
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff')::text, true);

-- User F tries to delete User E's avatar
DELETE FROM storage.objects
WHERE bucket_id = 'avatars' AND name = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg';

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects
   WHERE bucket_id = 'avatars' AND name = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.jpg') = 1,
  'User cannot delete other user avatar (DELETE own protection)'
);

RESET ROLE;

-- ============================================================================
-- Finish tests
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
