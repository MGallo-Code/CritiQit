import { VerifyResetForm } from "@/components/auth/verify-reset-form";

interface PageProps {
  searchParams?: Promise<{
    email?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyResetForm initialEmail={params?.email ?? ""} />
      </div>
    </div>
  );
}
