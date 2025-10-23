create extension if not exists "pgjwt" with schema "extensions";

-- ================================
-- Tables
-- ================================

CREATE TABLE "public"."profiles" (
  "id" uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id),
  "username" TEXT UNIQUE
    CONSTRAINT "username_length" CHECK (char_length(username) >= 3 AND char_length(username) <= 35),
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
-- Row Level Security
-- ================================

alter table "public"."profiles" enable row level security;
alter table "storage"."objects" enable row level security;

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
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'User_' || substr(md5(new.email || NOW()::text), 1, 10)
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
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  on conflict (id) do nothing; -- prevent errors on subsequent runs

-- Create the 'email.templates' bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('email-templates', 'email-templates', true)
  on conflict (id) do nothing; -- prevent errors on subsequent runs

-- ================================
-- Policies
-- ================================

-- ~~~~~~~ Profiles ~~~~~~~

create policy "Public profiles are viewable by everyone."
  on "public"."profiles"
  as permissive
  for select
  to public
  using (true);

create policy "Users can insert their own profile."
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile."
  on "public"."profiles"
  as permissive
  for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can delete their own profile."
  on "public"."profiles"
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

CREATE POLICY "Users can upload an avatar to their own folder."
  ON "storage"."objects"
  AS permissive
  FOR insert
  TO authenticated
  WITH CHECK (
    (bucket_id = 'avatars'::text) AND (owner = auth.uid())
  );

CREATE POLICY "Users can update their own avatars."
  ON "storage"."objects"
  AS permissive
  FOR update
  TO authenticated
  using (
    (bucket_id = 'avatars'::text) AND (owner = auth.uid())
  )
  with check (
    (bucket_id = 'avatars'::text) AND (owner = auth.uid())
  );

CREATE POLICY "Users can delete their own avatars."
  ON "storage"."objects"
  AS permissive
  FOR delete
  TO authenticated
  USING (
    (bucket_id = 'avatars'::text) AND (owner = auth.uid())
  );

-- ~~~~~~~ Email Templates ~~~~~~~

CREATE POLICY "Admins can upload email templates."
  ON "storage"."objects"
  AS permissive
  FOR insert
  TO authenticated
  WITH CHECK (
    (bucket_id = 'email-templates'::text) AND (owner = auth.uid())
  );

CREATE POLICY "Allow service_role to insert into email-templates"
  ON "storage"."objects"
  AS permissive
  FOR INSERT
  WITH CHECK (
    (bucket_id = 'email-templates'::text) AND
    (auth.role() = 'service_role')
  );

-- ================================
-- Realtime
-- ================================
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table "public"."profiles";