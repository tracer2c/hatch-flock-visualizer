-- Fix HOI% calculation for training data in residue_analysis
-- HOI% should use eggs_injected, not fertile_eggs

UPDATE residue_analysis ra
SET hoi_percent = ROUND((
  (ra.sample_size - ra.infertile_eggs - COALESCE(ra.early_dead, 0) - ra.mid_dead - COALESCE(ra.late_dead, 0) - COALESCE(ra.cull_chicks, 0) - COALESCE(ra.live_pip_number, 0) - COALESCE(ra.dead_pip_number, 0))::numeric 
  / NULLIF(b.eggs_injected, 0)
) * 100, 2)
FROM batches b
WHERE ra.batch_id = b.id
AND b.data_type = 'dummy'
AND b.eggs_injected > 0;