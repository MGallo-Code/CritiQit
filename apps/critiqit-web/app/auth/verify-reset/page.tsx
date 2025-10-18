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
  const email = params.email ?? "";
  const redirectTo = params.redirectTo ?? "";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyResetForm initialEmail={email} redirectTo={redirectTo} />
      </div>
    </div>
  );
}
