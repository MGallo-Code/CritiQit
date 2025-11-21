"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/providers/current-user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { isRateLimitError, type RateLimitError } from "@/lib/form-state";
import { Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsernamePickerFormProps {
  userId: string;
  currentUsername?: string | null;
}

const errorMessages: Record<string, string> = {
  invalid_format: "Username can only contain letters and numbers.",
  too_short: "Username must be at least 3 characters.",
  too_long: "Username must be 35 characters or less.",
  reserved: "This username is reserved and cannot be used.",
  taken: "This username is already taken.",
};

export function UsernamePickerForm({
  userId,
  currentUsername,
}: UsernamePickerFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { refreshUser } = useCurrentUser();
  const searchParams = useSearchParams();

  // Get redirect destination from query params
  const redirectTo = searchParams.get("redirect") || "/protected/dashboard";

  // State management
  const [pool, setPool] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customUsername, setCustomUsername] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | RateLimitError | null>(null);

  const fetchUsernamePool = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingPool(true);

      try {
        const { data, error } = await supabase.rpc("generate_usernames");
        if (error) throw error;

        const suggestions = data?.suggestions || [];

        if (silent) {
          // Append to existing pool
          setPool((prev) => [...prev, ...suggestions]);
        } else {
          // Replace pool (initial load)
          setPool(suggestions);
          setCurrentIndex(0);
        }
      } catch (err) {
        if (!silent) {
          console.error("Error fetching username pool:", err);
          setError("Unable to load suggestions. Please try again.");
        }
      } finally {
        if (!silent) setIsLoadingPool(false);
      }
    },
    [supabase]
  );

  // Initial pool load
  useEffect(() => {
    fetchUsernamePool();
  }, [fetchUsernamePool]);

  // Background refill when pool gets low
  useEffect(() => {
    if (pool.length > 0 && pool.length - currentIndex <= 2) {
      fetchUsernamePool(true);
    }
  }, [currentIndex, pool.length, fetchUsernamePool]);

  function handleRandomize() {
    if (pool.length === 0) return;

    setCurrentIndex((prev) => {
      const next = prev + 1;
      return next >= pool.length ? 0 : next;
    });

    setUseCustom(false);
    setCustomUsername("");
    setError(null);
  }

  function handleCustomInputChange(value: string) {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
    setCustomUsername(cleaned);
    setError(null);
  }

  function handleToggleCustom() {
    setUseCustom(!useCustom);
    setError(null);
    if (useCustom) {
      setCustomUsername("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const usernameToSet = useCustom ? customUsername : pool[currentIndex];

    if (!usernameToSet) {
      setError("Please select or enter a username.");
      setIsSubmitting(false);
      return;
    }

    try {
      // If custom, validate first
      if (useCustom) {
        const { data, error: validationError } = await supabase.rpc(
          "check_username_available",
          { username_input: usernameToSet }
        );

        if (validationError) throw validationError;

        if (!data.available) {
          setError(
            errorMessages[data.error] || "This username is not available."
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Update profile (username stored as lowercase in DB)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: usernameToSet.toLowerCase() })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Refresh user context to update username immediately
      await refreshUser();

      // Success! Navigate to intended destination
      router.push(redirectTo);
    } catch (err) {
      console.error("Error setting username:", err);
      setError("Unable to set username. Please try again.");
      setIsSubmitting(false);
    }
  }

  function handleSkip() {
    router.push(redirectTo);
  }

  const isRateLimited = isRateLimitError(error);
  const currentSuggestion = pool[currentIndex];

  if (isLoadingPool && pool.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 rounded-xl border border-border bg-background-secondary p-6 shadow-sm md:p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
        <p className="text-sm text-muted-foreground">
          Loading suggestions...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 rounded-xl border border-border bg-background-secondary p-6 shadow-sm md:p-10">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Choose Your Username</h1>
        <p className="text-muted-foreground">
          {currentUsername
            ? "Update your username or keep your current one"
            : "Pick a suggestion or create your own"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Suggestion or Custom Input */}
        {!useCustom ? (
          <div className="space-y-2">
            <Label htmlFor="username-suggestion">Suggested Username</Label>
            <div className="flex gap-2">
              <Input
                id="username-suggestion"
                type="text"
                value={currentSuggestion || ""}
                readOnly
                className="flex-1 cursor-default"
                disabled={isSubmitting || isRateLimited}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRandomize}
                disabled={isSubmitting || isRateLimited || pool.length === 0}
                title="Randomize username"
              >
                <Shuffle className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click shuffle for more suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="custom-username">Create Your Own</Label>
            <Input
              id="custom-username"
              type="text"
              value={customUsername}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              placeholder="YourAwesomeUsername"
              autoFocus
              disabled={isSubmitting || isRateLimited}
              maxLength={35}
            />
            <p className="text-xs text-muted-foreground">
              Letters and numbers only, 3-35 characters
            </p>
          </div>
        )}

        {/* Toggle Link */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleToggleCustom}
            disabled={isSubmitting || isRateLimited}
            className={cn(
              "link-gold text-sm font-medium transition-opacity",
              (isSubmitting || isRateLimited) && "cursor-not-allowed opacity-50"
            )}
          >
            {useCustom ? "← Back to suggestions" : "Or create your own"}
          </button>
        </div>

        {/* Error Message */}
        {error && <FormError error={error} />}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || isRateLimited}
          >
            {isSubmitting ? "Setting username..." : "Continue"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1"
          >
            Skip for now
          </Button>
        </div>
      </form>

      {/* Current Username Display (if editing) */}
      {currentUsername && (
        <div className="rounded-md border border-border-subtle bg-background-tertiary p-3 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Current username
          </p>
          <p className="mt-1 font-semibold">{currentUsername}</p>
        </div>
      )}
    </div>
  );
}
