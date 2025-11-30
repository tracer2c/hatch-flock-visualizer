
-- Fix 1: Update machine-level QA records to have batch_id = NULL
UPDATE qa_monitoring 
SET batch_id = NULL 
WHERE entry_mode = 'machine';

-- Fix 2: Add more multi_setter_sets for machines that don't have all 18 positions
DO $$
DECLARE
  machine_rec RECORD;
  zone_val zone_type;
  side_val side_type;
  level_val level_type;
  flock_ids UUID[];
  flock_idx INT := 0;
  existing_count INT;
BEGIN
  -- Get all flock IDs into an array
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO flock_ids FROM flocks;
  
  -- Loop through each multi-setter machine
  FOR machine_rec IN 
    SELECT m.id as machine_id, m.unit_id, m.machine_number
    FROM machines m
    WHERE (m.machine_type = 'setter' OR m.machine_type = 'combo')
      AND m.setter_mode = 'multi_setter'
    ORDER BY m.machine_number
  LOOP
    -- Check how many positions this machine already has
    SELECT COUNT(*) INTO existing_count FROM multi_setter_sets WHERE machine_id = machine_rec.machine_id;
    
    -- If machine doesn't have all 18 positions, add them
    IF existing_count < 18 THEN
      -- Delete existing to recreate uniformly
      DELETE FROM qa_position_linkage 
      WHERE multi_setter_set_id IN (SELECT id FROM multi_setter_sets WHERE machine_id = machine_rec.machine_id);
      
      DELETE FROM multi_setter_sets WHERE machine_id = machine_rec.machine_id;
      
      -- Create all 18 position entries
      FOREACH zone_val IN ARRAY ARRAY['A', 'B', 'C']::zone_type[]
      LOOP
        FOREACH side_val IN ARRAY ARRAY['Left', 'Right']::side_type[]
        LOOP
          FOREACH level_val IN ARRAY ARRAY['Top', 'Middle', 'Bottom']::level_type[]
          LOOP
            -- Use rotating flock assignment
            flock_idx := flock_idx + 1;
            IF flock_idx > array_length(flock_ids, 1) THEN
              flock_idx := 1;
            END IF;
            
            INSERT INTO multi_setter_sets (
              machine_id, flock_id, zone, side, level, 
              capacity, set_date, data_type, company_id
            ) VALUES (
              machine_rec.machine_id,
              flock_ids[flock_idx],
              zone_val,
              side_val,
              level_val,
              5000,
              CURRENT_DATE - (random() * 14)::int,
              'original',
              '00000000-0000-0000-0000-000000000001'
            );
          END LOOP;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;
