-- ============================================
-- TROY: 56 Multi-Stage Setters (TROY - 01 to TROY - 56)
-- Capacity: 87,480 | setter_mode: multi_setter
-- ============================================
INSERT INTO public.machines (machine_number, machine_type, capacity, status, company_id, unit_id, setter_mode, data_type)
SELECT 
  'TROY - ' || LPAD(n::text, 2, '0'),
  'setter',
  87480,
  'available',
  '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9',
  '71fc006f-001f-46b0-9829-62930a7164f8',
  'multi_setter',
  'original'
FROM generate_series(1, 56) AS n;

-- ============================================
-- TROY: 27 Single-Stage Setters (TROY - SS01 to TROY - SS27)
-- Capacity: 9,144 | setter_mode: single_setter
-- ============================================
INSERT INTO public.machines (machine_number, machine_type, capacity, status, company_id, unit_id, setter_mode, data_type)
SELECT 
  'TROY - SS' || LPAD(n::text, 2, '0'),
  'setter',
  9144,
  'available',
  '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9',
  '71fc006f-001f-46b0-9829-62930a7164f8',
  'single_setter',
  'original'
FROM generate_series(1, 27) AS n;

-- ============================================
-- ENT: 26 Multi-Stage Setters (ENT - 01 to ENT - 26)
-- Capacity: 87,480 | setter_mode: multi_setter
-- ============================================
INSERT INTO public.machines (machine_number, machine_type, capacity, status, company_id, unit_id, setter_mode, data_type)
SELECT 
  'ENT - ' || LPAD(n::text, 2, '0'),
  'setter',
  87480,
  'available',
  '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9',
  '97b242e9-bf3e-4587-afa4-7c2811e1f7f6',
  'multi_setter',
  'original'
FROM generate_series(1, 26) AS n;

-- ============================================
-- DHN: 34 Multi-Stage Setters (DHN - 01 to DHN - 34)
-- Capacity: 87,480 | setter_mode: multi_setter
-- ============================================
INSERT INTO public.machines (machine_number, machine_type, capacity, status, company_id, unit_id, setter_mode, data_type)
SELECT 
  'DHN - ' || LPAD(n::text, 2, '0'),
  'setter',
  87480,
  'available',
  '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9',
  'fe852edc-65e5-4868-bc24-34834f0665d6',
  'multi_setter',
  'original'
FROM generate_series(1, 34) AS n;

-- ============================================
-- SAM: 28 Multi-Stage Setters (SAM - 01 to SAM - 28)
-- Capacity: 93,312 | setter_mode: multi_setter
-- ============================================
INSERT INTO public.machines (machine_number, machine_type, capacity, status, company_id, unit_id, setter_mode, data_type)
SELECT 
  'SAM - ' || LPAD(n::text, 2, '0'),
  'setter',
  93312,
  'available',
  '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9',
  'b06e1183-27be-42c3-b8f2-982ddab4eee5',
  'multi_setter',
  'original'
FROM generate_series(1, 28) AS n;