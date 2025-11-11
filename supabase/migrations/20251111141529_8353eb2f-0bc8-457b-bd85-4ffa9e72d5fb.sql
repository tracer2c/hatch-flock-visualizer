-- Drop the dependent view first
DROP VIEW IF EXISTS batches_with_fertility CASCADE;

-- Remove early_dead from fertility_analysis table
ALTER TABLE fertility_analysis
DROP COLUMN IF EXISTS early_dead;

-- Add early_dead and late_dead columns to residue_analysis table
ALTER TABLE residue_analysis
ADD COLUMN IF NOT EXISTS early_dead integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_dead integer DEFAULT 0;

-- Recreate batches_with_fertility view without early_dead
CREATE OR REPLACE VIEW batches_with_fertility AS
SELECT 
  b.*,
  f.fertile_eggs,
  f.infertile_eggs,
  f.fertility_percent,
  f.hatch_percent
FROM batches b
LEFT JOIN fertility_analysis f ON b.id = f.batch_id;

COMMENT ON COLUMN residue_analysis.early_dead IS 'Early dead embryos (0-7 days) found in residue analysis';
COMMENT ON COLUMN residue_analysis.late_dead IS 'Late dead embryos (15-21 days) found in residue analysis';