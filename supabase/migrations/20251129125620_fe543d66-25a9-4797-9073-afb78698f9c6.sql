-- Update batch_numbers to use flock name pattern instead of "Training-Flock-XXXX"
UPDATE batches 
SET batch_number = flocks.flock_name || ' #' || REGEXP_REPLACE(batches.batch_number, '.*#', '')
FROM flocks 
WHERE batches.flock_id = flocks.id 
  AND batches.batch_number LIKE 'Training-Flock-%';