-- Add UNIQUE constraint on batch_id in residue_analysis table
-- This allows upsert operations to work correctly
ALTER TABLE public.residue_analysis
ADD CONSTRAINT residue_analysis_batch_id_key UNIQUE (batch_id);

-- Create index for performance (if not automatically created by constraint)
CREATE INDEX IF NOT EXISTS idx_residue_analysis_batch_id 
ON public.residue_analysis(batch_id);