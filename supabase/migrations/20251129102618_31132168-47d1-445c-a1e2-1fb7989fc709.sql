-- Create machine_transfers table for tracking setter → hatcher transfers
CREATE TABLE IF NOT EXISTS public.machine_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  from_machine_id UUID NOT NULL REFERENCES public.machines(id),
  to_machine_id UUID NOT NULL REFERENCES public.machines(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_time TIME WITHOUT TIME ZONE,
  days_in_previous_machine INTEGER,
  transferred_by UUID,
  notes TEXT,
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_machine_transfers_batch_id ON public.machine_transfers(batch_id);
CREATE INDEX idx_machine_transfers_from_machine ON public.machine_transfers(from_machine_id);
CREATE INDEX idx_machine_transfers_to_machine ON public.machine_transfers(to_machine_id);
CREATE INDEX idx_machine_transfers_date ON public.machine_transfers(transfer_date);
CREATE INDEX idx_machine_transfers_company_id ON public.machine_transfers(company_id);

-- Enable RLS
ALTER TABLE public.machine_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Company users can access their transfers
CREATE POLICY "Company users can access their transfers" ON public.machine_transfers
  FOR ALL USING (company_id = get_user_company(auth.uid()));