-- Fix domain mismatch for Wayne Sanderson Farms
UPDATE public.companies 
SET domain = 'waynesanderson.com', updated_at = now()
WHERE domain = 'waynesandersonfarms.com' AND name = 'Wayne Sanderson Farms';