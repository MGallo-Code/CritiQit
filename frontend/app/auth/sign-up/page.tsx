import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{
    redirectTo?: string
  }>;
}) {
  const params = await searchParams;
  const redirectTo = params?.redirectTo ?? "/protected/dashboard";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 sm:p-6">
      <SignUpForm className="w-full sm:max-w-md" redirectTo={redirectTo} />
    </div>
  );
}
