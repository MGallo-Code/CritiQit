"use client";

import { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { PresetAvatar } from "@/components/avatar/preset-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESET_COLORS } from "@/lib/avatar-presets";
import { SPRITESHEET_CONFIG } from "@/lib/avatar-spritesheet";

/**
 * AvatarPickerModal Component
 *
 * Unified modal for selecting preset avatars OR uploading custom photos.
 * Features two tabs:
 * 1. "Choose Preset" (default/primary) - Grid of preset avatars + color picker
 * 2. "Upload Photo" - Image upload, crop, and processing workflow
 *
 * Mobile: Uses Drawer for better touch experience
 * Desktop: Uses Dialog for centered modal
 */

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl: string | null;
  currentPresetIndex: number | null;
  currentBackgroundColor: string | null;
  onPresetSelect: (presetIndex: number, backgroundColor: string) => Promise<void>;
  onUploadSuccess: (newUrl: string) => Promise<void>;
  onRemove?: () => Promise<void>;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Hook to detect mobile viewport
 * Uses SSR-safe initialization to prevent flash
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Default crop configuration: 80% of image, centered, 1:1 aspect ratio locked
 */
const getInitialCrop = (imageWidth: number, imageHeight: number): Crop => {
  const minDimension = Math.min(imageWidth, imageHeight);
  const cropSize = minDimension * 0.8;

  const x = (imageWidth - cropSize) / 2;
  const y = (imageHeight - cropSize) / 2;

  return {
    unit: 'px',
    width: cropSize,
    height: cropSize,
    x,
    y,
  };
};

/**
 * Upload phase tracking for multi-step workflow
 */
type UploadPhase =
  | 'idle'           // No file selected
  | 'cropping'       // File loaded, user adjusting crop
  | 'preview'        // Crop complete, showing preview
  | 'uploading';     // Processing + uploading

export function AvatarPickerModal({
  isOpen,
  onClose,
  userId,
  currentAvatarUrl,
  currentPresetIndex,
  currentBackgroundColor,
  onPresetSelect,
  onUploadSuccess,
  onRemove,
}: AvatarPickerModalProps) {
  const supabase = createClient();
  const isMobile = useIsMobile();

  // Active tab state
  const [activeTab, setActiveTab] = useState<'preset' | 'upload'>('preset');

  // Preset tab state
  const defaultColor = PRESET_COLORS[0].hex;
  const defaultPresetIndex = 0;
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(
    currentPresetIndex ?? defaultPresetIndex
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    currentBackgroundColor || defaultColor
  );
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Upload tab state
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared error state
  const [error, setError] = useState<string | null>(null);

  // Track preset button refs for auto-focus on selected item
  const presetButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset to preset tab by default
      setActiveTab('preset');

      // Reset preset state
      setSelectedPresetIndex(currentPresetIndex ?? defaultPresetIndex);
      setSelectedColor(currentBackgroundColor || defaultColor);

      // Reset upload state
      setUploadPhase('idle');
      setError(null);
    }
  }, [isOpen, currentPresetIndex, currentBackgroundColor, defaultColor, defaultPresetIndex]);

  // Auto-focus the selected preset when modal opens on preset tab
  useEffect(() => {
    if (isOpen && activeTab === 'preset') {
      const timeoutId = setTimeout(() => {
        const selectedButton = presetButtonRefs.current.get(selectedPresetIndex);
        if (selectedButton) {
          selectedButton.focus();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, activeTab, selectedPresetIndex]);

  // ============================
  // PRESET TAB HANDLERS
  // ============================

  const handlePresetSave = async () => {
    setIsSavingPreset(true);
    setError(null);

    try {
      await onPresetSelect(selectedPresetIndex, selectedColor);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preset avatar");
    } finally {
      setIsSavingPreset(false);
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

  // ============================
  // UPLOAD TAB HANDLERS
  // ============================

  /**
   * Comprehensive file validation including actual image loading
   */
  const validateImageFile = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Check for HEIC/HEIF files
    if (file.type === 'image/heic' || file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      return {
        valid: false,
        error: "HEIC format isn't supported yet. Please convert to JPEG, PNG, or WebP first. On iOS: Open the photo, tap Share → Save to Files, then select it here.",
      };
    }

    // Basic checks
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "Please select a valid image file (JPEG, PNG, or WebP).",
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `Image must be less than ${MAX_FILE_SIZE_MB}MB. Please choose a smaller image.`,
      };
    }

    // Verify it's actually an image by loading it
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);

          if (img.width < 50 || img.height < 50) {
            resolve({
              valid: false,
              error: "Image is too small. Minimum 50x50 pixels required.",
            });
            return;
          }

          if (img.width > 4096 || img.height > 4096) {
            resolve({
              valid: false,
              error: "Image is too large. Maximum 4096x4096 pixels allowed.",
            });
            return;
          }

          resolve({ valid: true });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({
            valid: false,
            error: "File is not a valid image. Please try another file.",
          });
        };

        img.src = url;
      } catch {
        resolve({
          valid: false,
          error: "This image format isn't supported. Please try a JPEG, PNG, or WebP file.",
        });
      }
    });
  };

  /**
   * Converts the user's crop selection to a Blob
   */
  const getCroppedBlob = async (
    image: HTMLImageElement,
    pixelCrop: PixelCrop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        1.0
      );
    });
  };

  /**
   * Process image: resize to 512x512 and convert to JPEG
   */
  const processImage = async (inputBlob: Blob): Promise<Blob> => {
    const options = {
      maxWidthOrHeight: 512,
      maxSizeMB: 0.1,
      fileType: 'image/jpeg' as const,
      initialQuality: 0.85,
      useWebWorker: false,
    };

    try {
      const fileToCompress = inputBlob instanceof File
        ? inputBlob
        : new File([inputBlob], 'cropped.png', { type: inputBlob.type });

      const compressedBlob = await imageCompression(fileToCompress, options);

      if (compressedBlob.type !== 'image/jpeg') {
        throw new Error('Image processing failed to produce JPEG output.');
      }

      if (compressedBlob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Processed image is still too large. Please try a smaller image.');
      }

      if (compressedBlob.size === 0) {
        throw new Error('Image processing produced empty output.');
      }

      return compressedBlob;
    } catch (err) {
      if (err instanceof Error && err.message.includes('processing')) {
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
      if (errorMessage.includes('heic') || errorMessage.includes('heif') ||
          errorMessage.includes('unsupported') || errorMessage.includes('format')) {
        throw new Error('This image format isn\'t supported. Please use JPEG, PNG, or WebP.');
      }

      throw new Error('Failed to process image. Please try a different image.');
    }
  };

  /**
   * Upload processed image to Supabase Storage
   */
  const uploadToStorage = async (blob: Blob): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      throw new Error('You must be logged in to upload an avatar.');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch. Please refresh the page and try again.');
    }

    const filename = `${userId}.jpg`;
    const path = filename;

    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      if (uploadError.message?.toLowerCase().includes('rate limit')) {
        throw new Error('You\'ve changed your profile picture too many times. Please try again later.');
      }
      if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
        throw new Error('Unable to save your profile picture. Please try again later.');
      }
      throw new Error('Unable to upload your profile picture. Please try again.');
    }

    if (!data) {
      throw new Error('Unable to confirm upload. Please refresh the page.');
    }

    const timestamp = Date.now();
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return `${urlData.publicUrl}?v=${timestamp}`;
  };

  /**
   * Handle file selection with comprehensive validation
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadPhase('uploading');

    try {
      const validation = await validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error!);
        setUploadPhase('idle');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      try {
        const objectUrl = URL.createObjectURL(file);
        setOriginalImageUrl(objectUrl);
        setCrop(undefined);
        setCompletedCrop(null);
        setUploadPhase('cropping');
      } catch {
        throw new Error('Unable to load image. The file may be corrupted.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate image. Please try again.';
      setError(errorMessage);
      setUploadPhase('idle');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle crop completion - execute crop and move to preview
   */
  const handleCropComplete = async () => {
    if (!completedCrop || !imageRef.current) {
      setError('Please adjust the crop area before continuing.');
      return;
    }

    setUploadPhase('uploading');
    setError(null);

    try {
      const blob = await getCroppedBlob(imageRef.current, completedCrop);
      const previewUrl = URL.createObjectURL(blob);

      setCroppedBlob(blob);
      setCroppedPreviewUrl(previewUrl);
      setUploadPhase('preview');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to crop image. Please try again.';
      setError(errorMessage);
      setUploadPhase('cropping');
    }
  };

  /**
   * Handle back to crop from preview
   */
  const handleBackToCrop = () => {
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
    }
    setCroppedPreviewUrl(null);
    setCroppedBlob(null);
    setUploadPhase('cropping');
  };

  /**
   * Handle upload button click (after crop and preview)
   */
  const handleUpload = async () => {
    if (!croppedBlob) {
      setError('No cropped image available. Please try again.');
      return;
    }

    setUploadPhase('uploading');
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(25);
      const processedBlob = await processImage(croppedBlob);

      setUploadProgress(50);
      const newUrl = await uploadToStorage(processedBlob);

      setUploadProgress(75);
      await onUploadSuccess(newUrl);

      setUploadProgress(100);

      // Clean up
      if (originalImageUrl) {
        URL.revokeObjectURL(originalImageUrl);
      }
      if (croppedPreviewUrl) {
        URL.revokeObjectURL(croppedPreviewUrl);
      }

      setOriginalImageUrl(null);
      setCroppedPreviewUrl(null);
      setCroppedBlob(null);
      setCrop(undefined);
      setCompletedCrop(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setUploadPhase('idle');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setUploadPhase('preview');
    } finally {
      setUploadProgress(0);
    }
  };

  /**
   * Handle cancel/close
   */
  const handleCancel = () => {
    // Clean up upload state
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl);
    }
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
    }

    setOriginalImageUrl(null);
    setCroppedPreviewUrl(null);
    setCroppedBlob(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setError(null);
    setUploadPhase('idle');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onClose();
  };

  /**
   * Trigger file input click
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ============================
  // RENDER FUNCTIONS
  // ============================

  /**
   * Render preset tab content
   */
  const renderPresetTab = () => (
    <div className="space-y-4">
      {/* Preview Section */}
      <div className="flex flex-col items-center gap-3 py-2">
        <PresetAvatar
          presetIndex={selectedPresetIndex}
          backgroundColor={selectedColor}
          size="lg"
        />
        <p className="text-muted-foreground">Preview</p>
      </div>

      {/* Preset Grid */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <h3 className="font-semibold text-muted-foreground">Avatar Presets</h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 p-2">
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
              disabled={isSavingPreset}
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
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <h3 className="font-semibold text-muted-foreground">Background Color</h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-wrap gap-3 p-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => setSelectedColor(color.hex)}
              disabled={isSavingPreset}
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
        <p className="text-error text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );

  /**
   * Render upload tab content
   */
  const renderUploadTab = () => {
    // Idle state - show upload trigger
    if (uploadPhase === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div
            onClick={triggerFileInput}
            className="group cursor-pointer flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
          >
            <Upload className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="text-muted-foreground text-center">
              Click to select an image
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            JPEG, PNG, or WebP • Max {MAX_FILE_SIZE_MB}MB • Recommended 512x512px
          </p>

          {error && (
            <p className="text-error text-center" role="alert">
              {error}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      );
    }

    // Cropping phase
    if (uploadPhase === 'cropping' && originalImageUrl) {
      return (
        <div className="space-y-4">
          <div className={cn(
            "crop-container relative w-full rounded-lg overflow-hidden",
            isMobile ? "flex-1 min-h-0" : ""
          )}>
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              <img
                ref={imageRef}
                src={originalImageUrl}
                alt="Crop preview"
                className={cn(
                  "max-w-full h-auto mx-auto object-contain",
                  isMobile ? "max-h-[40vh]" : "max-h-[50vh]"
                )}
                onLoad={(e) => {
                  imageRef.current = e.currentTarget;
                  const initialCrop = getInitialCrop(
                    e.currentTarget.width,
                    e.currentTarget.height
                  );
                  setCrop(initialCrop);
                }}
              />
            </ReactCrop>
          </div>

          <div className={cn(
            "flex gap-3",
            isMobile ? "flex-col" : "justify-end"
          )}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadPhase('idle')}
              className={isMobile ? "min-h-[48px]" : ""}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className={isMobile ? "min-h-[48px]" : ""}
            >
              Continue
            </Button>
          </div>

          {error && (
            <p className="text-sm text-error text-center" role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }

    // Preview phase
    if (uploadPhase === 'preview' && croppedPreviewUrl) {
      return (
        <div className="space-y-4">
          <div className="flex justify-center py-4">
            <Avatar className="h-40 w-40 border-4 border-primary shadow-xl">
              <AvatarImage src={croppedPreviewUrl} alt="Cropped preview" />
            </Avatar>
          </div>

          <div className={cn(
            "flex gap-3",
            isMobile ? "flex-col" : "justify-end"
          )}>
            <Button
              type="button"
              variant="outline"
              onClick={handleBackToCrop}
              className={isMobile ? "min-h-[48px]" : ""}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              className={isMobile ? "min-h-[48px]" : ""}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>

          {error && (
            <p className="text-sm text-error text-center" role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }

    // Uploading phase
    if (uploadPhase === 'uploading') {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-primary shadow-xl opacity-50">
              <AvatarImage
                src={croppedPreviewUrl || currentAvatarUrl || undefined}
                alt="Uploading"
              />
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            </div>
          </div>

          <div className="w-full max-w-xs" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>
                {uploadProgress === 0 ? 'Processing...' : `Uploading... ${uploadProgress}%`}
              </span>
            </div>
            {uploadProgress > 0 && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-error text-center" role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  /**
   * Shared modal content with tabs
   */
  const renderModalContent = () => (
    <>
      {/* Custom CSS for circular crop overlay */}
      <style jsx global>{`
        .crop-container {
          position: relative;
          overflow: hidden;
          border-radius: 0.5rem;
        }

        .ReactCrop__crop-selection {
          border: 3px solid hsl(45 85% 75%);
          border-radius: 50%;
          box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.6);
        }

        .ReactCrop__drag-handle {
          width: 44px;
          height: 44px;
          background: hsl(45 85% 75%);
          border: 2px solid hsl(240 8% 12%);
          border-radius: 50%;
        }

        @media (min-width: 640px) {
          .ReactCrop__drag-handle {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preset' | 'upload')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preset">Choose Preset</TabsTrigger>
          <TabsTrigger value="upload">Upload Photo</TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="mt-2 overflow-hidden">
          {renderPresetTab()}
        </TabsContent>

        <TabsContent value="upload" className="mt-2 overflow-hidden">
          {renderUploadTab()}
        </TabsContent>
      </Tabs>

      {/* Remove Avatar Button (Outside Tabs) */}
      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isSavingPreset || isRemoving}
          className="w-full py-2 px-4 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRemoving ? "Removing..." : "Remove Avatar (Use Default)"}
        </button>
      )}

      {/* Footer (only show for preset tab or when upload is idle) */}
      {(activeTab === 'preset' || uploadPhase === 'idle') && (
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSavingPreset}
            className="flex-1 py-2 px-4 rounded-md border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'preset' && (
            <button
              type="button"
              onClick={handlePresetSave}
              disabled={isSavingPreset}
              className="flex-1 py-2 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingPreset ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          )}
        </div>
      )}
    </>
  );

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="text-center">
            <DrawerTitle>Choose Profile Picture</DrawerTitle>
            <DrawerDescription>
              Select a preset avatar or upload your own photo
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 flex flex-col gap-4 px-4 pb-8 overflow-y-auto">
            {renderModalContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto top-[5%] translate-y-0">
        <DialogHeader>
          <DialogTitle>Choose Profile Picture</DialogTitle>
          <DialogDescription>
            Select a preset avatar or upload your own photo
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {renderModalContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
