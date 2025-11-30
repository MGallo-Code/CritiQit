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
 * Renders a preset avatar using CSS sprite positioning. Displays a white silhouette
 * from the spritesheet on a colored circular background.
 *
 * Uses CSS sprites for performance (single image load instead of multiple requests).
 */

interface PresetAvatarProps {
  presetIndex: number;
  backgroundColor: string;
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
        // Scale spritesheet so each frame fills 100% of container width
        // Example: 3 frames = 300% total width, so each frame = 100%
        backgroundSize: `${SPRITESHEET_CONFIG.frameCount * 100}% 100%`,
      }}
      role="img"
      aria-label={`Preset avatar ${presetIndex}`}
    />
  );
}
