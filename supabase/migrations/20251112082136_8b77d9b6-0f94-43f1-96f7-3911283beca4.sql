-- Create missing training houses with unique batch_number using flock_number
WITH flock_house_counts AS (
  SELECT f.id, f.flock_name, f.flock_number, f.unit_id, f.arrival_date,
    COUNT(b.id) as existing_houses,
    row_number() OVER (PARTITION BY f.unit_id ORDER BY f.id) as flock_row
  FROM flocks f
  LEFT JOIN batches b ON b.flock_id = f.id AND b.data_type = 'dummy'
  WHERE f.data_type = 'dummy'
  GROUP BY f.id, f.flock_name, f.flock_number, f.unit_id, f.arrival_date
  HAVING COUNT(b.id) < 2
),
hatchery_machines AS (
  SELECT id, unit_id, machine_number,
    row_number() OVER (PARTITION BY unit_id ORDER BY machine_number) as machine_row,
    COUNT(*) OVER (PARTITION BY unit_id) as machines_per_hatchery
  FROM machines
  WHERE data_type = 'dummy'
),
machine_assignments AS (
  SELECT 
    fhc.id as flock_id,
    fhc.flock_name,
    fhc.flock_number,
    fhc.unit_id,
    fhc.arrival_date,
    fhc.existing_houses,
    hm.id as machine_id
  FROM flock_house_counts fhc
  JOIN hatchery_machines hm ON hm.unit_id = fhc.unit_id
    AND hm.machine_row = ((fhc.flock_row - 1) % hm.machines_per_hatchery) + 1
),
houses_to_create AS (
  -- Create first house if needed
  SELECT 
    flock_id, flock_name, flock_number, unit_id, arrival_date, machine_id,
    1 as house_num
  FROM machine_assignments
  WHERE existing_houses = 0
  
  UNION ALL
  
  -- Create second house for flocks with 0 or 1 houses
  SELECT 
    flock_id, flock_name, flock_number, unit_id, arrival_date, machine_id,
    2 as house_num
  FROM machine_assignments
  WHERE existing_houses <= 1
),
house_data AS (
  SELECT
    flock_id,
    flock_name,
    flock_number,
    unit_id,
    arrival_date,
    house_num,
    -- Use flock_number in batch_number to ensure uniqueness
    flock_name || ' (' || flock_number || ') #' || house_num AS batch_number,
    machine_id,
    (arrival_date + (random() * 60)::int) AS set_date,
    ('07:00:00'::time + (random() * interval '8 hours'))::time AS set_time,
    (40000 + floor(random() * 50000))::int AS total_eggs_set,
    CASE 
      WHEN random() < 0.30 THEN 'completed'::batch_status
      WHEN random() < 0.55 THEN 'hatching'::batch_status
      WHEN random() < 0.80 THEN 'incubating'::batch_status
      WHEN random() < 0.95 THEN 'setting'::batch_status
      ELSE 'planned'::batch_status
    END AS status,
    CASE WHEN random() < 0.2
      THEN (ARRAY['Standard batch', 'High priority', 'Quality monitoring'])[
        floor(random() * 3 + 1)::int
      ]
      ELSE NULL
    END AS notes
  FROM houses_to_create
)
INSERT INTO public.batches (
  batch_number, flock_id, machine_id, unit_id,
  set_date, set_time, expected_hatch_date,
  total_eggs_set, status, notes,
  eggs_injected, chicks_hatched, eggs_cleared,
  data_type, company_id, created_at, updated_at
)
SELECT 
  batch_number, flock_id, machine_id, unit_id,
  set_date, set_time, (set_date + interval '21 days')::date,
  total_eggs_set, status, notes,
  0, 0, NULL,
  'dummy', '00000000-0000-0000-0000-000000000001'::uuid, NOW(), NOW()
FROM house_data;