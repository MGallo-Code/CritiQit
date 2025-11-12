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

type ForgotPasswordFormProps = ComponentPropsWithoutRef<typeof Card> & {
  initialEmail?: string;
  redirectTo?: string;
};

export function ForgotPasswordForm({
  className,
  initialEmail = "",
  redirectTo = "/protected/dashboard",
  ...props
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const router = useRouter();

  const redirectToParamString = "redirectTo=" + encodeURIComponent(redirectTo);
  const emailParamString = "email=" + encodeURIComponent(email);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password?${redirectToParamString}`,
        captchaToken: turnstileToken,
      });
      if (error) throw error;
      router.push(`/auth/verify-reset?${emailParamString}&${redirectToParamString}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card {...props} className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-2xl">Reset Your Password</CardTitle>
        <CardDescription>
          Type in your email and we&apos;ll send you a link and a code to reset
          your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleForgotPassword}>
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
              <Label>Security Verification</Label>
              <Turnstile
                onTokenReceived={setTurnstileToken}
                onError={(error) =>
                  setError(`Security verification failed: ${error}`)
                }
                onExpired={() => setTurnstileToken(null)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
              {isLoading ? "Sending..." : "Send reset email"}
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
  );
}
