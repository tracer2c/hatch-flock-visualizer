
-- Fix: Replace global unique constraint on machine_number with per-company unique constraint
ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_machine_number_key;
ALTER TABLE public.machines ADD CONSTRAINT machines_company_machine_number_key UNIQUE (company_id, machine_number);

-- Now replicate hatcheries and machines to Wayne Sanderson Farms
WITH new_units AS (
  INSERT INTO public.units (name, code, description, status, company_id)
  SELECT name, code, description, status, '31165db9-014c-4d69-bd04-8d170699d7f2'::uuid
  FROM public.units
  WHERE company_id = '00000000-0000-0000-0000-000000000001'
  RETURNING id, name
),
unit_mapping AS (
  SELECT old_u.id AS old_unit_id, new_u.id AS new_unit_id
  FROM public.units old_u
  JOIN new_units new_u ON old_u.name = new_u.name
  WHERE old_u.company_id = '00000000-0000-0000-0000-000000000001'
)
INSERT INTO public.machines (machine_number, machine_type, capacity, status, setter_mode, location, notes, data_type, unit_id, company_id)
SELECT m.machine_number, m.machine_type, m.capacity, m.status, m.setter_mode, m.location, m.notes, m.data_type,
       um.new_unit_id, '31165db9-014c-4d69-bd04-8d170699d7f2'::uuid
FROM public.machines m
JOIN unit_mapping um ON m.unit_id = um.old_unit_id
WHERE m.company_id = '00000000-0000-0000-0000-000000000001';
