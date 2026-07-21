ALTER TABLE public.qa_monitoring
DROP CONSTRAINT IF EXISTS valid_entry_mode;

ALTER TABLE public.qa_monitoring
ADD CONSTRAINT valid_entry_mode
CHECK (entry_mode = ANY (ARRAY['house'::text, 'machine'::text, 'room'::text]));