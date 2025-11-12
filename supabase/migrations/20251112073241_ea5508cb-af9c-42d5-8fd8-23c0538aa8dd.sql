-- Add cull_chicks column to residue_analysis table
ALTER TABLE public.residue_analysis 
ADD COLUMN IF NOT EXISTS cull_chicks INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_residue_analysis_cull_chicks 
ON public.residue_analysis(cull_chicks);

-- Add comment for documentation
COMMENT ON COLUMN public.residue_analysis.cull_chicks IS 'Number of culled chicks identified during residue analysis';