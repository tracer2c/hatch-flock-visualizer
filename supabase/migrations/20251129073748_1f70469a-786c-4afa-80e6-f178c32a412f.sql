-- Clean up existing dummy data first
DELETE FROM fertility_analysis WHERE batch_id IN (SELECT id FROM batches WHERE data_type = 'dummy');
DELETE FROM residue_analysis WHERE batch_id IN (SELECT id FROM batches WHERE data_type = 'dummy');
DELETE FROM egg_pack_quality WHERE batch_id IN (SELECT id FROM batches WHERE data_type = 'dummy');
DELETE FROM qa_monitoring WHERE batch_id IN (SELECT id FROM batches WHERE data_type = 'dummy');
DELETE FROM weight_tracking WHERE batch_id IN (SELECT id FROM batches WHERE data_type = 'dummy');
DELETE FROM checklist_completions WHERE batch_id IN (SELECT id FROM batches WHERE data_type = 'dummy');
DELETE FROM batches WHERE data_type = 'dummy';
DELETE FROM flocks WHERE data_type = 'dummy';
DELETE FROM machines WHERE data_type = 'dummy';

-- Create 50 realistic training flocks with unique flock numbers
DO $$
DECLARE
  unit_ids uuid[] := (SELECT array_agg(id) FROM units WHERE status = 'active' LIMIT 4);
  flock_id uuid;
  i int;
  unit_idx int;
  flock_num int;
  age_wks int;
  arrival date;
  flock_nm text;
  base_flock_num int := 6000;
BEGIN
  FOR i IN 1..50 LOOP
    unit_idx := ((i - 1) % 4) + 1;
    flock_num := base_flock_num + i;
    age_wks := 25 + floor(random() * 40)::int;
    arrival := CURRENT_DATE - ((age_wks - 25) * 7 + floor(random() * 60)::int);
    flock_nm := 'Training-Flock-' || flock_num;
    
    INSERT INTO flocks (
      flock_number, flock_name, age_weeks, breed, arrival_date, 
      total_birds, unit_id, data_type, technician_name
    ) VALUES (
      flock_num, flock_nm, age_wks, 'broiler', arrival,
      15000 + floor(random() * 15000)::int,
      unit_ids[unit_idx], 'dummy', 
      (ARRAY['John Smith', 'Maria Garcia', 'James Wilson', 'Sarah Johnson', 'Robert Brown'])[1 + floor(random() * 5)::int]
    )
    RETURNING id INTO flock_id;
    
    FOR j IN 1..2 LOOP
      DECLARE
        set_dt date;
        days_ago int;
        house_status text;
        exp_hatch date;
        act_hatch date;
        eggs_set int;
        machine_id uuid;
      BEGIN
        SELECT id INTO machine_id FROM machines WHERE data_type = 'original' ORDER BY random() LIMIT 1;
        IF machine_id IS NULL THEN
          SELECT id INTO machine_id FROM machines ORDER BY random() LIMIT 1;
        END IF;
        
        eggs_set := 40000 + floor(random() * 50000)::int;
        
        CASE 
          WHEN i <= 5 THEN
            days_ago := floor(random() * 2)::int;
            set_dt := CURRENT_DATE - days_ago;
            house_status := 'setting';
            exp_hatch := set_dt + 21;
            act_hatch := NULL;
          WHEN i <= 15 THEN
            days_ago := 2 + floor(random() * 9)::int;
            set_dt := CURRENT_DATE - days_ago;
            house_status := 'incubating';
            exp_hatch := set_dt + 21;
            act_hatch := NULL;
          WHEN i <= 25 THEN
            days_ago := 11 + floor(random() * 8)::int;
            set_dt := CURRENT_DATE - days_ago;
            house_status := 'incubating';
            exp_hatch := set_dt + 21;
            act_hatch := NULL;
          WHEN i <= 35 THEN
            days_ago := 19 + floor(random() * 3)::int;
            set_dt := CURRENT_DATE - days_ago;
            house_status := 'hatching';
            exp_hatch := set_dt + 21;
            act_hatch := NULL;
          ELSE
            days_ago := 22 + floor(random() * 68)::int;
            set_dt := CURRENT_DATE - days_ago;
            house_status := 'completed';
            exp_hatch := set_dt + 21;
            act_hatch := set_dt + 21 + floor(random() * 2)::int;
        END CASE;
        
        INSERT INTO batches (
          batch_number, flock_id, machine_id, set_date, expected_hatch_date, 
          actual_hatch_date, total_eggs_set, status, unit_id, data_type,
          eggs_injected, chicks_hatched, eggs_cleared
        ) VALUES (
          flock_nm || ' #' || j, flock_id, machine_id, set_dt, exp_hatch,
          act_hatch, eggs_set, house_status::batch_status, unit_ids[unit_idx], 'dummy',
          CASE WHEN house_status IN ('hatching', 'completed') THEN (eggs_set * 0.92)::int ELSE 0 END,
          CASE WHEN house_status = 'completed' THEN (eggs_set * 0.85)::int ELSE 0 END,
          CASE WHEN house_status IN ('incubating', 'hatching', 'completed') THEN (eggs_set * 0.08)::int ELSE 0 END
        );
      END;
    END LOOP;
  END LOOP;
