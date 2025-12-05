-- Insert missing residue analysis data for 5 houses
INSERT INTO residue_analysis (batch_id, sample_size, infertile_eggs, early_dead, mid_dead, late_dead, live_pip_number, dead_pip_number, cull_chicks, total_residue_count, contaminated_eggs, malformed_chicks, pipped_not_hatched, unhatched_fertile, pip_number, hatch_percent, hof_percent, hoi_percent, if_dev_percent, lab_technician, notes)
VALUES 
  ('fc6daf6f-91f9-4949-a34f-40b282879644', 648, 32, 15, 18, 22, 3, 2, 8, 100, 2, 3, 5, 12, 5, 84.1, 87.2, 82.5, 4.9, 'John Smith', 'Sample analysis complete'),
  ('656748ff-dc11-412b-9d67-9cac99c92be0', 648, 28, 12, 20, 25, 2, 3, 6, 96, 3, 2, 4, 10, 5, 85.3, 88.1, 83.2, 4.3, 'Maria Garcia', 'Normal residue levels'),
  ('161c9c87-e8df-47a2-a550-d85032d80242', 648, 35, 18, 15, 28, 4, 2, 10, 112, 2, 4, 6, 15, 6, 82.7, 85.9, 80.1, 5.4, 'David Lee', 'Slightly elevated early mortality'),
  ('38fdf0c6-f3c1-46f5-87fb-a2e0fb107c91', 648, 30, 14, 22, 20, 3, 1, 7, 97, 1, 2, 4, 11, 4, 85.0, 87.8, 83.0, 4.6, 'Sarah Johnson', 'Within normal range'),
  ('e0133dd6-c129-436d-9b3b-fc7816cc4c22', 648, 38, 16, 19, 24, 2, 4, 9, 112, 3, 3, 6, 14, 6, 82.1, 85.2, 79.8, 5.9, 'Mike Wilson', 'Monitor late dead levels')
ON CONFLICT (batch_id) DO NOTHING;

-- Insert missing fertility analysis data for 5 houses (without generated column fertility_percent)
INSERT INTO fertility_analysis (batch_id, sample_size, fertile_eggs, infertile_eggs, hatch_percent, hof_percent, hoi_percent, if_dev_percent, technician_name, notes)
VALUES 
  ('161c9c87-e8df-47a2-a550-d85032d80242', 648, 598, 50, 82.7, 85.9, 80.1, 7.7, 'David Lee', 'Fertility check complete'),
  ('38fdf0c6-f3c1-46f5-87fb-a2e0fb107c91', 648, 608, 40, 85.0, 87.8, 83.0, 6.2, 'Sarah Johnson', 'Good fertility'),
  ('e0133dd6-c129-436d-9b3b-fc7816cc4c22', 648, 595, 53, 82.1, 85.2, 79.8, 8.2, 'Mike Wilson', 'Acceptable range'),
  ('656748ff-dc11-412b-9d67-9cac99c92be0', 648, 612, 36, 85.3, 88.1, 83.2, 5.6, 'Maria Garcia', 'Excellent fertility'),
  ('fc6daf6f-91f9-4949-a34f-40b282879644', 648, 602, 46, 84.1, 87.2, 82.5, 7.1, 'John Smith', 'Standard results')
ON CONFLICT (batch_id) DO NOTHING;

-- Insert missing QA monitoring data for 5 houses
INSERT INTO qa_monitoring (batch_id, machine_id, day_of_incubation, temperature, humidity, inspector_name, check_date, check_time, co2_level, turning_frequency, ventilation_rate, notes,
  temp_front_top_left, temp_front_top_right, temp_front_mid_left, temp_front_mid_right, temp_front_bottom_left, temp_front_bottom_right,
  temp_middle_top_left, temp_middle_top_right, temp_middle_mid_left, temp_middle_mid_right, temp_middle_bottom_left, temp_middle_bottom_right,
  temp_back_top_left, temp_back_top_right, temp_back_mid_left, temp_back_mid_right, temp_back_bottom_left, temp_back_bottom_right)
