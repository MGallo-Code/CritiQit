"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  getPresetBackgroundPosition,
  SPRITESHEET_CONFIG
} from "@/lib/avatar-spritesheet";

/**
 * PresetAvatar Component
 *
 * Displays a preset avatar using CSS sprite positioning from a spritesheet.
 * Shows a white silhouette on a colored circular background.
 * Used in the avatar picker and throughout the app when users choose preset avatars.
 *
 * Uses CSS spritesheet for performance (single image load vs multiple individual images).
 */

interface PresetAvatarProps {
  presetIndex: number;
  backgroundColor: string; // hex color
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-10 h-10',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

export function PresetAvatar({
  presetIndex,
  backgroundColor,
  size = 'md',
  className,
}: PresetAvatarProps) {
  // Get CSS background-position for this preset from spritesheet
  const backgroundPosition = useMemo(
    () => getPresetBackgroundPosition(presetIndex),
    [presetIndex]
  );

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden",
        SIZE_CLASSES[size],
        className
      )}
      style={{
        backgroundColor,
        backgroundImage: `url('${SPRITESHEET_CONFIG.imagePath}')`,
        backgroundPosition,
        backgroundRepeat: 'no-repeat',
        // Scale spritesheet so one frame fills the container
        // 300% width means each of the 3 frames = 100% of container
        backgroundSize: `${SPRITESHEET_CONFIG.frameCount * 100}% 100%`,
      }}
      role="img"
      aria-label={`Preset avatar ${presetIndex}`}
    />
  );
}