END $$;

-- Generate fertility analysis for houses with days >= 7
INSERT INTO fertility_analysis (batch_id, sample_size, fertile_eggs, infertile_eggs, technician_name, analysis_date)
SELECT 
  b.id, 648,
  598 + floor(random() * 40)::int,
  48 + floor(random() * 25)::int,
  (ARRAY['John Smith', 'Maria Garcia', 'James Wilson'])[1 + floor(random() * 3)::int],
  b.set_date + 7 + floor(random() * 3)::int
FROM batches b
WHERE b.data_type = 'dummy' AND (CURRENT_DATE - b.set_date) >= 7
ON CONFLICT (batch_id) DO NOTHING;

-- Generate residue analysis for completed and hatching houses (include total_residue_count)
INSERT INTO residue_analysis (
  batch_id, sample_size, total_residue_count, infertile_eggs, early_dead, mid_dead, late_dead, 
  cull_chicks, live_pip_number, dead_pip_number, pip_number,
  hatch_percent, hof_percent, hoi_percent, if_dev_percent,
  lab_technician, analysis_date
)
SELECT 
  b.id, 648,
  100 + floor(random() * 50)::int,
  48 + floor(random() * 25)::int,
  12 + floor(random() * 15)::int,
  8 + floor(random() * 12)::int,
  15 + floor(random() * 18)::int,
  5 + floor(random() * 10)::int,
  2 + floor(random() * 6)::int,
  3 + floor(random() * 8)::int,
  5 + floor(random() * 10)::int,
  78 + (random() * 12)::numeric(5,2),
  80 + (random() * 10)::numeric(5,2),
  82 + (random() * 10)::numeric(5,2),
  6 + (random() * 6)::numeric(5,2),
  (ARRAY['Lab Tech A', 'Lab Tech B', 'Lab Tech C'])[1 + floor(random() * 3)::int],
  b.expected_hatch_date
FROM batches b
WHERE b.data_type = 'dummy' AND b.status IN ('hatching', 'completed')
ON CONFLICT (batch_id) DO NOTHING;

-- Generate egg pack quality
INSERT INTO egg_pack_quality (
  batch_id, sample_size, grade_a, grade_b, grade_c, cracked, dirty,
  small, large, inspector_name, inspection_date
)
SELECT 
  b.id, 100,
  75 + floor(random() * 10)::int,
  8 + floor(random() * 7)::int,
  2 + floor(random() * 4)::int,
  1 + floor(random() * 3)::int,
  1 + floor(random() * 2)::int,
  3 + floor(random() * 4)::int,
  4 + floor(random() * 5)::int,
  (ARRAY['Inspector A', 'Inspector B'])[1 + floor(random() * 2)::int],
  b.set_date - 1
FROM batches b
WHERE b.data_type = 'dummy' AND (CURRENT_DATE - b.set_date) >= 3
ON CONFLICT DO NOTHING;

-- Generate QA monitoring
INSERT INTO qa_monitoring (
  batch_id, check_date, check_time, day_of_incubation,
  temperature, humidity, co2_level, ventilation_rate, turning_frequency, inspector_name
)
SELECT 
  b.id,
  b.set_date + 10 + floor(random() * 5)::int,
  '08:00:00'::time,
  10 + floor(random() * 5)::int,
  99.3 + (random() * 0.9)::numeric(4,2),
  53 + (random() * 5)::numeric(4,2),
  0.3 + (random() * 0.2)::numeric(3,2),
  25 + (random() * 10)::numeric(4,2),
  12 + floor(random() * 6)::int,
  (ARRAY['QA Inspector 1', 'QA Inspector 2'])[1 + floor(random() * 2)::int]
FROM batches b
WHERE b.data_type = 'dummy' AND (CURRENT_DATE - b.set_date) >= 10
ON CONFLICT DO NOTHING;