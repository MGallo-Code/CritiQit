"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LoadingContent from "@/components/ui/loading-content";
import { useCurrentUser } from "@/providers/current-user-provider";

export default function AuthCallbackPage() {
  // use the provider to get user
  const { user, refreshUser } = useCurrentUser();

  //for redirects
  const router = useRouter();
  // ensure we don't double-redirect the user
  const hasRedirectedRef = useRef(false);

  // get the redirect to parameter
  const params = useSearchParams();
  const redirectParam = params.get("redirectTo") ?? "";
  const redirectTo =
    redirectParam && redirectParam.startsWith("/")
      ? redirectParam
      : "/protected/dashboard";
  
  // used to update message displayed on screen for timeouts
  const [message, setMessage] = useState({
    title: "Please wait while we authenticate you...",
    description: "This may take a few seconds, please don't refresh the page...",
    showLoader: true
  })

  // main loop, pokes the provider to get the user if not loaded yet
  useEffect(() => {
    // if user is loaded and not yet redirected,
    if (user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace(redirectTo);
    }
    // user not loaded, poke provider to get user
    else {
      refreshUser()
    }
  }, [user])

  // set a message to tell user to refresh the page if it takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      setMessage({
        title: "This is taking longer than expected, please try refreshing the page...",
        description: "",
        showLoader: false
      })
    }, 10000)
    // clean up the timeout
    return () => clearTimeout(timeout);
  }, [])

  return (
    <LoadingContent
      heading={message.title}
      description={message.description}
      showLoader={message.showLoader}
    />
  );
}
