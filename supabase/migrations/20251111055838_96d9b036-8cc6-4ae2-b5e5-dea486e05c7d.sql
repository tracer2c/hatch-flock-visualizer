-- Add technician_name and created_by to flocks table
ALTER TABLE public.flocks 
ADD COLUMN IF NOT EXISTS technician_name TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);