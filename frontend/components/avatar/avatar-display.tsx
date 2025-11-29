"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { PresetAvatar } from "@/components/avatar/preset-avatar";
import { getAvatarDisplay } from "@/lib/avatar-presets";
import type { UserProfile } from "@/lib/auth/user";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AvatarDisplay Component
 *
 * Unified avatar display that handles all three avatar types:
 * 1. Preset avatars (avatar_preset_index + avatar_background_color)
 * 2. Custom uploaded images (avatar_url)
 * 3. Default placeholder
 *
 * This is the single source of truth for avatar rendering across the app.
 */

interface AvatarDisplayProps {
  profile: Pick<
    UserProfile,
    'avatar_url' | 'avatar_preset_index' | 'avatar_background_color' | 'username'
  >;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-10 h-10',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

export function AvatarDisplay({
  profile,
  size = 'md',
  className,
}: AvatarDisplayProps) {
  const display = getAvatarDisplay(profile);

  // Custom uploaded avatar
  if (display.type === 'custom') {
    return (
      <Avatar className={cn(className || SIZE_MAP[size])}>
        <AvatarImage src={display.url} alt={`${profile.username}'s avatar`} />
      </Avatar>
    );
  }

  // Preset avatar
  if (display.type === 'preset') {
    return (
      <PresetAvatar
        presetIndex={display.presetIndex}
        backgroundColor={display.backgroundColor}
        size={size}
        className={className}
      />
    );
  }

  // Default placeholder
  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center",
        className || SIZE_MAP[size]
      )}
    >
      <User className={cn(
        "text-muted-foreground",
        size === 'sm' && "w-5 h-5",
        size === 'md' && "w-10 h-10",
        size === 'lg' && "w-16 h-16"
      )} />
    </div>
  );
}
