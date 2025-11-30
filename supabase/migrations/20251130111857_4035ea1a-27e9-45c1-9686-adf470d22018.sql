-- Part 2: Create batches with proper default values

-- Create 200 batches (houses) distributed across flocks  
INSERT INTO batches (batch_number, flock_id, machine_id, unit_id, set_date, expected_hatch_date, total_eggs_set, status, eggs_cleared, eggs_injected, chicks_hatched)
SELECT 
  f.flock_name || ' #' || house_num::text as batch_number,
  f.id as flock_id,
  m.id as machine_id,
  f.unit_id as unit_id,
  set_dt as set_date,
  set_dt + 21 as expected_hatch_date,
  45000 + (random() * 45000)::int as total_eggs_set,
  batch_status::batch_status as status,
  COALESCE(CASE WHEN batch_status IN ('hatching', 'completed') THEN 30 + (random() * 70)::int ELSE 0 END, 0) as eggs_cleared,
  COALESCE(CASE WHEN batch_status IN ('hatching', 'completed') THEN 550 + (random() * 98)::int ELSE 0 END, 0) as eggs_injected,
  COALESCE(CASE WHEN batch_status = 'completed' THEN 500 + (random() * 100)::int ELSE 0 END, 0) as chicks_hatched
FROM (
  SELECT 
    f.id,
    f.flock_name,
    f.unit_id,
    house_num,
    CURRENT_DATE - (5 + house_num * 7 + (random() * 10)::int)::int as set_dt,
    (ARRAY['incubating', 'incubating', 'hatching', 'completed', 'setting'])[1 + (random() * 4)::int] as batch_status,
    row_number() OVER () as rn
  FROM flocks f
  CROSS JOIN generate_series(1, 4) as house_num
) sub
JOIN flocks f ON f.id = sub.id
CROSS JOIN LATERAL (
  SELECT id FROM machines WHERE unit_id = f.unit_id AND machine_type IN ('setter', 'combo') ORDER BY random() LIMIT 1
) m
WHERE rn <= 200;

-- Create fertility analysis for all batches
INSERT INTO fertility_analysis (batch_id, sample_size, fertile_eggs, infertile_eggs, analysis_date, technician_name)
SELECT 
  b.id as batch_id,
  648 as sample_size,
  570 + (random() * 78)::int as fertile_eggs,
  30 + (random() * 50)::int as infertile_eggs,
  b.set_date + 7 as analysis_date,
  (ARRAY['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Brown', 'David Lee'])[1 + (random() * 4)::int] as technician_name
FROM batches b
ON CONFLICT (batch_id) DO NOTHING;

-- Create residue analysis for all batches
INSERT INTO residue_analysis (batch_id, sample_size, infertile_eggs, early_dead, mid_dead, late_dead, cull_chicks, live_pip_number, dead_pip_number, total_residue_count, hof_percent, hoi_percent, analysis_date, lab_technician)
SELECT 
  b.id as batch_id,
  648 as sample_size,
  30 + (random() * 50)::int as infertile_eggs,
  10 + (random() * 15)::int as early_dead,
  8 + (random() * 12)::int as mid_dead,
  15 + (random() * 15)::int as late_dead,
  5 + (random() * 10)::int as cull_chicks,
  2 + (random() * 6)::int as live_pip_number,
  3 + (random() * 7)::int as dead_pip_number,
  100 + (random() * 50)::int as total_residue_count,
  75 + (random() * 15) as hof_percent,
  72 + (random() * 18) as hoi_percent,
  b.expected_hatch_date as analysis_date,
  (ARRAY['Lab Tech A', 'Lab Tech B', 'Lab Tech C'])[1 + (random() * 2)::int] as lab_technician
FROM batches b
ON CONFLICT (batch_id) DO NOTHING;

-- Create egg pack quality records
INSERT INTO egg_pack_quality (batch_id, sample_size, grade_a, grade_b, grade_c, cracked, dirty, large, small, inspection_date, inspector_name)
SELECT 
  b.id as batch_id,
  100 as sample_size,
  75 + (random() * 10)::int as grade_a,
  8 + (random() * 7)::int as grade_b,
  2 + (random() * 3)::int as grade_c,
  1 + (random() * 3)::int as cracked,
  1 + (random() * 3)::int as dirty,
  5 + (random() * 5)::int as large,
  3 + (random() * 4)::int as small,
  b.set_date - 1 as inspection_date,
  (ARRAY['Inspector A', 'Inspector B', 'Inspector C'])[1 + (random() * 2)::int] as inspector_name
FROM batches b
LIMIT 150;