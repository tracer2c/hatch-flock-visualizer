-- Populate missing residue characteristic data for training records
-- Update residue_analysis records that have NULL values for characteristic fields

UPDATE public.residue_analysis
SET
  brain_defects = floor(random() * 4)::integer,  -- 0-3 per batch
  dry_egg = floor(random() * 3)::integer,        -- 0-2 per batch
  malpositioned = floor(random() * 4 + 1)::integer,  -- 1-4 per batch
  upside_down = floor(random() * 3)::integer,    -- 0-2 per batch
  transfer_crack = floor(random() * 3 + 1)::integer  -- 1-3 per batch
WHERE 
  batch_id IN (
    SELECT id FROM public.batches WHERE data_type = 'dummy'
  )
  AND (
    brain_defects IS NULL 
    OR dry_egg IS NULL 
    OR malpositioned IS NULL 
    OR upside_down IS NULL 
    OR transfer_crack IS NULL
  );