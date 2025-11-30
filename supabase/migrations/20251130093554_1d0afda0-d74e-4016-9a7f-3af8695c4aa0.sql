-- Add linkage_type column to qa_position_linkage table
-- Values: 'position' (for temps) or 'machine_wide' (for angles/humidity)
ALTER TABLE public.qa_position_linkage 
ADD COLUMN linkage_type TEXT NOT NULL DEFAULT 'position';

-- Add index for efficient filtering
CREATE INDEX idx_qa_position_linkage_type ON public.qa_position_linkage(linkage_type);