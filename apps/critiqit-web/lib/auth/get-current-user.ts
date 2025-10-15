import { cache } from "react";
import type { Session } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { mapSessionToUser, type UserProfile } from "@/lib/auth/user";

interface CurrentUserResult {
  session: Session | null;
  user: UserProfile | null;
}

// get the current user from the database, cached
export const getCurrentUser = cache(async (): Promise<CurrentUserResult> => {
  const supabase = await createClient();

  // get session from the db
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // if error, return it
  if (sessionError) {
    console.error("[getCurrentUser] Failed to load session", sessionError);
    return { session: null, user: null };
  }

  // if no session, return null---user is logged out
  if (!session || !session.user) {
    return { session: null, user: null };
  }

  // get user id from the session
  const userId =
    session.user.id ?? (session.user.user_metadata?.sub as string | undefined);

  // if no user id, return the session, can't check the db for the user
  if (!userId) {
    return { session, user: mapSessionToUser(session, null) };
  }

  // get user's profile from the db
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("avatar_url, username, full_name")
    .eq("id", userId)
    .maybeSingle();

  // if error, return the session, can't check the db for the user
  if (profileError) {
    console.error("[getCurrentUser] Failed to load profile", profileError);
    return { session, user: mapSessionToUser(session, null) };
  }

  // return the session and the user's profile
  return {
    session,
    user: mapSessionToUser(session, profile ?? null),
  };
});
