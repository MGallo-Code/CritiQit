import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { mapAuthUserToProfile, type UserProfile } from "@/lib/auth/user";

interface CurrentUserResult {
  user: UserProfile | null;
}

// get the current user from the database, cached
export const getCurrentUser = cache(async (): Promise<CurrentUserResult> => {
  const supabase = await createClient();

  // if no claims, return null, as user is logged out
  const {
    data: claims,
    error: claimsError,
  } = await supabase.auth.getClaims();

  // user not logged in, no need for further checks
  if (!claims || !claims.claims || claimsError) {
    return { user: null };
  }

  const userClaims = claims.claims;

  // get user's profile from the db
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("avatar_url, username, created_at")
    .eq("id", userClaims.sub)
    .maybeSingle();

  // if error, return the verified auth user without extra profile data
  if (profileError) {
    console.error("[getCurrentUser] Failed to load user's profile", profileError);
    return {
      user: mapAuthUserToProfile(userClaims, null),
    };
  }

  // return the user's profile combined with data from Supabase Auth
  return {
    user: mapAuthUserToProfile(userClaims, profile ?? null),
  };
});
