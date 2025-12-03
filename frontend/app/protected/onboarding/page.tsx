import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get current username and temporary flag
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, username_is_temporary")
    .eq("id", user.id)
    .single();

  // If username is already user-chosen (not temporary), redirect to dashboard
  // This prevents users from accessing the picker page if they already set their username
  if (profile && !profile.username_is_temporary) {
    redirect("/protected/dashboard");
  }

  return (
    <div className="w-full max-w-md sm:max-w-lg">
      <OnboardingForm
        userId={user.id}
        currentUsername={profile?.username}
      />
    </div>
  );
}
