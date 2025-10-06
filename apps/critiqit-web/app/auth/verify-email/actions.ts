"use server";

import { createClient } from "@/lib/supabase/server";

// form state for verify email code
export type VerifyEmailFormState = {
  status: "idle" | "error" | "success";
  error?: string;
};

export async function verifyEmailCodeAction(
  _: VerifyEmailFormState,
  formData: FormData,
): Promise<VerifyEmailFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const captchaToken = String(formData.get("turnstileToken") ?? "").trim();

  if (!email || !token) {
    return {
      status: "error",
      error: "Email and verification code are required.",
    };
  }

  if (!captchaToken) {
    return {
      status: "error",
      error: "Security verification is required.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type: "signup",
    email,
    token,
    options: {
      captchaToken,
    },
  });

  if (error) {
    return {
      status: "error",
      error: error.message,
    };
  }

  return {
    status: "success",
  };
}

export async function resendEmailCodeAction(
  _: VerifyEmailFormState,
  formData: FormData,
): Promise<VerifyEmailFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const captchaToken = String(formData.get("turnstileToken") ?? "").trim();

  if (!email) {
    return {
      status: "error",
      error: "Email is required to resend the verification code.",
    };
  }

  if (!captchaToken) {
    return {
      status: "error",
      error: "Security verification is required.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      captchaToken,
    },
  });

  if (error) {
    return {
      status: "error",
      error: error.message,
    };
  }

  return {
    status: "success",
  };
}
