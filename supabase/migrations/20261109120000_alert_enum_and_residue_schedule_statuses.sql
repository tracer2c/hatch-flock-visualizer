-- check-alerts raises "transfer overdue" alerts, but the enum had no such value,
-- so every one of those inserts was rejected.
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'transfer_overdue';

-- Houses now move scheduled -> in_setter -> in_hatcher -> completed. This
-- trigger still listed the legacy statuses (setting / incubating), so no
-- residue analysis was ever scheduled and check-overdue-analysis had nothing
-- to check. Schedule when a house enters the setter.
CREATE OR REPLACE FUNCTION public.schedule_residue_analysis()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status::text IN ('in_setter', 'setting', 'incubating')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.residue_analysis_schedule (
      batch_id,
      scheduled_date,
      due_date,
      company_id
    ) VALUES (
      NEW.id,
      NEW.set_date + INTERVAL '21 days',
      NEW.set_date + INTERVAL '23 days', -- 2 day grace period
      NEW.company_id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
