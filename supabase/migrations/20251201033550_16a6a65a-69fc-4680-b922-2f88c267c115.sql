-- Phase 1: House-Machine Allocations Schema

-- 1.1 Create house_machine_allocations table for split allocations
CREATE TABLE public.house_machine_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id),
  eggs_allocated INTEGER NOT NULL CHECK (eggs_allocated > 0),
  allocation_date DATE NOT NULL,
  allocation_time TIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'completed')),
  notes TEXT,
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.house_machine_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policy for company isolation
CREATE POLICY "Company users can access their allocations"
  ON public.house_machine_allocations FOR ALL
  USING (company_id = get_user_company(auth.uid()));

-- Performance indexes
CREATE INDEX idx_allocations_batch ON public.house_machine_allocations(batch_id);
CREATE INDEX idx_allocations_machine ON public.house_machine_allocations(machine_id);
CREATE INDEX idx_allocations_date ON public.house_machine_allocations(allocation_date);
CREATE INDEX idx_allocations_status ON public.house_machine_allocations(status);
CREATE INDEX idx_allocations_company ON public.house_machine_allocations(company_id);

-- 1.2 Make batches.machine_id nullable (houses can exist without single primary machine)
ALTER TABLE public.batches ALTER COLUMN machine_id DROP NOT NULL;

-- 1.3 Add allocation_id to multi_setter_sets for position-level allocation linkage
ALTER TABLE public.multi_setter_sets ADD COLUMN allocation_id UUID REFERENCES public.house_machine_allocations(id);
CREATE INDEX idx_multi_setter_sets_allocation ON public.multi_setter_sets(allocation_id);

-- 1.4 Add allocation_id to machine_transfers for transfer tracking per allocation
ALTER TABLE public.machine_transfers ADD COLUMN allocation_id UUID REFERENCES public.house_machine_allocations(id);
CREATE INDEX idx_machine_transfers_allocation ON public.machine_transfers(allocation_id);