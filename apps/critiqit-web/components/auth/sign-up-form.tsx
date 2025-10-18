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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OAuthPanel } from "./oauth-panel";

export function SignUpForm({
  className,
  redirectTo = "/protected/dashboard",
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const router = useRouter();

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
      if (data.user.identities.length === 0) {
        // notify user that they already have an account
        setError(
          <>
            An account with this email already exists. Please{' '}
            <Link
              href={`/auth/login?${redirectToParamString}`}
              className="underline underline-offset-4"
            >
              login
            </Link>{' '}
            or{' '}
            <Link
              href={`/auth/forgot-password?email=${encodeURIComponent(email)}&${redirectToParamString}`}
              className="underline underline-offset-4"
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
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthPanel redirectTo={redirectTo} />
          <div className="flex w-full items-center gap-2 p-6 text-sm text-slate-600">
              <div className="h-px w-full bg-primary"></div>
              OR
              <div className="h-px w-full bg-primary"></div>
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
              <div className="grid gap-2">
                <Label>Security Verification</Label>
                <Turnstile
                  onTokenReceived={setTurnstileToken}
                  onError={(error) => setError(`Security verification failed: ${error}`)}
                  onExpired={() => setTurnstileToken(null)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href={`/auth/login?${redirectToParamString}`}
                className="underline underline-offset-4"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
