-- Fix HOI% calculation for all training data using correct formula
-- HOI% = (chicks_hatched / eggs_injected) × 100
-- eggs_injected = fertile_eggs in this context

WITH corrected_hoi AS (
  SELECT 
    ra.id,
    ROUND((
      (ra.sample_size - ra.infertile_eggs - ra.early_dead - ra.mid_dead - 
       ra.late_dead - ra.cull_chicks - ra.live_pip_number - ra.dead_pip_number)::numeric 
      / NULLIF(ra.fertile_eggs, 0)
    ) * 100, 2) AS correct_hoi_percent
  FROM residue_analysis ra
  JOIN batches b ON b.id = ra.batch_id
  WHERE b.data_type = 'dummy'
    AND ra.fertile_eggs > 0
)
UPDATE residue_analysis
SET hoi_percent = corrected_hoi.correct_hoi_percent
FROM corrected_hoi
WHERE residue_analysis.id = corrected_hoi.id;