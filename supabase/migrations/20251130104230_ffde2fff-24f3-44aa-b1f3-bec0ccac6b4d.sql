
-- Step 1: Create Single-Setter Machines (one per hatchery)
INSERT INTO machines (id, machine_number, machine_type, setter_mode, capacity, unit_id, status, data_type)
VALUES 
  ('11111111-0001-0001-0001-000000000001', 'SS-001', 'setter', 'single_setter', 50000, 'd9651cd9-f951-4242-8628-50d3311931e5', 'available', 'original'),
  ('11111111-0001-0001-0001-000000000002', 'SS-002', 'setter', 'single_setter', 50000, 'a34d2c88-a952-4c19-a8cc-79f34b993dc7', 'available', 'original'),
  ('11111111-0001-0001-0001-000000000003', 'SS-003', 'setter', 'single_setter', 50000, 'f5a0e309-271a-41e0-a4f9-86c9c8407fd9', 'available', 'original'),
  ('11111111-0001-0001-0001-000000000004', 'SS-004', 'setter', 'single_setter', 50000, 'cf37474a-77d4-4dd3-8667-2ad8697d4a42', 'available', 'original')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create Houses/Batches assigned to Single-Setters
INSERT INTO batches (id, batch_number, flock_id, machine_id, unit_id, set_date, set_time, expected_hatch_date, total_eggs_set, status, data_type)
VALUES 
  ('22222222-0001-0001-0001-000000000001', 'SUNNY DALE (6009) #3', '397d0bab-3dc1-42a6-aa59-b258b9aa9498', '11111111-0001-0001-0001-000000000001', 'd9651cd9-f951-4242-8628-50d3311931e5', '2025-11-20', '08:30:00', '2025-12-11', 48000, 'incubating', 'original'),
  ('22222222-0001-0001-0001-000000000002', 'VALLEY VIEW (6040) #2', '41482477-2117-4c30-be93-092406d877fe', '11111111-0001-0001-0001-000000000002', 'a34d2c88-a952-4c19-a8cc-79f34b993dc7', '2025-11-21', '09:00:00', '2025-12-12', 45000, 'incubating', 'original'),
  ('22222222-0001-0001-0001-000000000003', 'CRYSTAL LAKE (6007) #3', '797af4b4-20e6-4189-b8c4-a06d2371994f', '11111111-0001-0001-0001-000000000003', 'f5a0e309-271a-41e0-a4f9-86c9c8407fd9', '2025-11-22', '07:45:00', '2025-12-13', 47000, 'incubating', 'original'),
  ('22222222-0001-0001-0001-000000000004', 'TIMBER RIDGE (6006) #2', 'b0459ec9-595e-46f4-805b-5a9d7663bfab', '11111111-0001-0001-0001-000000000004', 'cf37474a-77d4-4dd3-8667-2ad8697d4a42', '2025-11-23', '08:15:00', '2025-12-14', 46000, 'incubating', 'original')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update DHN-S1 multi_setter_sets to have 3 different flocks
DELETE FROM multi_setter_sets WHERE machine_id = '8ccac864-8a24-4b5e-8cea-01b8e166bd22';

