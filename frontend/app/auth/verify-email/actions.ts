"use server";

import { createClient } from "@/lib/supabase/server";
import { parseEdgeFunctionError, parseAuthError } from "@/lib/parse-auth-error";
import { FormState } from "@/lib/form-state";

export async function verifyEmailCodeAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
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

  if (error) {
    // IMPORTANT: Parse Edge Function errors using the async parser
    const parsedError = await parseEdgeFunctionError(error);
    return {
      status: "error",
      error: parsedError,
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
  _: FormState,
  formData: FormData,
): Promise<FormState> {
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
      error: parseAuthError(error),
    };
  }

  return {
    status: "success",
  };
}
