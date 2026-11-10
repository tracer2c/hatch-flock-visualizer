import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// House statuses that mean eggs are actually in a machine. The `batch_status`
// enum still contains the legacy names (setting/incubating/hatching) but no
// house uses them any more.
const ACTIVE_HOUSE_STATUSES = ["in_setter", "in_hatcher"];

// Only machine-level and house-level QA readings are setter air/eggshell
// temperatures in °F. `room` readings (room temp, rectal temp, tray wash...)
// use other units and ranges, so they must not be compared to these bands.
const TEMP_HUMIDITY_ENTRY_MODES = ["machine", "house"];

// Defaults used when a company has no enabled temperature/humidity alert_config.
const DEFAULT_TEMP_BAND = { min: 99, max: 101 };
const DEFAULT_HUMIDITY_BAND = { min: 55, max: 65 };
// A reading this far outside the band is "critical" instead of "warning".
const TEMP_CRITICAL_MARGIN = 2;
const HUMIDITY_CRITICAL_MARGIN = 10;

const CRITICAL_DAYS = [7, 14, 18, 21];
const TRANSFER_DAY = 18;
const TRANSFER_OVERDUE_AFTER_DAY = 22;
const MAINTENANCE_INTERVAL_DAYS = 30;

// QA readings are looked at for this long after they are saved. The same
// window (plus a margin) is used for de-duplication so one reading can only
// ever produce one alert, however often this function runs.
const QA_LOOKBACK_MS = 2 * 60 * 60 * 1000;
const QA_DEDUPE_MS = 3 * 60 * 60 * 1000;
// Maintenance alerts repeat at most weekly while a machine stays overdue.
const MAINTENANCE_DEDUPE_MS = 7 * 24 * 60 * 60 * 1000;

// "Checklist incomplete" only makes sense near the end of the incubation day.
// Days roll over at 00:00 UTC (set_date is a UTC date), so from 22:00 UTC
// (about 5pm US Central) there is little of the day left to finish the list.
const CHECKLIST_ALERT_AFTER_UTC_HOUR = 22;

type AlertInsert = {
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  status: "active";
  batch_id?: string | null;
  machine_id?: string | null;
  batch_day?: number | null;
  current_temperature?: number;
  current_humidity?: number;
};

// send-push-notification filters on these names; anything else is sent as-is.
const PUSH_ALERT_TYPE: Record<string, string> = {
  machine_maintenance: "maintenance",
  schedule_reminder: "schedule",
};

