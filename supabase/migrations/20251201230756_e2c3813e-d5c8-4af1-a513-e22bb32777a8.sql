-- Migrate batches table
UPDATE batches SET status = 'scheduled' WHERE status = 'planned';
UPDATE batches SET status = 'in_setter' WHERE status IN ('setting', 'incubating');
UPDATE batches SET status = 'in_hatcher' WHERE status = 'hatching';

-- Migrate batch_status_history table
UPDATE batch_status_history SET from_status = 'scheduled' WHERE from_status = 'planned';
UPDATE batch_status_history SET to_status = 'scheduled' WHERE to_status = 'planned';
UPDATE batch_status_history SET from_status = 'in_setter' WHERE from_status IN ('setting', 'incubating');
UPDATE batch_status_history SET to_status = 'in_setter' WHERE to_status IN ('setting', 'incubating');
UPDATE batch_status_history SET from_status = 'in_hatcher' WHERE from_status = 'hatching';
UPDATE batch_status_history SET to_status = 'in_hatcher' WHERE to_status = 'hatching';

-- Update automation rules with CORRECT day values
UPDATE batch_status_automation_rules SET 
  rule_name = 'Start Setter',
  from_status = 'scheduled',
  to_status = 'in_setter',
  min_days_after_set = 0
WHERE from_status = 'planned' OR rule_name ILIKE '%Incubation%' OR rule_name ILIKE '%Start%';

UPDATE batch_status_automation_rules SET 
  rule_name = 'Start Hatcher',
  from_status = 'in_setter',
  to_status = 'in_hatcher',
  min_days_after_set = 18
WHERE from_status IN ('setting', 'incubating') OR rule_name ILIKE '%Hatching%' OR rule_name ILIKE '%Transfer%';

UPDATE batch_status_automation_rules SET 
  rule_name = 'Complete House',
  from_status = 'in_hatcher',
  to_status = 'completed',
  min_days_after_set = 21
WHERE to_status = 'completed' OR rule_name ILIKE '%Complete%';