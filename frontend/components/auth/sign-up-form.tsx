"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/ui/turnstile";
import { FormError } from "@/components/ui/form-error";
import { parseAuthError } from "@/lib/parse-auth-error";
import { isRateLimitError, type RateLimitError } from "@/lib/form-state";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentPropsWithoutRef } from "react";
import { OAuthPanel } from "./oauth-panel";

type SignUpFormProps = ComponentPropsWithoutRef<typeof Card> & {
  redirectTo?: string;
};

export function SignUpForm({
  className,
  redirectTo = "/protected/dashboard",
  ...props
}: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | RateLimitError | React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const router = useRouter();

  // Check if user is rate limited
  // Check if user is rate limited (only for RateLimitError, not ReactNode)
  const isRateLimited = typeof error === "object" && error !== null && "type" in error && error.type === "rate_limit";

  const redirectToParamString = "redirectTo=" + encodeURIComponent(redirectTo);
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken: turnstileToken,
        },
      });
      if (error) throw error;
      // user already exists and is verified
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        // notify user that they already have an account
        setError(
          <>
            An account with this email already exists. Please{' '}
            <Link
              href={`/auth/login?${redirectToParamString}`}
              className="link-gold"
            >
              login
            </Link>{' '}
            or{' '}
            <Link
              href={`/auth/forgot-password?email=${encodeURIComponent(email)}&${redirectToParamString}`}
              className="link-gold"
            >
              reset your password
            </Link>
            .
          </>,
        );
        setIsLoading(false);
        return;
      }
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&${redirectToParamString}`);
    } catch (error: unknown) {
      setError(parseAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card {...props} className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-2xl">Sign up</CardTitle>
        <CardDescription>Create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <OAuthPanel redirectTo={redirectTo} />
        <div className="flex w-full items-center gap-2 p-6 text-sm text-text-tertiary">
            <div className="h-px w-full bg-border"></div>
            OR
            <div className="h-px w-full bg-border"></div>
        </div>
        <form onSubmit={handleSignUp}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="repeat-password">Repeat Password</Label>
              </div>
              <Input
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2 overflow-hidden">
              <Label>Security Verification</Label>
              <Turnstile
                onTokenReceived={setTurnstileToken}
                onError={(error) => setError(`Security verification failed: ${error}`)}
                onExpired={() => setTurnstileToken(null)}
              />
            </div>
            {error && (typeof error === "string" || (typeof error === "object" && "type" in error)) ? (
              <FormError error={error as string | RateLimitError} />
            ) : error ? (
              <div className="text-sm text-red-500">{error}</div>
            ) : null}
            <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken || isRateLimited} aria-busy={isLoading}>
              {isLoading ? "Creating an account..." : "Sign up"}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link
              href={`/auth/login?${redirectToParamString}`}
              className="link-gold"
            >
              Login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
