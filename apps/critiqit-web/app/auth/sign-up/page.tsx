import { SignUpForm } from "@/components/auth/sign-up-form";

export default function Page({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  const redirectTo = searchParams.redirectTo;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}