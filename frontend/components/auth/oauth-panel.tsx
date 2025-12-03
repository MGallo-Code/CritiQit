"use client";

import { FaGoogle } from 'react-icons/fa';
import type { IconType } from 'react-icons';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { createClient } from '@/lib/supabase/client';
import { parseAuthError } from '@/lib/parse-auth-error';
import { isRateLimitError, type RateLimitError } from '@/lib/form-state';
import { useState } from 'react';

// Define the structure for a provider
type OAuthProvider = {
  name: string;
  provider: string;
  iconUrl: string;
};

// Define the list of providers you want to support
const oauthProviders: OAuthProvider[] = [
  {
    name: 'Google',
    provider: 'google',
    iconUrl: 'https://www.svgrepo.com/show/475656/google-color.svg',
  }
];


export function OAuthPanel({
  redirectTo = "/protected/dashboard",
}: {
  redirectTo: string;
}) {
  const redirectToParamString = "redirectTo=" + encodeURIComponent(redirectTo);
  const [isPending, setIsPending] = useState<string | null>(null);
  const [error, setError] = useState<string | RateLimitError | null>(null);
  const supabase = createClient();

  // Check if user is rate limited
  const isRateLimited = isRateLimitError(error);

  const handleOAuthSignIn = async (providerName: string) => {
    // Set loading state for the clicked button
    setIsPending(providerName);
    setError(null);

    try {
      // return data from the signInWithOAuth function
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerName as any, // Type assertion needed for provider string
        options: {
          redirectTo: `${location.origin}/auth/callback?${redirectToParamString}`,
        },
      });

      if (error) {
        setError(parseAuthError(error));
        setIsPending(null);
      }
      // If successful, user will be redirected by OAuth flow
    } catch (error) {
      setError(parseAuthError(error));
      setIsPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {oauthProviders.map((provider) => (
        <Button
          key={provider.provider}
          variant="default"
          size="lg"
          className="h-12 w-full gap-3"
          onClick={() => handleOAuthSignIn(provider.provider)}
          disabled={isPending !== null || isRateLimited}
          aria-label={`Continue with ${provider.name}`}
          aria-busy={isPending === provider.provider}
        >
          <img
            src={provider.iconUrl}
            alt=""
            aria-hidden="true"
            className="h-5 w-5 rounded-full"
          />
          {isPending === provider.provider ? 'Redirecting...' : `Continue with ${provider.name}`}
        </Button>
      ))}
      <FormError error={error} />
    </div>
  );
}