"use client";

import { useEffect, useMemo, useState, useActionState, type ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
import { OTPInput } from "@/components/ui/otp-input";
import {
  resendResetCodeAction,
  verifyResetCodeAction,
} from "@/app/auth/verify-reset/actions";
import { INITIAL_FORM_STATE, isRateLimitError } from "@/lib/form-state";


function SubmitButton({ children, disabled, isRateLimited }: { children: React.ReactNode; disabled?: boolean; isRateLimited?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled || isRateLimited}>
      {pending ? "Working..." : children}
    </Button>
  );
}

type CardProps = ComponentPropsWithoutRef<typeof Card>;

export interface VerifyResetFormProps extends CardProps {
  initialEmail?: string;
  redirectTo?: string;
}

export function VerifyResetForm({
  initialEmail = "",
  redirectTo = "/protected/dashboard",
  className,
  ...props
}: VerifyResetFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const redirectToParamString = "redirectTo=" + encodeURIComponent(redirectTo);

  const [verifyState, verifyAction] = useActionState(
    verifyResetCodeAction,
    INITIAL_FORM_STATE,
  );
  const [resendState, resendAction] = useActionState(
    resendResetCodeAction,
    INITIAL_FORM_STATE,
  );

  useEffect(() => {
    if (verifyState.status === "success") {
      router.push(`/auth/update-password?${redirectToParamString}`);
    }
  }, [verifyState.status, router, redirectToParamString]);

  useEffect(() => {
    if (verifyState.status !== "idle" || resendState.status !== "idle") {
      setTurnstileToken(null);
      setTurnstileKey((current) => current + 1);
    }
  }, [verifyState.status, resendState.status]);

  // Check if user is rate limited
  const isRateLimited = isRateLimitError(verifyState.error) || isRateLimitError(resendState.error);

  const feedback = useMemo(() => {
    if (verifyState.status === "error") {
      return { tone: "error", message: verifyState.error } as const;
    }
    if (resendState.status === "error") {
      return { tone: "error", message: resendState.error } as const;
    }
    if (resendState.status === "success") {
      return {
        tone: "success",
        message: "If the email exists we sent a new reset message.",
      } as const;
    }
    return null;
  }, [verifyState, resendState]);

  return (
    <Card {...props} className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-2xl">Verify password reset</CardTitle>
        <CardDescription>
          Enter the six-digit code we emailed you to secure your account before choosing a new password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={verifyAction} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col items-center gap-3 pt-4 pb-5">
            <Label className="text-lg font-semibold">Verification code</Label>
            <OTPInput
              value={token}
              onChange={setToken}
              disabled={isRateLimited}
              error={!!verifyState.error}
              autoFocus={true}
            />
            <input
              type="hidden"
              name="token"
              value={token}
            />
          </div>
          <div className="grid gap-2 justify-center">
            <Label>Security verification</Label>
            <Turnstile
              key={turnstileKey}
              onTokenReceived={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpired={() => setTurnstileToken(null)}
            />
          </div>
          <input
            type="hidden"
            name="turnstileToken"
            value={turnstileToken ?? ""}
          />
          {feedback && feedback.tone === "error" && (
            <FormError error={feedback.message} />
          )}
          <SubmitButton disabled={!turnstileToken || token.length !== 6} isRateLimited={isRateLimited}>
            Verify and continue
          </SubmitButton>
        </form>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No email yet or need a fresh code?
          </p>
          <form action={resendAction} className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="email" value={email} />
            <input
              type="hidden"
              name="turnstileToken"
              value={turnstileToken ?? ""}
            />
            <SubmitButton disabled={!turnstileToken} isRateLimited={isRateLimited}>
              Resend reset email
            </SubmitButton>
          </form>
          {feedback && feedback.tone === "success" && (
            <p className="text-sm text-green-600">{feedback.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
