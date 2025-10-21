"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LoadingContent from "@/components/ui/loading-content";
import { useCurrentUser } from "@/providers/current-user-provider";

export default function AuthCallbackPage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  // get the redirect to parameter
  const params = useSearchParams();
  const redirectParam = params.get("redirectTo") ?? "";
  const redirectTo =
    redirectParam && redirectParam.startsWith("/")
      ? redirectParam
      : "/protected/dashboard";

  useEffect(() => {
    if (!user || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    router.replace(redirectTo);
  }, [user, redirectTo, router]);

  return (
    <LoadingContent
      heading="Please wait while we authenticate you..."
      description="This may take a few seconds, please don't refresh the page..."
    />
  );
}
