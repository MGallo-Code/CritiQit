-- ============================================================================
-- EMAIL-TEMPLATES BUCKET RLS TESTS
-- ============================================================================
-- Tests that email-templates bucket is protected (service_role only).
-- Prevents attackers from injecting malicious content into verification emails.
--
-- Coverage:
--   - Anon users cannot read/write email templates
--   - Authenticated users cannot read/write email templates
--   - Service role can manage email templates
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(6);

-- ============================================================================
-- Setup: Create test user and seed template
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
  '99999999-9999-9999-9999-999999999999',
  '00000000-0000-0000-0000-000000000000',
  'email-template-test@test.local',
  '$2a$10$test',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Insert test template as service_role
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
  'email-templates',
  'test-template.html',
  NULL,
  NULL,
  NOW(),
  NOW(),
  NOW(),
  '{"size": 512, "mimetype": "text/html"}'::jsonb
)
ON CONFLICT (bucket_id, name) DO NOTHING;

RESET ROLE;

-- ============================================================================
-- Anon User Tests
-- ============================================================================

-- Test 1: Anon users cannot read email templates
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'email-templates') = 0,
  'Anon users cannot read email-templates bucket (RLS hides rows)'
);

RESET ROLE;

-- Test 2: Anon users cannot write to email templates
SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner, owner_id, created_at, updated_at, last_accessed_at, metadata)
    VALUES ('email-templates', 'malicious.html', NULL, NULL, NOW(), NOW(), NOW(), '{}'::jsonb)$$,
  '42501',
  NULL,
  'Anon users cannot write to email-templates bucket'
);

RESET ROLE;

-- ============================================================================
-- Authenticated User Tests
-- ============================================================================

-- Test 3: Authenticated users cannot read email templates
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', '99999999-9999-9999-9999-999999999999')::text, true);

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'email-templates') = 0,
  'Authenticated users cannot read email-templates bucket (RLS hides rows)'
);

RESET ROLE;

-- Test 4: Authenticated users cannot write to email templates
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', '99999999-9999-9999-9999-999999999999')::text, true);

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner, owner_id, created_at, updated_at, last_accessed_at, metadata)
    VALUES ('email-templates', 'phishing.html', NULL, NULL, NOW(), NOW(), NOW(), '{}'::jsonb)$$,
  '42501',
  NULL,
  'Authenticated users cannot write to email-templates bucket'
);

RESET ROLE;

-- ============================================================================
-- Service Role Tests
-- ============================================================================

-- Test 5: Service role can read email templates
SET ROLE service_role;

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'email-templates' AND name = 'test-template.html') = 1,
  'Service role can read email-templates bucket'
);

RESET ROLE;

-- Test 6: Service role can delete email templates
SET ROLE service_role;

DELETE FROM storage.objects WHERE bucket_id = 'email-templates' AND name = 'test-template.html';

SELECT ok(
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'email-templates' AND name = 'test-template.html') = 0,
  'Service role can delete from email-templates bucket'
);

RESET ROLE;

-- ============================================================================
-- Cleanup and Finish
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
