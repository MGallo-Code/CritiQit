import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { mapAuthUserToProfile, type UserProfile } from "@/lib/auth/user";

interface CurrentUserResult {
  user: UserProfile | null;
}

// get the current user from the database, cached
export const getCurrentUser = cache(async (): Promise<CurrentUserResult> => {
  const supabase = await createClient();

  // verify the current user with Supabase Auth
  const {
    data: { user: authUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[getCurrentUser] Failed to verify user", userError);
    return { user: null };
  }

  if (!authUser) {
    return { user: null };
  }

  // get user's profile from the db
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("avatar_url, username, full_name")
    .eq("id", authUser.id)
    .maybeSingle();

  // if error, return the verified auth user without extra profile data
  if (profileError) {
    console.error("[getCurrentUser] Failed to load profile", profileError);
    return {
      user: mapAuthUserToProfile(authUser, null),
    };
  }

  // return the user's profile combined with data from Supabase Auth
  return {
    user: mapAuthUserToProfile(authUser, profile ?? null),
  };
});
