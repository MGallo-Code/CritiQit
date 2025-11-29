"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * PresetAvatar Component
 *
 * Displays a preset avatar: white silhouette PNG on a colored circular background.
 * Used in the avatar picker and throughout the app when users choose preset avatars.
 */

interface PresetAvatarProps {
  presetId: string;
  backgroundColor: string; // hex color
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { container: 'w-10 h-10', padding: 'p-1.5' },
  md: { container: 'w-20 h-20', padding: 'p-3' },
  lg: { container: 'w-32 h-32', padding: 'p-4' },
};

export function PresetAvatar({
  presetId,
  backgroundColor,
  size = 'md',
  className,
}: PresetAvatarProps) {
  // Preset images: transparent PNG silhouettes composited on colored backgrounds
  // Path: {supabase_url}/storage/v1/object/public/avatar-presets/{presetId}.png
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // Build image URL - memoized based on presetId only
  // No cache busting needed: presets are immutable (if preset changes, presetId changes)
  const imageUrl = useMemo(
    () => `${supabaseUrl}/storage/v1/object/public/avatar-presets/${presetId}.png`,
    [supabaseUrl, presetId]
  );

  const { container, padding } = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center overflow-hidden",
        container,
        padding,
        className
      )}
      style={{ backgroundColor }}
    >
      <img
        src={imageUrl}
        alt={`${presetId} avatar`}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
