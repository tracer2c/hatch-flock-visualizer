-- Backfill actual_hatch_date for completed batches where it's NULL
-- Set it to expected_hatch_date for historical accuracy
UPDATE public.batches
SET actual_hatch_date = expected_hatch_date
WHERE status = 'completed' AND actual_hatch_date IS NULL;

-- Create trigger function to auto-set actual_hatch_date when batch completes
CREATE OR REPLACE FUNCTION public.set_actual_hatch_date_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'completed' and actual_hatch_date is not already set
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.actual_hatch_date IS NULL THEN
    NEW.actual_hatch_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_actual_hatch_date ON public.batches;

CREATE TRIGGER trigger_set_actual_hatch_date
BEFORE UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.set_actual_hatch_date_on_complete();