import { LoginForm } from "@/components/auth/login-form";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{
    redirectTo?: string
  }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirectTo}/>
      </div>
    </div>
  );
}
