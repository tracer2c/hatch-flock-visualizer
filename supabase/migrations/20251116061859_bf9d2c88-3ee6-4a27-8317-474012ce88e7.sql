-- Feature 2: Flexible Sample Size
-- Remove defaults from sample_size columns
ALTER TABLE fertility_analysis ALTER COLUMN sample_size DROP DEFAULT;
ALTER TABLE residue_analysis ALTER COLUMN sample_size DROP DEFAULT;

-- Add validation constraints
ALTER TABLE fertility_analysis ADD CONSTRAINT fertility_sample_size_positive 
  CHECK (sample_size IS NULL OR sample_size > 0);
  
ALTER TABLE residue_analysis ADD CONSTRAINT residue_sample_size_positive 
  CHECK (sample_size IS NULL OR sample_size > 0);

-- Create sample size presets table for quick selection
CREATE TABLE IF NOT EXISTS sample_size_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size integer NOT NULL UNIQUE,
  description text,
  is_common boolean DEFAULT false,
  company_id uuid REFERENCES companies(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE sample_size_presets ENABLE ROW LEVEL SECURITY;

-- RLS policies for sample_size_presets
CREATE POLICY "Users can view sample size presets"
  ON sample_size_presets FOR SELECT
  USING (company_id IS NULL OR company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage sample size presets"
  ON sample_size_presets FOR ALL
  USING (company_id = get_user_company(auth.uid()));

-- Insert common presets (NULL company_id = global defaults)
INSERT INTO sample_size_presets (size, description, is_common) VALUES
  (648, 'Standard sample (18 flats × 36 eggs)', true),
  (360, 'Half sample (10 flats × 36 eggs)', true),
  (324, 'Quarter sample (9 flats × 36 eggs)', true),
  (180, 'Small sample (5 flats)', true),
  (100, 'Minimal sample', false)
ON CONFLICT (size) DO NOTHING;

-- Feature 5: Flock Update Tracking
-- Add tracking columns to flocks table
ALTER TABLE flocks 
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_modified_at timestamp with time zone DEFAULT now();

-- Create trigger to auto-update last_modified_at
CREATE OR REPLACE FUNCTION update_flocks_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_flocks_updated_at
  BEFORE UPDATE ON flocks
  FOR EACH ROW
  EXECUTE FUNCTION update_flocks_modified_timestamp();

-- Create flock history table for audit trail
CREATE TABLE IF NOT EXISTS flock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flock_id uuid REFERENCES flocks(id) ON DELETE CASCADE,
  changed_at timestamp with time zone DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id),
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  field_changed text,
  old_value text,
  new_value text,
  notes text
);

-- Enable RLS for flock_history
ALTER TABLE flock_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for flock_history
CREATE POLICY "Company users can view flock history"
  ON flock_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flocks
      WHERE flocks.id = flock_history.flock_id
      AND flocks.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "System can insert flock history"
  ON flock_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flocks
      WHERE flocks.id = flock_history.flock_id
      AND flocks.company_id = get_user_company(auth.uid())
    )
  );
