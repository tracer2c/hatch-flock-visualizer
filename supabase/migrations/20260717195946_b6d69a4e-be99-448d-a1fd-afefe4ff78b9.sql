
CREATE TYPE public.room_type AS ENUM ('chick','separator','hatcher','setter','wash','other');

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  name text NOT NULL,
  room_type public.room_type NOT NULL DEFAULT 'other',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_company ON public.rooms(company_id);
CREATE INDEX idx_rooms_unit ON public.rooms(unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_same_company" ON public.rooms
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "rooms_write_admin_ops" ON public.rooms
  FOR ALL TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND (public.has_role(auth.uid(),'company_admin') OR public.has_role(auth.uid(),'operations_head'))
  )
  WITH CHECK (
    company_id = public.get_user_company(auth.uid())
    AND (public.has_role(auth.uid(),'company_admin') OR public.has_role(auth.uid(),'operations_head'))
  );

CREATE OR REPLACE FUNCTION public.tg_rooms_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.tg_rooms_touch_updated_at();
