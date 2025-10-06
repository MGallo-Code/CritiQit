import { VerifyEmailForm } from "@/components/auth/verify-email-form";

interface PageProps {
  searchParams?: {
    email?: string;
  };
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyEmailForm initialEmail={params?.email ?? ""} />
      </div>
    </div>
  );
}
