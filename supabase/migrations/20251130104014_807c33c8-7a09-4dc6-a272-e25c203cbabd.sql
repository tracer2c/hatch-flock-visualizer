
-- Update the valid_position constraint to include 'machine_wide'
ALTER TABLE qa_position_linkage DROP CONSTRAINT IF EXISTS valid_position;

ALTER TABLE qa_position_linkage ADD CONSTRAINT valid_position CHECK (
  position = ANY (ARRAY[
    'front_top_left', 'front_top_right', 'front_mid_left', 'front_mid_right', 'front_bottom_left', 'front_bottom_right',
    'middle_top_left', 'middle_top_right', 'middle_mid_left', 'middle_mid_right', 'middle_bottom_left', 'middle_bottom_right',
    'back_top_left', 'back_top_right', 'back_mid_left', 'back_mid_right', 'back_bottom_left', 'back_bottom_right',
    'machine_wide'
  ])
);
