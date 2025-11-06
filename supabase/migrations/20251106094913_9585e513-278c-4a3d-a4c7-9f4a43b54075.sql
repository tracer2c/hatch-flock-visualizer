-- Add unit_id (hatchery) to machines table
ALTER TABLE machines ADD COLUMN unit_id uuid REFERENCES units(id);

-- Add index for better query performance
CREATE INDEX idx_machines_unit_id ON machines(unit_id);