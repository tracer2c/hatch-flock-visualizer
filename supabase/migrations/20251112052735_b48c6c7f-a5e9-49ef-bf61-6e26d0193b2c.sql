-- Migration: Remove late_dead and cull_chicks from fertility_analysis table
-- These mortality fields belong exclusively to residue_analysis

-- Step 1: Drop the batches_with_fertility view if it exists
DROP VIEW IF EXISTS public.batches_with_fertility CASCADE;

-- Step 2: Remove late_dead and cull_chicks columns from fertility_analysis
ALTER TABLE public.fertility_analysis 
DROP COLUMN IF EXISTS late_dead,
DROP COLUMN IF EXISTS cull_chicks;

-- Step 3: Ensure late_dead exists in residue_analysis with proper default
-- (early_dead already exists based on previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'residue_analysis' 
    AND column_name = 'late_dead'
  ) THEN
    ALTER TABLE public.residue_analysis 
    ADD COLUMN late_dead INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Step 4: Recreate batches_with_fertility view without late_dead and cull_chicks
CREATE OR REPLACE VIEW public.batches_with_fertility AS
SELECT 
  b.*,
  fa.fertile_eggs,
  fa.infertile_eggs,
  fa.fertility_percent,
  fa.hatch_percent
FROM public.batches b
LEFT JOIN public.fertility_analysis fa ON b.id = fa.batch_id;