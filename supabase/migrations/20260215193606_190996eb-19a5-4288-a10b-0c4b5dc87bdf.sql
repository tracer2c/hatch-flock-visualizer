
-- =============================================
-- GROUP 1: Tables with ALL + company_id check
-- =============================================

-- 1. batches
DROP POLICY IF EXISTS "Company users can access their batches" ON batches;
CREATE POLICY "Company users can view their batches" ON batches FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert batches" ON batches FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update batches" ON batches FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete batches" ON batches FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 2. flocks
DROP POLICY IF EXISTS "Company users can access their flocks" ON flocks;
CREATE POLICY "Company users can view their flocks" ON flocks FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert flocks" ON flocks FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update flocks" ON flocks FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete flocks" ON flocks FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 3. machines
DROP POLICY IF EXISTS "Company users can access their machines" ON machines;
CREATE POLICY "Company users can view their machines" ON machines FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert machines" ON machines FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update machines" ON machines FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete machines" ON machines FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 4. alert_configs
DROP POLICY IF EXISTS "Company users can access their alert configs" ON alert_configs;
CREATE POLICY "Company users can view their alert configs" ON alert_configs FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert alert configs" ON alert_configs FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update alert configs" ON alert_configs FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete alert configs" ON alert_configs FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 5. custom_targets
DROP POLICY IF EXISTS "Company users can access their targets" ON custom_targets;
CREATE POLICY "Company users can view their targets" ON custom_targets FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert targets" ON custom_targets FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update targets" ON custom_targets FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete targets" ON custom_targets FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 6. daily_checklist_items
DROP POLICY IF EXISTS "Company users can access their checklist items" ON daily_checklist_items;
CREATE POLICY "Company users can view their checklist items" ON daily_checklist_items FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert checklist items" ON daily_checklist_items FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update checklist items" ON daily_checklist_items FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete checklist items" ON daily_checklist_items FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 7. data_entry_images
DROP POLICY IF EXISTS "Company users can access their images" ON data_entry_images;
CREATE POLICY "Company users can view their images" ON data_entry_images FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert images" ON data_entry_images FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update images" ON data_entry_images FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete images" ON data_entry_images FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 8. house_machine_allocations
DROP POLICY IF EXISTS "Company users can access their allocations" ON house_machine_allocations;
CREATE POLICY "Company users can view their allocations" ON house_machine_allocations FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert allocations" ON house_machine_allocations FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update allocations" ON house_machine_allocations FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete allocations" ON house_machine_allocations FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 9. machine_transfers
DROP POLICY IF EXISTS "Company users can access their transfers" ON machine_transfers;
CREATE POLICY "Company users can view their transfers" ON machine_transfers FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert transfers" ON machine_transfers FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update transfers" ON machine_transfers FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete transfers" ON machine_transfers FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 10. multi_setter_sets
DROP POLICY IF EXISTS "Company users can access their multi setter sets" ON multi_setter_sets;
CREATE POLICY "Company users can view their multi setter sets" ON multi_setter_sets FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert multi setter sets" ON multi_setter_sets FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update multi setter sets" ON multi_setter_sets FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete multi setter sets" ON multi_setter_sets FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 11. residue_analysis_schedule
DROP POLICY IF EXISTS "Company users can access their schedules" ON residue_analysis_schedule;
CREATE POLICY "Company users can view their schedules" ON residue_analysis_schedule FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert schedules" ON residue_analysis_schedule FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update schedules" ON residue_analysis_schedule FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete schedules" ON residue_analysis_schedule FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 12. sop_templates
DROP POLICY IF EXISTS "Company users can access their SOP templates" ON sop_templates;
CREATE POLICY "Company users can view their SOP templates" ON sop_templates FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert SOP templates" ON sop_templates FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update SOP templates" ON sop_templates FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete SOP templates" ON sop_templates FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 13. specific_gravity_tests
DROP POLICY IF EXISTS "Company users can access their specific gravity tests" ON specific_gravity_tests;
CREATE POLICY "Company users can view their specific gravity tests" ON specific_gravity_tests FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert specific gravity tests" ON specific_gravity_tests FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update specific gravity tests" ON specific_gravity_tests FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete specific gravity tests" ON specific_gravity_tests FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- 14. units
DROP POLICY IF EXISTS "Company users can access their units" ON units;
CREATE POLICY "Company users can view their units" ON units FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Non-staff can insert units" ON units FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update units" ON units FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete units" ON units FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));

-- =============================================
-- GROUP 2: Tables with ALL + true
-- =============================================

-- 15. residue_analysis
DROP POLICY IF EXISTS "Allow all operations on residue_analysis" ON residue_analysis;
CREATE POLICY "Anyone can view residue_analysis" ON residue_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-staff can insert residue_analysis" ON residue_analysis FOR INSERT TO authenticated WITH CHECK (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update residue_analysis" ON residue_analysis FOR UPDATE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete residue_analysis" ON residue_analysis FOR DELETE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));

-- 16. fertility_analysis
DROP POLICY IF EXISTS "Allow all operations on fertility_analysis" ON fertility_analysis;
CREATE POLICY "Anyone can view fertility_analysis" ON fertility_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-staff can insert fertility_analysis" ON fertility_analysis FOR INSERT TO authenticated WITH CHECK (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update fertility_analysis" ON fertility_analysis FOR UPDATE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete fertility_analysis" ON fertility_analysis FOR DELETE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));

-- 17. egg_pack_quality
DROP POLICY IF EXISTS "Allow all operations on egg_pack_quality" ON egg_pack_quality;
CREATE POLICY "Anyone can view egg_pack_quality" ON egg_pack_quality FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-staff can insert egg_pack_quality" ON egg_pack_quality FOR INSERT TO authenticated WITH CHECK (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update egg_pack_quality" ON egg_pack_quality FOR UPDATE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete egg_pack_quality" ON egg_pack_quality FOR DELETE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));

-- 18. checklist_completions
DROP POLICY IF EXISTS "Allow all operations on checklist_completions" ON checklist_completions;
CREATE POLICY "Anyone can view checklist_completions" ON checklist_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-staff can insert checklist_completions" ON checklist_completions FOR INSERT TO authenticated WITH CHECK (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update checklist_completions" ON checklist_completions FOR UPDATE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete checklist_completions" ON checklist_completions FOR DELETE TO authenticated USING (NOT has_role(auth.uid(), 'staff'::user_role));

-- =============================================
-- GROUP 3: qa_monitoring - already has separate policies, add staff check to write policies
-- =============================================
DROP POLICY IF EXISTS "Company users can insert their qa_monitoring" ON qa_monitoring;
DROP POLICY IF EXISTS "Company users can update their qa_monitoring" ON qa_monitoring;
DROP POLICY IF EXISTS "Company users can delete their qa_monitoring" ON qa_monitoring;

CREATE POLICY "Non-staff can insert qa_monitoring" ON qa_monitoring FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can update qa_monitoring" ON qa_monitoring FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role)) WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
CREATE POLICY "Non-staff can delete qa_monitoring" ON qa_monitoring FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role));
