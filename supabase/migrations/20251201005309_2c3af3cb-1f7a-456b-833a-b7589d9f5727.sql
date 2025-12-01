-- Make batch_id nullable (machine completions won't have batch_id)
ALTER TABLE checklist_completions ALTER COLUMN batch_id DROP NOT NULL;

-- Add machine_id column
ALTER TABLE checklist_completions ADD COLUMN machine_id UUID REFERENCES machines(id);

-- Add constraint: either batch_id OR machine_id must be set
ALTER TABLE checklist_completions 
ADD CONSTRAINT check_batch_or_machine 
CHECK (batch_id IS NOT NULL OR machine_id IS NOT NULL);

-- Create index for machine_id queries
CREATE INDEX idx_checklist_completions_machine_id ON checklist_completions(machine_id);

-- Insert machine maintenance checklist items
INSERT INTO daily_checklist_items (title, description, target_type, is_required, applicable_days, order_index) VALUES
('Check Temperature Calibration', 'Verify machine temperature sensors are calibrated correctly', 'machine', true, '{1}', 1),
('Clean Air Filters', 'Clean or replace air filters as needed', 'machine', true, '{1}', 2),
('Inspect Turning Mechanism', 'Check egg turning mechanism functions properly', 'machine', true, '{1}', 3),
('Check Humidity System', 'Verify humidity water levels and spray nozzles', 'machine', true, '{1}', 4),
('Lubricate Moving Parts', 'Apply lubricant to door hinges and moving components', 'machine', false, '{1}', 5),
('Verify Alarm Systems', 'Test all alarm systems are functioning', 'machine', true, '{1}', 6),
('Record Maintenance Log', 'Document maintenance performed and any issues found', 'machine', true, '{1}', 7);