-- Add avatar preset fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_preset_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_background_color TEXT;

-- Add constraint for hex color format
ALTER TABLE public.profiles
ADD CONSTRAINT avatar_background_color_check 
CHECK (avatar_background_color IS NULL OR avatar_background_color ~ '^#[0-9A-Fa-f]{6}$');

COMMENT ON COLUMN public.profiles.avatar_preset_id IS 'ID of the selected preset avatar (e.g., "t-rex")';
COMMENT ON COLUMN public.profiles.avatar_background_color IS 'Hex color code for the preset avatar background';
