"use client";

import { Turnstile as ReactTurnstile } from "@marsidev/react-turnstile";
import { useState, useCallback } from "react";

interface TurnstileProps {
  onTokenReceived: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  className?: string;
}

export function Turnstile({ 
  onTokenReceived, 
  onError, 
  onExpired, 
  className 
}: TurnstileProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleSuccess = useCallback((token: string) => {
    onTokenReceived(token);
  }, [onTokenReceived]);

  const handleError = useCallback((error: string) => {
    onError?.(error);
  }, [onError]);

  const handleExpired = useCallback(() => {
    onExpired?.();
  }, [onExpired]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Get site key from environment variables
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-700">
        Turnstile site key is not configured. Please set NEXT_PUBLIC_TURNSTILE_SITE_KEY in your environment variables.
      </div>
    );
  }

  return (
    <ReactTurnstile
      siteKey={siteKey}
      onSuccess={handleSuccess}
      onError={handleError}
      onExpire={handleExpired}
      onLoad={handleLoad}
      options={{
        theme: "light",
        size: "normal",
      }}
    />
  );
}
