"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/providers/current-user-provider";

export function LogoutButton() {
  const router = useRouter();
  const { refreshUser } = useCurrentUser();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // Manually refresh the provider to clear the user
    await refreshUser();

    // Navigate to login page
    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
