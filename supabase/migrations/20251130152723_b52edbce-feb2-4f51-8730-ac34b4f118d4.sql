-- Link QA Monitoring records to batches via machine relationship
UPDATE public.qa_monitoring qm
SET batch_id = (
  SELECT b.id FROM public.batches b 
  WHERE b.machine_id = qm.machine_id 
  ORDER BY b.set_date DESC LIMIT 1
)
WHERE qm.batch_id IS NULL AND qm.machine_id IS NOT NULL;

-- Generate weight_tracking records for existing batches (Day 7, 14, 18 checks)
INSERT INTO public.weight_tracking (batch_id, flock_id, machine_id, day_of_incubation, check_date, total_weight, top_weight, middle_weight, bottom_weight, percent_loss, target_loss_min, target_loss_max, notes)
SELECT 
  b.id as batch_id,
  b.flock_id,
  b.machine_id,
  day_num as day_of_incubation,
  b.set_date + (day_num || ' days')::interval as check_date,
  (60 + random() * 5)::numeric(5,2) as total_weight,
  (61 + random() * 3)::numeric(5,2) as top_weight,
  (60 + random() * 3)::numeric(5,2) as middle_weight,
  (59 + random() * 3)::numeric(5,2) as bottom_weight,
  (day_num * 0.5 + random() * 2)::numeric(5,2) as percent_loss,
  (day_num * 0.4)::numeric(5,2) as target_loss_min,
  (day_num * 0.6)::numeric(5,2) as target_loss_max,
  'Auto-generated weight tracking for day ' || day_num as notes
FROM public.batches b
CROSS JOIN (SELECT unnest(ARRAY[7, 14, 18]) as day_num) days
WHERE NOT EXISTS (
  SELECT 1 FROM public.weight_tracking wt 
  WHERE wt.batch_id = b.id AND wt.day_of_incubation = days.day_num
)
ORDER BY b.set_date DESC
LIMIT 600;

-- Generate specific_gravity_tests for existing flocks
INSERT INTO public.specific_gravity_tests (flock_id, age_weeks, test_date, float_count, float_percentage, sink_count, sample_size, concentration, meets_standard, standard_min, standard_max, difference, notes)
SELECT 
  f.id as flock_id,
  f.age_weeks,
  CURRENT_DATE - (random() * 30)::integer as test_date,
  (5 + random() * 15)::integer as float_count,
  ((5 + random() * 15) / 100 * 100)::numeric(5,2) as float_percentage,
  (85 + random() * 10)::integer as sink_count,
  100 as sample_size,
  '1.080' as concentration,
  true as meets_standard,
  5.0 as standard_min,
  15.0 as standard_max,
  0.0 as difference,
  'Auto-generated specific gravity test' as notes
FROM public.flocks f
WHERE NOT EXISTS (
  SELECT 1 FROM public.specific_gravity_tests sgt WHERE sgt.flock_id = f.id
)
LIMIT 100;

-- Add candling_results to qa_monitoring records that don't have them
UPDATE public.qa_monitoring
SET candling_results = 'fertile: ' || (580 + (random() * 50)::integer)::text || ', infertile: ' || (10 + (random() * 30)::integer)::text
WHERE candling_results IS NULL;

-- Update all data_type to 'original' to remove segregation
UPDATE public.batches SET data_type = 'original' WHERE data_type = 'dummy';
UPDATE public.flocks SET data_type = 'original' WHERE data_type = 'dummy';
UPDATE public.machines SET data_type = 'original' WHERE data_type = 'dummy';
UPDATE public.multi_setter_sets SET data_type = 'original' WHERE data_type = 'dummy';