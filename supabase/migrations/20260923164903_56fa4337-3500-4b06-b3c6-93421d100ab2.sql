CREATE TABLE public.flock_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flock_id, unit_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flock_units TO authenticated;
GRANT ALL ON public.flock_units TO service_role;
ALTER TABLE public.flock_units ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_flock_units_unit ON public.flock_units(unit_id);
CREATE INDEX idx_flock_units_flock ON public.flock_units(flock_id);

CREATE POLICY "Company members can view flock hatcheries" ON public.flock_units
  FOR SELECT TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "Admins and ops can add flock hatcheries" ON public.flock_units
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid())
    AND (public.has_role(auth.uid(),'company_admin') OR public.has_role(auth.uid(),'operations_head')));
CREATE POLICY "Admins and ops can remove flock hatcheries" ON public.flock_units
  FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid())
    AND (public.has_role(auth.uid(),'company_admin') OR public.has_role(auth.uid(),'operations_head')));

INSERT INTO public.flock_units (flock_id, unit_id, company_id)
SELECT id, unit_id, company_id FROM public.flocks WHERE unit_id IS NOT NULL
ON CONFLICT DO NOTHING;