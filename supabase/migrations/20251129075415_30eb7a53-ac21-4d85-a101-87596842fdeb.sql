-- Phase 1: Merge all dummy data to original
UPDATE public.batches SET data_type = 'original' WHERE data_type = 'dummy';
UPDATE public.flocks SET data_type = 'original' WHERE data_type = 'dummy';
UPDATE public.machines SET data_type = 'original' WHERE data_type = 'dummy';

-- Phase 2: Create realistic machines distributed across hatcheries
DO $$
DECLARE
    dhn_id UUID;
    sam_id UUID;
    troy_id UUID;
    ent_id UUID;
BEGIN
    SELECT id INTO dhn_id FROM public.units WHERE name = 'DHN' LIMIT 1;
    SELECT id INTO sam_id FROM public.units WHERE name = 'SAM' LIMIT 1;
    SELECT id INTO troy_id FROM public.units WHERE name = 'Troy' LIMIT 1;
    SELECT id INTO ent_id FROM public.units WHERE name = 'ENT' LIMIT 1;

    INSERT INTO public.machines (machine_number, machine_type, capacity, unit_id, status, location, data_type)
    VALUES 
        ('DHN-S1', 'setter'::machine_type, 75000, dhn_id, 'available', 'DHN Building A', 'original'),
        ('DHN-S2', 'setter'::machine_type, 75000, dhn_id, 'available', 'DHN Building A', 'original'),
        ('DHN-S3', 'setter'::machine_type, 60000, dhn_id, 'available', 'DHN Building B', 'original'),
        ('DHN-H1', 'hatcher'::machine_type, 50000, dhn_id, 'available', 'DHN Building C', 'original'),
        ('DHN-H2', 'hatcher'::machine_type, 50000, dhn_id, 'available', 'DHN Building C', 'original'),
        ('SAM-S1', 'setter'::machine_type, 80000, sam_id, 'available', 'SAM Main Hall', 'original'),
        ('SAM-S2', 'setter'::machine_type, 80000, sam_id, 'available', 'SAM Main Hall', 'original'),
        ('SAM-S3', 'setter'::machine_type, 65000, sam_id, 'available', 'SAM Wing B', 'original'),
        ('SAM-H1', 'hatcher'::machine_type, 55000, sam_id, 'available', 'SAM Hatch Wing', 'original'),
        ('SAM-H2', 'hatcher'::machine_type, 55000, sam_id, 'available', 'SAM Hatch Wing', 'original'),
        ('TROY-S1', 'setter'::machine_type, 70000, troy_id, 'available', 'Troy Facility 1', 'original'),
        ('TROY-S2', 'setter'::machine_type, 70000, troy_id, 'available', 'Troy Facility 1', 'original'),
        ('TROY-S3', 'setter'::machine_type, 55000, troy_id, 'available', 'Troy Facility 2', 'original'),
        ('TROY-H1', 'hatcher'::machine_type, 45000, troy_id, 'available', 'Troy Hatch Center', 'original'),
        ('TROY-H2', 'hatcher'::machine_type, 45000, troy_id, 'available', 'Troy Hatch Center', 'original'),
        ('ENT-S1', 'setter'::machine_type, 85000, ent_id, 'available', 'ENT Production A', 'original'),
        ('ENT-S2', 'setter'::machine_type, 85000, ent_id, 'available', 'ENT Production A', 'original'),
        ('ENT-S3', 'setter'::machine_type, 70000, ent_id, 'available', 'ENT Production B', 'original'),
        ('ENT-H1', 'hatcher'::machine_type, 60000, ent_id, 'available', 'ENT Hatch Bay', 'original'),
        ('ENT-H2', 'hatcher'::machine_type, 60000, ent_id, 'available', 'ENT Hatch Bay', 'original');
END $$;

-- Reassign batches to appropriate machines
UPDATE public.batches b
SET machine_id = (
    SELECT m.id FROM public.machines m 
    WHERE m.unit_id = b.unit_id 
    AND m.machine_type = (CASE 
        WHEN b.status IN ('setting', 'incubating') THEN 'setter'
        WHEN b.status IN ('hatching', 'completed') THEN 'hatcher'
        ELSE 'setter'
    END)::machine_type
    ORDER BY random()
    LIMIT 1
)
WHERE b.unit_id IS NOT NULL;

-- Phase 3: Fill missing analysis data

-- Insert missing fertility_analysis records
INSERT INTO public.fertility_analysis (batch_id, sample_size, fertile_eggs, infertile_eggs, hatch_percent, hof_percent, hoi_percent, if_dev_percent, technician_name, notes, analysis_date)
SELECT 
    b.id, 648,
    648 - (30 + floor(random() * 50)::int),
    30 + floor(random() * 50)::int,
    75 + (random() * 15)::numeric(5,2),
    80 + (random() * 12)::numeric(5,2),
    78 + (random() * 14)::numeric(5,2),
    4 + (random() * 6)::numeric(5,2),
    (ARRAY['John Smith', 'Maria Garcia', 'David Chen', 'Sarah Johnson', 'Mike Wilson'])[floor(random() * 5 + 1)::int],
    'Routine fertility analysis',
    b.set_date + interval '7 days'
