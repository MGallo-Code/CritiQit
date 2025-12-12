"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseAvatarPickerOptions {
  userId: string;
  currentAvatarUrl?: string | null;
  onAvatarChange?: () => Promise<void>;
}

interface AvatarPickerHandlers {
  handlePresetSelect: (presetIndex: number, backgroundColor: string) => Promise<void>;
  handleUploadSuccess: (newUrl: string) => Promise<void>;
  handleAvatarRemove: () => Promise<void>;
}

/**
 * Custom hook for avatar picker handlers
 *
 * Encapsulates all avatar management logic:
 * - Selecting preset avatars
 * - Uploading custom photos
 * - Removing avatars
 *
 * @example
 * ```tsx
 * const { handlePresetSelect, handleUploadSuccess, handleAvatarRemove } =
 *   useAvatarPicker({ userId, onAvatarChange: refreshUser });
 *
 * <AvatarPickerModal
 *   onPresetSelect={handlePresetSelect}
 *   onUploadSuccess={handleUploadSuccess}
 *   onRemove={handleAvatarRemove}
 * />
 * ```
 */
export function useAvatarPicker({
  userId,
  currentAvatarUrl,
  onAvatarChange,
}: UseAvatarPickerOptions): AvatarPickerHandlers {
  const supabase = useMemo(() => createClient(), []);

  /**
   * Select a preset avatar (and delete custom avatar if exists)
   */
  const handlePresetSelect = async (presetIndex: number, backgroundColor: string) => {
    // Delete custom uploaded avatar if exists
    if (currentAvatarUrl) {
      const filename = `${userId}.jpg`;
      await supabase.storage.from("avatars").remove([filename]);
      // Ignore delete errors - continue anyway
    }

    // Update profile: set preset fields and clear custom URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: null,
        avatar_preset_index: presetIndex,
        avatar_background_color: backgroundColor,
      })
      .eq("id", userId);

    if (updateError) {
      throw new Error("Unable to set preset avatar. Please try again.");
    }

    // Notify parent (triggers user context refresh)
    if (onAvatarChange) {
      await onAvatarChange();
    }
  };

  /**
   * Handle successful custom avatar upload
   */
  const handleUploadSuccess = async (newUrl: string) => {
    // Update profile with new avatar URL and clear preset fields
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: newUrl,
        avatar_preset_index: null,
        avatar_background_color: null,
      })
      .eq("id", userId);

    if (updateError) {
      throw new Error("Unable to update your profile. Please refresh the page and try again.");
    }

    // Notify parent (triggers user context refresh)
    if (onAvatarChange) {
      await onAvatarChange();
    }
  };

  /**
   * Remove avatar completely (revert to default)
   */
  const handleAvatarRemove = async () => {
    // Delete custom uploaded avatar if exists
    if (currentAvatarUrl) {
      const filename = `${userId}.jpg`;
      await supabase.storage.from("avatars").remove([filename]);
      // Ignore delete errors - continue anyway
    }

    // Clear all avatar fields
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: null,
        avatar_preset_index: null,
        avatar_background_color: null,
      })
      .eq("id", userId);

    if (updateError) {
      throw new Error("Unable to remove avatar. Please try again.");
    }

    // Notify parent (triggers user context refresh)
    if (onAvatarChange) {
      await onAvatarChange();
    }
  };

  return {
    handlePresetSelect,
    handleUploadSuccess,
    handleAvatarRemove,
  };
}
