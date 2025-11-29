"use client";

import { useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/providers/current-user-provider";
import { LogoutButton } from "@/components/auth/logout-button";
import { AvatarDisplay } from "@/components/avatar/avatar-display";
import { AvatarUpload } from "@/components/auth/avatar-upload";
import { getAvatarDisplay } from "@/lib/avatar-presets";

type EditableProfile = {
  full_name: string;
  username: string;
  bio: string;
};

const EMPTY_PROFILE: EditableProfile = {
  full_name: "",
  username: "",
  bio: "",
};

const textareaClasses =
  "flex min-h-[128px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// RGB to HSL conversion helper
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

type ProfileFormProps = ComponentPropsWithoutRef<typeof Card>;

export function ProfileForm({
  className,
  ...props
}: ProfileFormProps) {
  const [mode, setMode] = useState<"edit" | "view">("view");
  const [formData, setFormData] = useState<EditableProfile>(EMPTY_PROFILE);
  const [initialProfile, setInitialProfile] =
    useState<EditableProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [headerGradient, setHeaderGradient] = useState<string>(
    "linear-gradient(135deg, hsl(355 70% 35% / 0.45), hsl(355 70% 55% / 0.65), hsl(355 70% 60% / 0.55), hsl(355 70% 55% / 0.65), hsl(355 70% 35% / 0.45))"
  );

  const supabase = useMemo(() => createClient(), []);
  const { user: currentUser, isLoading: isUserLoading, refreshUser } =
    useCurrentUser();

  // Extract dominant color from avatar and generate gradient
  useEffect(() => {
    if (!currentUser) {
      // Use dramatic default primary color gradient
      setHeaderGradient(
        "linear-gradient(135deg, hsl(355 70% 35% / 0.45), hsl(355 70% 55% / 0.65), hsl(355 70% 60% / 0.55), hsl(355 70% 55% / 0.65), hsl(355 70% 35% / 0.45))"
      );
      return;
    }

    const avatarDisplay = getAvatarDisplay({
      avatar_url: currentUser.avatar_url,
      avatar_preset_index: currentUser.avatar_preset_index,
      avatar_background_color: currentUser.avatar_background_color,
    });

    // For preset avatars, use the preset background color directly
    if (avatarDisplay.type === 'preset') {
      // Parse hex color to RGB
      const hex = avatarDisplay.backgroundColor;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      // Convert RGB to HSL for better control
      const hsl = rgbToHsl(r, g, b);

      // Generate dramatic gradient with preset color
      // Boost saturation for more vibrant colors (min 45%, boost by 15%)
      const saturation = Math.min(Math.max(hsl.s + 15, 45), 85);

      // Adjust lightness for better visibility (boost by 15%, min 55%)
      const baseLightness = Math.max(hsl.l + 15, 55);

      // Create 5-stop gradient with varying lightness and higher opacity
      // Uses diagonal angle (135deg) for more visual interest
      // Opacity range: 0.45 - 0.65 (much more prominent than 0.2 - 0.3)
      setHeaderGradient(
        `linear-gradient(135deg, hsl(${hsl.h} ${saturation}% ${baseLightness - 25}% / 0.45), hsl(${hsl.h} ${saturation}% ${baseLightness + 5}% / 0.65), hsl(${hsl.h} ${saturation}% ${baseLightness + 10}% / 0.55), hsl(${hsl.h} ${saturation}% ${baseLightness + 5}% / 0.65), hsl(${hsl.h} ${saturation}% ${baseLightness - 25}% / 0.45))`
      );
      return;
    }

    // For custom avatars, extract color from the image
    if (avatarDisplay.type === 'custom') {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = avatarDisplay.url;

      img.onload = () => {
        try {
          // Create canvas to sample image
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Resize to small size for faster processing
          canvas.width = 50;
          canvas.height = 50;
          ctx.drawImage(img, 0, 0, 50, 50);

          // Get image data
          const imageData = ctx.getImageData(0, 0, 50, 50);
          const data = imageData.data;

          // Calculate average RGB
          let r = 0, g = 0, b = 0;
          const pixelCount = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }

          r = Math.floor(r / pixelCount);
          g = Math.floor(g / pixelCount);
          b = Math.floor(b / pixelCount);

          // Convert RGB to HSL for better control
          const hsl = rgbToHsl(r, g, b);

          // Generate dramatic gradient with extracted color
          // Boost saturation for more vibrant colors (min 45%, boost by 15%)
          const saturation = Math.min(Math.max(hsl.s + 15, 45), 85);

          // Adjust lightness for better visibility (boost by 15%, min 55%)
          const baseLightness = Math.max(hsl.l + 15, 55);

          // Create 5-stop gradient with varying lightness and higher opacity
          // Uses diagonal angle (135deg) for more visual interest
          // Opacity range: 0.45 - 0.65 (much more prominent than 0.2 - 0.3)
          setHeaderGradient(
            `linear-gradient(135deg, hsl(${hsl.h} ${saturation}% ${baseLightness - 25}% / 0.45), hsl(${hsl.h} ${saturation}% ${baseLightness + 5}% / 0.65), hsl(${hsl.h} ${saturation}% ${baseLightness + 10}% / 0.55), hsl(${hsl.h} ${saturation}% ${baseLightness + 5}% / 0.65), hsl(${hsl.h} ${saturation}% ${baseLightness - 25}% / 0.45))`
          );
        } catch (err) {
          // Fallback to neutral gray
          setHeaderGradient(
            "linear-gradient(135deg, hsl(0 0% 25% / 0.45), hsl(0 0% 40% / 0.65), hsl(0 0% 45% / 0.55), hsl(0 0% 40% / 0.65), hsl(0 0% 25% / 0.45))"
          );
        }
      };

      img.onerror = () => {
        // Fallback to neutral gray on error
        setHeaderGradient(
          "linear-gradient(135deg, hsl(0 0% 25% / 0.45), hsl(0 0% 40% / 0.65), hsl(0 0% 45% / 0.55), hsl(0 0% 40% / 0.65), hsl(0 0% 25% / 0.45))"
        );
      };
      return;
    }

    // Default: neutral gray gradient
    setHeaderGradient(
      "linear-gradient(135deg, hsl(0 0% 25% / 0.45), hsl(0 0% 40% / 0.65), hsl(0 0% 45% / 0.55), hsl(0 0% 40% / 0.65), hsl(0 0% 25% / 0.45))"
    );
  }, [currentUser?.avatar_url, currentUser?.avatar_preset_index, currentUser?.avatar_background_color, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const normalized: EditableProfile = {
      full_name: currentUser.full_name ?? "",
      username: currentUser.username ?? "",
      bio: currentUser.bio ?? "",
    };

    setFormData(normalized);
    setInitialProfile(normalized);
    setMode("view");
    setError(null);
  }, [currentUser]);

  const hasChanges =
    !!initialProfile &&
    (initialProfile.full_name !== formData.full_name ||
      initialProfile.username !== formData.username ||
      initialProfile.bio !== formData.bio);

  const handleCancel = () => {
    if (initialProfile) {
      setFormData(initialProfile);
    }
    setMode("view");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentUser || !initialProfile) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const trimmedUsername = formData.username.trim();
    if (trimmedUsername && trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters long.");
      setIsSaving(false);
      return;
    }

    const updates: Record<string, string | null> = {};

    if (initialProfile.full_name !== formData.full_name) {
      updates.full_name = formData.full_name.trim() || null;
    }

    if (initialProfile.username !== formData.username) {
      if (!trimmedUsername) {
        setError("Username is required.");
        setIsSaving(false);
        return;
      }
      updates.username = trimmedUsername;
    }

    if (initialProfile.bio !== formData.bio) {
      updates.bio = formData.bio.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      setMode("view");
      setIsSaving(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id);

      if (updateError) {
        throw updateError;
      }

      await refreshUser();
      setMode("view");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to update profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // generate display name
  const displayName =
    currentUser?.username ||
    "Your profile";

  // format the created_at date
  const joinedAt = useMemo(() => {
    const createdAt = currentUser?.created_at;
    if (!createdAt) return null;
    const value = new Date(createdAt);
    if (Number.isNaN(value.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(value);
  }, [currentUser?.created_at]);

  // generate avatar alt text
  const avatarAlt = currentUser?.username
    ? `${currentUser.username}'s profile image`
    : "User profile image";

  // if user is loading, show a loading message
  if (isUserLoading) {
    return (
      <Card {...props} className={cn("w-full max-w-md", className)}>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Loading profile…
        </CardContent>
      </Card>
    );
  }

  // if no current user, show an error message
  if (!currentUser) {
    return (
      <Card {...props} className={cn("w-full max-w-md", className)}>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          We couldn&apos;t load your profile details.
        </CardContent>
      </Card>
    );
  }

  return (
      <Card {...props} className={cn("w-full max-w-4xl overflow-hidden shadow-lg", className)}>
        <div
          className="h-36 md:h-48 transition-colors duration-500"
          style={{ background: headerGradient }}
        />
        <CardHeader className="px-6 pb-6 pt-0">
          {mode === "edit" ? (
            <div className="-mt-20 md:-mt-32 mx-auto">
              <AvatarUpload
                userId={currentUser.id}
                currentAvatarUrl={currentUser.avatar_url}
                currentPresetIndex={currentUser.avatar_preset_index}
                currentBackgroundColor={currentUser.avatar_background_color}
                username={currentUser.username}
                onUploadSuccess={async (newUrl) => {
                  // Refresh user context to update avatar everywhere
                  await refreshUser();
                }}
              />
            </div>
          ) : (
            <div className="-mt-20 md:-mt-32 mx-auto">
              <AvatarDisplay
                profile={{
                  avatar_url: currentUser.avatar_url,
                  avatar_preset_index: currentUser.avatar_preset_index,
                  avatar_background_color: currentUser.avatar_background_color,
                  username: currentUser.username,
                }}
                size="lg"
                className="h-40 w-40 border-4 border-background shadow-xl md:h-64 md:w-64"
              />
            </div>
          )}
          <div className="mt-4 flex flex-col gap-6 w-full md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-center md:text-left">
              <h1 className="text-3xl font-semibold">
                {displayName}
              </h1>
              <p className="text-base text-muted-foreground">
                {currentUser.email}
              </p>
              {joinedAt && (
                <p className="text-sm text-muted-foreground">
                  Member since {joinedAt}
                </p>
              )}
            </div>
            {mode === "view" ? (
              <Button size="lg" onClick={() => setMode("edit")}>
                Edit profile
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8 px-6 pb-8">
          {mode === "view" ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border p-5">
                <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                  Username
                </h2>
                <p className="mt-2 text-base">
                  {formData.username ? `@${formData.username}` : "Choose a username"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-5">
                <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                  Full name
                </h2>
                <p className="mt-2 text-base">
                  {formData.full_name || "Add your full name"}
                </p>
              </div>
              <div className="md:col-span-2">
                <div className="rounded-lg border border-border p-5">
                  <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                    Bio
                  </h2>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    {formData.bio || "Tell the community a little about yourself."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full name (optional)</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        full_name: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    placeholder="Add the name you’d like people to see"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        username: event.target.value,
                      }))
                    }
                    disabled={isSaving}
                    required
                    placeholder="your-handle"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      bio: event.target.value,
                    }))
                  }
                  className={textareaClasses}
                  disabled={isSaving}
                  placeholder="Share what drives you, what you work on, or what people can expect from you."
                />
              </div>
              {error && (
                <p className="text-sm text-error" role="alert" aria-live="polite">{error}</p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" size="lg" disabled={isSaving || !hasChanges}>
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col justify-between gap-4 border-t border-border bg-muted/30 px-6 py-5 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Need to switch accounts?
          </p>
          <LogoutButton />
        </CardFooter>
      </Card>
  );
}