VALUES 
  ('fc6daf6f-91f9-4949-a34f-40b282879644', '00695dcf-b111-4abb-943c-2e8cbba1c0bb', 12, 99.8, 55.2, 'John Smith', CURRENT_DATE, '09:30', 0.42, 24, 18.5, 'Normal readings',
   99.7, 99.9, 99.8, 100.0, 99.6, 99.8, 99.8, 100.0, 99.9, 100.1, 99.7, 99.9, 99.9, 100.1, 100.0, 100.2, 99.8, 100.0),
  ('656748ff-dc11-412b-9d67-9cac99c92be0', '7521a807-ee4c-4a73-9094-dc154d12aac9', 15, 100.1, 54.8, 'Maria Garcia', CURRENT_DATE, '10:15', 0.45, 24, 19.0, 'Optimal conditions',
   100.0, 100.2, 100.1, 100.3, 99.9, 100.1, 100.1, 100.3, 100.2, 100.4, 100.0, 100.2, 100.2, 100.4, 100.3, 100.5, 100.1, 100.3),
  ('161c9c87-e8df-47a2-a550-d85032d80242', 'f07e4336-4c4c-489e-a0df-2611a0ac1010', 8, 99.5, 56.0, 'David Lee', CURRENT_DATE, '11:00', 0.38, 24, 17.5, 'Early stage check',
   99.4, 99.6, 99.5, 99.7, 99.3, 99.5, 99.5, 99.7, 99.6, 99.8, 99.4, 99.6, 99.6, 99.8, 99.7, 99.9, 99.5, 99.7),
  ('38fdf0c6-f3c1-46f5-87fb-a2e0fb107c91', '0867dc55-a99a-45f2-895e-d431e0c95e34', 14, 100.0, 55.5, 'Sarah Johnson', CURRENT_DATE, '14:30', 0.44, 24, 18.8, 'Pre-transfer check',
   99.9, 100.1, 100.0, 100.2, 99.8, 100.0, 100.0, 100.2, 100.1, 100.3, 99.9, 100.1, 100.1, 100.3, 100.2, 100.4, 100.0, 100.2),
  ('e0133dd6-c129-436d-9b3b-fc7816cc4c22', '93b0cf43-15f3-47f3-bb22-48e945ee6831', 16, 100.2, 54.5, 'Mike Wilson', CURRENT_DATE, '15:45', 0.48, 24, 19.2, 'Late setter stage',
   100.1, 100.3, 100.2, 100.4, 100.0, 100.2, 100.2, 100.4, 100.3, 100.5, 100.1, 100.3, 100.3, 100.5, 100.4, 100.6, 100.2, 100.4);

-- Insert missing weight tracking data for 5 houses
INSERT INTO weight_tracking (batch_id, flock_id, machine_id, day_of_incubation, top_weight, middle_weight, bottom_weight, total_weight, percent_loss, target_loss_min, target_loss_max, check_date, notes)
VALUES 
  ('fc6daf6f-91f9-4949-a34f-40b282879644', '9d899433-3e74-4ffb-9719-dd7825390767', '00695dcf-b111-4abb-943c-2e8cbba1c0bb', 12, 58.2, 57.8, 57.5, 173.5, 11.8, 10.0, 14.0, CURRENT_DATE, 'On target'),
  ('656748ff-dc11-412b-9d67-9cac99c92be0', '0a9cbc92-4ea4-4fbd-90f6-c964e59c3a87', '7521a807-ee4c-4a73-9094-dc154d12aac9', 15, 56.5, 56.2, 55.8, 168.5, 13.2, 10.0, 14.0, CURRENT_DATE, 'Good moisture loss'),
  ('161c9c87-e8df-47a2-a550-d85032d80242', '87dc1084-2c20-4855-866e-8a3c8e939c4e', 'f07e4336-4c4c-489e-a0df-2611a0ac1010', 8, 60.5, 60.2, 59.8, 180.5, 8.5, 10.0, 14.0, CURRENT_DATE, 'Early stage weight'),
  ('38fdf0c6-f3c1-46f5-87fb-a2e0fb107c91', '2080f51f-a0ec-499c-8385-3cae879a11d0', '0867dc55-a99a-45f2-895e-d431e0c95e34', 14, 57.0, 56.5, 56.2, 169.7, 12.5, 10.0, 14.0, CURRENT_DATE, 'Normal range'),
  ('e0133dd6-c129-436d-9b3b-fc7816cc4c22', '488eceb5-d8ed-45fb-be81-a0d5db3be67b', '93b0cf43-15f3-47f3-bb22-48e945ee6831', 16, 55.8, 55.4, 55.0, 166.2, 13.8, 10.0, 14.0, CURRENT_DATE, 'Near target max');

