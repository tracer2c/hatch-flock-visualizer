-- Generate training data for weight_tracking, specific_gravity_tests, and candling_results

-- 1. Generate weight tracking records (200 records, one per house at various days)
INSERT INTO public.weight_tracking (
  batch_id, flock_id, machine_id, company_id, check_date, day_of_incubation, check_day,
  total_weight, top_weight, middle_weight, bottom_weight, percent_loss,
  target_loss_min, target_loss_max, notes
)
SELECT 
  b.id as batch_id,
  b.flock_id,
  b.machine_id,
  b.company_id,
  b.set_date + (7 + floor(random() * 11)::int) as check_date,
  7 + floor(random() * 11)::int as day_of_incubation,
  CASE 
    WHEN random() < 0.33 THEN 'Day 7'
    WHEN random() < 0.66 THEN 'Day 14'
    ELSE 'Day 18'
  END as check_day,
  55 + random() * 10 as total_weight,
  54 + random() * 8 as top_weight,
  55 + random() * 9 as middle_weight,
  56 + random() * 10 as bottom_weight,
  11 + random() * 4 as percent_loss,
  11.0 as target_loss_min,
  14.0 as target_loss_max,
  CASE WHEN random() < 0.3 THEN 'Weight check completed' ELSE NULL END as notes
FROM public.batches b
WHERE b.data_type = 'dummy'
LIMIT 200
ON CONFLICT DO NOTHING;

-- 2. Generate specific gravity tests (100 records, one per flock)
INSERT INTO public.specific_gravity_tests (
  flock_id, batch_id, company_id, test_date, age_weeks,
  float_count, sink_count, sample_size, float_percentage,
  concentration, standard_min, standard_max, meets_standard, difference, notes
)
SELECT DISTINCT ON (f.id)
  f.id as flock_id,
  b.id as batch_id,
  f.company_id,
  b.set_date - INTERVAL '1 day' as test_date,
  f.age_weeks,
  10 + floor(random() * 20)::int as float_count,
  80 + floor(random() * 10)::int as sink_count,
  100 as sample_size,
  10 + random() * 20 as float_percentage,
  '1.080' as concentration,
  10.0 as standard_min,
  25.0 as standard_max,
  random() > 0.2 as meets_standard,
  random() * 5 - 2.5 as difference,
  CASE WHEN random() < 0.3 THEN 'Shell quality within standards' ELSE NULL END as notes
FROM public.flocks f
JOIN public.batches b ON b.flock_id = f.id
WHERE f.data_type = 'dummy'
LIMIT 100
ON CONFLICT DO NOTHING;

-- 3. Update existing qa_monitoring records with candling_results
UPDATE public.qa_monitoring
SET candling_results = 'fertile: ' || (580 + floor(random() * 50)::int)::text || ', infertile: ' || (18 + floor(random() * 30)::int)::text
WHERE candling_results IS NULL
  AND day_of_incubation BETWEEN 7 AND 12
  AND EXISTS (
    SELECT 1 FROM public.batches b 
    WHERE b.id = qa_monitoring.batch_id 
    AND b.data_type = 'dummy'
  );

-- 4. Also add some candling results to qa_monitoring records that don't have them
UPDATE public.qa_monitoring qm
SET candling_results = 'fertile: ' || (575 + floor(random() * 55)::int)::text || ', infertile: ' || (15 + floor(random() * 35)::int)::text
FROM public.batches b
WHERE qm.batch_id = b.id
  AND b.data_type = 'dummy'
  AND qm.candling_results IS NULL
  AND qm.day_of_incubation >= 7;