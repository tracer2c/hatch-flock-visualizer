-- Delete the duplicate "Start Setter" rule
DELETE FROM batch_status_automation_rules 
WHERE id = '503744c9-b5ec-4cd5-93dd-20e05dfd21e1';

-- Insert the missing "Start Hatcher" rule (Day 18 transfer)
INSERT INTO batch_status_automation_rules (
  company_id, rule_name, from_status, to_status, 
  min_days_after_set, requires_fertility_data, 
  requires_residue_data, requires_qa_data, 
  min_qa_checks_required, is_enabled
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Start Hatcher',
  'in_setter',
  'in_hatcher',
  18,
  false,
  false,
  false,
  0,
  true
);