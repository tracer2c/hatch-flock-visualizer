-- Phase 3: Database Reset & Full Population (Corrected)
-- First clear all data including machines

-- Step 1: Clear data tables
TRUNCATE TABLE qa_position_linkage CASCADE;
TRUNCATE TABLE qa_monitoring CASCADE;
TRUNCATE TABLE multi_setter_sets CASCADE;
TRUNCATE TABLE machine_transfers CASCADE;
TRUNCATE TABLE residue_analysis CASCADE;
TRUNCATE TABLE fertility_analysis CASCADE;
TRUNCATE TABLE egg_pack_quality CASCADE;
TRUNCATE TABLE batches CASCADE;
TRUNCATE TABLE flocks CASCADE;

-- Step 2: Delete existing machines and recreate fresh
DELETE FROM machines;

-- Step 3: Create single-setter machines (4 per hatchery)
INSERT INTO machines (machine_number, machine_type, setter_mode, capacity, unit_id, status)
SELECT 
  u.code || '-SS' || n::text as machine_number,
  'setter' as machine_type,
  'single_setter' as setter_mode,
  80000 as capacity,
  u.id as unit_id,
  'available' as status
FROM units u
CROSS JOIN generate_series(1, 4) as n
WHERE u.status = 'active';

-- Step 4: Create multi-setter machines (3 per hatchery)
INSERT INTO machines (machine_number, machine_type, setter_mode, capacity, unit_id, status)
SELECT 
  u.code || '-MS' || n::text as machine_number,
  'setter' as machine_type,
  'multi_setter' as setter_mode,
  120000 as capacity,
  u.id as unit_id,
  'available' as status
FROM units u
CROSS JOIN generate_series(1, 3) as n
WHERE u.status = 'active';

-- Step 5: Create hatcher machines (2 per hatchery)
INSERT INTO machines (machine_number, machine_type, setter_mode, capacity, unit_id, status)
SELECT 
  u.code || '-H' || n::text as machine_number,
  'hatcher' as machine_type,
  NULL as setter_mode,
  60000 as capacity,
  u.id as unit_id,
  'available' as status
FROM units u
CROSS JOIN generate_series(1, 2) as n
WHERE u.status = 'active';

-- Step 6: Create 60 flocks (15 per hatchery) with unique names per hatchery
INSERT INTO flocks (flock_number, flock_name, age_weeks, arrival_date, total_birds, unit_id, breed)
SELECT 
  1000 + row_num as flock_number,
  farm_name || ' ' || u.code as flock_name,
  25 + (random() * 40)::int as age_weeks,
  CURRENT_DATE - (random() * 365)::int as arrival_date,
  15000 + (random() * 15000)::int as total_birds,
  u.id as unit_id,
  'broiler' as breed
FROM (
  SELECT u.id, u.code, farm_names.farm_name, 
         row_number() OVER () as row_num
  FROM units u
  CROSS JOIN (
    SELECT unnest(ARRAY[
      'FINCH HOLLOW', 'DOVE FARM', 'PRAIRIE LANDS', 'SUNRISE RANCH', 'VALLEY VIEW',
      'MEADOW CREEK', 'GOLDEN ACRES', 'HILLTOP', 'BLUE SKY', 'OAK GROVE',
      'CEDAR RIDGE', 'PINE VALLEY', 'WILLOW BROOK', 'MAPLE HILL', 'RIVER BEND'
    ]) as farm_name
  ) farm_names
  WHERE u.status = 'active'
) combined, units u
WHERE combined.id = u.id;