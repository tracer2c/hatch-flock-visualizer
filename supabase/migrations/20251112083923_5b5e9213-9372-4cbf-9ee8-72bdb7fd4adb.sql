-- Generate training data with database-compliant value ranges
-- Phase 1: Fertility Analysis
WITH training_batches_no_fertility AS (
  SELECT b.id as batch_id, b.set_date, b.expected_hatch_date
  FROM batches b
  WHERE b.data_type = 'dummy'
    AND NOT EXISTS (SELECT 1 FROM fertility_analysis fa WHERE fa.batch_id = b.id)
),
fertility_data AS (
  SELECT
    batch_id,
    (set_date + (7 + floor(random() * 4))::int) AS analysis_date,
    648 AS sample_size,
    (30 + floor(random() * 71))::int AS infertile_eggs,
    (ARRAY['John Smith', 'Maria Garcia', 'David Lee', 'Sarah Johnson', 'Mike Chen'])[floor(random() * 5 + 1)::int] AS technician_name,
    CASE WHEN random() < 0.2 THEN (ARRAY['Good fertility observed', 'Normal candling results', 'Slight variations noted', 'Standard analysis'])[floor(random() * 4 + 1)::int] ELSE NULL END AS notes
  FROM training_batches_no_fertility
)
INSERT INTO fertility_analysis (batch_id, analysis_date, sample_size, infertile_eggs, fertile_eggs, hatch_percent, hof_percent, hoi_percent, if_dev_percent, technician_name, notes, created_at)
SELECT batch_id, analysis_date, sample_size, infertile_eggs, (sample_size - infertile_eggs), 0, 0, 0, ROUND((infertile_eggs::numeric / sample_size) * 100, 2), technician_name, notes, NOW()
FROM fertility_data;

-- Phase 2: Residue Analysis
WITH training_batches_no_residue AS (
  SELECT fa.batch_id, fa.sample_size, fa.infertile_eggs, fa.fertile_eggs, b.expected_hatch_date
  FROM fertility_analysis fa
  JOIN batches b ON b.id = fa.batch_id
  WHERE b.data_type = 'dummy' AND NOT EXISTS (SELECT 1 FROM residue_analysis ra WHERE ra.batch_id = b.id)
),
residue_data AS (
  SELECT batch_id, expected_hatch_date AS analysis_date, sample_size, infertile_eggs, fertile_eggs,
    (10 + floor(random() * 16))::int AS early_dead, (8 + floor(random() * 13))::int AS mid_dead, (15 + floor(random() * 16))::int AS late_dead,
    (5 + floor(random() * 11))::int AS cull_chicks, (2 + floor(random() * 7))::int AS live_pip_number, (3 + floor(random() * 8))::int AS dead_pip_number,
    (1 + floor(random() * 5))::int AS malformed_chicks, (1 + floor(random() * 3))::int AS contaminated_eggs, (2 + floor(random() * 5))::int AS handling_cracks,
    floor(random() * 3)::int AS mold, (1 + floor(random() * 4))::int AS abnormal,
    (ARRAY['Dr. Wilson', 'Dr. Martinez', 'Lab Tech Sarah', 'Dr. Anderson', 'Lab Tech James'])[floor(random() * 5 + 1)::int] AS lab_technician,
    CASE WHEN random() < 0.25 THEN (ARRAY['Complete residue analysis', 'Standard mortality observed', 'Detailed examination completed'])[floor(random() * 3 + 1)::int] ELSE NULL END AS notes
  FROM training_batches_no_residue
),
residue_calculated AS (
  SELECT *, (sample_size - infertile_eggs - early_dead - mid_dead - late_dead - cull_chicks - live_pip_number - dead_pip_number) AS chicks_hatched,
    (live_pip_number + dead_pip_number) AS pip_number
  FROM residue_data
)
INSERT INTO residue_analysis (batch_id, analysis_date, sample_size, infertile_eggs, fertile_eggs, early_dead, mid_dead, late_dead, cull_chicks, live_pip_number, dead_pip_number, pip_number, malformed_chicks, contaminated_eggs, handling_cracks, mold, abnormal, total_residue_count, hatch_percent, hof_percent, hoi_percent, if_dev_percent, residue_percent, lab_technician, notes, created_at)
SELECT batch_id, analysis_date, sample_size, infertile_eggs, fertile_eggs, early_dead, mid_dead, late_dead, cull_chicks, live_pip_number, dead_pip_number, pip_number, malformed_chicks, contaminated_eggs, handling_cracks, mold, abnormal,
  (infertile_eggs + early_dead + mid_dead + late_dead + cull_chicks + live_pip_number + dead_pip_number),
  ROUND((chicks_hatched::numeric / sample_size) * 100, 2), ROUND((chicks_hatched::numeric / NULLIF(fertile_eggs, 0)) * 100, 2),
  ROUND((chicks_hatched::numeric / NULLIF(fertile_eggs, 0)) * 100, 2), ROUND((infertile_eggs::numeric / sample_size) * 100, 2),
  ROUND(((sample_size - chicks_hatched)::numeric / sample_size) * 100, 2), lab_technician, notes, NOW()
