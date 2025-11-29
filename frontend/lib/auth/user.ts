// JWT claims structure from Supabase auth
interface JWTClaims {
  sub: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

// interface for the user profile
export interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
  avatar_preset_id: string | null;
  avatar_background_color: string | null;
  username: string;
  username_is_temporary: boolean;
  full_name: string | null;
  bio: string | null;
  created_at: string | null;
}

// map the auth user and optional profile record to the user interface
export const mapAuthUserToProfile = (
  claims: JWTClaims,
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
    avatar_preset_id:
      profile?.avatar_preset_id ??
      null,
    avatar_background_color:
      profile?.avatar_background_color ??
      null,
    username:
      profile?.username ??
      metadata.username ??
      "",
    username_is_temporary:
      profile?.username_is_temporary ??
      false,
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
