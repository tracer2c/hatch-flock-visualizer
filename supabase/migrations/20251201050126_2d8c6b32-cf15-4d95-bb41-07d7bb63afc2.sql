
-- Delete orphan multi_setter_sets records with no batch_id
-- These are garbage training data not linked to any actual house
DELETE FROM multi_setter_sets WHERE batch_id IS NULL;
