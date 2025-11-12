-- First, remove duplicate fertility_analysis records, keeping only the most recent one per batch
WITH ranked_records AS (
  SELECT id,
         batch_id,
         ROW_NUMBER() OVER (PARTITION BY batch_id ORDER BY created_at DESC, id DESC) as rn
  FROM fertility_analysis
)
DELETE FROM fertility_analysis
WHERE id IN (
  SELECT id FROM ranked_records WHERE rn > 1
);

-- Now add UNIQUE constraint on batch_id in fertility_analysis table
-- This ensures only one fertility analysis per batch and enables upsert operations
ALTER TABLE public.fertility_analysis
ADD CONSTRAINT fertility_analysis_batch_id_key UNIQUE (batch_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_fertility_analysis_batch_id 
ON public.fertility_analysis(batch_id);