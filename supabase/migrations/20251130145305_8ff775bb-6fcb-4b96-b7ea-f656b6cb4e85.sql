-- Fix residue_analysis: recalculate fertile_eggs and hatch_percent
UPDATE public.residue_analysis
SET 
  fertile_eggs = COALESCE(sample_size, 648) - COALESCE(infertile_eggs, 0),
  hatch_percent = CASE 
    WHEN COALESCE(sample_size, 648) > 0 
    THEN ROUND(
      (
        (COALESCE(sample_size, 648) - COALESCE(infertile_eggs, 0) - COALESCE(early_dead, 0) - COALESCE(mid_dead, 0) - COALESCE(late_dead, 0) - COALESCE(cull_chicks, 0) - COALESCE(live_pip_number, 0) - COALESCE(dead_pip_number, 0))::numeric 
        / COALESCE(sample_size, 648)::numeric
      ) * 100, 2
    )
    ELSE 0
  END,
  hof_percent = CASE 
    WHEN (COALESCE(sample_size, 648) - COALESCE(infertile_eggs, 0)) > 0 
    THEN ROUND(
      (
        (COALESCE(sample_size, 648) - COALESCE(infertile_eggs, 0) - COALESCE(early_dead, 0) - COALESCE(mid_dead, 0) - COALESCE(late_dead, 0) - COALESCE(cull_chicks, 0) - COALESCE(live_pip_number, 0) - COALESCE(dead_pip_number, 0))::numeric 
        / (COALESCE(sample_size, 648) - COALESCE(infertile_eggs, 0))::numeric
      ) * 100, 2
    )
    ELSE 0
  END
WHERE fertile_eggs IS NULL OR fertile_eggs = 0 OR hatch_percent IS NULL OR hatch_percent = 0;

-- Add technician_name column to residue_analysis_schedule if not exists
ALTER TABLE public.residue_analysis_schedule 
ADD COLUMN IF NOT EXISTS technician_name TEXT;

-- Add flock_id column to residue_analysis_schedule for direct flock filtering
ALTER TABLE public.residue_analysis_schedule 
ADD COLUMN IF NOT EXISTS flock_id UUID REFERENCES public.flocks(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_residue_schedule_flock ON public.residue_analysis_schedule(flock_id);
CREATE INDEX IF NOT EXISTS idx_residue_schedule_technician ON public.residue_analysis_schedule(technician_name);

-- Add comment
COMMENT ON COLUMN public.residue_analysis_schedule.technician_name IS 'Name of technician who created the schedule';
COMMENT ON COLUMN public.residue_analysis_schedule.flock_id IS 'Direct link to flock for filtering';