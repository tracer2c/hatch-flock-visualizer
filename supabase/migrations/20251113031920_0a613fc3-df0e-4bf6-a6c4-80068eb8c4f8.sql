-- Increase precision for temperature fields to accommodate values above 100°F
-- Change from NUMERIC(4,2) to NUMERIC(5,2) to allow values up to 999.99

ALTER TABLE public.qa_monitoring 
ALTER COLUMN temperature TYPE NUMERIC(5,2);

-- Also update humidity field to be consistent (humidity can exceed 100% in some cases)
ALTER TABLE public.qa_monitoring 
ALTER COLUMN humidity TYPE NUMERIC(5,2);

-- Update angle fields which might also need higher precision
ALTER TABLE public.qa_monitoring 
ALTER COLUMN angle_top_left TYPE NUMERIC(5,2);

ALTER TABLE public.qa_monitoring 
ALTER COLUMN angle_mid_left TYPE NUMERIC(5,2);

ALTER TABLE public.qa_monitoring 
ALTER COLUMN angle_bottom_left TYPE NUMERIC(5,2);

ALTER TABLE public.qa_monitoring 
ALTER COLUMN angle_top_right TYPE NUMERIC(5,2);

ALTER TABLE public.qa_monitoring 
ALTER COLUMN angle_mid_right TYPE NUMERIC(5,2);

ALTER TABLE public.qa_monitoring 
ALTER COLUMN angle_bottom_right TYPE NUMERIC(5,2);

-- Update other numeric fields that might exceed 99.99
ALTER TABLE public.qa_monitoring 
ALTER COLUMN co2_level TYPE NUMERIC(6,2);

ALTER TABLE public.qa_monitoring 
ALTER COLUMN ventilation_rate TYPE NUMERIC(6,2);

-- Add comment explaining the change
COMMENT ON COLUMN public.qa_monitoring.temperature IS 'Temperature in Fahrenheit, NUMERIC(5,2) to support values above 100°F';