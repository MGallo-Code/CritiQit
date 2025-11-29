-- ================================
-- Create Avatar Presets Bucket
-- ================================
-- Separate bucket for system preset avatars (PNG format).
-- Public read, service_role write only.
--
-- BENEFITS OF SEPARATE BUCKET:
-- 1. Strict MIME enforcement - PNG only at bucket level
-- 2. Clear separation - users cannot touch this bucket
-- 3. Simpler policies - no path pattern checks needed
-- 4. No ambiguity - user avatars vs system presets clearly separated
--
-- URL PATTERN:
-- /storage/v1/object/public/avatar-presets/{preset-id}.png

-- ================================
-- Create the bucket
-- ================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar-presets',
  'avatar-presets',
  true,                    -- Public read access
  5242880,                 -- 5MB limit
  ARRAY['image/png']       -- PNG only
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png'];

-- ================================
-- RLS Policies
-- ================================

-- Public read: Anyone can view preset avatars
CREATE POLICY "Preset avatars are publicly accessible"
  ON storage.objects
  AS permissive
  FOR SELECT
  TO public
  USING (bucket_id = 'avatar-presets'::text);

-- Service role INSERT: Only service_role can upload presets
CREATE POLICY "Service role can upload preset avatars"
  ON storage.objects
  AS permissive
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'avatar-presets'::text);

-- Service role UPDATE: Only service_role can update presets
CREATE POLICY "Service role can update preset avatars"
  ON storage.objects
  AS permissive
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'avatar-presets'::text)
  WITH CHECK (bucket_id = 'avatar-presets'::text);

-- Service role DELETE: Only service_role can delete presets
CREATE POLICY "Service role can delete preset avatars"
  ON storage.objects
  AS permissive
  FOR DELETE
  TO service_role
  USING (bucket_id = 'avatar-presets'::text);
