-- Update the hatching status transition rule to start on day 19 instead of day 18
-- This ensures Incubating covers Day 1-18, and Hatching covers Day 19-21

UPDATE batch_status_automation_rules
SET min_days_after_set = 19,
    updated_at = now()
WHERE rule_name = 'Start Hatching' 
  AND from_status = 'incubating' 
  AND to_status = 'hatching';