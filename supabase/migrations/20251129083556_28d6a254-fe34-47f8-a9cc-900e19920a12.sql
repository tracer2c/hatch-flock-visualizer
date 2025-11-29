-- Phase 1: Rename "Training-Flock-XXXX" flocks to realistic production names
-- First, create a temporary function to generate realistic flock names
DO $$
DECLARE
    flock_record RECORD;
    name_counter INTEGER := 1;
    new_name TEXT;
    name_array TEXT[] := ARRAY[
        'HIGHLANDS', 'RIVERSIDE', 'VALLEY VIEW', 'SUNSET FARMS', 'GREEN MEADOWS',
        'GOLDEN ACRES', 'LAKESIDE', 'PINE RIDGE', 'MAPLE GROVE', 'OAK HOLLOW',
        'CEDAR POINT', 'WILLOW CREEK', 'SPRING VALLEY', 'HARVEST HILL', 'BLUE SKY',
        'SILVER SPRINGS', 'MOUNTAIN VIEW', 'PRAIRIE LANDS', 'TIMBER RIDGE', 'CRYSTAL LAKE',
        'ROLLING HILLS', 'SUNNY DALE', 'FOREST GLEN', 'BROOK SIDE', 'MEADOW LARK',
        'WINDY RIDGE', 'STONE CREEK', 'EAGLE NEST', 'HAWK VALLEY', 'DOVE FARM',
        'ROBIN HILL', 'CARDINAL POINT', 'SPARROW DALE', 'FINCH HOLLOW', 'CRANE RIDGE',
        'HERON LAKE', 'PELICAN BAY', 'SWAN MEADOW', 'GOOSE CREEK', 'DUCK POND',
        'PHEASANT RUN', 'QUAIL RIDGE', 'TURKEY HOLLOW', 'PARTRIDGE FARM', 'GROUSE HILL',
        'PEACOCK MANOR', 'OSTRICH PLAINS', 'EMU RANCH', 'KIWI GROVE', 'PENGUIN POINT'
    ];
BEGIN
    FOR flock_record IN 
        SELECT id FROM public.flocks 
        WHERE flock_name LIKE 'Training-Flock-%' 
        AND data_type = 'original'
        ORDER BY created_at
        LIMIT 50
    LOOP
        new_name := name_array[name_counter];
        
        UPDATE public.flocks 
        SET flock_name = new_name,
            updated_at = now()
        WHERE id = flock_record.id;
        
        name_counter := name_counter + 1;
    END LOOP;
END $$;

-- Phase 2: Generate 18-point temperature data for 50 QA records
-- Update QA records with realistic temperature values
UPDATE public.qa_monitoring
SET 
    -- Front zone temperatures (slightly warmer, 99.8-100.4)
    temp_front_top_left = 99.8 + (random() * 0.6),
    temp_front_top_right = 99.8 + (random() * 0.6),
    temp_front_mid_left = 99.9 + (random() * 0.5),
    temp_front_mid_right = 99.9 + (random() * 0.5),
    temp_front_bottom_left = 100.0 + (random() * 0.4),
    temp_front_bottom_right = 100.0 + (random() * 0.4),
    
    -- Middle zone temperatures (optimal range, 99.5-100.5)
    temp_middle_top_left = 99.5 + (random() * 0.8),
    temp_middle_top_right = 99.5 + (random() * 0.8),
    temp_middle_mid_left = 99.7 + (random() * 0.6),
    temp_middle_mid_right = 99.7 + (random() * 0.6),
    temp_middle_bottom_left = 99.8 + (random() * 0.5),
    temp_middle_bottom_right = 99.8 + (random() * 0.5),
    
    -- Back zone temperatures (slightly cooler, 99.3-100.2)
    temp_back_top_left = 99.3 + (random() * 0.7),
    temp_back_top_right = 99.3 + (random() * 0.7),
    temp_back_mid_left = 99.5 + (random() * 0.6),
    temp_back_mid_right = 99.5 + (random() * 0.6),
    temp_back_bottom_left = 99.6 + (random() * 0.5),
    temp_back_bottom_right = 99.6 + (random() * 0.5)
WHERE id IN (
    SELECT id FROM public.qa_monitoring 
    WHERE temp_front_top_left IS NULL
    ORDER BY created_at DESC
    LIMIT 50
);

-- Phase 3: Calculate and update zone averages for all records that have 18-point data
UPDATE public.qa_monitoring
SET 
    temp_avg_front = ROUND((
        COALESCE(temp_front_top_left, 0) + COALESCE(temp_front_top_right, 0) +
        COALESCE(temp_front_mid_left, 0) + COALESCE(temp_front_mid_right, 0) +
        COALESCE(temp_front_bottom_left, 0) + COALESCE(temp_front_bottom_right, 0)
    ) / 6.0, 2),
    temp_avg_middle = ROUND((
        COALESCE(temp_middle_top_left, 0) + COALESCE(temp_middle_top_right, 0) +
        COALESCE(temp_middle_mid_left, 0) + COALESCE(temp_middle_mid_right, 0) +
        COALESCE(temp_middle_bottom_left, 0) + COALESCE(temp_middle_bottom_right, 0)
    ) / 6.0, 2),
    temp_avg_back = ROUND((
        COALESCE(temp_back_top_left, 0) + COALESCE(temp_back_top_right, 0) +
        COALESCE(temp_back_mid_left, 0) + COALESCE(temp_back_mid_right, 0) +
        COALESCE(temp_back_bottom_left, 0) + COALESCE(temp_back_bottom_right, 0)
    ) / 6.0, 2),
    temp_avg_overall = ROUND((
        COALESCE(temp_front_top_left, 0) + COALESCE(temp_front_top_right, 0) +
        COALESCE(temp_front_mid_left, 0) + COALESCE(temp_front_mid_right, 0) +
        COALESCE(temp_front_bottom_left, 0) + COALESCE(temp_front_bottom_right, 0) +
        COALESCE(temp_middle_top_left, 0) + COALESCE(temp_middle_top_right, 0) +
        COALESCE(temp_middle_mid_left, 0) + COALESCE(temp_middle_mid_right, 0) +
        COALESCE(temp_middle_bottom_left, 0) + COALESCE(temp_middle_bottom_right, 0) +
        COALESCE(temp_back_top_left, 0) + COALESCE(temp_back_top_right, 0) +
        COALESCE(temp_back_mid_left, 0) + COALESCE(temp_back_mid_right, 0) +
        COALESCE(temp_back_bottom_left, 0) + COALESCE(temp_back_bottom_right, 0)
    ) / 18.0, 2)
WHERE temp_front_top_left IS NOT NULL;