INSERT INTO multi_setter_sets (id, machine_id, flock_id, zone, side, level, capacity, set_date, data_type)
VALUES 
  -- Zone A (Front) = FINCH HOLLOW
  ('33333333-0001-0001-0001-000000000001', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '22680894-e306-429d-bf7f-33bbb9f9c562', 'A', 'Left', 'Top', 5000, '2025-11-25', 'original'),
  ('33333333-0001-0001-0001-000000000002', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '22680894-e306-429d-bf7f-33bbb9f9c562', 'A', 'Left', 'Middle', 5000, '2025-11-25', 'original'),
  ('33333333-0001-0001-0001-000000000003', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '22680894-e306-429d-bf7f-33bbb9f9c562', 'A', 'Left', 'Bottom', 5000, '2025-11-25', 'original'),
  ('33333333-0001-0001-0001-000000000004', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '22680894-e306-429d-bf7f-33bbb9f9c562', 'A', 'Right', 'Top', 5000, '2025-11-25', 'original'),
  ('33333333-0001-0001-0001-000000000005', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '22680894-e306-429d-bf7f-33bbb9f9c562', 'A', 'Right', 'Middle', 5000, '2025-11-25', 'original'),
  ('33333333-0001-0001-0001-000000000006', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '22680894-e306-429d-bf7f-33bbb9f9c562', 'A', 'Right', 'Bottom', 5000, '2025-11-25', 'original'),
  -- Zone B (Middle) = DOVE FARM
  ('33333333-0001-0001-0001-000000000007', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '04a02b46-45a0-415b-81f2-f81efc15bea0', 'B', 'Left', 'Top', 5000, '2025-11-26', 'original'),
  ('33333333-0001-0001-0001-000000000008', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '04a02b46-45a0-415b-81f2-f81efc15bea0', 'B', 'Left', 'Middle', 5000, '2025-11-26', 'original'),
  ('33333333-0001-0001-0001-000000000009', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '04a02b46-45a0-415b-81f2-f81efc15bea0', 'B', 'Left', 'Bottom', 5000, '2025-11-26', 'original'),
  ('33333333-0001-0001-0001-000000000010', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '04a02b46-45a0-415b-81f2-f81efc15bea0', 'B', 'Right', 'Top', 5000, '2025-11-26', 'original'),
  ('33333333-0001-0001-0001-000000000011', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '04a02b46-45a0-415b-81f2-f81efc15bea0', 'B', 'Right', 'Middle', 5000, '2025-11-26', 'original'),
  ('33333333-0001-0001-0001-000000000012', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', '04a02b46-45a0-415b-81f2-f81efc15bea0', 'B', 'Right', 'Bottom', 5000, '2025-11-26', 'original'),
  -- Zone C (Back) = PRAIRIE LANDS
  ('33333333-0001-0001-0001-000000000013', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 'a8dd58c2-335d-4768-b982-f71be23f3211', 'C', 'Left', 'Top', 5000, '2025-11-27', 'original'),
  ('33333333-0001-0001-0001-000000000014', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 'a8dd58c2-335d-4768-b982-f71be23f3211', 'C', 'Left', 'Middle', 5000, '2025-11-27', 'original'),
  ('33333333-0001-0001-0001-000000000015', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 'a8dd58c2-335d-4768-b982-f71be23f3211', 'C', 'Left', 'Bottom', 5000, '2025-11-27', 'original'),
  ('33333333-0001-0001-0001-000000000016', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 'a8dd58c2-335d-4768-b982-f71be23f3211', 'C', 'Right', 'Top', 5000, '2025-11-27', 'original'),
  ('33333333-0001-0001-0001-000000000017', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 'a8dd58c2-335d-4768-b982-f71be23f3211', 'C', 'Right', 'Middle', 5000, '2025-11-27', 'original'),
  ('33333333-0001-0001-0001-000000000018', '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 'a8dd58c2-335d-4768-b982-f71be23f3211', 'C', 'Right', 'Bottom', 5000, '2025-11-27', 'original');

-- Step 4: Create Single-Setter QA Entry for SS-001
INSERT INTO qa_monitoring (id, batch_id, machine_id, check_date, check_time, day_of_incubation, temperature, humidity, inspector_name, entry_mode,
  temp_front_top_left, temp_front_top_right, temp_front_mid_left, temp_front_mid_right, temp_front_bottom_left, temp_front_bottom_right,
  temp_middle_top_left, temp_middle_top_right, temp_middle_mid_left, temp_middle_mid_right, temp_middle_bottom_left, temp_middle_bottom_right,
  temp_back_top_left, temp_back_top_right, temp_back_mid_left, temp_back_mid_right, temp_back_bottom_left, temp_back_bottom_right,
  temp_avg_front, temp_avg_middle, temp_avg_back, temp_avg_overall)
VALUES 
  ('44444444-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000001', 
   '2025-11-28', '10:30:00', 8, 99.8, 55.5, 'John Smith', 'house',
   99.7, 99.8, 99.9, 100.0, 99.6, 99.7,
   100.0, 100.1, 99.8, 99.9, 99.7, 99.8,
   99.9, 100.0, 99.7, 99.8, 99.6, 99.7,
   99.78, 99.88, 99.78, 99.81)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create Multi-Setter 18-Point Temperature QA Entry for DHN-S1
INSERT INTO qa_monitoring (id, batch_id, machine_id, check_date, check_time, day_of_incubation, temperature, humidity, inspector_name, entry_mode,
  temp_front_top_left, temp_front_top_right, temp_front_mid_left, temp_front_mid_right, temp_front_bottom_left, temp_front_bottom_right,
  temp_middle_top_left, temp_middle_top_right, temp_middle_mid_left, temp_middle_mid_right, temp_middle_bottom_left, temp_middle_bottom_right,
  temp_back_top_left, temp_back_top_right, temp_back_mid_left, temp_back_mid_right, temp_back_bottom_left, temp_back_bottom_right,
  temp_avg_front, temp_avg_middle, temp_avg_back, temp_avg_overall)
VALUES 
  ('44444444-0001-0001-0001-000000000002', NULL, '8ccac864-8a24-4b5e-8cea-01b8e166bd22', 
   '2025-11-28', '11:00:00', 3, 99.9, 56.0, 'Mary Johnson', 'machine',
   99.8, 99.9, 100.0, 100.1, 99.7, 99.8,
   100.1, 100.2, 99.9, 100.0, 99.8, 99.9,
   100.0, 100.1, 99.8, 99.9, 99.7, 99.8,
   99.88, 99.98, 99.88, 99.91)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Create qa_position_linkage for 18-Point Temps
INSERT INTO qa_position_linkage (id, qa_monitoring_id, position, temperature, linkage_type, multi_setter_set_id, resolved_flock_id)
VALUES 
  -- Zone A = FINCH HOLLOW
  ('55555555-0001-0001-0001-000000000001', '44444444-0001-0001-0001-000000000002', 'front_top_left', 99.8, 'position', '33333333-0001-0001-0001-000000000001', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  ('55555555-0001-0001-0001-000000000002', '44444444-0001-0001-0001-000000000002', 'front_top_right', 99.9, 'position', '33333333-0001-0001-0001-000000000004', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  ('55555555-0001-0001-0001-000000000003', '44444444-0001-0001-0001-000000000002', 'front_mid_left', 100.0, 'position', '33333333-0001-0001-0001-000000000002', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  ('55555555-0001-0001-0001-000000000004', '44444444-0001-0001-0001-000000000002', 'front_mid_right', 100.1, 'position', '33333333-0001-0001-0001-000000000005', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  ('55555555-0001-0001-0001-000000000005', '44444444-0001-0001-0001-000000000002', 'front_bottom_left', 99.7, 'position', '33333333-0001-0001-0001-000000000003', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  ('55555555-0001-0001-0001-000000000006', '44444444-0001-0001-0001-000000000002', 'front_bottom_right', 99.8, 'position', '33333333-0001-0001-0001-000000000006', '22680894-e306-429d-bf7f-33bbb9f9c562'),
  -- Zone B = DOVE FARM
  ('55555555-0001-0001-0001-000000000007', '44444444-0001-0001-0001-000000000002', 'middle_top_left', 100.1, 'position', '33333333-0001-0001-0001-000000000007', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  ('55555555-0001-0001-0001-000000000008', '44444444-0001-0001-0001-000000000002', 'middle_top_right', 100.2, 'position', '33333333-0001-0001-0001-000000000010', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  ('55555555-0001-0001-0001-000000000009', '44444444-0001-0001-0001-000000000002', 'middle_mid_left', 99.9, 'position', '33333333-0001-0001-0001-000000000008', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  ('55555555-0001-0001-0001-000000000010', '44444444-0001-0001-0001-000000000002', 'middle_mid_right', 100.0, 'position', '33333333-0001-0001-0001-000000000011', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  ('55555555-0001-0001-0001-000000000011', '44444444-0001-0001-0001-000000000002', 'middle_bottom_left', 99.8, 'position', '33333333-0001-0001-0001-000000000009', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  ('55555555-0001-0001-0001-000000000012', '44444444-0001-0001-0001-000000000002', 'middle_bottom_right', 99.9, 'position', '33333333-0001-0001-0001-000000000012', '04a02b46-45a0-415b-81f2-f81efc15bea0'),
  -- Zone C = PRAIRIE LANDS
  ('55555555-0001-0001-0001-000000000013', '44444444-0001-0001-0001-000000000002', 'back_top_left', 100.0, 'position', '33333333-0001-0001-0001-000000000013', 'a8dd58c2-335d-4768-b982-f71be23f3211'),
  ('55555555-0001-0001-0001-000000000014', '44444444-0001-0001-0001-000000000002', 'back_top_right', 100.1, 'position', '33333333-0001-0001-0001-000000000016', 'a8dd58c2-335d-4768-b982-f71be23f3211'),
  ('55555555-0001-0001-0001-000000000015', '44444444-0001-0001-0001-000000000002', 'back_mid_left', 99.8, 'position', '33333333-0001-0001-0001-000000000014', 'a8dd58c2-335d-4768-b982-f71be23f3211'),
  ('55555555-0001-0001-0001-000000000016', '44444444-0001-0001-0001-000000000002', 'back_mid_right', 99.9, 'position', '33333333-0001-0001-0001-000000000017', 'a8dd58c2-335d-4768-b982-f71be23f3211'),
  ('55555555-0001-0001-0001-000000000017', '44444444-0001-0001-0001-000000000002', 'back_bottom_left', 99.7, 'position', '33333333-0001-0001-0001-000000000015', 'a8dd58c2-335d-4768-b982-f71be23f3211'),
  ('55555555-0001-0001-0001-000000000018', '44444444-0001-0001-0001-000000000002', 'back_bottom_right', 99.8, 'position', '33333333-0001-0001-0001-000000000018', 'a8dd58c2-335d-4768-b982-f71be23f3211')
ON CONFLICT (id) DO NOTHING;
