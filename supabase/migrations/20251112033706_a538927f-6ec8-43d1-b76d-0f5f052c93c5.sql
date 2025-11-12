-- Add data_type column to flocks table
ALTER TABLE flocks ADD COLUMN IF NOT EXISTS data_type TEXT NOT NULL DEFAULT 'original';

-- Add constraint to ensure only 'original' or 'dummy' values
ALTER TABLE flocks ADD CONSTRAINT flocks_data_type_check CHECK (data_type IN ('original', 'dummy'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_flocks_data_type ON flocks(data_type);

-- Set all existing flocks to 'original'
UPDATE flocks SET data_type = 'original' WHERE data_type IS NULL OR data_type = '';