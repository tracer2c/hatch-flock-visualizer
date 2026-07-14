
-- ============ flock_weekly_egg_pack ============
CREATE TABLE public.flock_weekly_egg_pack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  sample_size integer NOT NULL DEFAULT 648,
  grade_a integer NOT NULL DEFAULT 0,
  grade_b integer NOT NULL DEFAULT 0,
  grade_c integer NOT NULL DEFAULT 0,
  cracked integer NOT NULL DEFAULT 0,
  dirty integer NOT NULL DEFAULT 0,
  small integer NOT NULL DEFAULT 0,
  large integer NOT NULL DEFAULT 0,
  weight_avg numeric,
  shell_thickness_avg numeric,
  inspector_name text,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, flock_id, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flock_weekly_egg_pack TO authenticated;
GRANT ALL ON public.flock_weekly_egg_pack TO service_role;
ALTER TABLE public.flock_weekly_egg_pack ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flock_weekly_egg_pack_select" ON public.flock_weekly_egg_pack
  FOR SELECT TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_egg_pack_insert" ON public.flock_weekly_egg_pack
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_egg_pack_update" ON public.flock_weekly_egg_pack
  FOR UPDATE TO authenticated USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_egg_pack_delete" ON public.flock_weekly_egg_pack
  FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE TRIGGER trg_flock_weekly_egg_pack_touch
  BEFORE UPDATE ON public.flock_weekly_egg_pack
  FOR EACH ROW EXECUTE FUNCTION public.tg_flock_weekly_clears_set_updated_at();

-- ============ flock_weekly_fertility ============
CREATE TABLE public.flock_weekly_fertility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  sample_size integer NOT NULL DEFAULT 648,
  fertile_eggs integer NOT NULL DEFAULT 0,
  infertile_eggs integer NOT NULL DEFAULT 0,
  early_dead integer,
  late_dead integer,
  fertility_percent numeric,
  hatch_percent numeric,
  hof_percent numeric,
  hoi_percent numeric,
  if_dev_percent numeric,
  technician_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, flock_id, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flock_weekly_fertility TO authenticated;
GRANT ALL ON public.flock_weekly_fertility TO service_role;
ALTER TABLE public.flock_weekly_fertility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flock_weekly_fertility_select" ON public.flock_weekly_fertility
  FOR SELECT TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_fertility_insert" ON public.flock_weekly_fertility
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_fertility_update" ON public.flock_weekly_fertility
  FOR UPDATE TO authenticated USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_fertility_delete" ON public.flock_weekly_fertility
  FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE TRIGGER trg_flock_weekly_fertility_touch
  BEFORE UPDATE ON public.flock_weekly_fertility
  FOR EACH ROW EXECUTE FUNCTION public.tg_flock_weekly_clears_set_updated_at();

-- ============ flock_weekly_residue ============
CREATE TABLE public.flock_weekly_residue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  flock_id uuid NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  sample_size integer DEFAULT 648,
  fertile_eggs integer DEFAULT 0,
  infertile_eggs integer,
  early_dead integer DEFAULT 0,
  mid_dead integer NOT NULL DEFAULT 0,
  late_dead integer DEFAULT 0,
  live_pip_number integer DEFAULT 0,
  dead_pip_number integer DEFAULT 0,
  pip_number integer NOT NULL DEFAULT 0,
  malformed_chicks integer NOT NULL DEFAULT 0,
  contaminated_eggs integer NOT NULL DEFAULT 0,
  handling_cracks integer,
  transfer_crack integer,
  mold integer,
  abnormal integer,
  brain_defects integer,
  dry_egg integer,
  upside_down integer,
  malpositioned integer,
  cull_chicks integer DEFAULT 0,
  total_residue_count integer NOT NULL DEFAULT 0,
  hatch_percent numeric DEFAULT 0,
  hof_percent numeric DEFAULT 0,
  hoi_percent numeric DEFAULT 0,
  if_dev_percent numeric DEFAULT 0,
  lab_technician text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, flock_id, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flock_weekly_residue TO authenticated;
GRANT ALL ON public.flock_weekly_residue TO service_role;
ALTER TABLE public.flock_weekly_residue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flock_weekly_residue_select" ON public.flock_weekly_residue
  FOR SELECT TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_residue_insert" ON public.flock_weekly_residue
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_residue_update" ON public.flock_weekly_residue
  FOR UPDATE TO authenticated USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "flock_weekly_residue_delete" ON public.flock_weekly_residue
  FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE TRIGGER trg_flock_weekly_residue_touch
  BEFORE UPDATE ON public.flock_weekly_residue
  FOR EACH ROW EXECUTE FUNCTION public.tg_flock_weekly_clears_set_updated_at();
