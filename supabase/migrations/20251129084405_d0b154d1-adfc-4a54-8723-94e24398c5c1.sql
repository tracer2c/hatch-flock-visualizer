-- 1A. Populate missing residue characteristics
UPDATE public.residue_analysis SET
  mold = floor(random() * 3)::integer,
  abnormal = floor(random() * 5)::integer,
  brain_defects = floor(random() * 3)::integer,
  dry_egg = floor(random() * 4)::integer,
  malpositioned = floor(random() * 7)::integer,
  upside_down = floor(random() * 4)::integer,
  transfer_crack = floor(random() * 3)::integer,
  handling_cracks = floor(random() * 3)::integer
WHERE mold IS NULL OR abnormal IS NULL;

-- 1B. Populate angle data for all QA records missing angles
UPDATE public.qa_monitoring SET
  angle_top_left = 40 + floor(random() * 15)::numeric,
  angle_mid_left = 42 + floor(random() * 13)::numeric,
  angle_bottom_left = 38 + floor(random() * 17)::numeric,
  angle_top_right = 40 + floor(random() * 15)::numeric,
  angle_mid_right = 42 + floor(random() * 13)::numeric,
  angle_bottom_right = 38 + floor(random() * 17)::numeric
WHERE angle_top_left IS NULL;

-- 1C. Populate 18-point temperature data for QA records missing temps
UPDATE public.qa_monitoring SET
  temp_front_top_left = round((99.5 + random())::numeric, 1),
  temp_front_top_right = round((99.5 + random())::numeric, 1),
  temp_front_mid_left = round((99.5 + random())::numeric, 1),
  temp_front_mid_right = round((99.5 + random())::numeric, 1),
  temp_front_bottom_left = round((99.5 + random())::numeric, 1),
  temp_front_bottom_right = round((99.5 + random())::numeric, 1),
  temp_middle_top_left = round((99.5 + random())::numeric, 1),
  temp_middle_top_right = round((99.5 + random())::numeric, 1),
  temp_middle_mid_left = round((99.5 + random())::numeric, 1),
  temp_middle_mid_right = round((99.5 + random())::numeric, 1),
  temp_middle_bottom_left = round((99.5 + random())::numeric, 1),
  temp_middle_bottom_right = round((99.5 + random())::numeric, 1),
  temp_back_top_left = round((99.5 + random())::numeric, 1),
  temp_back_top_right = round((99.5 + random())::numeric, 1),
  temp_back_mid_left = round((99.5 + random())::numeric, 1),
  temp_back_mid_right = round((99.5 + random())::numeric, 1),
  temp_back_bottom_left = round((99.5 + random())::numeric, 1),
  temp_back_bottom_right = round((99.5 + random())::numeric, 1)
WHERE temp_avg_overall IS NULL;

-- Calculate zone averages for all records
UPDATE public.qa_monitoring SET
  temp_avg_front = round(((COALESCE(temp_front_top_left, 0) + COALESCE(temp_front_top_right, 0) + 
                           COALESCE(temp_front_mid_left, 0) + COALESCE(temp_front_mid_right, 0) + 
                           COALESCE(temp_front_bottom_left, 0) + COALESCE(temp_front_bottom_right, 0)) / 6)::numeric, 2),
  temp_avg_middle = round(((COALESCE(temp_middle_top_left, 0) + COALESCE(temp_middle_top_right, 0) + 
                            COALESCE(temp_middle_mid_left, 0) + COALESCE(temp_middle_mid_right, 0) + 
                            COALESCE(temp_middle_bottom_left, 0) + COALESCE(temp_middle_bottom_right, 0)) / 6)::numeric, 2),
  temp_avg_back = round(((COALESCE(temp_back_top_left, 0) + COALESCE(temp_back_top_right, 0) + 
                          COALESCE(temp_back_mid_left, 0) + COALESCE(temp_back_mid_right, 0) + 
                          COALESCE(temp_back_bottom_left, 0) + COALESCE(temp_back_bottom_right, 0)) / 6)::numeric, 2),
  temp_avg_overall = round(((COALESCE(temp_front_top_left, 0) + COALESCE(temp_front_top_right, 0) + 
                             COALESCE(temp_front_mid_left, 0) + COALESCE(temp_front_mid_right, 0) + 
                             COALESCE(temp_front_bottom_left, 0) + COALESCE(temp_front_bottom_right, 0) +
                             COALESCE(temp_middle_top_left, 0) + COALESCE(temp_middle_top_right, 0) + 
                             COALESCE(temp_middle_mid_left, 0) + COALESCE(temp_middle_mid_right, 0) + 
                             COALESCE(temp_middle_bottom_left, 0) + COALESCE(temp_middle_bottom_right, 0) +
                             COALESCE(temp_back_top_left, 0) + COALESCE(temp_back_top_right, 0) + 
                             COALESCE(temp_back_mid_left, 0) + COALESCE(temp_back_mid_right, 0) + 
                             COALESCE(temp_back_bottom_left, 0) + COALESCE(temp_back_bottom_right, 0)) / 18)::numeric, 2)
WHERE temp_front_top_left IS NOT NULL;

-- 1D. Update egg_pack_quality notes to include Set Week
UPDATE public.egg_pack_quality SET
  notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL AND notes != '' THEN ', ' ELSE '' END || 'Set Week: Week ' || (1 + floor(random() * 4))::text
WHERE notes IS NULL OR notes NOT LIKE '%Set Week%';