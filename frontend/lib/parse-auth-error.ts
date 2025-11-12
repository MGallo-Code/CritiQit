import { RateLimitError } from "./form-state";

/**
 * Parse errors from direct Supabase auth calls (signUp, signInWithPassword, etc.)
 *
 * Direct auth calls return AuthError with message and status properties.
 */
export function parseAuthError(error: unknown): string | RateLimitError {
  // Handle Supabase AuthError
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: string }).message;

    // Check if it's a 429 rate limit error
    if ("status" in error && (error as { status: number }).status === 429) {
      // Try to parse structured error data from message if it's JSON
      try {
        const parsed = JSON.parse(message);
        if (parsed && typeof parsed === "object" && "retry_after" in parsed) {
          return {
            message: parsed.message || "Rate limit exceeded. Please try again later.",
            type: "rate_limit",
            retry_after: parsed.retry_after || 60,
            limit_hit: parsed.limit_hit || "hour",
            identifier_type: parsed.identifier_type || "email",
          };
        }
      } catch {
        // Not JSON, return default rate limit error
      }

      // Return default rate limit error
      return {
        message: message || "Rate limit exceeded. Please try again later.",
        type: "rate_limit",
        retry_after: 60, // Default fallback
        limit_hit: "hour",
        identifier_type: "email",
      };
    }

    return message;
  }

  return "An error occurred. Please try again.";
}

/**
 * Parse errors from Edge Function calls (functions.invoke)
 *
 * IMPORTANT: Edge Functions return errors via FunctionsHttpError.context
 * The context must be parsed with .json() to extract the error data.
 */
export async function parseEdgeFunctionError(error: unknown): Promise<string | RateLimitError> {
  // Check if it's a FunctionsHttpError
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as any).context;

    // Parse the JSON response from context
    let errorObj: any;
    try {
      errorObj = await context.json();
    } catch {
      return "An error occurred. Please try again.";
    }

    // Check if it's a 429 rate limit error
    if (context.status === 429) {
      return {
        message: errorObj.message || "Rate limit exceeded. Please try again later.",
        type: "rate_limit",
        retry_after: errorObj.retry_after || 60,
        limit_hit: errorObj.limit_hit || "hour",
        identifier_type: errorObj.identifier_type || "email",
      };
    }

    // Return standard error message
    return errorObj.error || errorObj.message || "An error occurred.";
  }

  // Fallback for unknown error types
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message;
  }

  return "An error occurred. Please try again.";
}
