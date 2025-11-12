export const INITIAL_FORM_STATE: FormState = { status: "idle" };

export type RateLimitError = {
  message: string;
  type: "rate_limit";
  retry_after: number;  // seconds until retry allowed
  limit_hit: string;    // "hour" | "minute" | "day"
  identifier_type: string;  // "email" | "ip" | "user"
};

export type FormState = {
  status: "idle" | "error" | "success";
  error?: string | RateLimitError;
};

/**
 * Type guard to check if an error is a rate limit error
 */
export function isRateLimitError(error: string | RateLimitError | null | undefined): error is RateLimitError {
  return typeof error === "object" && error !== null && error.type === "rate_limit";
}