-- Populate missing residue analysis characteristics fields with realistic data
UPDATE public.residue_analysis
SET 
  brain_defects = (random() * 5)::integer,
  dry_egg = 1 + (random() * 7)::integer,
  malpositioned = 2 + (random() * 8)::integer,
  upside_down = 1 + (random() * 5)::integer,
  transfer_crack = 1 + (random() * 7)::integer,
  handling_cracks = 2 + (random() * 10)::integer,
  abnormal = (random() * 4)::integer,
  mold = (random() * 3)::integer
WHERE brain_defects IS NULL 
   OR dry_egg IS NULL 
   OR malpositioned IS NULL 
   OR upside_down IS NULL 
   OR transfer_crack IS NULL 
   OR handling_cracks IS NULL;