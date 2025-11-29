-- Create level_type enum
CREATE TYPE public.level_type AS ENUM ('Top', 'Middle', 'Bottom');

-- Add level column to multi_setter_sets
ALTER TABLE public.multi_setter_sets ADD COLUMN level public.level_type;

-- Set default for existing records
UPDATE public.multi_setter_sets SET level = 'Middle' WHERE level IS NULL;

-- Make it required
ALTER TABLE public.multi_setter_sets ALTER COLUMN level SET NOT NULL;

-- Add index for analytics queries
CREATE INDEX idx_multi_setter_sets_level ON public.multi_setter_sets(level);