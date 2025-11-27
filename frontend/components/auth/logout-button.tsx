"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/providers/current-user-provider";

export function LogoutButton() {
  const router = useRouter();
  const { refreshUser } = useCurrentUser();

  const logout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        return;
      }

      // Manually refresh the provider to clear the user
      await refreshUser();

      // Navigate to login page
      router.push("/auth/login");
    } catch (error) {
      console.error("Unexpected logout error:", error);
    }
  };

  return <Button onClick={logout}>Logout</Button>;
}
