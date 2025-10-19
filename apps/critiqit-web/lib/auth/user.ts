import type { User } from "@supabase/supabase-js";

// interface for the user profile
export interface UserProfile {
  email: string;
  avatar_url: string | null;
  username: string;
  full_name: string | null;
  created_at: string | null;
}

// map the auth user and optional profile record to the user interface
export const mapAuthUserToProfile = (
  user: User,
  profile: Partial<UserProfile> | null,
): UserProfile => {
  const metadata = user.user_metadata ?? {};

  return {
    email:
      profile?.email ??
      user.email ??
      (metadata.email as string | undefined) ??
      "",
    avatar_url: profile?.avatar_url ?? null,
    username: (profile?.username as string | undefined) ?? "",
    full_name: (profile?.full_name as string | undefined) ?? "Not Set",
    created_at: profile?.created_at ?? user.created_at ?? null,
  };
};
