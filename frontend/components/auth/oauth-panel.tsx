"use client";

import { FaGoogle } from 'react-icons/fa';
import type { IconType } from 'react-icons';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
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
  const supabase = createClient();

  const handleOAuthSignIn = async (providerName: string) => {
    // Set loading state for the clicked button
    setIsPending(providerName);
    try {
        // return data from the signInWithOAuth function
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: providerName,
            options: {
                redirectTo: `${location.origin}/auth/callback?${redirectToParamString}`,
            },
        });
    } catch (error) {
        console.error(error);
    } finally {
        setIsPending(null);
    }
  };

  return (
    <div className="mt-7 flex flex-col gap-2">
        {oauthProviders.map((provider) => (
            <button
                className="inline-flex h-16 w-full items-center justify-center gap-4 rounded border border-slate-300 bg-primary p-2 text-med font-medium text-primary-foreground outline-none focus:ring-2 focus:ring-[#333] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 rounded-lg"
                onClick={() => handleOAuthSignIn(provider.provider)}
                key={provider.provider}>
                <img
                    src={provider.iconUrl}
                    alt={provider.name}
                    className="rounded-full"
                    style={{ height: '28px', width: '28px' }}
                />
                Continue with {provider.name}
            </button>
        ))}
    </div>
  );
}