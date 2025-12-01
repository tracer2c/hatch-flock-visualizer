-- Drop the old unique constraint on flock_number
ALTER TABLE public.flocks DROP CONSTRAINT IF EXISTS flocks_flock_number_key;

-- Add new composite unique constraint (flock_number + unit_id)
-- This allows the same flock number to exist across different hatcheries
ALTER TABLE public.flocks ADD CONSTRAINT flocks_flock_number_unit_key 
  UNIQUE (flock_number, unit_id);