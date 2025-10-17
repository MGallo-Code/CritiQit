"use client"

import { useCurrentUser } from "@/providers/current-user-provider"
import LoadingContent from "@/components/ui/loading-content"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <LoadingContent
        heading="Checking your authentication..."
        description="This may take a few seconds, please don't refresh the page..."
      />
    );
  }

  if (!user) {
    // get full URL user tried accessing
    const headersList = headers();
    const pathname = headersList.get("x-pathname") || "/protected/dashboard";

    // Construct login url with redirect parameter
    const loginUrl = `/auth/login?redirectTo=${encodeURIComponent(pathname)}`
    
    // redirect
    return redirect(loginUrl);
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {children}
        </div>
      </div>
    </main>
  );
}
