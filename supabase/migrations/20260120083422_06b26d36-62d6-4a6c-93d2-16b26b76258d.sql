-- Add company_id column to qa_monitoring
ALTER TABLE public.qa_monitoring 
ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Backfill company_id from batches or machines
UPDATE public.qa_monitoring qm
SET company_id = COALESCE(
  (SELECT b.company_id FROM public.batches b WHERE b.id = qm.batch_id),
  (SELECT m.company_id FROM public.machines m WHERE m.id = qm.machine_id),
  '00000000-0000-0000-0000-000000000001'  -- Default company as fallback
);

-- Make company_id NOT NULL after backfill
ALTER TABLE public.qa_monitoring 
ALTER COLUMN company_id SET NOT NULL;

-- Set default for future inserts
ALTER TABLE public.qa_monitoring 
ALTER COLUMN company_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Add index for performance
CREATE INDEX idx_qa_monitoring_company_id ON public.qa_monitoring(company_id);

-- Drop the permissive policy
DROP POLICY IF EXISTS "Allow all operations on qa_monitoring" ON public.qa_monitoring;

-- Create company-based RLS policy for SELECT
CREATE POLICY "Company users can view their qa_monitoring"
ON public.qa_monitoring
FOR SELECT
USING (company_id = public.get_user_company(auth.uid()));

-- Create company-based RLS policy for INSERT
CREATE POLICY "Company users can insert their qa_monitoring"
ON public.qa_monitoring
FOR INSERT
WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- Create company-based RLS policy for UPDATE
CREATE POLICY "Company users can update their qa_monitoring"
ON public.qa_monitoring
FOR UPDATE
USING (company_id = public.get_user_company(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- Create company-based RLS policy for DELETE
CREATE POLICY "Company users can delete their qa_monitoring"
ON public.qa_monitoring
FOR DELETE
USING (company_id = public.get_user_company(auth.uid()));