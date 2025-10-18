"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
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
import {
  resendResetCodeAction,
  verifyResetCodeAction,
} from "@/app/auth/verify-reset/actions";
import { INITIAL_FORM_STATE } from "@/lib/form-state";


function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? "Working..." : children}
    </Button>
  );
}

export interface VerifyResetFormProps {
  initialEmail?: string;
  redirectTo?: string;
}

export function VerifyResetForm({
  initialEmail = "",
  redirectTo = "/protected/dashboard"
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
    <Card>
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
          <div className="grid gap-2">
            <Label htmlFor="token">Verification code</Label>
            <Input
              id="token"
              name="token"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
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
            <p className="text-sm text-red-500">{feedback.message}</p>
          )}
          <SubmitButton disabled={!turnstileToken || token.length !== 6}>
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
            <SubmitButton disabled={!turnstileToken}>
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
