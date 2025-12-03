import { VerifyResetForm } from "@/components/auth/verify-reset-form";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{
    email?: string;
    redirectTo?: string;
  }>;
}) {
  const params = await searchParams;
  const email = params?.email ?? "";
  const redirectTo = params?.redirectTo ?? "";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 sm:p-6">
      <VerifyResetForm
        className="w-full sm:max-w-md"
        initialEmail={email}
        redirectTo={redirectTo}
      />
    </div>
  );
}