-- Insert missing egg pack quality data for ~40 houses (valid UUIDs only)
INSERT INTO egg_pack_quality (batch_id, sample_size, grade_a, grade_b, grade_c, cracked, dirty, small, large, weight_avg, shell_thickness_avg, inspector_name, notes)
VALUES 
  ('7869d5fa-5773-4117-a59b-8e60c89dc5d7', 648, 420, 95, 35, 12, 8, 28, 50, 61.2, 0.38, 'Tom Anderson', 'Good quality'),
  ('fc6daf6f-91f9-4949-a34f-40b282879644', 648, 435, 88, 32, 10, 9, 25, 49, 60.8, 0.39, 'Lisa Chen', 'Excellent grade A'),
  ('31db6d35-b8c9-49c3-a5fa-7908089283cf', 648, 412, 102, 38, 14, 11, 32, 39, 59.5, 0.37, 'James Wilson', 'Standard quality'),
  ('a852ca0a-c725-493c-9f69-d2c6a84a933a', 648, 428, 92, 34, 11, 7, 27, 49, 62.1, 0.40, 'Emma Davis', 'Above average'),
  ('b0404919-1f2c-4e17-be41-d84850d80d6c', 648, 408, 105, 40, 15, 12, 30, 38, 58.9, 0.36, 'Robert Brown', 'Acceptable'),
  ('977980ed-ac72-447f-94bc-e5a4120cbf08', 648, 445, 82, 28, 9, 6, 22, 56, 63.5, 0.41, 'Jennifer Taylor', 'Premium batch'),
  ('e290c5f9-b80d-4234-812f-eec1f46e28a1', 648, 418, 98, 36, 13, 10, 29, 44, 60.2, 0.38, 'Michael Lee', 'Normal range'),
  ('bbe26e4e-23de-4ceb-b2e1-5793ac880858', 648, 432, 90, 33, 10, 8, 26, 49, 61.8, 0.39, 'Sarah Martinez', 'Good shell quality'),
  ('e73063c3-b2cf-48e1-ab47-ac3227c06ce5', 648, 405, 108, 42, 16, 13, 33, 31, 58.2, 0.35, 'David Johnson', 'Monitor quality'),
  ('2745c692-bee2-4b6d-9159-5c46ab33390c', 648, 438, 85, 30, 9, 7, 24, 55, 62.8, 0.40, 'Amanda White', 'Excellent'),
  ('066f99c1-8e6c-49a8-b2c3-c3ee776a3e58', 648, 422, 94, 35, 12, 9, 28, 48, 60.5, 0.38, 'Chris Thompson', 'Standard'),
  ('6699690a-555f-4a25-be24-79151171b691', 648, 415, 100, 37, 14, 11, 31, 40, 59.8, 0.37, 'Kelly Garcia', 'Average quality'),
  ('74c0bf69-f0aa-4e85-9d5c-77398618505b', 648, 440, 84, 29, 10, 6, 23, 56, 63.2, 0.41, 'Brian Rodriguez', 'Premium'),
  ('656748ff-dc11-412b-9d67-9cac99c92be0', 648, 425, 91, 34, 11, 8, 27, 52, 61.5, 0.39, 'Nicole Hernandez', 'Good'),
  ('4fdc231b-e4d7-4bed-9040-eba6a490a236', 648, 410, 104, 39, 15, 12, 32, 36, 58.6, 0.36, 'Steven Moore', 'Below target'),
  ('161c9c87-e8df-47a2-a550-d85032d80242', 648, 448, 80, 27, 8, 5, 21, 59, 64.0, 0.42, 'Rachel Clark', 'Outstanding'),
  ('094a2fb9-1044-4675-b6b3-6520e256332c', 648, 420, 96, 36, 13, 10, 29, 44, 60.0, 0.38, 'Daniel Lewis', 'Normal'),
  ('15887bb4-4775-410c-9788-0170138eb8e9', 648, 430, 89, 32, 10, 8, 26, 53, 61.9, 0.39, 'Michelle Walker', 'Good quality'),
  ('d459a672-67b2-4aaa-9820-d7a1058b5a01', 648, 402, 110, 44, 17, 14, 35, 26, 57.5, 0.34, 'Kevin Hall', 'Needs improvement'),
  ('8114d893-c72c-4289-9144-bddf3eef8eaa', 648, 442, 83, 28, 9, 6, 22, 58, 63.8, 0.41, 'Laura Allen', 'Excellent'),
  ('018a0b2c-ff57-4259-9cec-97dbacf1b133', 648, 417, 97, 37, 14, 11, 30, 42, 59.4, 0.37, 'Ryan Young', 'Standard'),
  ('2745d3c7-a174-484b-89ed-b39fb908df15', 648, 433, 88, 31, 10, 7, 25, 54, 62.5, 0.40, 'Ashley King', 'Above average'),
  ('49ab2a47-c707-49bb-b225-f79bc6d6405b', 648, 425, 92, 34, 12, 9, 28, 48, 60.7, 0.38, 'Joshua Wright', 'Good'),
  ('d2c5882f-21ad-46b2-8f73-db863216980a', 648, 412, 101, 38, 14, 11, 31, 41, 59.2, 0.37, 'Emily Scott', 'Average'),
  ('3582a4e4-4eb7-4ed0-86ea-cfcec0c87873', 648, 438, 86, 30, 9, 7, 24, 54, 62.3, 0.40, 'Andrew Green', 'Very good'),
  ('1cd8f0a4-8854-47d2-aeac-d0fd007669e5', 648, 420, 95, 35, 13, 10, 29, 46, 60.3, 0.38, 'Megan Adams', 'Normal'),
  ('69e8c6a7-7262-4157-bd14-4bd20d911226', 648, 445, 81, 27, 8, 6, 21, 60, 64.2, 0.42, 'Brandon Baker', 'Premium batch'),
  ('c7a814bd-a241-47cc-aced-17dd612f5f05', 648, 408, 106, 41, 16, 13, 33, 31, 58.0, 0.35, 'Jessica Nelson', 'Monitor'),
  ('4b52f7d5-1aac-48a2-8966-de584e6cf687', 648, 435, 87, 31, 10, 7, 25, 53, 62.0, 0.40, 'Tyler Hill', 'Good quality'),
  ('ebdb7e9a-016c-4dd8-92d9-6b545440267b', 648, 422, 93, 36, 12, 9, 28, 48, 60.8, 0.38, 'Samantha Ramirez', 'Standard'),
  ('27743e21-c57f-44ca-92d4-7bb62bf52917', 648, 440, 84, 29, 9, 6, 23, 57, 63.5, 0.41, 'Jacob Campbell', 'Excellent'),
  ('9f4d853c-01c5-48ab-9f6f-d9b0fae97d06', 648, 415, 99, 38, 14, 11, 31, 40, 59.6, 0.37, 'Olivia Mitchell', 'Average'),
  ('c472707a-59c0-4ca9-a2ad-f2c659754fd9', 648, 428, 91, 33, 11, 8, 27, 50, 61.2, 0.39, 'Nathan Roberts', 'Good'),
  ('4a5a262b-7cac-4a72-864c-24f0351dfdb1', 648, 437, 85, 30, 10, 7, 24, 55, 62.6, 0.40, 'Hannah Turner', 'Very good'),
  ('7ac63aed-ad4d-4aaa-b398-fe3dc2c8cd66', 648, 418, 97, 36, 13, 10, 29, 45, 60.1, 0.38, 'Ethan Phillips', 'Normal'),
  ('76183f89-9579-4f93-8e1a-2b6df4cad230', 648, 442, 82, 28, 9, 6, 22, 59, 64.0, 0.41, 'Madison Parker', 'Premium'),
  ('d3824023-e1e6-4752-9515-5955a7459612', 648, 405, 107, 43, 16, 13, 34, 30, 57.8, 0.35, 'Alexander Evans', 'Below average'),
  ('38fdf0c6-f3c1-46f5-87fb-a2e0fb107c91', 648, 430, 89, 32, 11, 8, 26, 52, 61.7, 0.39, 'Sophia Edwards', 'Good quality'),
  ('f0c222e3-fa86-4a82-ad52-3555895f840f', 648, 420, 94, 35, 12, 9, 28, 50, 60.5, 0.38, 'William Collins', 'Standard')
ON CONFLICT DO NOTHING;