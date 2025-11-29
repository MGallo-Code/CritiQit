/**
 * Avatar Preset Spritesheet Configuration
 *
 * Auto-generated metadata from presets.json. Single source of truth for:
 * - Frame dimensions and count
 * - Preset names (for accessibility)
 * - CSS positioning calculations
 *
 * To add presets: npm run sprites
 */

import presetMetadata from '@/public/avatars/presets.json';

/** Individual preset frame info */
export interface PresetFrame {
  index: number;
  id: string;
  name: string;
}

/** Spritesheet metadata (auto-loaded from presets.json) */
export const SPRITESHEET_CONFIG = {
  imagePath: '/avatars/presets.png',
  frameWidth: presetMetadata.frameWidth,
  frameHeight: presetMetadata.frameHeight,
  frameCount: presetMetadata.frameCount,
  totalWidth: presetMetadata.totalWidth,
  layout: presetMetadata.layout as 'horizontal',
  frames: presetMetadata.frames as PresetFrame[],
} as const;

/**
 * Get the CSS background-position for a preset avatar
 *
 * With background-size: N00% (where N = frameCount), percentage positioning works as:
 * - 0% shows frame 0 (left edge aligned)
 * - 50% shows frame 1 (for 3 frames)
 * - 100% shows frame N-1 (right edge aligned)
 *
 * Formula: position = index * 100 / (frameCount - 1)
 *
 * @param presetIndex - The preset avatar index (0, 1, 2, etc.)
 * @returns CSS background-position value (e.g., '0% 0', '50% 0', '100% 0')
 */
export function getPresetBackgroundPosition(presetIndex: number): string {
  if (presetIndex < 0 || presetIndex >= SPRITESHEET_CONFIG.frameCount) {
    console.warn(`Invalid preset index: ${presetIndex}. Defaulting to first frame.`);
    return '0% 0';
  }

  // Handle edge case of single frame
  if (SPRITESHEET_CONFIG.frameCount === 1) {
    return '0% 0';
  }

  const xOffsetPercent = (presetIndex * 100) / (SPRITESHEET_CONFIG.frameCount - 1);
  return `${xOffsetPercent}% 0`;
}

/**
 * Get the intrinsic aspect ratio of the preset frames
 * Useful for maintaining aspect ratio when sizing avatars
 */
export function getPresetAspectRatio(): number {
  return SPRITESHEET_CONFIG.frameWidth / SPRITESHEET_CONFIG.frameHeight;
}

/**
 * Validate that a preset index is valid
 */
export function isValidPresetIndex(presetIndex: number): boolean {
  return presetIndex >= 0 && presetIndex < SPRITESHEET_CONFIG.frameCount;
}
