import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{
    redirectTo?: string
  }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "/protected/dashboard";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <SignUpForm className="w-full max-w-sm" redirectTo={redirectTo} />
    </div>
  );
}