FROM public.batches b
WHERE NOT EXISTS (SELECT 1 FROM public.fertility_analysis fa WHERE fa.batch_id = b.id);

-- Insert missing residue_analysis records
INSERT INTO public.residue_analysis (
    batch_id, sample_size, total_residue_count, infertile_eggs, fertile_eggs,
    early_dead, mid_dead, late_dead, cull_chicks, live_pip_number, dead_pip_number,
    malformed_chicks, contaminated_eggs, pipped_not_hatched, unhatched_fertile,
    hatch_percent, hof_percent, hoi_percent, if_dev_percent, residue_percent,
    lab_technician, notes, analysis_date
)
SELECT 
    b.id, 648,
    80 + floor(random() * 60)::int,
    30 + floor(random() * 40)::int,
    648 - (30 + floor(random() * 40)::int),
    8 + floor(random() * 12)::int,
    6 + floor(random() * 10)::int,
    10 + floor(random() * 15)::int,
    3 + floor(random() * 8)::int,
    2 + floor(random() * 5)::int,
    3 + floor(random() * 6)::int,
    1 + floor(random() * 4)::int,
    2 + floor(random() * 5)::int,
    4 + floor(random() * 8)::int,
    5 + floor(random() * 10)::int,
    75 + (random() * 15)::numeric(5,2),
    80 + (random() * 12)::numeric(5,2),
    78 + (random() * 14)::numeric(5,2),
    4 + (random() * 6)::numeric(5,2),
    12 + (random() * 10)::numeric(5,2),
    (ARRAY['Lab Tech A', 'Lab Tech B', 'Lab Tech C', 'Lab Tech D'])[floor(random() * 4 + 1)::int],
    'Standard residue analysis completed',
    b.expected_hatch_date
FROM public.batches b
WHERE NOT EXISTS (SELECT 1 FROM public.residue_analysis ra WHERE ra.batch_id = b.id);

-- Insert missing egg_pack_quality records
INSERT INTO public.egg_pack_quality (
    batch_id, sample_size, grade_a, grade_b, grade_c, cracked, dirty,
    small, large, weight_avg, shell_thickness_avg, inspector_name, notes, inspection_date
)
SELECT 
    b.id, 100,
    75 + floor(random() * 10)::int,
    8 + floor(random() * 7)::int,
    2 + floor(random() * 4)::int,
    1 + floor(random() * 3)::int,
    1 + floor(random() * 4)::int,
    3 + floor(random() * 5)::int,
    2 + floor(random() * 4)::int,
    62 + (random() * 6)::numeric(4,1),
    0.35 + (random() * 0.08)::numeric(4,3),
    (ARRAY['Inspector A', 'Inspector B', 'Inspector C'])[floor(random() * 3 + 1)::int],
    'Quality inspection completed',
    b.set_date - interval '1 day'
FROM public.batches b
WHERE NOT EXISTS (SELECT 1 FROM public.egg_pack_quality eq WHERE eq.batch_id = b.id);

-- Insert missing qa_monitoring records
INSERT INTO public.qa_monitoring (
    batch_id, check_date, check_time, day_of_incubation, temperature, humidity,
    co2_level, ventilation_rate, turning_frequency, inspector_name, notes
)
SELECT 
    b.id,
    b.set_date + interval '10 days',
    '10:30'::time,
    11,
    99.3 + (random() * 0.9)::numeric(4,2),
    53 + (random() * 5)::numeric(4,1),
    0.3 + (random() * 0.4)::numeric(3,2),
    25 + (random() * 10)::numeric(4,1),
    floor(random() * 3 + 1)::int,
    (ARRAY['QA Tech 1', 'QA Tech 2', 'QA Tech 3', 'QA Tech 4'])[floor(random() * 4 + 1)::int],
    'Routine QA monitoring check'
FROM public.batches b
WHERE NOT EXISTS (SELECT 1 FROM public.qa_monitoring qa WHERE qa.batch_id = b.id);

-- Update batches with eggs_cleared from fertility data
UPDATE public.batches b
SET eggs_cleared = fa.infertile_eggs
FROM public.fertility_analysis fa
WHERE fa.batch_id = b.id AND (b.eggs_cleared IS NULL OR b.eggs_cleared = 0);

-- Update batches with eggs_injected from fertility data
UPDATE public.batches b
SET eggs_injected = fa.fertile_eggs
FROM public.fertility_analysis fa
WHERE fa.batch_id = b.id AND (b.eggs_injected IS NULL OR b.eggs_injected = 0);

-- Update batches with chicks_hatched from residue data
UPDATE public.batches b
SET chicks_hatched = GREATEST(0, 
    COALESCE(fa.fertile_eggs, 608) - 
    COALESCE(ra.early_dead, 0) - 
    COALESCE(ra.mid_dead, 0) - 
    COALESCE(ra.late_dead, 0) - 
    COALESCE(ra.cull_chicks, 0) - 
    COALESCE(ra.live_pip_number, 0) - 
    COALESCE(ra.dead_pip_number, 0)
)
FROM public.fertility_analysis fa, public.residue_analysis ra
WHERE fa.batch_id = b.id AND ra.batch_id = b.id AND (b.chicks_hatched IS NULL OR b.chicks_hatched = 0);