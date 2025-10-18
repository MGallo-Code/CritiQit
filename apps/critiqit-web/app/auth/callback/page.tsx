"use client";

import { redirect, useSearchParams } from 'next/navigation'
import { useCurrentUser } from '@/providers/current-user-provider'
import LoadingContent from '@/components/ui/loading-content'

export default function AuthCallbackPage() {
  // Get the current user
  const { user } = useCurrentUser()

  // Get the redirect to parameter
  const params = useSearchParams()
  const redirectTo = params.get('redirectTo') ?? '/protected/dashboard'

  // If the user object exists, the authentication was successful.
  if (user) {
    // Redirect the user to their dashboard or another protected page.
    redirect(redirectTo)
  }

  // Show message to user while waiting for authentication to complete,
  // also show a loading spinner
  return (
    <LoadingContent
      heading="Please wait while we authenticate you..."
      description="This may take a few seconds, please don't refresh the page..."
    />
  );
}