FROM residue_calculated;

-- Phase 3: Egg Pack Quality
WITH training_batches_no_egg_pack AS (SELECT b.id as batch_id, b.set_date FROM batches b WHERE b.data_type = 'dummy' AND NOT EXISTS (SELECT 1 FROM egg_pack_quality epq WHERE epq.batch_id = b.id)),
egg_pack_data AS (
  SELECT batch_id, (set_date - 1) AS inspection_date, 100 AS sample_size,
    (75 + floor(random() * 11))::int AS grade_a, (8 + floor(random() * 8))::int AS grade_b, (2 + floor(random() * 4))::int AS grade_c,
    (1 + floor(random() * 4))::int AS cracked, (2 + floor(random() * 5))::int AS dirty, (5 + floor(random() * 8))::int AS large, (3 + floor(random() * 6))::int AS small,
    ROUND((58 + random() * 10)::numeric, 2) AS weight_avg, ROUND((0.32 + random() * 0.06)::numeric, 2) AS shell_thickness_avg,
    (ARRAY['Inspector Rodriguez', 'Inspector Kim', 'Quality Control Jane', 'Inspector Thompson', 'QC Manager Alex'])[floor(random() * 5 + 1)::int] AS inspector_name,
    CASE WHEN random() < 0.15 THEN (ARRAY['Quality standards met', 'Excellent egg quality', 'Standard inspection'])[floor(random() * 3 + 1)::int] ELSE NULL END AS notes
  FROM training_batches_no_egg_pack
)
INSERT INTO egg_pack_quality (batch_id, inspection_date, sample_size, grade_a, grade_b, grade_c, cracked, dirty, large, small, weight_avg, shell_thickness_avg, inspector_name, notes, created_at)
SELECT batch_id, inspection_date, sample_size, grade_a, grade_b, grade_c, cracked, dirty, large, small, weight_avg, shell_thickness_avg, inspector_name, notes, NOW()
FROM egg_pack_data;

