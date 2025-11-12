-- Generate 100 training flocks with 4-digit numbers (1000-9999 range)
WITH flock_data AS (
  SELECT
    -- Generate unique 4-digit flock number
    (1000 + floor(random() * 9000))::int AS flock_number,
    -- Generate flock name from predefined patterns
    (ARRAY['Bertha Valley', 'Oak Valley', 'Wilson Farm', 'Anderson Farm', 
           'Sunset Ranch', 'River Ranch', 'Green Hills', 'Blue Ridge Farm',
           'Cedar Valley', 'Maple Farm', 'Pine Ridge', 'Willow Creek Ranch',
           'Heritage Farm', 'Golden Valley', 'Silver Creek', 'Mountain View Ranch',
           'Prairie Farm', 'Lakeside Valley', 'Horizon Ranch', 'Valley View Farm',
           'Meadow Brook', 'Highland Farm', 'Riverside Ranch', 'Forest Hills'])[
      floor(random() * 24 + 1)::int
    ] AS flock_name,
    -- Random age between 25-65 weeks
    (25 + floor(random() * 41))::int AS age_weeks,
    -- Random arrival date in last 18 months
    (CURRENT_DATE - (random() * 540)::int) AS arrival_date,
    -- Random total birds between 15000-30000, rounded to nearest 1000
    (FLOOR((15000 + random() * 15001) / 1000) * 1000)::int AS total_birds,
    -- Rotate through 4 hatcheries evenly
    (ARRAY[
      'd9651cd9-f951-4242-8628-50d3311931e5'::uuid,
      'a34d2c88-a952-4c19-a8cc-79f34b993dc7'::uuid,
      'f5a0e309-271a-41e0-a4f9-86c9c8407fd9'::uuid,
      'cf37474a-77d4-4dd3-8667-2ad8697d4a42'::uuid
    ])[(row_number() OVER ()) % 4 + 1] AS unit_id,
    -- Random technician name
    (ARRAY['James Smith', 'Maria Garcia', 'John Davis', 'Sarah Johnson',
           'Michael Brown', 'Jennifer Wilson', 'David Martinez', 'Lisa Anderson',
           'Robert Taylor', 'Patricia Moore'])[
      floor(random() * 10 + 1)::int
    ] AS technician_name,
    -- 30% chance of having notes
    CASE WHEN random() < 0.3 
      THEN (ARRAY['Good performance', 'New flock', 'Transfer from Unit B', 
                  'High fertility expected', 'Monitoring closely'])[
        floor(random() * 5 + 1)::int
      ]
      ELSE NULL
    END AS notes,
    row_number() OVER () as rn
  FROM generate_series(1, 100)
)
INSERT INTO public.flocks (
  flock_number, flock_name, age_weeks, arrival_date, 
  total_birds, unit_id, technician_name, notes,
  breed, data_type, created_at, updated_at
)
SELECT 
  flock_number, flock_name, age_weeks, arrival_date,
  total_birds, unit_id, technician_name, notes,
  'breeder', 'dummy', NOW(), NOW()
FROM flock_data
ON CONFLICT DO NOTHING;