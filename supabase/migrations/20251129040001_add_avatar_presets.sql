-- Add avatar preset fields to profiles table
-- Preset index references position in frontend spritesheet (public/avatars/presets.png)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_preset_index SMALLINT,
ADD COLUMN IF NOT EXISTS avatar_background_color TEXT;

-- Validate preset index is non-negative
ALTER TABLE public.profiles
ADD CONSTRAINT avatar_preset_index_check
CHECK (avatar_preset_index IS NULL OR avatar_preset_index >= 0);

-- Add constraint for hex color format
ALTER TABLE public.profiles
ADD CONSTRAINT avatar_background_color_check
CHECK (avatar_background_color IS NULL OR avatar_background_color ~ '^#[0-9A-Fa-f]{6}$');

COMMENT ON COLUMN public.profiles.avatar_preset_index IS 'Index into frontend spritesheet (0=bear, 1=bird, 2=t-rex, etc.)';
COMMENT ON COLUMN public.profiles.avatar_background_color IS 'Hex color code for the preset avatar background';
