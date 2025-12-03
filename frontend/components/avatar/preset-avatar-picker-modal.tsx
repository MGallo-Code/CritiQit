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
import { PRESET_COLORS } from "@/lib/avatar-presets";
import { SPRITESHEET_CONFIG } from "@/lib/avatar-spritesheet";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * PresetAvatarPickerModal Component
 *
 * Modal for selecting a preset avatar + background color combination.
 * Features:
 * - Live preview of selected preset + color
 * - Grid of all available preset avatars
 * - Color palette selection
 * - Optional "Remove Avatar" action to revert to default
 */

interface PresetAvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPresetIndex?: number | null;
  currentBackgroundColor?: string | null;
  onSelect: (presetIndex: number, backgroundColor: string) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export function PresetAvatarPickerModal({
  isOpen,
  onClose,
  currentPresetIndex,
  currentBackgroundColor,
  onSelect,
  onRemove,
}: PresetAvatarPickerModalProps) {
  const defaultColor = PRESET_COLORS[0].hex;
  const defaultPresetIndex = 0;

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(
    currentPresetIndex ?? defaultPresetIndex
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    currentBackgroundColor || defaultColor
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track preset button refs for auto-focus on selected item
  const presetButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPresetIndex(currentPresetIndex ?? defaultPresetIndex);
      setSelectedColor(currentBackgroundColor || defaultColor);
      setError(null);
    }
  }, [isOpen, currentPresetIndex, currentBackgroundColor, defaultColor, defaultPresetIndex]);

  // Auto-focus the selected preset when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the button is rendered and ref is set
      const timeoutId = setTimeout(() => {
        const selectedButton = presetButtonRefs.current.get(selectedPresetIndex);
        if (selectedButton) {
          selectedButton.focus();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, selectedPresetIndex]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSelect(selectedPresetIndex, selectedColor);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preset avatar");
    } finally {
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
            <PresetAvatar
              presetIndex={selectedPresetIndex}
              backgroundColor={selectedColor}
              size="lg"
            />
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
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <h3 className="text-sm font-semibold text-muted-foreground">Avatar Presets</h3>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {SPRITESHEET_CONFIG.frames.map((frame) => (
                <button
                  key={frame.index}
                  ref={(el) => {
                    if (el) {
                      presetButtonRefs.current.set(frame.index, el);
                    } else {
                      presetButtonRefs.current.delete(frame.index);
                    }
                  }}
                  type="button"
                  onClick={() => setSelectedPresetIndex(frame.index)}
                  disabled={isSaving}
                  className="w-10 h-10 focus-visible:outline-none"
                  title={frame.name}
                >
                  <PresetAvatar
                    presetIndex={frame.index}
                    backgroundColor={selectedColor}
                    size="sm"
                    className={cn(
                      "ring-offset-background transition-shadow",
                      "hover:ring-2 hover:ring-accent hover:ring-offset-1",
                      "focus-visible:ring-2 focus-visible:ring-muted-foreground/50 focus-visible:ring-offset-2",
                      selectedPresetIndex === frame.index &&
                        "ring-2 ring-primary ring-offset-2"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <h3 className="text-sm font-semibold text-muted-foreground">Background Color</h3>
              <div className="flex-1 h-px bg-border" />
            </div>
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

        <DialogFooter className="mt-6 gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
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
