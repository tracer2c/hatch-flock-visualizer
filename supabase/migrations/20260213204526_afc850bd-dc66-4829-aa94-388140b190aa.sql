
-- Create role_permissions table for dynamic feature access control
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  role public.user_role NOT NULL,
  has_access boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, feature_key, role)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- All company users can read their company's permissions
CREATE POLICY "Company users can view their permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Only company_admin can insert/update/delete
CREATE POLICY "Company admins can manage permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'::user_role))
WITH CHECK (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'::user_role));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_role_permissions_timestamp
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_role_permissions_updated_at();

-- Seed default permissions for all existing companies
-- Define the feature keys and their default access per role
INSERT INTO public.role_permissions (company_id, feature_key, role, has_access)
SELECT c.id, f.feature_key, f.role, f.has_access
FROM public.companies c
CROSS JOIN (VALUES
  -- Staff defaults
  ('dashboard', 'staff'::user_role, true),
  ('data_entry', 'staff'::user_role, true),
  ('qa_hub', 'staff'::user_role, true),
  ('embrex_data_sheet', 'staff'::user_role, true),
  ('embrex_timeline', 'staff'::user_role, true),
  ('checklist', 'staff'::user_role, true),
  ('chat', 'staff'::user_role, true),
  ('performance', 'staff'::user_role, true),
  ('process_flow', 'staff'::user_role, true),
  ('analytics', 'staff'::user_role, true),
  ('live_tracking', 'staff'::user_role, true),
  ('machine_utilization', 'staff'::user_role, true),
  ('residue_breakout', 'staff'::user_role, true),
  ('house_flow', 'staff'::user_role, true),
  ('bulk_import', 'staff'::user_role, true),
  ('report', 'staff'::user_role, true),
  ('management', 'staff'::user_role, false),
  ('sop_dashboard', 'staff'::user_role, true),
  ('sop_manager', 'staff'::user_role, true),
  ('residue_schedule', 'staff'::user_role, true),
  ('flocks_management', 'staff'::user_role, false),
  ('machines_management', 'staff'::user_role, false),
  ('user_management', 'staff'::user_role, false),
  ('targets', 'staff'::user_role, false),
  ('hatcheries', 'staff'::user_role, false),
  ('house_automation', 'staff'::user_role, false),
  ('reports', 'staff'::user_role, false),
  ('activity_log', 'staff'::user_role, false),
  -- Operations Head defaults
  ('dashboard', 'operations_head'::user_role, true),
  ('data_entry', 'operations_head'::user_role, true),
  ('qa_hub', 'operations_head'::user_role, true),
  ('embrex_data_sheet', 'operations_head'::user_role, true),
  ('embrex_timeline', 'operations_head'::user_role, true),
  ('checklist', 'operations_head'::user_role, true),
  ('chat', 'operations_head'::user_role, true),
  ('performance', 'operations_head'::user_role, true),
  ('process_flow', 'operations_head'::user_role, true),
  ('analytics', 'operations_head'::user_role, true),
  ('live_tracking', 'operations_head'::user_role, true),
  ('machine_utilization', 'operations_head'::user_role, true),
  ('residue_breakout', 'operations_head'::user_role, true),
  ('house_flow', 'operations_head'::user_role, true),
  ('bulk_import', 'operations_head'::user_role, true),
  ('report', 'operations_head'::user_role, true),
  ('management', 'operations_head'::user_role, true),
  ('sop_dashboard', 'operations_head'::user_role, true),
  ('sop_manager', 'operations_head'::user_role, true),
  ('residue_schedule', 'operations_head'::user_role, true),
  ('flocks_management', 'operations_head'::user_role, true),
  ('machines_management', 'operations_head'::user_role, true),
  ('user_management', 'operations_head'::user_role, false),
  ('targets', 'operations_head'::user_role, false),
  ('hatcheries', 'operations_head'::user_role, false),
  ('house_automation', 'operations_head'::user_role, false),
  ('reports', 'operations_head'::user_role, true),
  ('activity_log', 'operations_head'::user_role, true)
) AS f(feature_key, role, has_access)
ON CONFLICT DO NOTHING;

-- Function to auto-seed permissions for new companies
CREATE OR REPLACE FUNCTION public.seed_role_permissions_for_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.role_permissions (company_id, feature_key, role, has_access)
  VALUES
    (NEW.id, 'dashboard', 'staff', true),
    (NEW.id, 'data_entry', 'staff', true),
    (NEW.id, 'qa_hub', 'staff', true),
    (NEW.id, 'embrex_data_sheet', 'staff', true),
    (NEW.id, 'embrex_timeline', 'staff', true),
    (NEW.id, 'checklist', 'staff', true),
    (NEW.id, 'chat', 'staff', true),
    (NEW.id, 'performance', 'staff', true),
    (NEW.id, 'process_flow', 'staff', true),
    (NEW.id, 'analytics', 'staff', true),
    (NEW.id, 'live_tracking', 'staff', true),
    (NEW.id, 'machine_utilization', 'staff', true),
    (NEW.id, 'residue_breakout', 'staff', true),
    (NEW.id, 'house_flow', 'staff', true),
    (NEW.id, 'bulk_import', 'staff', true),
    (NEW.id, 'report', 'staff', true),
    (NEW.id, 'management', 'staff', false),
    (NEW.id, 'sop_dashboard', 'staff', true),
    (NEW.id, 'sop_manager', 'staff', true),
    (NEW.id, 'residue_schedule', 'staff', true),
    (NEW.id, 'flocks_management', 'staff', false),
    (NEW.id, 'machines_management', 'staff', false),
    (NEW.id, 'user_management', 'staff', false),
    (NEW.id, 'targets', 'staff', false),
    (NEW.id, 'hatcheries', 'staff', false),
    (NEW.id, 'house_automation', 'staff', false),
    (NEW.id, 'reports', 'staff', false),
    (NEW.id, 'activity_log', 'staff', false),
    (NEW.id, 'dashboard', 'operations_head', true),
    (NEW.id, 'data_entry', 'operations_head', true),
    (NEW.id, 'qa_hub', 'operations_head', true),
    (NEW.id, 'embrex_data_sheet', 'operations_head', true),
    (NEW.id, 'embrex_timeline', 'operations_head', true),
    (NEW.id, 'checklist', 'operations_head', true),
    (NEW.id, 'chat', 'operations_head', true),
    (NEW.id, 'performance', 'operations_head', true),
    (NEW.id, 'process_flow', 'operations_head', true),
    (NEW.id, 'analytics', 'operations_head', true),
    (NEW.id, 'live_tracking', 'operations_head', true),
    (NEW.id, 'machine_utilization', 'operations_head', true),
    (NEW.id, 'residue_breakout', 'operations_head', true),
    (NEW.id, 'house_flow', 'operations_head', true),
    (NEW.id, 'bulk_import', 'operations_head', true),
    (NEW.id, 'report', 'operations_head', true),
    (NEW.id, 'management', 'operations_head', true),
    (NEW.id, 'sop_dashboard', 'operations_head', true),
    (NEW.id, 'sop_manager', 'operations_head', true),
    (NEW.id, 'residue_schedule', 'operations_head', true),
    (NEW.id, 'flocks_management', 'operations_head', true),
    (NEW.id, 'machines_management', 'operations_head', true),
    (NEW.id, 'user_management', 'operations_head', false),
    (NEW.id, 'targets', 'operations_head', false),
    (NEW.id, 'hatcheries', 'operations_head', false),
    (NEW.id, 'house_automation', 'operations_head', false),
    (NEW.id, 'reports', 'operations_head', true),
    (NEW.id, 'activity_log', 'operations_head', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_permissions_on_company_insert
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.seed_role_permissions_for_company();
