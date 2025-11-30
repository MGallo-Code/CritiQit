/**
 * Avatar Preset System
 *
 * Provides curated preset avatars with themed color backgrounds.
 * Users can choose from preset images (defined in spritesheet) + color combinations
 * instead of uploading custom images.
 */

import type { UserProfile } from '@/lib/auth/user';

export interface PresetColor {
  name: string;
  hex: string;
  description: string;
}

/** Curated color palette following the movie theater theme */
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
 * Determine how to display an avatar based on profile data.
 *
 * Priority (strict separation):
 * 1. Preset avatar: avatar_preset_index + avatar_background_color are set
 * 2. Custom avatar: avatar_url is set
 * 3. Default: neither are set
 */
export function getAvatarDisplay(
  profile: Pick<UserProfile, 'avatar_url' | 'avatar_preset_index' | 'avatar_background_color'>
):
  | { type: 'custom'; url: string }
  | { type: 'preset'; presetIndex: number; backgroundColor: string }
  | { type: 'default' }
{
  // 1. Preset avatar (both fields must be set)
  if (profile.avatar_preset_index !== null && profile.avatar_preset_index !== undefined && profile.avatar_background_color) {
    return {
      type: 'preset',
      presetIndex: profile.avatar_preset_index,
      backgroundColor: profile.avatar_background_color
    };
  }

  // 2. Custom uploaded image
  if (profile.avatar_url) {
    return { type: 'custom', url: profile.avatar_url };
  }

  // 3. Default placeholder
  return { type: 'default' };
}

/** Find a preset color by its hex value */
export function getColorByHex(hex: string): PresetColor | undefined {
  return PRESET_COLORS.find(color => color.hex === hex);
}
