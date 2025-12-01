
-- Clean up stale multi_setter_sets records
-- 1. Delete records older than 21 days (incubation complete)
DELETE FROM multi_setter_sets 
WHERE set_date < CURRENT_DATE - INTERVAL '21 days';

-- 2. Delete records where batch has status 'completed' or 'hatching'
DELETE FROM multi_setter_sets 
WHERE batch_id IN (
  SELECT id FROM batches WHERE status IN ('completed', 'hatching')
);

-- 3. Remove duplicate position entries (keep the most recent one per position)
DELETE FROM multi_setter_sets a
USING multi_setter_sets b
WHERE a.machine_id = b.machine_id 
  AND a.zone = b.zone 
  AND a.side = b.side 
  AND a.level = b.level
  AND a.created_at < b.created_at;
