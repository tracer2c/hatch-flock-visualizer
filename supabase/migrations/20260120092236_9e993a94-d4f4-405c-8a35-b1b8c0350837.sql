-- Update TROY single-setter machines capacity from 9,144 to 99,144
UPDATE public.machines 
SET capacity = 99144, updated_at = now()
WHERE company_id = '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9'
  AND unit_id = '71fc006f-001f-46b0-9829-62930a7164f8'
  AND setter_mode = 'single_setter';