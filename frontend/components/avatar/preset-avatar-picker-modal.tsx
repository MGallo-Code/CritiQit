"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PresetAvatar } from "@/components/avatar/preset-avatar";
import { PRESET_COLORS, type AvatarPreset } from "@/lib/avatar-presets";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * PresetAvatarPickerModal Component
 *
 * Modal for selecting a preset avatar + background color combination.
 * Shows live preview, organized preset grid (Animals/Robots), and color palette.
 */

interface PresetAvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPresetId?: string | null;
  currentBackgroundColor?: string | null;
  onSelect: (presetId: string, backgroundColor: string) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export function PresetAvatarPickerModal({
  isOpen,
  onClose,
  currentPresetId,
  currentBackgroundColor,
  onSelect,
  onRemove,
}: PresetAvatarPickerModalProps) {
  const supabase = createClient();
  const defaultColor = PRESET_COLORS[0].hex;

  const [presets, setPresets] = useState<AvatarPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>(currentPresetId || '');
  const [selectedColor, setSelectedColor] = useState<string>(
    currentBackgroundColor || defaultColor
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track preset button elements for auto-focus
  const presetButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Fetch available presets from backend with caching
  useEffect(() => {
    // Simple in-memory cache with 5-minute TTL
    // CACHE_VERSION: Increment when adding new presets to force cache refresh
    const CACHE_VERSION = 1;
    const CACHE_KEY = `avatar_presets_cache_v${CACHE_VERSION}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    async function fetchPresets() {
      setIsLoadingPresets(true);
      try {
        // Check cache first
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data: cachedPresets, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          if (age < CACHE_TTL) {
            // Use cached data
            setPresets(cachedPresets);
            if (!currentPresetId && cachedPresets.length > 0) {
              setSelectedPreset(cachedPresets[0].id);
            }
            setIsLoadingPresets(false);
            return;
          }
        }

        // Cache miss or expired - fetch from backend
        const { data, error: fetchError } = await supabase.rpc('list_preset_avatars');
        if (fetchError) throw fetchError;

        // Convert preset IDs to AvatarPreset objects
        const presetList: AvatarPreset[] = (data || []).map((id: string) => ({
          id,
          name: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        }));

        // Store in cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: presetList,
          timestamp: Date.now(),
        }));

        setPresets(presetList);

        // Set default preset if none selected
        if (!currentPresetId && presetList.length > 0) {
          setSelectedPreset(presetList[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch presets:', err);
        setError('Unable to load presets. Please try again.');
      } finally {
        setIsLoadingPresets(false);
      }
    }

    if (isOpen) {
      fetchPresets();
      // Reset selection to current preset when modal opens
      setSelectedPreset(currentPresetId || '');
      setSelectedColor(currentBackgroundColor || defaultColor);
      setError(null);
    }
  }, [isOpen, currentPresetId, currentBackgroundColor, defaultColor, supabase]);

  // Auto-focus the selected preset when modal opens
  useEffect(() => {
    if (isOpen && selectedPreset && !isLoadingPresets) {
      // Small delay to ensure the button is rendered and ref is set
      const timeoutId = setTimeout(() => {
        const selectedButton = presetButtonRefs.current.get(selectedPreset);
        if (selectedButton) {
          selectedButton.focus();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, selectedPreset, isLoadingPresets]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // onSelect handles database update and refreshUser()
      await onSelect(selectedPreset, selectedColor);
      // Only close after success is confirmed
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preset avatar");
    } finally {
      // Ensure loading state is cleared even on error
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    setIsRemoving(true);
    setError(null);

    try {
      await onRemove();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Preset Avatar</DialogTitle>
          <DialogDescription>
            Select an avatar and background color combination
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Section */}
          <div className="flex flex-col items-center gap-3 py-4">
            {selectedPreset ? (
              <PresetAvatar
                presetId={selectedPreset}
                backgroundColor={selectedColor}
                size="lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-muted animate-pulse" />
            )}
            <p className="text-sm text-muted-foreground">Preview</p>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isSaving || isRemoving}
                className="text-muted-foreground hover:text-foreground"
              >
                {isRemoving ? "Removing..." : "Remove Avatar (Use Default)"}
              </Button>
            )}
          </div>

          {/* Preset Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Avatar Presets</h3>
            {isLoadingPresets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading presets...</span>
              </div>
            ) : presets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No presets available
              </p>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    ref={(el) => {
                      if (el) {
                        presetButtonRefs.current.set(preset.id, el);
                      } else {
                        presetButtonRefs.current.delete(preset.id);
                      }
                    }}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    disabled={isSaving}
                    className={cn(
                      "relative rounded-lg p-2 transition-all hover:bg-accent",
                      // Focus state: Subtle outline (different from selection)
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-muted-foreground/50",
                      // Selected state: Bold primary ring with background (visually distinct)
                      selectedPreset === preset.id &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background bg-accent"
                    )}
                    title={preset.name}
                  >
                    <PresetAvatar
                      presetId={preset.id}
                      backgroundColor={selectedColor}
                      size="sm"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color Palette */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Background Color</h3>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  disabled={isSaving}
                  className={cn(
                    "w-12 h-12 rounded-full transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    selectedColor === color.hex &&
                      "ring-2 ring-primary ring-offset-2 scale-110"
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-error text-center" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
