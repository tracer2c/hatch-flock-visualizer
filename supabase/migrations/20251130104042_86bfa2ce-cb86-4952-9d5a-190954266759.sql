
-- Create Multi-Setter Angles QA Entry for DHN-S1 (machine-wide)
INSERT INTO qa_monitoring (id, batch_id, machine_id, check_date, check_time, day_of_incubation, temperature, humidity, inspector_name, entry_mode,
  angle_top_left, angle_top_right, angle_mid_left, angle_mid_right, angle_bottom_left, angle_bottom_right)
VALUES 
  ('44444444-0001-0001-0001-000000000003', NULL, '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 
   '2025-11-28', '11:15:00', 3, 99.9, 56.0, 'Mary Johnson', 'machine',
   45, 44, 46, 45, 44, 45)
ON CONFLICT (id) DO NOTHING;

-- Create Multi-Setter Humidity QA Entry for DHN-S1 (machine-wide)
INSERT INTO qa_monitoring (id, batch_id, machine_id, check_date, check_time, day_of_incubation, temperature, humidity, inspector_name, entry_mode)
VALUES 
  ('44444444-0001-0001-0001-000000000004', NULL, '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 
   '2025-11-28', '11:30:00', 3, 99.9, 57.5, 'Mary Johnson', 'machine')
ON CONFLICT (id) DO NOTHING;

-- Insert the machine-wide linkage records for Angles (links to all 3 flocks in DHN-S1)
INSERT INTO qa_position_linkage (id, qa_monitoring_id, position, temperature, linkage_type, resolved_flock_id)
VALUES 
  ('55555555-0001-0001-0001-000000000019', '44444444-0001-0001-0001-000000000003', 'machine_wide', 0, 'machine_wide', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  ('55555555-0001-0001-0001-000000000020', '44444444-0001-0001-0001-000000000003', 'machine_wide', 0, 'machine_wide', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  ('55555555-0001-0001-0001-000000000021', '44444444-0001-0001-0001-000000000003', 'machine_wide', 0, 'machine_wide', 'a8dd58c2-335d-4768-b982-f71be23f3211')
ON CONFLICT (id) DO NOTHING;

-- Insert the machine-wide linkage records for Humidity (links to all 3 flocks in DHN-S1)
INSERT INTO qa_position_linkage (id, qa_monitoring_id, position, temperature, linkage_type, resolved_flock_id)
VALUES 
  ('55555555-0001-0001-0001-000000000022', '44444444-0001-0001-0001-000000000004', 'machine_wide', 0, 'machine_wide', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  ('55555555-0001-0001-0001-000000000023', '44444444-0001-0001-0001-000000000004', 'machine_wide', 0, 'machine_wide', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  ('55555555-0001-0001-0001-000000000024', '44444444-0001-0001-0001-000000000004', 'machine_wide', 0, 'machine_wide', 'a8dd58c2-335d-4768-b982-f71be23f3211')
ON CONFLICT (id) DO NOTHING;
