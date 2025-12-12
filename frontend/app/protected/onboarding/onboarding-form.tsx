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
import { AvatarTrigger } from "@/components/avatar/avatar-trigger";
import { AvatarPickerModal } from "@/components/avatar/avatar-picker-modal";
import { useAvatarPicker } from "@/hooks/use-avatar-picker";

interface OnboardingFormProps {
  userId: string;
  currentUsername?: string | null;
}

const errorMessages: Record<string, string> = {
  invalid_format: "Username can only contain letters, numbers, and underscores.",
  too_short: "Username must be at least 3 characters.",
  too_long: "Username must be 35 characters or less.",
  reserved: "This username is reserved and cannot be used.",
  taken: "This username is already taken.",
};

export function OnboardingForm({
  userId,
  currentUsername,
}: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { user, refreshUser } = useCurrentUser();
  const searchParams = useSearchParams();

  // Get redirect destination from query params
  const redirectTo = searchParams.get("redirect") || "/protected/dashboard";

  // State management
  const [pool, setPool] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [username, setUsername] = useState("");
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | RateLimitError | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

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
          // Pre-fill input with first suggestion
          if (suggestions.length > 0) {
            setUsername(suggestions[0]);
          }
        }
      } catch (err) {
        if (!silent) {
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

    // Get next username from pool
    const nextIndex = (currentIndex + 1) % pool.length;
    setCurrentIndex(nextIndex);

    // Replace input value with the next suggestion
    setUsername(pool[nextIndex]);
    setError(null);
  }

  function handleUsernameChange(value: string) {
    // Allow only valid username characters
    const cleaned = value.replace(/[^a-zA-Z0-9_]/g, "");
    setUsername(cleaned);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!username) {
      setError("Please enter a username.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Validate username availability
      const { data, error: validationError } = await supabase.rpc(
        "check_username_available",
        { username_input: username }
      );

      if (validationError) throw validationError;

      if (!data.available) {
        setError(
          errorMessages[data.error] || "This username is not available."
        );
        setIsSubmitting(false);
        return;
      }

      // Update profile with username AND clear temporary flag
      // This prevents infinite loop: even if user chooses "User123abc", it won't prompt again
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username,
          username_is_temporary: false  // Mark as user-chosen
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Refresh user context to update username immediately
      await refreshUser();

      // Success! Navigate to intended destination
      router.push(redirectTo);
    } catch (err) {
      setError("Unable to set username. Please try again.");
      setIsSubmitting(false);
    }
  }

  function handleSkip() {
    router.push(redirectTo);
  }

  // Avatar picker handlers (extracted to hook)
  const { handlePresetSelect, handleUploadSuccess, handleAvatarRemove } = useAvatarPicker({
    userId,
    currentAvatarUrl: user?.avatar_url,
    onAvatarChange: refreshUser,
  });

  const isRateLimited = isRateLimitError(error);

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
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Set Up Your Profile</h1>
        <p className="text-muted-foreground">
          Choose a profile picture and username
        </p>
      </header>

      {/* Avatar Section */}
      {user && (
        <AvatarTrigger
          profile={{
            avatar_url: user.avatar_url,
            avatar_preset_index: user.avatar_preset_index,
            avatar_background_color: user.avatar_background_color,
            username: user.username || "User",
          }}
          onTrigger={() => setIsAvatarPickerOpen(true)}
          showHoverOverlay={false}
          buttonText="Choose Profile Picture"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Unified Username Input */}
        <div className="space-y-2">
          <Label htmlFor="username">Your Username</Label>
          <div className="flex gap-2">
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="YourAwesomeUsername"
              autoFocus
              disabled={isSubmitting || isRateLimited}
              maxLength={35}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRandomize}
              disabled={isSubmitting || isRateLimited || pool.length === 0}
              title="Get a random username"
            >
              <Shuffle className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Type your own or click shuffle for suggestions. Letters, numbers, and underscores only (3-35 characters)
          </p>
        </div>

        {/* Error Message */}
        {error && <FormError error={error} />}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
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
            Skip
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

      {/* Avatar Picker Modal (Preset + Upload) */}
      {user && (
        <AvatarPickerModal
          isOpen={isAvatarPickerOpen}
          onClose={() => setIsAvatarPickerOpen(false)}
          userId={userId}
          currentAvatarUrl={user.avatar_url}
          currentPresetIndex={user.avatar_preset_index}
          currentBackgroundColor={user.avatar_background_color}
          onPresetSelect={handlePresetSelect}
          onUploadSuccess={handleUploadSuccess}
          onRemove={handleAvatarRemove}
        />
      )}
    </div>
  );
}
