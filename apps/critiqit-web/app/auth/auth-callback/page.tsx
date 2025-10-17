import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import LoadingContent from '@/components/ui/loading-content'

export default async function AuthCallbackPage({
    searchParams,
}: {
    searchParams: { redirectTo?: string };
}) {
  // Wait for the server-side authentication to complete.
  const { user } = await getCurrentUser()
  const redirectTo = searchParams.redirectTo ?? '/protected/dashboard'

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