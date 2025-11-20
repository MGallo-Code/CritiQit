"use client";

import { useState, useEffect } from "react";
import { isRateLimitError, type RateLimitError } from "@/lib/form-state";

interface FormErrorProps {
  error: string | RateLimitError | null | undefined;
}

export function FormError({ error }: FormErrorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (isRateLimitError(error)) {
      setTimeRemaining(error.retry_after);

      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [error]);

  if (!error) return null;

  if (isRateLimitError(error)) {
    const minutes = timeRemaining ? Math.floor(timeRemaining / 60) : 0;
    const seconds = timeRemaining ? timeRemaining % 60 : 0;

    return (
      <div className="rounded-md border border-warning/30 bg-warning/10 p-4" role="alert" aria-live="polite">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-warning"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm text-text-secondary">
              <p className="font-medium text-foreground">{error.message}</p>
              {timeRemaining !== null && timeRemaining > 0 && (
                <p className="mt-2" aria-live="polite">
                  Try again in{" "}
                  {minutes > 0 && `${minutes}m `}
                  {seconds}s
                </p>
              )}
              {timeRemaining === 0 && (
                <p className="mt-2 font-medium text-success" aria-live="polite">
                  You can try again now.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard error display
  return (
    <p className="text-sm text-error" role="alert" aria-live="polite">{error}</p>
  );
}
