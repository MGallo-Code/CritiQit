import { ProfileForm } from "@/components/auth/profile-form";

export default function ProfilePage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <ProfileForm className="w-full" />
    </div>
  );
}
