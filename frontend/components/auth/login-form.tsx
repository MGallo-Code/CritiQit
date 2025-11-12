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
import { useState, type ComponentPropsWithoutRef } from "react";
import { OAuthPanel } from "./oauth-panel";

type LoginFormProps = ComponentPropsWithoutRef<typeof Card> & {
  redirectTo?: string;
};

export function LoginForm({
  className,
  redirectTo = "/protected/dashboard",
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const router = useRouter();

  const redirectToParamString = "redirectTo=" + encodeURIComponent(redirectTo);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: turnstileToken
        }
      });
      // if email not confirmed, redirect to verify email page
      if (error && error.message && error.message.includes("Email not confirmed")) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&${redirectToParamString}`);
        return;
      }
      // throw any errors
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push(`/auth/callback?${redirectToParamString}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card {...props} className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OAuthPanel redirectTo={redirectTo} />
        <div className="flex w-full items-center gap-2 p-6 text-sm text-slate-600">
            <div className="h-px w-full bg-primary"></div>
            OR
            <div className="h-px w-full bg-primary"></div>
        </div>
        <form onSubmit={handleLogin}>
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
                <Link
                  href={`/auth/forgot-password?${redirectToParamString}`}
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
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
              <Label>Security Verification</Label>
              <Turnstile
                onTokenReceived={setTurnstileToken}
                onError={(error) => setError(`Security verification failed: ${error}`)}
                onExpired={() => setTurnstileToken(null)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href={`/auth/sign-up?${redirectToParamString}`}
              className="underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
