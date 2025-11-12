import type { Claims } from "@supabase/supabase-js";

// interface for the user profile
export interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
  username: string;
  full_name: string | null;
  bio: string | null;
  created_at: string | null;
}

// map the auth user and optional profile record to the user interface
export const mapAuthUserToProfile = (
  claims: Claims,
  profile: Partial<UserProfile> | null,
): UserProfile => {
  const metadata = claims.user_metadata ?? {};

  return {
    id: typeof claims.sub === "string" ? claims.sub : "",
    email:
      profile?.email ??
      claims.email ??
      metadata.email ??
      "",
    avatar_url:
      profile?.avatar_url ??
      metadata.avatar_url ??
      null,
    username:
      profile?.username ??
      metadata.username ??
      "",
    full_name:
      profile?.full_name ??
      metadata.full_name ??
      null,
    created_at:
      profile?.created_at ??
      null,
    bio:
      profile?.bio ??
      metadata.bio ??
      null,
  };
};
