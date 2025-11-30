-- Part 3 CORRECTED: Create multi-setter sets, QA monitoring, and machine transfers
-- Removed data_type='dummy' filter since batches have data_type='original'

-- Clear any existing test data to avoid duplicates
DELETE FROM qa_position_linkage WHERE qa_monitoring_id IN (SELECT id FROM qa_monitoring WHERE entry_mode = 'machine');
DELETE FROM qa_monitoring WHERE entry_mode = 'machine';
DELETE FROM multi_setter_sets WHERE data_type = 'dummy';
DELETE FROM machine_transfers WHERE notes = 'Transfer to hatcher on day 18';

-- Create multi-setter sets for multi-setter machines
INSERT INTO multi_setter_sets (machine_id, flock_id, batch_id, zone, side, level, capacity, set_date, data_type)
SELECT 
  m.id as machine_id,
  b.flock_id,
  b.id as batch_id,
  (ARRAY['A', 'B', 'C'])[1 + (random() * 2)::int]::zone_type as zone,
  (ARRAY['Left', 'Right'])[1 + (random() * 1)::int]::side_type as side,
  (ARRAY['Top', 'Middle', 'Bottom'])[1 + (random() * 2)::int]::level_type as level,
  15000 + (random() * 10000)::int as capacity,
  b.set_date,
  b.data_type
FROM batches b
JOIN machines m ON m.id = b.machine_id
WHERE m.setter_mode = 'multi_setter'
AND NOT EXISTS (SELECT 1 FROM multi_setter_sets mss WHERE mss.batch_id = b.id)
LIMIT 100;

-- Create QA monitoring entries for batches
INSERT INTO qa_monitoring (batch_id, machine_id, check_date, check_time, day_of_incubation, temperature, humidity, inspector_name, entry_mode,
  temp_front_top_left, temp_front_top_right, temp_front_mid_left, temp_front_mid_right, temp_front_bottom_left, temp_front_bottom_right,
  temp_middle_top_left, temp_middle_top_right, temp_middle_mid_left, temp_middle_mid_right, temp_middle_bottom_left, temp_middle_bottom_right,
  temp_back_top_left, temp_back_top_right, temp_back_mid_left, temp_back_mid_right, temp_back_bottom_left, temp_back_bottom_right,
  temp_avg_front, temp_avg_middle, temp_avg_back, temp_avg_overall,
  angle_top_left, angle_top_right, angle_mid_left, angle_mid_right, angle_bottom_left, angle_bottom_right,
  co2_level, ventilation_rate, turning_frequency)
SELECT 
  b.id as batch_id,
  b.machine_id,
  b.set_date + 10 as check_date,
  '10:30:00'::time as check_time,
  10 + (random() * 2)::int as day_of_incubation,
  99.5 + (random() * 1.0) as temperature,
  53 + (random() * 5) as humidity,
  (ARRAY['QA Tech A', 'QA Tech B', 'QA Tech C', 'QA Tech D'])[1 + (random() * 3)::int] as inspector_name,
  'machine' as entry_mode,
  -- 18-point temperatures (Front zone)
  99.3 + (random() * 1.2) as temp_front_top_left,
  99.3 + (random() * 1.2) as temp_front_top_right,
  99.4 + (random() * 1.0) as temp_front_mid_left,
  99.4 + (random() * 1.0) as temp_front_mid_right,
  99.5 + (random() * 0.8) as temp_front_bottom_left,
  99.5 + (random() * 0.8) as temp_front_bottom_right,
  -- Middle zone
  99.4 + (random() * 1.0) as temp_middle_top_left,
  99.4 + (random() * 1.0) as temp_middle_top_right,
  99.5 + (random() * 0.8) as temp_middle_mid_left,
  99.5 + (random() * 0.8) as temp_middle_mid_right,
  99.6 + (random() * 0.6) as temp_middle_bottom_left,
  99.6 + (random() * 0.6) as temp_middle_bottom_right,
  -- Back zone
  99.3 + (random() * 1.2) as temp_back_top_left,
  99.3 + (random() * 1.2) as temp_back_top_right,
  99.4 + (random() * 1.0) as temp_back_mid_left,
  99.4 + (random() * 1.0) as temp_back_mid_right,
  99.5 + (random() * 0.8) as temp_back_bottom_left,
  99.5 + (random() * 0.8) as temp_back_bottom_right,
  -- Zone averages
  99.5 + (random() * 0.5) as temp_avg_front,
  99.6 + (random() * 0.4) as temp_avg_middle,
  99.5 + (random() * 0.5) as temp_avg_back,
  99.55 + (random() * 0.4) as temp_avg_overall,
  -- Angles
  42 + (random() * 6) as angle_top_left,
  42 + (random() * 6) as angle_top_right,
  43 + (random() * 5) as angle_mid_left,
  43 + (random() * 5) as angle_mid_right,
  44 + (random() * 4) as angle_bottom_left,
  44 + (random() * 4) as angle_bottom_right,
  -- Other metrics
  3000 + (random() * 2000) as co2_level,
  25 + (random() * 10) as ventilation_rate,
  24 as turning_frequency
FROM batches b
WHERE NOT EXISTS (SELECT 1 FROM qa_monitoring qa WHERE qa.batch_id = b.id AND qa.entry_mode = 'machine')
LIMIT 200;

-- Create machine transfers for hatching/completed batches
INSERT INTO machine_transfers (batch_id, from_machine_id, to_machine_id, transfer_date, transfer_time, days_in_previous_machine, notes, company_id)
SELECT 
  b.id as batch_id,
  b.machine_id as from_machine_id,
  h.id as to_machine_id,
  b.set_date + 18 as transfer_date,
  '08:00:00'::time as transfer_time,
  18 as days_in_previous_machine,
  'Transfer to hatcher on day 18' as notes,
  b.company_id
FROM batches b
CROSS JOIN LATERAL (
  SELECT id FROM machines 
  WHERE unit_id = b.unit_id 
  AND machine_type IN ('hatcher', 'combo') 
  AND id != b.machine_id
  ORDER BY random() 
  LIMIT 1
) h
WHERE b.status IN ('hatching', 'completed')
AND NOT EXISTS (SELECT 1 FROM machine_transfers mt WHERE mt.batch_id = b.id)
LIMIT 80;