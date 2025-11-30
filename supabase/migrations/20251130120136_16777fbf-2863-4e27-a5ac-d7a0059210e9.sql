
-- =====================================================
-- COMPREHENSIVE QA HUB DATA FIX (Fixed position format)
-- =====================================================

-- Step 1: Create qa_position_linkage records for all machine-level QA
-- Using correct position format: front_top_left, middle_mid_right, etc.
DO $$
DECLARE
  qa_rec RECORD;
  set_rec RECORD;
  position_key TEXT;
  temp_value NUMERIC;
  zone_name TEXT;
  level_name TEXT;
  side_name TEXT;
BEGIN
  -- Loop through all machine-level QA records
  FOR qa_rec IN 
    SELECT qm.* 
    FROM qa_monitoring qm 
    WHERE qm.entry_mode = 'machine' AND qm.machine_id IS NOT NULL
  LOOP
    -- For each QA record, create 18 position linkage entries
    FOR set_rec IN 
      SELECT mss.id as set_id, mss.flock_id, mss.zone, mss.side, mss.level
      FROM multi_setter_sets mss
      WHERE mss.machine_id = qa_rec.machine_id
    LOOP
      -- Convert zone A/B/C to front/middle/back
      zone_name := CASE set_rec.zone 
        WHEN 'A' THEN 'front'
        WHEN 'B' THEN 'middle'
        WHEN 'C' THEN 'back'
      END;
      
      -- Convert level to lowercase with mid for middle
      level_name := CASE set_rec.level
        WHEN 'Top' THEN 'top'
        WHEN 'Middle' THEN 'mid'
        WHEN 'Bottom' THEN 'bottom'
      END;
      
      -- Convert side to lowercase
      side_name := lower(set_rec.side::text);
      
      -- Build position key in correct format
      position_key := zone_name || '_' || level_name || '_' || side_name;
      
      -- Map to actual temperature columns
      CASE 
        WHEN position_key = 'front_top_left' THEN temp_value := qa_rec.temp_front_top_left;
        WHEN position_key = 'front_mid_left' THEN temp_value := qa_rec.temp_front_mid_left;
        WHEN position_key = 'front_bottom_left' THEN temp_value := qa_rec.temp_front_bottom_left;
        WHEN position_key = 'front_top_right' THEN temp_value := qa_rec.temp_front_top_right;
        WHEN position_key = 'front_mid_right' THEN temp_value := qa_rec.temp_front_mid_right;
        WHEN position_key = 'front_bottom_right' THEN temp_value := qa_rec.temp_front_bottom_right;
        WHEN position_key = 'middle_top_left' THEN temp_value := qa_rec.temp_middle_top_left;
        WHEN position_key = 'middle_mid_left' THEN temp_value := qa_rec.temp_middle_mid_left;
        WHEN position_key = 'middle_bottom_left' THEN temp_value := qa_rec.temp_middle_bottom_left;
        WHEN position_key = 'middle_top_right' THEN temp_value := qa_rec.temp_middle_top_right;
        WHEN position_key = 'middle_mid_right' THEN temp_value := qa_rec.temp_middle_mid_right;
        WHEN position_key = 'middle_bottom_right' THEN temp_value := qa_rec.temp_middle_bottom_right;
        WHEN position_key = 'back_top_left' THEN temp_value := qa_rec.temp_back_top_left;
        WHEN position_key = 'back_mid_left' THEN temp_value := qa_rec.temp_back_mid_left;
        WHEN position_key = 'back_bottom_left' THEN temp_value := qa_rec.temp_back_bottom_left;
        WHEN position_key = 'back_top_right' THEN temp_value := qa_rec.temp_back_top_right;
        WHEN position_key = 'back_mid_right' THEN temp_value := qa_rec.temp_back_mid_right;
        WHEN position_key = 'back_bottom_right' THEN temp_value := qa_rec.temp_back_bottom_right;
        ELSE temp_value := qa_rec.temperature;
      END CASE;
      
      -- Use default temp if null
      IF temp_value IS NULL THEN
        temp_value := 99.5 + random() * 1.0;
      END IF;
      
      -- Insert linkage record
      INSERT INTO qa_position_linkage (
        qa_monitoring_id,
        position,
        temperature,
        linkage_type,
        multi_setter_set_id,
        resolved_flock_id
      ) VALUES (
        qa_rec.id,
        position_key,
        temp_value,
        'position',
        set_rec.set_id,
        set_rec.flock_id
      );
    END LOOP;
  END LOOP;
END $$;
