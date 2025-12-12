"use client";

import { AvatarDisplay } from "@/components/avatar/avatar-display";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AvatarTriggerProfile {
  avatar_url: string | null;
  avatar_preset_index: number | null;
  avatar_background_color: string | null;
  username: string | null;
}

interface AvatarTriggerProps {
  /** Profile data for displaying the avatar */
  profile: AvatarTriggerProfile;
  /** Callback when avatar or button is clicked */
  onTrigger: () => void;
  /** Size of the avatar (matches AvatarDisplay sizes) */
  size?: "sm" | "md" | "lg";
  /** Show hover overlay with text on desktop */
  showHoverOverlay?: boolean;
  /** Text to show in hover overlay */
  hoverText?: string;
  /** Show button below avatar */
  showButton?: boolean;
  /** Button text */
  buttonText?: string;
  /** Disable interactions */
  disabled?: boolean;
  /** Additional class for the avatar */
  avatarClassName?: string;
  /** Additional class for the container */
  className?: string;
}

/**
 * AvatarTrigger Component
 *
 * Unified trigger UI for opening the avatar picker modal.
 * Provides consistent interaction pattern across onboarding and profile pages.
 *
 * Features:
 * - Clickable avatar (larger touch target)
 * - Optional hover overlay (desktop affordance)
 * - Optional button below avatar
 * - Full keyboard accessibility
 * - ARIA labels for screen readers
 *
 * @example
 * ```tsx
 * // Onboarding (simple, no hover overlay)
 * <AvatarTrigger
 *   profile={user}
 *   onTrigger={() => setIsAvatarPickerOpen(true)}
 *   showHoverOverlay={false}
 * />
 *
 * // Profile edit (with hover overlay)
 * <AvatarTrigger
 *   profile={currentUser}
 *   onTrigger={() => setIsAvatarPickerOpen(true)}
 *   showHoverOverlay={true}
 *   hoverText="Change Avatar"
 * />
 * ```
 */
export function AvatarTrigger({
  profile,
  onTrigger,
  size = "lg",
  showHoverOverlay = true,
  hoverText = "Change Avatar",
  showButton = true,
  buttonText = "Choose Profile Picture",
  disabled = false,
  avatarClassName,
  className,
}: AvatarTriggerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTrigger();
    }
  };

  const handleClick = () => {
    if (disabled) return;
    onTrigger();
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Clickable Avatar with optional hover overlay */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={hoverText || "Change profile picture"}
        aria-disabled={disabled}
        className={cn(
          "relative group cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <AvatarDisplay
          key={`${profile.avatar_url}-${profile.avatar_preset_index}-${profile.avatar_background_color}`}
          profile={{
            avatar_url: profile.avatar_url,
            avatar_preset_index: profile.avatar_preset_index,
            avatar_background_color: profile.avatar_background_color,
            username: profile.username ?? "",
          }}
          size={size}
          className={cn(
            "transition-opacity",
            !disabled && "group-hover:opacity-80",
            avatarClassName
          )}
        />
        {showHoverOverlay && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity rounded-full">
            <span className="text-white font-medium text-sm md:text-base">
              {hoverText}
            </span>
          </div>
        )}
      </div>

      {/* Optional button */}
      {showButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          type="button"
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
}
