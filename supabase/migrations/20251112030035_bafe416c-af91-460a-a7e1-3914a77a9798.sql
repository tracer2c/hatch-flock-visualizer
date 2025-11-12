-- Add data_type column to batches table for dummy vs original data separation
ALTER TABLE batches 
ADD COLUMN data_type TEXT NOT NULL DEFAULT 'original'
CHECK (data_type IN ('original', 'dummy'));

-- Add index for efficient filtering
CREATE INDEX idx_batches_data_type ON batches(data_type);

-- Add comment for documentation
COMMENT ON COLUMN batches.data_type IS 'Indicates whether this is original production data or dummy/training data';