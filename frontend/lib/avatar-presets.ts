import type { UserProfile } from '@/lib/auth/user';

/**
 * Avatar Preset System
 *
 * Provides curated preset avatars with color backgrounds for users who don't want
 * to upload custom images. Follows the movie theater theme.
 */

export interface PresetColor {
  name: string;
  hex: string;
  description: string;
}

export interface AvatarPreset {
  id: string;
  name: string;
}

/**
 * 10 curated colors following the movie theater theme
 */
export const PRESET_COLORS: PresetColor[] = [
  { name: 'Curtain Red', hex: '#8B1E3F', description: 'Deep theatrical red' },
  { name: 'Warm Red', hex: '#E63946', description: 'Classic curtain warmth' },
  { name: 'Star Yellow', hex: '#F1C453', description: 'Marquee lights gold' },
  { name: 'Rich Gold', hex: '#D4A574', description: 'Ornate theater trim' },
  { name: 'Deep Purple', hex: '#5B2A86', description: 'Royal velvet drapes' },
  { name: 'Plush Purple', hex: '#8A4F9E', description: 'Luxurious seating' },
  { name: 'Warm Brown', hex: '#6B4226', description: 'Mahogany wood accents' },
  { name: 'Bronze', hex: '#A67C52', description: 'Art deco fixtures' },
  { name: 'Dark Teal', hex: '#1B4D5C', description: 'Classic cinema tones' },
  { name: 'Midnight Blue', hex: '#2C3E50', description: 'Darkened auditorium' },
];

/**
 * Available avatar presets (transparent PNG white silhouettes)
 * Rendered on colored backgrounds via PresetAvatar component
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 't-rex', name: 'T-Rex' },
];

/**
 * Determine how to display an avatar based on profile data
 * Priority: custom avatar > preset avatar > default
 *
 * Strategy C: Strict Separation
 * - Custom Avatar: avatar_url is set (and not a preset string), preset fields are null/ignored
 * - Preset Avatar: avatar_url is null/empty, preset fields are set
 * - Default: both are null/empty
 */
export function getAvatarDisplay(
  profile: Pick<UserProfile, 'avatar_url' | 'avatar_preset_id' | 'avatar_background_color'>
):
  | { type: 'custom'; url: string }
  | { type: 'preset'; presetId: string; backgroundColor: string }
  | { type: 'default' }
{

  // Preset via Columns (Priority 1)
  if (profile.avatar_preset_id && profile.avatar_background_color) {
    return {
      type: 'preset',
      presetId: profile.avatar_preset_id,
      backgroundColor: profile.avatar_background_color
    };
  }

  // Custom Upload (Priority 2)
  if (profile.avatar_url) {
    return { type: 'custom', url: profile.avatar_url };
  }

  // Default (Priority 3)
  return { type: 'default' };
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find(preset => preset.id === id);
}

/**
 * Get color by hex value
 */
export function getColorByHex(hex: string): PresetColor | undefined {
  return PRESET_COLORS.find(color => color.hex === hex);
}
