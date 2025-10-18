import { VerifyResetForm } from "@/components/auth/verify-reset-form";

interface PageProps {
  searchParams?: Promise<{
    email?: string;
    redirectTo?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email ?? "";
  const redirectTo = params.redirectTo ?? "/protected/dashboard";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyResetForm initialEmail={email} redirectTo={redirectTo} />
      </div>
    </div>
  );
}
