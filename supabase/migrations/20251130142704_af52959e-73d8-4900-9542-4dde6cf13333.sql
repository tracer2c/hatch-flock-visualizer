-- Add target_type and machine_id columns to daily_checklist_items for enhanced SOP assignments
ALTER TABLE public.daily_checklist_items 
ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'batch' CHECK (target_type IN ('batch', 'machine', 'transfer', 'alert'));

ALTER TABLE public.daily_checklist_items 
ADD COLUMN IF NOT EXISTS machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL;

-- Add index for efficient querying by target_type
CREATE INDEX IF NOT EXISTS idx_daily_checklist_items_target_type ON public.daily_checklist_items(target_type);
CREATE INDEX IF NOT EXISTS idx_daily_checklist_items_machine_id ON public.daily_checklist_items(machine_id);

-- Add comment for documentation
COMMENT ON COLUMN public.daily_checklist_items.target_type IS 'Type of target: batch (house), machine (maintenance), transfer (protocols), alert (notifications)';
COMMENT ON COLUMN public.daily_checklist_items.machine_id IS 'Optional machine reference for machine-specific checklists';