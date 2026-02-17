
DO $$
DECLARE
  ws_company_id UUID := '31165db9-014c-4d69-bd04-8d170699d7f2';
  default_company_id UUID := '00000000-0000-0000-0000-000000000001';
  old_sop_id UUID;
  new_sop_id UUID;
  rec RECORD;
BEGIN
  -- 1. Alert Configs (11)
  INSERT INTO public.alert_configs (company_id, name, alert_type, description, min_temperature, max_temperature, min_humidity, max_humidity, critical_days, maintenance_days_interval, maintenance_hours_interval, reminder_hours_before, is_enabled)
  SELECT ws_company_id, name, alert_type, description, min_temperature, max_temperature, min_humidity, max_humidity, critical_days, maintenance_days_interval, maintenance_hours_interval, reminder_hours_before, is_enabled
  FROM public.alert_configs WHERE company_id = default_company_id;

  -- 2. Batch Automation Rules (3)
  INSERT INTO public.batch_status_automation_rules (company_id, rule_name, from_status, to_status, min_days_after_set, requires_fertility_data, requires_residue_data, requires_qa_data, min_qa_checks_required, is_enabled)
  SELECT ws_company_id, rule_name, from_status, to_status, min_days_after_set, requires_fertility_data, requires_residue_data, requires_qa_data, min_qa_checks_required, is_enabled
  FROM public.batch_status_automation_rules WHERE company_id = default_company_id;

  -- 3. SOP Templates (8) with ID mapping
  CREATE TEMP TABLE sop_id_map (old_id UUID, new_id UUID) ON COMMIT DROP;

  FOR rec IN SELECT * FROM public.sop_templates WHERE company_id = default_company_id
  LOOP
    INSERT INTO public.sop_templates (company_id, title, description, category, day_of_incubation, content, is_active)
    VALUES (ws_company_id, rec.title, rec.description, rec.category, rec.day_of_incubation, rec.content, rec.is_active)
    RETURNING id INTO new_sop_id;

    INSERT INTO sop_id_map (old_id, new_id) VALUES (rec.id, new_sop_id);
  END LOOP;

  -- 4. Daily Checklist Items (18) with SOP ID remapping
  INSERT INTO public.daily_checklist_items (company_id, title, description, order_index, is_required, applicable_days, sop_template_id, target_type, machine_id)
  SELECT 
    ws_company_id,
    ci.title,
    ci.description,
    ci.order_index,
    ci.is_required,
    ci.applicable_days,
    sm.new_id,  -- remapped SOP template ID (NULL if no linkage)
    ci.target_type,
    ci.machine_id
  FROM public.daily_checklist_items ci
  LEFT JOIN sop_id_map sm ON ci.sop_template_id = sm.old_id
  WHERE ci.company_id = default_company_id;
END $$;
