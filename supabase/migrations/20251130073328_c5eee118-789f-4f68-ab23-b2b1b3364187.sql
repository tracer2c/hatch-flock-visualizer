-- =====================================================
-- Multi-Setter QA Linkage System
-- =====================================================

-- 1. Create qa_position_linkage table to store position-level QA data
CREATE TABLE public.qa_position_linkage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    qa_monitoring_id uuid NOT NULL REFERENCES qa_monitoring(id) ON DELETE CASCADE,
    position text NOT NULL,
    temperature numeric NOT NULL,
    multi_setter_set_id uuid REFERENCES multi_setter_sets(id) ON DELETE SET NULL,
    resolved_flock_id uuid REFERENCES flocks(id) ON DELETE SET NULL,
    resolved_batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    
    CONSTRAINT valid_position CHECK (position IN (
        'front_top_left', 'front_top_right', 'front_mid_left', 'front_mid_right', 
        'front_bottom_left', 'front_bottom_right',
        'middle_top_left', 'middle_top_right', 'middle_mid_left', 'middle_mid_right',
        'middle_bottom_left', 'middle_bottom_right',
        'back_top_left', 'back_top_right', 'back_mid_left', 'back_mid_right',
        'back_bottom_left', 'back_bottom_right'
    ))
);

-- Indexes for performance
CREATE INDEX idx_qa_position_qa_id ON qa_position_linkage(qa_monitoring_id);
CREATE INDEX idx_qa_position_set_id ON qa_position_linkage(multi_setter_set_id);
CREATE INDEX idx_qa_position_flock_id ON qa_position_linkage(resolved_flock_id);
CREATE INDEX idx_qa_position_batch_id ON qa_position_linkage(resolved_batch_id);

-- 2. Modify qa_monitoring table - make batch_id nullable for machine-level entries
ALTER TABLE qa_monitoring ALTER COLUMN batch_id DROP NOT NULL;

-- 3. Add entry_mode column to qa_monitoring
ALTER TABLE qa_monitoring ADD COLUMN entry_mode text DEFAULT 'house' NOT NULL;

-- 4. Add constraint for valid entry_mode values
ALTER TABLE qa_monitoring ADD CONSTRAINT valid_entry_mode CHECK (entry_mode IN ('house', 'machine'));

-- 5. Enable RLS on new table
ALTER TABLE qa_position_linkage ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy for qa_position_linkage
CREATE POLICY "Allow all operations on qa_position_linkage"
ON qa_position_linkage FOR ALL
USING (true);