const daysSince = (date: string) =>
  Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const alertsGenerated: AlertInsert[] = [];

    const sendPushNotification = async (alert: AlertInsert) => {
      try {
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            title: alert.title,
            body: alert.message,
            url: "/alerts",
            alertType: PUSH_ALERT_TYPE[alert.alert_type] ?? alert.alert_type,
            severity: alert.severity,
            tag: `alert-${alert.alert_type}`,
          }),
        });

        if (!pushResponse.ok) {
          console.error(`Failed to send push notification: ${pushResponse.status}`);
        }
      } catch (err) {
        console.error("Error sending push notification:", err);
      }
    };

    // True if a matching alert already exists, whatever its status. Ignoring
    // status stops resolved/dismissed alerts from being re-created on the next run.
    const alertExists = async (
      match: Record<string, string | number>,
      since?: Date,
    ): Promise<boolean> => {
      let query = supabase.from("alerts").select("id").limit(1);
      for (const [column, value] of Object.entries(match)) {
        query = query.eq(column, value);
      }
      if (since) query = query.gte("triggered_at", since.toISOString());
      const { data, error } = await query;
      if (error) {
        console.error("Error checking for existing alert:", error);
        return true; // fail closed: better to miss an alert than to spam
      }
      return (data?.length ?? 0) > 0;
    };

    const createAlert = async (alert: AlertInsert) => {
      const { error } = await supabase.from("alerts").insert(alert);
      if (error) {
        console.error(`Failed to create ${alert.alert_type} alert "${alert.title}":`, error);
        return;
      }
      alertsGenerated.push(alert);
      await sendPushNotification(alert);
    };

    // ---- Reference data -------------------------------------------------
    const { data: machines, error: machineError } = await supabase
      .from("machines")
      .select("id, machine_number, last_maintenance");
    if (machineError) throw machineError;
    const machineNumber = new Map((machines || []).map((m) => [m.id, m.machine_number]));

    const { data: configs, error: configError } = await supabase
      .from("alert_configs")
      .select("company_id, alert_type, min_temperature, max_temperature, min_humidity, max_humidity")
      .eq("is_enabled", true)
      .in("alert_type", ["temperature", "humidity"]);
    if (configError) throw configError;

    const bandsFor = (companyId: string | null) => {
      const temp = (configs || []).find(
        (c) => c.company_id === companyId && c.alert_type === "temperature" &&
          c.min_temperature != null && c.max_temperature != null,
      );
      const humidity = (configs || []).find(
        (c) => c.company_id === companyId && c.alert_type === "humidity" &&
          c.min_humidity != null && c.max_humidity != null,
      );
      return {
        temp: temp ? { min: Number(temp.min_temperature), max: Number(temp.max_temperature) } : DEFAULT_TEMP_BAND,
        humidity: humidity
          ? { min: Number(humidity.min_humidity), max: Number(humidity.max_humidity) }
          : DEFAULT_HUMIDITY_BAND,
      };
    };

    // ---- Temperature / humidity from recent QA readings ------------------
    console.log("Checking for temperature and humidity alerts...");
    const { data: qaData, error: qaError } = await supabase
      .from("qa_monitoring")
      .select("id, batch_id, machine_id, company_id, temperature, humidity, day_of_incubation, batches (id, batch_number)")
      .in("entry_mode", TEMP_HUMIDITY_ENTRY_MODES)
      .gte("created_at", new Date(Date.now() - QA_LOOKBACK_MS).toISOString())
      .order("created_at", { ascending: false });
    if (qaError) throw qaError;

    for (const qa of qaData || []) {
      // Machine-level readings are not tied to a house, so alert on the machine.
      const scope = qa.batch_id
        ? { column: "batch_id", id: qa.batch_id, label: (qa.batches as any)?.batch_number ?? "house" }
        : qa.machine_id
        ? { column: "machine_id", id: qa.machine_id, label: machineNumber.get(qa.machine_id) ?? "machine" }
        : null;
      if (!scope) continue;

      const target = { [scope.column]: scope.id } as { batch_id?: string; machine_id?: string };
      const since = new Date(Date.now() - QA_DEDUPE_MS);
      const bands = bandsFor(qa.company_id);

      // Machine-wide angle/humidity saves store 0 as a placeholder for the
      // fields they do not measure, so 0 means "no reading", not "0°F".
      if (qa.temperature != null && Number(qa.temperature) > 0) {
        const temperature = Number(qa.temperature);
        const { min, max } = bands.temp;
        if ((temperature < min || temperature > max) &&
            !(await alertExists({ ...target, alert_type: "temperature" } as Record<string, string>, since))) {
          const critical = temperature < min - TEMP_CRITICAL_MARGIN || temperature > max + TEMP_CRITICAL_MARGIN;
          await createAlert({
            alert_type: "temperature",
            ...target,
            severity: critical ? "critical" : "warning",
            title: `Temperature Alert - ${scope.label}`,
            message: `Temperature reading of ${temperature}°F is outside optimal range (${min}-${max}°F)`,
            current_temperature: temperature,
            batch_day: qa.day_of_incubation,
            status: "active",
          });
        }
      }

      if (qa.humidity != null && Number(qa.humidity) > 0) {
        const humidity = Number(qa.humidity);
        const { min, max } = bands.humidity;
        if ((humidity < min || humidity > max) &&
            !(await alertExists({ ...target, alert_type: "humidity" } as Record<string, string>, since))) {
          const critical = humidity < min - HUMIDITY_CRITICAL_MARGIN || humidity > max + HUMIDITY_CRITICAL_MARGIN;
          await createAlert({
            alert_type: "humidity",
            ...target,
            severity: critical ? "critical" : "warning",
            title: `Humidity Alert - ${scope.label}`,
            message: `Humidity reading of ${humidity}% is outside optimal range (${min}-${max}%)`,
            current_humidity: humidity,
            batch_day: qa.day_of_incubation,
            status: "active",
          });
        }
      }
    }

    // ---- Critical days and overdue transfers -----------------------------
    console.log("Checking for critical day and transfer alerts...");
    const { data: batches, error: batchError } = await supabase
      .from("batches")
      .select("id, batch_number, status, set_date")
      .in("status", ACTIVE_HOUSE_STATUSES);
    if (batchError) throw batchError;

    for (const batch of batches || []) {
      const day = daysSince(batch.set_date);

      if (CRITICAL_DAYS.includes(day) &&
          !(await alertExists({ batch_id: batch.id, alert_type: "critical_day", batch_day: day }))) {
        await createAlert({
          alert_type: "critical_day",
          batch_id: batch.id,
          severity: "info",
          title: `Critical Day ${day} - ${batch.batch_number}`,
          message: `House ${batch.batch_number} has reached day ${day} - special attention required`,
          batch_day: day,
          status: "active",
        });
      }

      if (day >= TRANSFER_OVERDUE_AFTER_DAY && batch.status === "in_setter" &&
          !(await alertExists({ batch_id: batch.id, alert_type: "transfer_overdue" }))) {
        const daysOverdue = day - TRANSFER_DAY;
        await createAlert({
          alert_type: "transfer_overdue",
          batch_id: batch.id,
          severity: daysOverdue >= 7 ? "critical" : "warning",
          title: `Transfer Overdue - ${batch.batch_number}`,
          message: `House ${batch.batch_number} is ${daysOverdue} days overdue for transfer (Day ${day}, should transfer on Day ${TRANSFER_DAY})`,
          batch_day: day,
          status: "active",
        });
      }
    }

    // ---- Incomplete house checklists (end of day only) -------------------
    if (new Date().getUTCHours() >= CHECKLIST_ALERT_AFTER_UTC_HOUR) {
      console.log("Checking for incomplete checklists...");
      for (const batch of batches || []) {
        const day = daysSince(batch.set_date);

        // Machine checklists are completed against machines, never houses.
        const { data: checklistItems, error: checklistError } = await supabase
          .from("daily_checklist_items")
          .select("id")
          .contains("applicable_days", [day])
          .eq("is_required", true)
          .eq("target_type", "batch");
        if (checklistError) {
          console.error("Error fetching checklist items:", checklistError);
          continue;
        }
        if (!checklistItems?.length) continue;

        const { data: completions, error: completionsError } = await supabase
          .from("checklist_completions")
          .select("checklist_item_id")
          .eq("batch_id", batch.id)
          .eq("day_of_incubation", day);
        if (completionsError) {
          console.error("Error fetching completions:", completionsError);
          continue;
        }

        const done = new Set((completions || []).map((c) => c.checklist_item_id));
        const incomplete = checklistItems.filter((item) => !done.has(item.id));

        if (incomplete.length > 0 &&
            !(await alertExists({ batch_id: batch.id, alert_type: "checklist_incomplete", batch_day: day }))) {
          await createAlert({
            alert_type: "checklist_incomplete",
            batch_id: batch.id,
            severity: incomplete.length >= 3 ? "critical" : "warning",
            title: `Incomplete Checklist - ${batch.batch_number}`,
            message: `${incomplete.length} required checklist items incomplete for Day ${day}`,
            batch_day: day,
            status: "active",
          });
        }
      }
    }

    // ---- Machine maintenance ---------------------------------------------
    // Only machines with a recorded maintenance date are checked. Most machines
    // have never had one logged, and treating "created long ago" as "overdue"
    // would raise hundreds of alerts at once.
    console.log("Checking for machine maintenance alerts...");
    for (const machine of machines || []) {
      if (!machine.last_maintenance) continue;

      const daysSinceMaintenance = daysSince(machine.last_maintenance);
      if (daysSinceMaintenance < MAINTENANCE_INTERVAL_DAYS) continue;

      if (!(await alertExists(
        { machine_id: machine.id, alert_type: "machine_maintenance" },
        new Date(Date.now() - MAINTENANCE_DEDUPE_MS),
      ))) {
        await createAlert({
          alert_type: "machine_maintenance",
          machine_id: machine.id,
          severity: daysSinceMaintenance >= 45 ? "critical" : "warning",
          title: `Maintenance Overdue - ${machine.machine_number}`,
          message: `Machine ${machine.machine_number} maintenance is overdue by ${daysSinceMaintenance - MAINTENANCE_INTERVAL_DAYS} days`,
          status: "active",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsGenerated: alertsGenerated.length,
        alerts: alertsGenerated,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error) {
    console.error("Error in check-alerts function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
