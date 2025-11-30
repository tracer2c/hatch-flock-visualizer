-- Generate QA monitoring records for all batches that don't have one
INSERT INTO public.qa_monitoring (
  batch_id, machine_id, check_date, check_time, day_of_incubation, 
  temperature, humidity, co2_level, ventilation_rate, turning_frequency,
  inspector_name, candling_results, entry_mode, notes,
  temp_front_top_left, temp_front_top_right, temp_front_mid_left, temp_front_mid_right,
  temp_front_bottom_left, temp_front_bottom_right, temp_middle_top_left, temp_middle_top_right,
  temp_middle_mid_left, temp_middle_mid_right, temp_middle_bottom_left, temp_middle_bottom_right,
  temp_back_top_left, temp_back_top_right, temp_back_mid_left, temp_back_mid_right,
  temp_back_bottom_left, temp_back_bottom_right,
  temp_avg_overall, temp_avg_front, temp_avg_middle, temp_avg_back,
  angle_top_left, angle_mid_left, angle_bottom_left, angle_top_right, angle_mid_right, angle_bottom_right
)
SELECT 
  b.id as batch_id,
  b.machine_id,
  b.set_date + INTERVAL '10 days' as check_date,
  ('08:' || LPAD((random() * 59)::integer::text, 2, '0'))::time as check_time,
  10 + (random() * 2)::integer as day_of_incubation,
  (99.3 + random() * 0.9)::numeric(5,2) as temperature,
  (53 + random() * 5)::numeric(5,2) as humidity,
  (2500 + random() * 1000)::numeric(6,2) as co2_level,
  (25 + random() * 10)::numeric(5,2) as ventilation_rate,
  (24)::integer as turning_frequency,
  (ARRAY['John Smith', 'Maria Garcia', 'David Johnson', 'Sarah Wilson', 'Michael Brown', 'Emily Davis'])[1 + (random() * 5)::integer] as inspector_name,
  'fertile: ' || (580 + (random() * 50)::integer)::text || ', infertile: ' || (10 + (random() * 30)::integer)::text as candling_results,
  'house' as entry_mode,
  'Auto-generated QA monitoring record' as notes,
  -- 18-point temperatures (Front zone)
  (99.3 + random() * 0.9)::numeric(5,2), (99.3 + random() * 0.9)::numeric(5,2),
  (99.4 + random() * 0.8)::numeric(5,2), (99.4 + random() * 0.8)::numeric(5,2),
  (99.5 + random() * 0.7)::numeric(5,2), (99.5 + random() * 0.7)::numeric(5,2),
  -- 18-point temperatures (Middle zone)
  (99.4 + random() * 0.8)::numeric(5,2), (99.4 + random() * 0.8)::numeric(5,2),
  (99.5 + random() * 0.7)::numeric(5,2), (99.5 + random() * 0.7)::numeric(5,2),
  (99.6 + random() * 0.6)::numeric(5,2), (99.6 + random() * 0.6)::numeric(5,2),
  -- 18-point temperatures (Back zone)
  (99.5 + random() * 0.7)::numeric(5,2), (99.5 + random() * 0.7)::numeric(5,2),
  (99.6 + random() * 0.6)::numeric(5,2), (99.6 + random() * 0.6)::numeric(5,2),
  (99.7 + random() * 0.5)::numeric(5,2), (99.7 + random() * 0.5)::numeric(5,2),
  -- Zone averages
  (99.5 + random() * 0.5)::numeric(5,2) as temp_avg_overall,
  (99.4 + random() * 0.6)::numeric(5,2) as temp_avg_front,
  (99.5 + random() * 0.5)::numeric(5,2) as temp_avg_middle,
  (99.6 + random() * 0.4)::numeric(5,2) as temp_avg_back,
  -- Setter angles (6 positions)
  (43 + random() * 4)::numeric(5,2), (43 + random() * 4)::numeric(5,2),
  (43 + random() * 4)::numeric(5,2), (43 + random() * 4)::numeric(5,2),
  (43 + random() * 4)::numeric(5,2), (43 + random() * 4)::numeric(5,2)
FROM public.batches b
WHERE NOT EXISTS (
  SELECT 1 FROM public.qa_monitoring qm WHERE qm.batch_id = b.id
);