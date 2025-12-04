-- Fix houses with future set dates that were incorrectly marked as in_setter or setting
UPDATE batches 
SET status = 'scheduled' 
WHERE set_date > CURRENT_DATE 
  AND status IN ('in_setter', 'setting');