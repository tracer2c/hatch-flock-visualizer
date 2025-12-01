-- Add new enum values to batch_status (must be committed before use)
ALTER TYPE batch_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE batch_status ADD VALUE IF NOT EXISTS 'in_setter';
ALTER TYPE batch_status ADD VALUE IF NOT EXISTS 'in_hatcher';