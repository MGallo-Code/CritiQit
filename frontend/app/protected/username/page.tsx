import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsernamePickerForm } from "./username-picker-form";

export default async function UsernamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get current username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <UsernamePickerForm
          userId={user.id}
          currentUsername={profile?.username}
        />
      </div>
    </div>
  );
}
