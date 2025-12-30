-- ============================================================================
-- RATE LIMITING TESTS
-- ============================================================================
-- Tests for check_rate_limit() and cleanup_old_rate_limits() functions
-- which provide application-level rate limiting for sensitive endpoints.
--
-- Coverage:
--   - First request is always allowed
--   - Limits are enforced per time window
--   - Counters increment correctly
--   - Window reset behavior
--   - Response structure validation
--   - Cleanup function removes stale records
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(14);

-- ============================================================================
-- Setup: Clean slate for rate limit tests
-- ============================================================================

-- Clear any existing test data
DELETE FROM public.rate_limits WHERE identifier LIKE 'test-%';

-- ============================================================================
-- Response Structure Tests
-- ============================================================================

-- Test 1: Returns jsonb with required keys
SELECT ok(
  (SELECT check_rate_limit('test-structure', 'user', '/test', 10, 100, 1000, 10000)
    ?& ARRAY['allowed', 'limit_hit', 'reset_at', 'current']),
  'check_rate_limit() returns jsonb with all required keys'
);

-- Test 2: 'current' contains all counter fields
SELECT ok(
  (SELECT (check_rate_limit('test-current', 'user', '/test', 10, 100, 1000, 10000))->'current'
    ?& ARRAY['second', 'minute', 'hour', 'day']),
  'current object contains second, minute, hour, day counters'
);

-- ============================================================================
-- First Request Behavior Tests
-- ============================================================================

-- Test 3: First request is always allowed
SELECT ok(
  (SELECT (check_rate_limit('test-first', 'user', '/test', 5, 50, 500, 5000))->>'allowed')::boolean = true,
  'First request to new identifier is allowed'
);

-- Test 4: limit_hit is null when allowed
SELECT ok(
  (SELECT (check_rate_limit('test-limit-null', 'user', '/test', 5, 50, 500, 5000))->>'limit_hit') IS NULL,
  'limit_hit is null when request is allowed'
);

-- ============================================================================
-- Counter Increment Tests
-- ============================================================================

-- Test 5: Counter increments after allowed request
-- The 'current' field shows counter state BEFORE the current request's increment
-- So: call 1 returns current=0 (then increments to 1)
--     call 2 returns current=1 (then increments to 2)
--     call 3 returns current=2 (showing previous state)
SELECT check_rate_limit('test-increment', 'user', '/test', 100, 100, 100, 100);  -- Returns 0, increments to 1
SELECT check_rate_limit('test-increment', 'user', '/test', 100, 100, 100, 100);  -- Returns 1, increments to 2

SELECT ok(
  (SELECT ((check_rate_limit('test-increment', 'user', '/test', 100, 100, 100, 100))->'current'->>'minute')::integer) = 2,
  'Minute counter increments after each allowed request'
);

-- ============================================================================
-- Limit Enforcement Tests
-- ============================================================================

-- Test 6: Hourly limit is enforced
-- Create identifier and exhaust hour limit
SELECT check_rate_limit('test-hour-limit', 'user', '/test', NULL, NULL, 2, NULL);
SELECT check_rate_limit('test-hour-limit', 'user', '/test', NULL, NULL, 2, NULL);

-- Third request should be blocked
SELECT ok(
  (SELECT (check_rate_limit('test-hour-limit', 'user', '/test', NULL, NULL, 2, NULL))->>'allowed')::boolean = false,
  'Request is blocked when hourly limit exceeded'
);

-- Test 7: Correct limit_hit value when blocked
SELECT ok(
  (SELECT (check_rate_limit('test-hour-limit', 'user', '/test', NULL, NULL, 2, NULL))->>'limit_hit') = 'hour',
  'limit_hit indicates "hour" when hourly limit exceeded'
);

-- Test 8: Daily limit is enforced
SELECT check_rate_limit('test-day-limit', 'user', '/test', NULL, NULL, NULL, 1);

SELECT ok(
  (SELECT (check_rate_limit('test-day-limit', 'user', '/test', NULL, NULL, NULL, 1))->>'allowed')::boolean = false,
  'Request is blocked when daily limit exceeded'
);

-- Test 9: reset_at is provided when blocked
SELECT ok(
  (SELECT (check_rate_limit('test-day-limit', 'user', '/test', NULL, NULL, NULL, 1))->>'reset_at') IS NOT NULL,
  'reset_at timestamp is provided when request is blocked'
);

-- ============================================================================
-- NULL Limit Behavior Tests
-- ============================================================================

-- Test 10: NULL limits are ignored (no restriction)
-- Request with only minute limit set, others NULL
SELECT check_rate_limit('test-null-limits', 'user', '/test', NULL, 1, NULL, NULL);

SELECT ok(
  (SELECT (check_rate_limit('test-null-limits', 'user', '/test', NULL, 1, NULL, NULL))->>'limit_hit') = 'minute',
  'Only specified limits are enforced, NULL limits are ignored'
);

-- ============================================================================
-- Identifier Type Tests
-- ============================================================================

-- Test 11: Different identifier types are tracked separately
SELECT check_rate_limit('shared-id', 'user', '/test', NULL, NULL, 1, NULL);

-- Same identifier but different type should have fresh counter
SELECT ok(
  (SELECT (check_rate_limit('shared-id', 'ip', '/test', NULL, NULL, 1, NULL))->>'allowed')::boolean = true,
  'Same identifier with different type is tracked separately'
);

-- ============================================================================
-- Endpoint Separation Tests
-- ============================================================================

-- Test 12: Different endpoints are tracked separately
SELECT check_rate_limit('endpoint-test', 'user', '/endpoint-a', NULL, NULL, 1, NULL);

SELECT ok(
  (SELECT (check_rate_limit('endpoint-test', 'user', '/endpoint-b', NULL, NULL, 1, NULL))->>'allowed')::boolean = true,
  'Same identifier on different endpoint has fresh counter'
);

-- ============================================================================
-- Cleanup Function Tests
-- ============================================================================

-- Test 13: Cleanup function returns integer count
SELECT ok(
  (SELECT pg_typeof(cleanup_old_rate_limits())::text) = 'integer',
  'cleanup_old_rate_limits() returns integer count'
);

-- Test 14: Cleanup removes old records
-- Insert old test record directly
INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, updated_at)
VALUES ('test-cleanup-old', 'user', '/test', NOW() - INTERVAL '8 days');

-- Run cleanup
SELECT cleanup_old_rate_limits();

-- Verify record was deleted
SELECT ok(
  (SELECT COUNT(*) FROM public.rate_limits WHERE identifier = 'test-cleanup-old') = 0,
  'cleanup_old_rate_limits() removes records older than 7 days'
);

-- ============================================================================
-- Cleanup and Finish
-- ============================================================================

-- Clean up test data
DELETE FROM public.rate_limits WHERE identifier LIKE 'test-%';

SELECT * FROM finish();

ROLLBACK;
