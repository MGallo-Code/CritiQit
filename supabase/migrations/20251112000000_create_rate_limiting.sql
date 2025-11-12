-- Migration: Create rate limiting infrastructure
-- Date: 2025-11-12

-- Create rate_limits table for tracking request counts
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifier (user ID or IP address)
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('user', 'ip')),

  -- Endpoint being tracked
  endpoint text NOT NULL,

  -- Counters for different time windows
  count_per_second integer DEFAULT 0,
  count_per_minute integer DEFAULT 0,
  count_per_hour integer DEFAULT 0,
  count_per_day integer DEFAULT 0,

  -- Window reset timestamps
  reset_second timestamp with time zone DEFAULT now(),
  reset_minute timestamp with time zone DEFAULT now(),
  reset_hour timestamp with time zone DEFAULT now(),
  reset_day timestamp with time zone DEFAULT now(),

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Unique constraint: one row per identifier+endpoint combination
  UNIQUE(identifier, identifier_type, endpoint)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier
  ON public.rate_limits(identifier, identifier_type, endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_times
  ON public.rate_limits(reset_day, reset_hour, reset_minute, reset_second);

-- Enable RLS (service role will bypass this)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role only"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to check and increment rate limits
-- Returns JSONB with: { allowed: boolean, limit_hit: text, reset_at: timestamp, current: {...} }
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_identifier_type text,
  p_endpoint text,
  p_limit_second integer DEFAULT NULL,
  p_limit_minute integer DEFAULT NULL,
  p_limit_hour integer DEFAULT NULL,
  p_limit_day integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_record RECORD;
  v_now timestamp with time zone := now();
  v_allowed boolean := true;
  v_limit_hit text := NULL;
  v_reset_at timestamp with time zone := NULL;
BEGIN
  -- Upsert: get or create rate limit record
  INSERT INTO public.rate_limits (
    identifier,
    identifier_type,
    endpoint,
    count_per_second,
    count_per_minute,
    count_per_hour,
    count_per_day,
    reset_second,
    reset_minute,
    reset_hour,
    reset_day
  ) VALUES (
    p_identifier,
    p_identifier_type,
    p_endpoint,
    0,
    0,
    0,
    0,
    v_now + interval '1 second',
    v_now + interval '1 minute',
    v_now + interval '1 hour',
    v_now + interval '1 day'
  )
  ON CONFLICT (identifier, identifier_type, endpoint)
  DO UPDATE SET updated_at = v_now
  RETURNING * INTO v_record;

  -- Reset counters if windows have expired
  IF v_record.reset_second <= v_now THEN
    UPDATE public.rate_limits
    SET count_per_second = 0,
        reset_second = v_now + interval '1 second'
    WHERE id = v_record.id;
    v_record.count_per_second := 0;
  END IF;

  IF v_record.reset_minute <= v_now THEN
    UPDATE public.rate_limits
    SET count_per_minute = 0,
        reset_minute = v_now + interval '1 minute'
    WHERE id = v_record.id;
    v_record.count_per_minute := 0;
  END IF;

  IF v_record.reset_hour <= v_now THEN
    UPDATE public.rate_limits
    SET count_per_hour = 0,
        reset_hour = v_now + interval '1 hour'
    WHERE id = v_record.id;
    v_record.count_per_hour := 0;
  END IF;

  IF v_record.reset_day <= v_now THEN
    UPDATE public.rate_limits
    SET count_per_day = 0,
        reset_day = v_now + interval '1 day'
    WHERE id = v_record.id;
    v_record.count_per_day := 0;
  END IF;

  -- Check limits (most restrictive first)
  IF p_limit_second IS NOT NULL AND v_record.count_per_second >= p_limit_second THEN
    v_allowed := false;
    v_limit_hit := 'second';
    v_reset_at := v_record.reset_second;
  ELSIF p_limit_minute IS NOT NULL AND v_record.count_per_minute >= p_limit_minute THEN
    v_allowed := false;
    v_limit_hit := 'minute';
    v_reset_at := v_record.reset_minute;
  ELSIF p_limit_hour IS NOT NULL AND v_record.count_per_hour >= p_limit_hour THEN
    v_allowed := false;
    v_limit_hit := 'hour';
    v_reset_at := v_record.reset_hour;
  ELSIF p_limit_day IS NOT NULL AND v_record.count_per_day >= p_limit_day THEN
    v_allowed := false;
    v_limit_hit := 'day';
    v_reset_at := v_record.reset_day;
  END IF;

  -- If allowed, increment counters
  IF v_allowed THEN
    UPDATE public.rate_limits
    SET
      count_per_second = count_per_second + 1,
      count_per_minute = count_per_minute + 1,
      count_per_hour = count_per_hour + 1,
      count_per_day = count_per_day + 1,
      updated_at = v_now
    WHERE id = v_record.id;
  END IF;

  -- Return result as JSONB
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'limit_hit', v_limit_hit,
    'reset_at', v_reset_at,
    'current', jsonb_build_object(
      'second', v_record.count_per_second,
      'minute', v_record.count_per_minute,
      'hour', v_record.count_per_hour,
      'day', v_record.count_per_day
    )
  );
END;
$function$;

-- Cleanup function to remove old records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_deleted integer;
BEGIN
  -- Delete records older than 7 days with no recent activity
  DELETE FROM public.rate_limits
  WHERE updated_at < now() - interval '7 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits TO service_role;
