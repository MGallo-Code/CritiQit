import { ProfileForm } from "@/components/auth/profile-form";

export default function ProfilePage() {
  return (
    <div className="flex w-full items-center justify-center p-0 sm:p-6 md:p-10">
      <ProfileForm className="w-full" />
    </div>
  );
}
