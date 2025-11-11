-- Add PIP split columns to residue_analysis
ALTER TABLE residue_analysis 
ADD COLUMN IF NOT EXISTS live_pip_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dead_pip_number INTEGER DEFAULT 0;

-- Add technician/notes columns to batches table for HOI and Clears/Injected
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS hoi_technician_name TEXT,
ADD COLUMN IF NOT EXISTS hoi_notes TEXT,
ADD COLUMN IF NOT EXISTS clears_technician_name TEXT,
ADD COLUMN IF NOT EXISTS clears_notes TEXT;

-- Migrate existing pip_number data to live_pip_number (optional - for existing records)
UPDATE residue_analysis 
SET live_pip_number = COALESCE(pip_number, 0), 
    dead_pip_number = 0 
WHERE live_pip_number = 0 AND pip_number IS NOT NULL;