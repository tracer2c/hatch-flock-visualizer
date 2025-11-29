-- Add 18 temperature point columns to qa_monitoring table
-- Zone: Front (A), Middle (B), Back (C)
-- Level: Top, Mid, Bottom
-- Side: Left, Right

-- Front Zone (A) - 6 columns
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_front_top_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_front_top_right numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_front_mid_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_front_mid_right numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_front_bottom_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_front_bottom_right numeric;

-- Middle Zone (B) - 6 columns
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_middle_top_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_middle_top_right numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_middle_mid_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_middle_mid_right numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_middle_bottom_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_middle_bottom_right numeric;

-- Back Zone (C) - 6 columns
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_back_top_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_back_top_right numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_back_mid_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_back_mid_right numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_back_bottom_left numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_back_bottom_right numeric;

-- Calculated average columns
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_avg_overall numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_avg_front numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_avg_middle numeric;
ALTER TABLE public.qa_monitoring ADD COLUMN IF NOT EXISTS temp_avg_back numeric;

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_qa_monitoring_temp_avg_overall ON public.qa_monitoring(temp_avg_overall);
CREATE INDEX IF NOT EXISTS idx_qa_monitoring_temp_avg_front ON public.qa_monitoring(temp_avg_front);
CREATE INDEX IF NOT EXISTS idx_qa_monitoring_temp_avg_middle ON public.qa_monitoring(temp_avg_middle);
CREATE INDEX IF NOT EXISTS idx_qa_monitoring_temp_avg_back ON public.qa_monitoring(temp_avg_back);