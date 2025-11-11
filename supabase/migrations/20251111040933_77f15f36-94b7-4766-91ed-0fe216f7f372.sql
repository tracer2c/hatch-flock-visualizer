-- Create batch_status_automation_rules table
CREATE TABLE IF NOT EXISTS public.batch_status_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  rule_name TEXT NOT NULL,
  from_status batch_status NOT NULL,
  to_status batch_status NOT NULL,
  min_days_after_set INTEGER NOT NULL DEFAULT 0,
  requires_fertility_data BOOLEAN NOT NULL DEFAULT false,
  requires_residue_data BOOLEAN NOT NULL DEFAULT false,
  requires_qa_data BOOLEAN NOT NULL DEFAULT false,
  min_qa_checks_required INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batch_status_history table
CREATE TABLE IF NOT EXISTS public.batch_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  from_status batch_status NOT NULL,
  to_status batch_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('manual', 'automatic')),
  rule_applied TEXT,
  days_since_set INTEGER,
  data_validation_passed BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_status_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for batch_status_automation_rules
CREATE POLICY "Company users can view their automation rules"
  ON public.batch_status_automation_rules
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company admins can manage their automation rules"
  ON public.batch_status_automation_rules
  FOR ALL
  USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'::user_role));

-- RLS policies for batch_status_history
CREATE POLICY "Company users can view their batch history"
  ON public.batch_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.batches
      WHERE batches.id = batch_status_history.batch_id
      AND batches.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "System can insert batch history"
  ON public.batch_status_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.batches
      WHERE batches.id = batch_status_history.batch_id
      AND batches.company_id = get_user_company(auth.uid())
    )
  );

-- Insert default automation rules for the default company
INSERT INTO public.batch_status_automation_rules (
  company_id,
  rule_name,
  from_status,
  to_status,
  min_days_after_set,
  requires_fertility_data,
  requires_residue_data,
  requires_qa_data,
  min_qa_checks_required
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Start Incubation',
    'setting',
    'incubating',
    1,
    false,
    false,
    false,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Start Hatching',
    'incubating',
    'hatching',
    18,
    false,
    false,
    false,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Complete Batch',
    'hatching',
    'completed',
    21,
    true,
    true,
    false,
    0
  )
ON CONFLICT DO NOTHING;