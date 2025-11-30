
-- Redistribute batches properly
DO $$
DECLARE
  ss_machines_by_unit RECORD;
  ms_machines_by_unit RECORD;
  batch_rec RECORD;
  machine_idx INT;
  ss_ids UUID[];
  current_unit UUID;
  default_ms_machine UUID;
BEGIN
  -- Process each hatchery (unit) separately
  FOR ss_machines_by_unit IN 
    SELECT u.id as unit_id, 
           ARRAY_AGG(m.id ORDER BY m.machine_number) as ss_machine_ids,
           array_length(ARRAY_AGG(m.id), 1) as ss_count
    FROM units u
    JOIN machines m ON m.unit_id = u.id AND m.setter_mode = 'single_setter'
    GROUP BY u.id
  LOOP
    -- Get the first multi-setter machine for this unit as fallback
    SELECT id INTO default_ms_machine
    FROM machines 
    WHERE unit_id = ss_machines_by_unit.unit_id AND setter_mode = 'multi_setter'
    LIMIT 1;
    
    -- If no multi-setter, use any multi-setter
    IF default_ms_machine IS NULL THEN
      SELECT id INTO default_ms_machine FROM machines WHERE setter_mode = 'multi_setter' LIMIT 1;
    END IF;
    
    ss_ids := ss_machines_by_unit.ss_machine_ids;
    machine_idx := 0;
    
    -- Assign 1 batch per single-setter machine for this unit
    FOR batch_rec IN 
      SELECT b.id 
      FROM batches b
      WHERE b.unit_id = ss_machines_by_unit.unit_id
        AND b.status IN ('incubating', 'hatching')
      ORDER BY b.set_date DESC
    LOOP
      machine_idx := machine_idx + 1;
      
      IF machine_idx <= array_length(ss_ids, 1) THEN
        -- Assign to single-setter
        UPDATE batches SET machine_id = ss_ids[machine_idx] WHERE id = batch_rec.id;
      ELSE
        -- Assign remaining to multi-setter
        UPDATE batches SET machine_id = default_ms_machine WHERE id = batch_rec.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;
