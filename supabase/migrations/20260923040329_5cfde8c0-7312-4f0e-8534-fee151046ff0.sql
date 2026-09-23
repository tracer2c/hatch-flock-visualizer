ALTER TABLE public.qa_monitoring
ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qa_monitoring_unit_check_date
ON public.qa_monitoring (unit_id, check_date DESC);

UPDATE public.qa_monitoring q
SET unit_id = COALESCE(m.unit_id, b.unit_id)
FROM public.qa_monitoring source
LEFT JOIN public.machines m ON m.id = source.machine_id
LEFT JOIN public.batches b ON b.id = source.batch_id
WHERE q.id = source.id
  AND q.unit_id IS NULL
  AND COALESCE(m.unit_id, b.unit_id) IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_qa_monitoring_set_unit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.unit_id IS NULL AND NEW.machine_id IS NOT NULL THEN
    SELECT unit_id INTO NEW.unit_id
    FROM public.machines
    WHERE id = NEW.machine_id;
  END IF;

  IF NEW.unit_id IS NULL AND NEW.batch_id IS NOT NULL THEN
    SELECT unit_id INTO NEW.unit_id
    FROM public.batches
    WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS qa_monitoring_set_unit ON public.qa_monitoring;
CREATE TRIGGER qa_monitoring_set_unit
BEFORE INSERT OR UPDATE OF machine_id, batch_id, unit_id
ON public.qa_monitoring
FOR EACH ROW
EXECUTE FUNCTION public.tg_qa_monitoring_set_unit();