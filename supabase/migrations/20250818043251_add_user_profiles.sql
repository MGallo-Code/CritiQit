create extension if not exists "pgjwt" with schema "extensions";

-- ================================
-- Tables
-- ================================

CREATE TABLE public.profiles (
  "id" uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id),
  "username" TEXT UNIQUE
    CONSTRAINT "username_length" CHECK (char_length(username) >= 3 AND char_length(username) <= 35)
    CONSTRAINT "username_format" CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  "username_is_temporary" BOOLEAN NOT NULL DEFAULT false,
  "full_name" TEXT
    CONSTRAINT "full_name_length" CHECK (char_length(full_name) >= 3 AND char_length(full_name) <= 100),
  "bio" TEXT
    CONSTRAINT bio_length CHECK (char_length(bio) <= 800),
  "avatar_url" TEXT
    CONSTRAINT "avatar_url_length" CHECK (char_length(avatar_url) <= 2048),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE
);

-- ================================
-- Indexes
-- ================================

-- Case-insensitive username lookup index (for availability checking)
-- UNIQUE constraint already creates btree index on username
-- This adds functional index on lower(username) for case-insensitive queries
CREATE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

COMMENT ON INDEX profiles_username_lower_idx IS
'Optimizes case-insensitive username lookups used in generate_usernames() and check_username_available().
Prevents full table scans when checking if lower(username) = ''someusername''.';

-- ================================
-- Row Level Security
-- ================================

alter table public.profiles enable row level security;
alter table storage.objects enable row level security;

-- ================================
-- Functions / Triggers
-- ================================

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
begin
  INSERT INTO public.profiles (id, full_name, avatar_url, username, username_is_temporary)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'User_' || substr(md5(new.email || NOW()::text), 1, 10),
    true  -- Mark temporary username
  );
  return new;
end;
$function$;

-- Call the function on user creation
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- ================================
-- Storage
-- ================================

-- Create the 'avatars' bucket
-- File structure:
--   - User avatars: {uuid}.jpg (one per user, managed by user)
--   - Preset avatars: presets/{name}.jpg (managed by service_role only)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  on conflict (id) do nothing; -- prevent errors on subsequent runs

UPDATE storage.buckets
SET
  file_size_limit = 5242880,  -- 5MB in bytes
  allowed_mime_types = ARRAY['image/jpeg']  -- Accept common formats (frontend converts to JPEG)
WHERE id = 'avatars';

-- Create the 'email.templates' bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('email-templates', 'email-templates', true)
  on conflict (id) do nothing; -- prevent errors on subsequent runs

-- ================================
-- Policies
-- ================================

-- ~~~~~~~ Profiles ~~~~~~~

create policy "Public profiles are viewable by everyone."
  on public.profiles
  as permissive
  for select
  to public
  using (true);

create policy "Users can insert their own profile."
  on public.profiles
  as permissive
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile."
  on public.profiles
  as permissive
  for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can delete their own profile."
  on public.profiles
  as permissive
  for delete
  to authenticated
  using (auth.uid() = id);


-- ~~~~~~~ Avatars ~~~~~~~

CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects
  AS permissive
  FOR select
  TO public
  USING (
    bucket_id = 'avatars'::text
  );

CREATE POLICY "Users can upload avatar as their UUID.jpg"
  ON storage.objects
  AS permissive
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (bucket_id = 'avatars'::text)
    AND (name = owner::text || '.jpg')
  );

COMMENT ON POLICY "Users can upload avatar as their UUID.jpg" ON storage.objects IS
'Enforces one-avatar-per-user via {uuid}.jpg naming pattern.
Storage service validates JWT and sets owner field.
Policy validates filename matches owner being inserted.
This works because owner is the NEW value from INSERT, not auth.uid() which returns NULL.';

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  AS permissive
  FOR UPDATE
  TO authenticated
  USING (
    (bucket_id = 'avatars'::text)
    AND (name = owner::text || '.jpg')
  )
  WITH CHECK (
    (bucket_id = 'avatars'::text)
    AND (name = owner::text || '.jpg')
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  AS permissive
  FOR DELETE
  TO authenticated
  USING (
    (bucket_id = 'avatars'::text)
    AND (name = owner::text || '.jpg')
  );

-- ~~~~~~~ Avatar Presets ~~~~~~~

CREATE POLICY "Service role can upload avatar presets"
  ON storage.objects
  AS permissive
  FOR INSERT
  TO service_role
  WITH CHECK (
    (bucket_id = 'avatars'::text)
    AND (name LIKE 'presets/%')
  );

COMMENT ON POLICY "Service role can upload avatar presets" ON storage.objects IS
'Allows admin/service_role to upload preset avatars to presets/ folder.
Users are restricted to {uuid}.jpg pattern and cannot upload to presets/.
Preset avatars are publicly readable via the main "Avatar images are publicly accessible" policy.';

CREATE POLICY "Service role can update avatar presets"
  ON storage.objects
  AS permissive
  FOR UPDATE
  TO service_role
  USING (
    (bucket_id = 'avatars'::text)
    AND (name LIKE 'presets/%')
  )
  WITH CHECK (
    (bucket_id = 'avatars'::text)
    AND (name LIKE 'presets/%')
  );

CREATE POLICY "Service role can delete avatar presets"
  ON storage.objects
  AS permissive
  FOR DELETE
  TO service_role
  USING (
    (bucket_id = 'avatars'::text)
    AND (name LIKE 'presets/%')
  );

-- ~~~~~~~ Email Templates ~~~~~~~

CREATE POLICY "Service role can insert email templates"
  ON storage.objects
  AS permissive
  FOR INSERT
  TO service_role
  WITH CHECK (
    bucket_id = 'email-templates'::text
  );

CREATE POLICY "Service role can update email templates"
  ON storage.objects
  AS permissive
  FOR UPDATE
  TO service_role
  USING (
    bucket_id = 'email-templates'::text
  )
  WITH CHECK (
    bucket_id = 'email-templates'::text
  );

CREATE POLICY "Service role can delete email templates"
  ON storage.objects
  AS permissive
  FOR DELETE
  TO service_role
  USING (
    bucket_id = 'email-templates'::text
  );
