"use server";

import { createClient } from "@/lib/supabase/server";
import { FunctionsHttpError } from "@supabase/supabase-js";

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

  const { data, error } = await supabase.functions.invoke("verify-otp-securely", {
    body: {
      req_type: "signup",
      email: email,
      token: token,
      captchaToken: captchaToken,
    },
  });

  if (error && error instanceof FunctionsHttpError) {
    const errorObj = await error.context.json()
    return {
      status: "error",
      error: errorObj.error,
    };
  }

  if (!data || !data.session) {
    return {
      status: "error",
      error: "Error verifying email. Please try again later.",
    };
  }

  const { access_token, refresh_token } = data.session

  if (!access_token || !refresh_token) {
    return {
      status: "error",
      error: "Error fetching session. Please try again later.",
    };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token
  })

  if (sessionError) {
    return {
      status: "error",
      error: sessionError.message,
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
