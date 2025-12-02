-- Insert test houses for Candling filter demonstration
INSERT INTO batches (
  batch_number, flock_id, unit_id, machine_id, company_id,
  set_date, expected_hatch_date, total_eggs_set, status, data_type
) VALUES
-- Day 10 (Nov 22) - Just entered candling window
('RIVER BEND DHN #99', '9d899433-3e74-4ffb-9719-dd7825390767', 
 'd9651cd9-f951-4242-8628-50d3311931e5', '00695dcf-b111-4abb-943c-2e8cbba1c0bb',
 '00000000-0000-0000-0000-000000000001',
 '2025-11-22', '2025-12-13', 50000, 'in_setter', 'original'),

-- Day 11 (Nov 21)
('MAPLE HILL DHN #99', '2080f51f-a0ec-499c-8385-3cae879a11d0', 
 'd9651cd9-f951-4242-8628-50d3311931e5', '0867dc55-a99a-45f2-895e-d431e0c95e34',
 '00000000-0000-0000-0000-000000000001',
 '2025-11-21', '2025-12-12', 50000, 'in_setter', 'original'),

-- Day 12 (Nov 20)
('WILLOW BROOK DHN #99', '488eceb5-d8ed-45fb-be81-a0d5db3be67b', 
 'd9651cd9-f951-4242-8628-50d3311931e5', '93b0cf43-15f3-47f3-bb22-48e945ee6831',
 '00000000-0000-0000-0000-000000000001',
 '2025-11-20', '2025-12-11', 50000, 'in_setter', 'original'),

-- Day 13 (Nov 19) - About to exit candling window
('PINE VALLEY DHN #99', '0a9cbc92-4ea4-4fbd-90f6-c964e59c3a87', 
 'cf37474a-77d4-4dd3-8667-2ad8697d4a42', '7521a807-ee4c-4a73-9094-dc154d12aac9',
 '00000000-0000-0000-0000-000000000001',
 '2025-11-19', '2025-12-10', 50000, 'in_setter', 'original');