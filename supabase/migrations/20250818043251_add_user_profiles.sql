create extension if not exists "pgjwt" with schema "extensions";

-- ================================
-- Tables
-- ================================

create table "public"."profiles" (
  "id" uuid not null primary key references auth.users(id),
  "updated_at" timestamp with time zone,
  "username" text unique,
  "full_name" text,
  "avatar_url" text,
  "website" text,
  constraint "username_length" check (char_length(username) >= 3)
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
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'User_' || substr(md5(new.email), 1, 8)
  );
  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();


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