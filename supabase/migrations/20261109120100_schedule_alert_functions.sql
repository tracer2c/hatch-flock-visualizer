-- check-alerts and check-overdue-analysis were deployed but never scheduled,
-- so the alerts table stayed empty. Both functions have verify_jwt = false
-- (see supabase/config.toml), matching the existing hourly
-- batch-status-automation job, so no key is needed in the request.

-- QA readings, critical days, overdue transfers, checklists, maintenance.
SELECT cron.schedule(
  'check-alerts-every-30-min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xgpizkqbhybbqytgmtum.supabase.co/functions/v1/check-alerts',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('trigger', 'cron', 'time', now()::text)
  ) AS request_id;
  $$
);

-- Marks residue analyses past their due date as overdue and raises an alert.
SELECT cron.schedule(
  'check-overdue-analysis-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xgpizkqbhybbqytgmtum.supabase.co/functions/v1/check-overdue-analysis',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('trigger', 'cron', 'time', now()::text)
  ) AS request_id;
  $$
);
