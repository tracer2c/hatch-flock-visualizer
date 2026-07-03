
CREATE TABLE public.flock_worksheet_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  set_date_week_start date NOT NULL,
  worksheet_type text NOT NULL CHECK (worksheet_type IN ('hatch_fertility','residue','egg_pack','hoi')),
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flock_id, set_date_week_start, worksheet_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flock_worksheet_values TO authenticated;
GRANT ALL ON public.flock_worksheet_values TO service_role;

ALTER TABLE public.flock_worksheet_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's flock worksheet values"
  ON public.flock_worksheet_values FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert flock worksheet values for their company"
  ON public.flock_worksheet_values FOR INSERT
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can update their company's flock worksheet values"
  ON public.flock_worksheet_values FOR UPDATE
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can delete their company's flock worksheet values"
  ON public.flock_worksheet_values FOR DELETE
  USING (company_id = public.get_user_company(auth.uid()));

CREATE OR REPLACE FUNCTION public.tg_flock_worksheet_values_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_flock_worksheet_values_touch_updated_at
BEFORE UPDATE ON public.flock_worksheet_values
FOR EACH ROW EXECUTE FUNCTION public.tg_flock_worksheet_values_touch_updated_at();

CREATE INDEX idx_flock_worksheet_values_flock_week
  ON public.flock_worksheet_values (flock_id, set_date_week_start, worksheet_type);

CREATE INDEX idx_flock_worksheet_values_company
  ON public.flock_worksheet_values (company_id);
