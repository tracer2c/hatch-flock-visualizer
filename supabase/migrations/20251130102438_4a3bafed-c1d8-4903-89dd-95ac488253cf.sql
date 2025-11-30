-- Populate DHN-S1 with all 18 position mappings for testing
-- First, get the machine ID for DHN-S1
DO $$
DECLARE
  v_machine_id UUID;
  v_flock_id UUID;
  v_batch_id UUID;
  v_zone TEXT;
  v_side TEXT;
  v_level TEXT;
BEGIN
  -- Get DHN-S1 machine ID
  SELECT id INTO v_machine_id FROM machines WHERE machine_number = 'DHN-S1' LIMIT 1;
  
  -- Get a flock (FINCH HOLLOW) for testing
  SELECT id INTO v_flock_id FROM flocks WHERE flock_name = 'FINCH HOLLOW' LIMIT 1;
  
  -- Get a batch for this flock
  SELECT id INTO v_batch_id FROM batches WHERE flock_id = v_flock_id LIMIT 1;
  
  -- Exit if we don't have the required data
  IF v_machine_id IS NULL OR v_flock_id IS NULL THEN
    RAISE NOTICE 'Machine or flock not found, skipping test data generation';
    RETURN;
  END IF;
  
  -- Delete existing sets for this machine to avoid conflicts
  DELETE FROM multi_setter_sets WHERE machine_id = v_machine_id;
  
  -- Insert all 18 positions (3 zones x 2 sides x 3 levels)
  FOR v_zone IN SELECT unnest(ARRAY['A', 'B', 'C']) LOOP
    FOR v_side IN SELECT unnest(ARRAY['Left', 'Right']) LOOP
      FOR v_level IN SELECT unnest(ARRAY['Top', 'Middle', 'Bottom']) LOOP
        INSERT INTO multi_setter_sets (
          machine_id,
          flock_id,
          batch_id,
          zone,
          side,
          level,
          set_date,
          capacity,
          data_type,
          company_id
        ) VALUES (
          v_machine_id,
          v_flock_id,
          v_batch_id,
          v_zone::zone_type,
          v_side::side_type,
          v_level::level_type,
          '2025-11-29',
          5000,
          'dummy',
          '00000000-0000-0000-0000-000000000001'
        );
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Successfully created 18 position mappings for DHN-S1';
END $$;