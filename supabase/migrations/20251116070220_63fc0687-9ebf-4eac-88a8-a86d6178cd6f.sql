-- Feature 1: Multi-Hatchery Flock Creation
-- Add flock_group_id to track related flocks across hatcheries

ALTER TABLE flocks 
  ADD COLUMN flock_group_id uuid DEFAULT NULL;

-- Create index for performance
CREATE INDEX idx_flocks_group_id ON flocks(flock_group_id);

-- Add comment for documentation
COMMENT ON COLUMN flocks.flock_group_id IS 
  'Links multiple flocks created together across different hatcheries with the same flock number';