-- ================================
-- List Preset Avatars Function
-- ================================
-- Returns all available preset avatar IDs from storage/avatars/presets/ folder
-- Used by frontend to populate preset picker dynamically

CREATE OR REPLACE FUNCTION public.list_preset_avatars()
RETURNS jsonb
LANGUAGE sql  -- Use SQL instead of plpgsql for better optimization
SECURITY DEFINER
SET search_path TO ''
STABLE  -- Result doesn't change within transaction
PARALLEL SAFE  -- Can use parallel query execution
AS $$
  SELECT COALESCE(
    jsonb_agg(regexp_replace(name, '^presets/(.+)\.png$', '\1') ORDER BY name),
    '[]'::jsonb
  )
  FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND name LIKE 'presets/%.png'
    AND name NOT LIKE '%/%/%';  -- Only direct children, no subdirectories
$$;

COMMENT ON FUNCTION public.list_preset_avatars IS
'Returns array of preset avatar IDs (e.g., ["t-rex", "robot", "cat"]) by querying storage.objects.
Frontend uses this to dynamically populate the preset picker without hardcoding preset list.
Returns empty array if no presets found.';

-- Grant execute permission to authenticated users (needed to call via PostgREST)
GRANT EXECUTE ON FUNCTION public.list_preset_avatars() TO authenticated;
