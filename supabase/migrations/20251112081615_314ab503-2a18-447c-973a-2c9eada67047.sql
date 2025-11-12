-- Step 1: Create 15 training machines distributed across 4 hatcheries
WITH machine_data AS (
  SELECT
    row_number() OVER () AS rn,
    -- Machine number with hatchery code
    CASE 
      WHEN hatchery_idx = 1 THEN 'M-DHN-' || LPAD(machine_num::text, 2, '0')
      WHEN hatchery_idx = 2 THEN 'M-ENT-' || LPAD(machine_num::text, 2, '0')
      WHEN hatchery_idx = 3 THEN 'M-SAM-' || LPAD(machine_num::text, 2, '0')
      ELSE 'M-TROY-' || LPAD(machine_num::text, 2, '0')
    END AS machine_number,
    -- Machine type rotation
    CASE 
      WHEN (row_number() OVER ()) % 3 = 1 THEN 'setter'::machine_type
      WHEN (row_number() OVER ()) % 3 = 2 THEN 'hatcher'::machine_type
      ELSE 'combo'::machine_type
    END AS machine_type,
    -- Capacity based on type
    CASE 
      WHEN (row_number() OVER ()) % 3 = 1 THEN (80000 + floor(random() * 40000))::int -- Setter
      WHEN (row_number() OVER ()) % 3 = 2 THEN (60000 + floor(random() * 40000))::int -- Hatcher
      ELSE (100000 + floor(random() * 50000))::int -- Combo
    END AS capacity,
    -- Hatchery assignment
    (ARRAY[
      'd9651cd9-f951-4242-8628-50d3311931e5'::uuid,
      'a34d2c88-a952-4c19-a8cc-79f34b993dc7'::uuid,
      'f5a0e309-271a-41e0-a4f9-86c9c8407fd9'::uuid,
      'cf37474a-77d4-4dd3-8667-2ad8697d4a42'::uuid
    ])[(row_number() OVER ()) % 4 + 1] AS unit_id,
    -- Location
    (ARRAY['Building A', 'Building B', 'Building C', 'Wing North', 'Wing South'])[
      floor(random() * 5 + 1)::int
    ] AS location,
    -- Last maintenance (50% chance)
    CASE WHEN random() < 0.5 
      THEN (CURRENT_DATE - (random() * 90)::int)
      ELSE NULL
    END AS last_maintenance,
    -- Notes (30% chance)
    CASE WHEN random() < 0.3
      THEN (ARRAY['Regular maintenance scheduled', 'Recently serviced', 'High performance unit'])[
        floor(random() * 3 + 1)::int
      ]
      ELSE NULL
    END AS notes,
    machine_num,
    hatchery_idx
  FROM generate_series(1, 15) AS s(machine_num),
       generate_series(1, 4) AS h(hatchery_idx)
  WHERE s.machine_num <= CASE 
    WHEN h.hatchery_idx IN (1, 2) THEN 4  -- DHN and ENT get 4 machines each
    ELSE 3  -- SAM and Troy get 3 machines each (total 15)
  END
)
INSERT INTO public.machines (
  machine_number, machine_type, capacity, unit_id, location,
  last_maintenance, notes, status, data_type, 
  company_id, created_at, updated_at
)
SELECT 
  machine_number, machine_type, capacity, unit_id, location,
  last_maintenance, notes, 'available', 'dummy',
  '00000000-0000-0000-0000-000000000001'::uuid, NOW(), NOW()
FROM machine_data
ON CONFLICT DO NOTHING;

-- Step 2: Create 200 houses (2 per flock) for the 100 training flocks
WITH training_flocks AS (
  SELECT id, flock_name, unit_id, arrival_date
  FROM public.flocks
  WHERE data_type = 'dummy'
),
training_machines AS (
  SELECT id, unit_id
  FROM public.machines
  WHERE data_type = 'dummy'
),
house_data AS (
  SELECT
    tf.id AS flock_id,
    tf.flock_name,
    tf.unit_id,
    tf.arrival_date,
    h.house_num,
    -- Generate batch_number: "FlockName #HouseNumber"
    tf.flock_name || ' #' || h.house_num AS batch_number,
    -- Random machine from same hatchery
    (
      SELECT tm.id 
      FROM training_machines tm 
      WHERE tm.unit_id = tf.unit_id 
      ORDER BY random() 
      LIMIT 1
    ) AS machine_id,
    -- Set date: 0-60 days after flock arrival
    (tf.arrival_date + (random() * 60)::int) AS set_date,
    -- Set time: random between 07:00 and 15:00
    ('07:00:00'::time + (random() * interval '8 hours')) AS set_time,
    -- Total eggs set: 40,000 - 90,000
    (40000 + floor(random() * 50000))::int AS total_eggs_set,
    -- Status distribution
    CASE 
      WHEN random() < 0.30 THEN 'completed'::batch_status
      WHEN random() < 0.55 THEN 'hatching'::batch_status
      WHEN random() < 0.80 THEN 'incubating'::batch_status
      WHEN random() < 0.95 THEN 'setting'::batch_status
      ELSE 'planned'::batch_status
    END AS status,
    -- Notes (20% chance)
    CASE WHEN random() < 0.2
      THEN (ARRAY['Standard batch', 'High priority', 'Quality monitoring'])[
        floor(random() * 3 + 1)::int
      ]
      ELSE NULL
    END AS notes
  FROM training_flocks tf
  CROSS JOIN LATERAL (SELECT 1 AS house_num UNION ALL SELECT 2) AS h
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
FROM house_data
ON CONFLICT DO NOTHING;