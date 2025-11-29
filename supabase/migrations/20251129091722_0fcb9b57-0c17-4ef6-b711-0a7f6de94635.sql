-- Create setter_mode enum
CREATE TYPE setter_mode AS ENUM ('single_setter', 'multi_setter');

-- Create zone_type enum (A = Front, B = Middle, C = Back)
CREATE TYPE zone_type AS ENUM ('A', 'B', 'C');

-- Create side_type enum
CREATE TYPE side_type AS ENUM ('Left', 'Right');

-- Add setter_mode column to machines table
ALTER TABLE machines ADD COLUMN setter_mode setter_mode;

-- Set ALL existing setter/combo machines to multi_setter (Option B per user request)
UPDATE machines 
SET setter_mode = 'multi_setter'::setter_mode
WHERE machine_type IN ('setter', 'combo');

-- Create multi_setter_sets table for tracking sets in multi-setter machines
CREATE TABLE multi_setter_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  capacity INTEGER NOT NULL,
  zone zone_type NOT NULL,
  side side_type NOT NULL,
  set_date DATE NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'original' CHECK (data_type IN ('original', 'dummy')),
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_multi_setter_sets_machine_id ON multi_setter_sets(machine_id);
CREATE INDEX idx_multi_setter_sets_flock_id ON multi_setter_sets(flock_id);
CREATE INDEX idx_multi_setter_sets_batch_id ON multi_setter_sets(batch_id);
CREATE INDEX idx_multi_setter_sets_set_date ON multi_setter_sets(set_date);
CREATE INDEX idx_multi_setter_sets_data_type ON multi_setter_sets(data_type);
CREATE INDEX idx_multi_setter_sets_company_id ON multi_setter_sets(company_id);

-- Enable RLS
ALTER TABLE multi_setter_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policy (same pattern as other tables)
CREATE POLICY "Company users can access their multi setter sets"
ON multi_setter_sets FOR ALL
USING (company_id = get_user_company(auth.uid()));