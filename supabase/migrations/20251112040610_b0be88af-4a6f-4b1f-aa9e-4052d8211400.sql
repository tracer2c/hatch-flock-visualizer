-- Add data_type column to machines table for training/production segregation
ALTER TABLE machines ADD COLUMN IF NOT EXISTS data_type TEXT NOT NULL DEFAULT 'original';

-- Add constraint to ensure only 'original' or 'dummy' values
ALTER TABLE machines ADD CONSTRAINT machines_data_type_check CHECK (data_type IN ('original', 'dummy'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_machines_data_type ON machines(data_type);

-- Set all existing machines to 'original'
UPDATE machines SET data_type = 'original' WHERE data_type IS NULL OR data_type = '';