-- Add set_time column to batches table to track the time when eggs were set
ALTER TABLE public.batches
ADD COLUMN set_time TIME;

-- Set a default time (9:00 AM) for existing records
UPDATE public.batches
SET set_time = '09:00:00'
WHERE set_time IS NULL;