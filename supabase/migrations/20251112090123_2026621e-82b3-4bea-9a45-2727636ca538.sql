-- Add mortality_count column to residue_analysis table
ALTER TABLE public.residue_analysis
ADD COLUMN mortality_count INTEGER DEFAULT 0;

-- Add index for performance
CREATE INDEX idx_residue_analysis_mortality_count ON public.residue_analysis(mortality_count);

-- Add comment
COMMENT ON COLUMN public.residue_analysis.mortality_count IS 'Total mortality count tracked during residue analysis';