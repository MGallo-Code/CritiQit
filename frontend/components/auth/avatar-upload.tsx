"use client";

import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Avatar Upload Component
 *
 * Features:
 * - Client-side image processing (resize to 512x512, convert to JPEG)
 * - One avatar per user (automatic overwrite via {user_id}.jpg naming)
 * - Progress indicator during upload
 * - Error handling with user-friendly messages
 * - Integration with existing dynamic gradient system
 *
 * Security (Production-Grade):
 * - Comprehensive file validation before upload
 *   - MIME type check (prevents basic spoofing)
 *   - Actual image loading verification (prevents advanced spoofing)
 *   - Dimension validation (50x50 to 4096x4096)
 *   - Detects corrupted files before upload attempt
 * - Processed output verification
 *   - Confirms JPEG conversion succeeded
 *   - Validates output size and content
 * - File size limits (5MB pre-processing, ~100KB post-processing)
 * - Rate limiting via Kong (5/hour, 20/day per user)
 * - RLS policies enforce {user_id}.jpg naming pattern
 *
 * Attack Vectors Prevented:
 * - MIME type spoofing (malicious file with image/jpeg header)
 * - Corrupted image files
 * - Dimension attacks (1x1 pixel or oversized images)
 * - Empty/invalid processing output
 */

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onUploadSuccess: (newUrl: string) => void;
  className?: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  onUploadSuccess,
  className,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  /**
   * Comprehensive file validation including actual image loading
   * Prevents spoofed MIME types and corrupted files
   *
   * Security enhancements:
   * - Verifies file actually loads as an Image (prevents MIME type spoofing)
   * - Validates image dimensions (prevents 1x1 pixel or oversized attacks)
   * - Catches corrupted files before upload attempt
   */
  const validateImageFile = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Step 1: Check for HEIC/HEIF files (iOS default camera format)
    // These crash the browser during processing, so catch them early with helpful message
    if (file.type === 'image/heic' || file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      return {
        valid: false,
        error: "HEIC format isn't supported yet. Please convert to JPEG, PNG, or WebP first. On iOS: Open the photo, tap Share → Save to Files, then select it here.",
      };
    }

    // Step 2: Basic checks (MIME type and size)
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

    // Step 2.5: Check for suspiciously large files that might crash during processing
    // Safari's HEIC-to-JPEG conversion can create very large files (>2MB)
    if (file.size > 3 * 1024 * 1024 && file.name.includes('tempImages')) {
      console.warn('Large Safari-converted image detected:', file.size, 'bytes');
      return {
        valid: false,
        error: "This image is too large to process (Safari converted it from HEIC). Please use a smaller image or convert to JPEG using another app.",
      };
    }

    // Step 3: Verify it's actually an image by loading it
    // This prevents MIME type spoofing attacks
    // Wrapped in try-catch to prevent page crashes from unsupported formats
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url); // Clean up memory

          // Step 4: Validate dimensions
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

          // All checks passed
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
      } catch (err) {
        // Catch crashes from unsupported formats (HEIC, corrupted files, etc.)
        console.error('Image validation crashed:', err);
        resolve({
          valid: false,
          error: "This image format isn't supported. Please try a JPEG, PNG, or WebP file.",
        });
      }
    });
  };

  /**
   * Process image: resize to 512x512 and convert to JPEG
   *
   * Security enhancements:
   * - Verifies processed output is valid JPEG
   * - Validates output size is within limits
   * - Ensures compression succeeded properly
   */
  const processImage = async (file: File): Promise<Blob> => {
    const options = {
      maxWidthOrHeight: 512,
      maxSizeMB: 0.1, // Target 100KB
      fileType: 'image/jpeg' as const,
      initialQuality: 0.85,
      useWebWorker: false, // Disable web worker - can cause crashes with large Safari-converted images
    };

    try {
      const compressedBlob = await imageCompression(file, options);

      // Verify the processed blob is valid JPEG
      if (compressedBlob.type !== 'image/jpeg') {
        throw new Error('Image processing failed to produce JPEG output.');
      }

      // Verify the processed blob is within size limits
      if (compressedBlob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Processed image is still too large. Please try a smaller image.');
      }

      // Verify we actually got a blob with content
      if (compressedBlob.size === 0) {
        throw new Error('Image processing produced empty output.');
      }

      return compressedBlob;
    } catch (err) {
      console.error('Image compression failed:', err);

      // Re-throw with original message if it's already a user-friendly error
      if (err instanceof Error && err.message.includes('processing')) {
        throw err;
      }

      // Check if it's an unsupported format error (HEIC often causes this)
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
   *
   * DEBUG: Enhanced logging to diagnose RLS policy violation
   */
  const uploadToStorage = async (blob: Blob): Promise<string> => {
    console.group('🔍 Avatar Upload Debug');

    // Step 1: Verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Auth session check:', {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionError,
      providedUserId: userId,
      userIdMatch: session?.user?.id === userId,
    });

    if (!session?.user?.id) {
      console.error('❌ No authenticated session found!');
      console.groupEnd();
      throw new Error('You must be logged in to upload an avatar.');
    }

    if (session.user.id !== userId) {
      console.error('❌ User ID mismatch!', {
        sessionUserId: session.user.id,
        providedUserId: userId,
      });
      console.groupEnd();
      throw new Error('User ID mismatch. Please refresh the page and try again.');
    }

    const filename = `${userId}.jpg`;
    const path = filename;

    console.log('Upload parameters:', {
      filename,
      path,
      blobSize: blob.size,
      blobType: blob.type,
      bucket: 'avatars',
    });

    // Step 2: Upload with upsert: true (atomic operation, no race condition)
    // This will either INSERT (first upload) or UPDATE (replacing existing)
    // RLS policies allow both operations for the file owner
    console.log('Attempting upload with upsert...');
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true, // Atomic operation - preserves existing avatar on failure
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('❌ Upload failed:', {
        error: uploadError,
        message: uploadError.message,
        statusCode: (uploadError as any).statusCode,
        details: (uploadError as any).details,
        hint: (uploadError as any).hint,
        fullError: JSON.stringify(uploadError, null, 2),
      });
      console.groupEnd();

      // Check if it's a rate limit error
      if (uploadError.message?.toLowerCase().includes('rate limit')) {
        throw new Error('You\'ve changed your profile picture too many times. Please try again later.');
      }

      // Check if it's an RLS policy error
      if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
        throw new Error('Unable to save your profile picture. Please try again later.');
      }

      throw new Error('Unable to upload your profile picture. Please try again.');
    }

    if (!data) {
      console.error('❌ Upload succeeded but no data returned.');
      console.groupEnd();
      throw new Error('Unable to confirm upload. Please refresh the page.');
    }

    console.log('✅ Upload successful:', {
      data,
      path: data.path,
    });

    // Generate public URL with cache-busting timestamp
    const timestamp = Date.now();
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    console.log('✅ Public URL generated:', urlData.publicUrl);
    console.groupEnd();

    return `${urlData.publicUrl}?v=${timestamp}`;
  };

  /**
   * Update profile with new avatar URL
   */
  const updateProfile = async (newUrl: string): Promise<void> => {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: newUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Unable to update your profile. Please refresh the page and try again.');
    }
  };

  /**
   * Handle file selection with comprehensive validation
   *
   * Validates file before showing preview to catch issues early:
   * - MIME type spoofing
   * - Corrupted images
   * - Invalid dimensions
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreviewUrl(null);
    setIsUploading(true); // Show loading during validation

    try {
      // Comprehensive async validation (loads image to verify it's valid)
      const validation = await validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error!);
        // Clear file input on validation failure
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validation passed - show preview
      // Wrap createObjectURL in try-catch to prevent crashes from malformed files
      try {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } catch (urlError) {
        console.error('Failed to create object URL:', urlError);
        throw new Error('Unable to load image preview. The file may be corrupted.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate image. Please try again.';
      setError(errorMessage);
      console.error('Validation error:', err);
      // Clear file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle upload button click (after preview shown)
   */
  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Process image (25% progress)
      setUploadProgress(25);
      const processedBlob = await processImage(file);

      // Step 2: Upload to storage (50% progress)
      setUploadProgress(50);
      const newUrl = await uploadToStorage(processedBlob);

      // Step 3: Update profile (75% progress)
      setUploadProgress(75);
      await updateProfile(newUrl);

      // Step 4: Complete (100% progress)
      setUploadProgress(100);

      // Clean up preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component
      onUploadSuccess(newUrl);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle cancel (dismiss preview)
   */
  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger file input click
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Preview or Current Avatar */}
      {previewUrl ? (
        <div className="relative">
          <Avatar className="h-40 w-40 border-4 border-primary shadow-xl md:h-64 md:w-64">
            <AvatarImage src={previewUrl} alt="Preview" />
          </Avatar>
          <div className="absolute -top-2 -right-2 flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={handleCancel}
              disabled={isUploading}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative group cursor-pointer" onClick={triggerFileInput}>
          <Avatar className="h-40 w-40 border-4 border-background shadow-xl md:h-64 md:w-64 transition-opacity group-hover:opacity-80">
            <AvatarImage src={currentAvatarUrl ?? undefined} alt="Current avatar" />
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Upload className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading... {uploadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-error text-center max-w-xs" role="alert">
          {error}
        </p>
      )}

      {/* Action Buttons */}
      {previewUrl ? (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
            size="lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          variant="outline"
          size="lg"
        >
          <Upload className="mr-2 h-4 w-4" />
          Change Avatar
        </Button>
      )}

      {/* Helper Text */}
      {!previewUrl && !isUploading && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          JPEG, PNG, or WebP • Max {MAX_FILE_SIZE_MB}MB • Recommended 512x512px
        </p>
      )}
    </div>
  );
}