-- Phase 4: QA Monitoring - use 98-99°F temperature range to stay under 99.99
WITH training_batches AS (SELECT b.id as batch_id, b.set_date FROM batches b WHERE b.data_type = 'dummy'),
qa_data AS (
  SELECT batch_id, (set_date + (10 + floor(random() * 3))::int) AS check_date, ('08:00:00'::time + (random() * interval '8 hours'))::time AS check_time,
    (10 + floor(random() * 3))::int AS day_of_incubation,
    ROUND((98 + random() * 1.5)::numeric, 1) AS temperature, ROUND((53 + random() * 5)::numeric, 1) AS humidity, 24 AS turning_frequency,
    ROUND((0.3 + random() * 0.2)::numeric, 2) AS co2_level, ROUND((25 + random() * 10)::numeric, 1) AS ventilation_rate, floor(random() * 3)::int AS mortality_count,
    ROUND((43 + random() * 4)::numeric, 1) AS angle_top_left, ROUND((43 + random() * 4)::numeric, 1) AS angle_top_right,
    ROUND((43 + random() * 4)::numeric, 1) AS angle_mid_left, ROUND((43 + random() * 4)::numeric, 1) AS angle_mid_right,
    ROUND((43 + random() * 4)::numeric, 1) AS angle_bottom_left, ROUND((43 + random() * 4)::numeric, 1) AS angle_bottom_right,
    CASE WHEN random() < 0.1 THEN (ARRAY['Clear development visible', 'Normal embryo growth', 'Good blood vessel formation'])[floor(random() * 3 + 1)::int] ELSE NULL END AS candling_results,
    (ARRAY['Inspector Harris', 'QA Tech Maria', 'Inspector Brown', 'QA Manager Lisa', 'Tech Supervisor Mark'])[floor(random() * 5 + 1)::int] AS inspector_name,
    CASE WHEN random() < 0.2 THEN (ARRAY['All parameters normal', 'Standard monitoring', 'Equipment functioning well'])[floor(random() * 3 + 1)::int] ELSE NULL END AS notes
  FROM training_batches
)
INSERT INTO qa_monitoring (batch_id, check_date, check_time, day_of_incubation, temperature, humidity, turning_frequency, co2_level, ventilation_rate, mortality_count, angle_top_left, angle_top_right, angle_mid_left, angle_mid_right, angle_bottom_left, angle_bottom_right, candling_results, inspector_name, notes, created_at)
SELECT batch_id, check_date, check_time, day_of_incubation, temperature, humidity, turning_frequency, co2_level, ventilation_rate, mortality_count, angle_top_left, angle_top_right, angle_mid_left, angle_mid_right, angle_bottom_left, angle_bottom_right, candling_results, inspector_name, notes, NOW()
FROM qa_data;

-- Phase 5: Update batches with HOI/Clears data
WITH batch_updates AS (
  SELECT b.id as batch_id, fa.infertile_eggs as eggs_cleared, fa.fertile_eggs as eggs_injected,
    GREATEST(0, 648 - COALESCE(ra.infertile_eggs, 0) - COALESCE(ra.early_dead, 0) - COALESCE(ra.mid_dead, 0) - COALESCE(ra.late_dead, 0) - COALESCE(ra.cull_chicks, 0) - COALESCE(ra.live_pip_number, 0) - COALESCE(ra.dead_pip_number, 0)) as chicks_hatched,
    fa.technician_name as clears_technician_name, ra.lab_technician as hoi_technician_name,
    CASE WHEN random() < 0.15 THEN (ARRAY['Clears recorded accurately', 'Standard clearing process'])[floor(random() * 2 + 1)::int] ELSE NULL END AS clears_notes,
    CASE WHEN random() < 0.15 THEN (ARRAY['Hatch recorded successfully', 'Standard hatch completion'])[floor(random() * 2 + 1)::int] ELSE NULL END AS hoi_notes
  FROM batches b
  JOIN fertility_analysis fa ON fa.batch_id = b.id
  LEFT JOIN residue_analysis ra ON ra.batch_id = b.id
  WHERE b.data_type = 'dummy'
)
UPDATE batches SET eggs_cleared = bu.eggs_cleared, eggs_injected = bu.eggs_injected, chicks_hatched = bu.chicks_hatched,
  clears_technician_name = bu.clears_technician_name, hoi_technician_name = bu.hoi_technician_name,
  clears_notes = bu.clears_notes, hoi_notes = bu.hoi_notes, updated_at = NOW()
FROM batch_updates bu WHERE batches.id = bu.batch_id;