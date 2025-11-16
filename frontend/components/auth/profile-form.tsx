"use client";

import { useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/providers/current-user-provider";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

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

type ProfileFormProps = ComponentPropsWithoutRef<"div">;

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

  const supabase = useMemo(() => createClient(), []);
  const { user: currentUser, isLoading: isUserLoading, refreshUser } =
    useCurrentUser();

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
    currentUser?.full_name?.trim() ||
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
      <div {...props} className={cn("w-full max-w-md", className)}>
        <div className="p-6 text-center text-sm text-muted-foreground bg-card/50 backdrop-blur-sm rounded-xl">
          Loading profile…
        </div>
      </div>
    );
  }

  // if no current user, show an error message
  if (!currentUser) {
    return (
      <div {...props} className={cn("w-full max-w-md", className)}>
        <div className="p-6 text-center text-sm text-muted-foreground bg-card/50 backdrop-blur-sm rounded-xl">
          We couldn&apos;t load your profile details.
        </div>
      </div>
    );
  }

  return (
      <div {...props} className={cn("w-full max-w-4xl", className)}>
        <div className="h-36" />
        <div className="bg-card rounded-t-xl px-6 pb-6 pt-0">
          <div className="-mt-24 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 items-center md:flex-row md:items-end md:gap-6">
              <Avatar className="h-40 w-40 border-4 border-background shadow-xl md:h-48 md:w-48">
                <AvatarImage
                  src={currentUser.avatar_url ?? undefined}
                  alt={avatarAlt}
                />
              </Avatar>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold">
                  {displayName}
                </h1>
                <p className="text-base text-muted-foreground">
                  {currentUser.username ? `@${currentUser.username}` : "Set your username"} ·{" "}
                  {currentUser.email}
                </p>
                {joinedAt && (
                  <p className="text-sm text-muted-foreground">
                    Member since {joinedAt}
                  </p>
                )}
              </div>
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
        </div>
        <div className="space-y-8 px-6 pb-8 bg-card">
          {mode === "view" ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border p-5">
                <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                  Full name
                </h2>
                <p className="mt-2 text-base">
                  {formData.full_name || "Add your full name"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-5">
                <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                  Username
                </h2>
                <p className="mt-2 text-base">
                  {formData.username ? `@${formData.username}` : "Choose a username"}
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
                  <Label htmlFor="full_name">Full name</Label>
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
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-border bg-card rounded-b-xl px-6 py-5 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Need to switch accounts?
          </p>
          <LogoutButton />
        </div>
      </div>
  );
}
