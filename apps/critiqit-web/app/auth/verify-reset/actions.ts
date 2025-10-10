"use server";

import { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

// base url for site redirects
const siteUrl = process.env.SITE_URL

// attempt to verify reset code
export async function verifyResetCodeAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const captchaToken = String(formData.get("turnstileToken") ?? "").trim();

  // catch empty email or token
  if (!email || !token) {
    return {
      status: "error",
      error: "Email and verification code are required.",
    };
  }

  // catch empty captcha token
  if (!captchaToken) {
    return {
      status: "error",
      error: "Security verification is required.",
    };
  }

  // create supabase client, attempt to verify otp
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke('verify-otp-securely', {
    body: {
      req_type: "recovery",
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

  const { access_token, refresh_token } = data.session

  if (!access_token || !refresh_token) {
    return {
      status: "error",
      error: "Error setting session. Please try again later.",
    };
  }

  const { sessionError } = await supabase.auth.setSession({
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

// attempt to resend email for reset code
export async function resendResetCodeAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const captchaToken = String(formData.get("turnstileToken") ?? "").trim();

  // catch empty email
  if (!email) {
    return {
      status: "error",
      error: "Email is required to resend the reset code.",
    };
  }

  // catch missing captcha token verif
  if (!captchaToken) {
    return {
      status: "error",
      error: "Security verification is required.",
    };
  }

  // create supabase client, attempt to reset password for email
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/update-password`,
    captchaToken,
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
