-- Add machine_id column to qa_monitoring
ALTER TABLE public.qa_monitoring ADD COLUMN machine_id UUID REFERENCES public.machines(id);

-- Backfill existing records by joining batch → machine
UPDATE public.qa_monitoring qm
SET machine_id = b.machine_id
FROM public.batches b
WHERE qm.batch_id = b.id;

-- Add index for machine-level queries
CREATE INDEX idx_qa_monitoring_machine_id ON public.qa_monitoring(machine_id);