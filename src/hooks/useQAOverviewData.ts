import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Manager-grade QA overview data — combines KPIs, today's compliance-by-type,
 * attention items (out-of-range + overdue), and a compact activity feed
 * into a single hook so the dashboard renders from one loading state.
 *
 * Ranges (ideal):
 *   • Machine temp    99.5 – 100.5 °F
 *   • Humidity        53 – 58 %
 *   • Tray wash temp  ≥ 140 °F
 *   • Chlorine PPM    50 – 200
 *   • Rectal (hatcher/separator) 104 – 106 °F, chick room 103 – 105 °F
 *
 * Overdue thresholds (per active target):
 *   • temp / angles / humidity : 24 h
 *   • hatch_progression         : during hatcher window (day 18+) 6 h; else N/A
 *   • tray_wash                 : 24 h
 *   • rectal_temperature        : 24 h (per room)
 *   • gravity / culls           : N/A on the "overdue" list (owner-triggered)
 */

export type QACheckType =
  | 'temperature'
  | 'angles'
  | 'humidity'
  | 'hatch_progression'
  | 'tray_wash'
  | 'rectal_temperature'
  | 'gravity'
  | 'cull_check';

export interface QAEntry {
  id: string;
  check_date: string;
  check_time: string | null;
  created_at: string;
  entry_mode: string | null;
  inspector_name: string | null;
  temperature: number | null;
  humidity: number | null;
  temp_avg_overall: number | null;
  day_of_incubation: number | null;
  notes: string | null;
  machine_id: string | null;
  batch_id: string | null;
  candling_results: any;
  batch?: {
    id: string;
    batch_number: string;
    flock?: { flock_name: string; flock_number: number } | null;
  } | null;
  machine?: { id: string; machine_number: string } | null;
}

export interface ComplianceCell {
  key: string;
  label: string;
  status: 'ok' | 'warn' | 'missing';
  lastValue?: string;
  entryId?: string;
}

export interface ComplianceRow {
  type: QACheckType;
  label: string;
  cells: ComplianceCell[];
  doneCount: number;
  totalCount: number;
}

export interface AttentionItem {
  id: string;
  severity: 'critical' | 'warning';
  type: QACheckType | 'overdue';
  target: string;
  reason: string;
  timestamp: string;
  entryId?: string;
}

export interface QAOverviewData {
  kpis: {
    today: number;
    week: number;
    outOfRange24h: number;
    overdue: number;
    activeMachinesToday: number;
    totalActiveMachines: number;
  };
  compliance: ComplianceRow[];
  attention: AttentionItem[];
  recent: QAEntry[];
}

const CHECK_TYPE_LABEL: Record<QACheckType, string> = {
  temperature: 'Temperature',
  angles: 'Angles',
  humidity: 'Humidity',
  hatch_progression: 'Hatch Progression',
  tray_wash: 'Tray Wash',
  rectal_temperature: 'Rectal Temps',
  gravity: 'Specific Gravity',
  cull_check: 'Culls',
};

const ROOM_TARGETS = [
  { key: 'setter_room',    label: 'Setter Room' },
  { key: 'hatcher_room',   label: 'Hatcher Room' },
  { key: 'chick_room',     label: 'Chick Room' },
];
const RECTAL_ROOMS = [
  { key: 'hatcher',        label: 'Hatcher' },
  { key: 'chick_room',     label: 'Chick Room' },
  { key: 'separator_room', label: 'Separator Room' },
];

function parseCR(v: any): any {
  if (v == null) return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return v;
}

function inferType(entry: QAEntry): QACheckType | null {
  const cr = parseCR(entry.candling_results);
  const t = cr?.type;
  if (t === 'tray_wash') return 'tray_wash';
  if (t === 'rectal_temperature') return 'rectal_temperature';
  if (t === 'hatch_progression') return 'hatch_progression';
  if (t === 'humidity') return 'humidity';
  if (t === 'cull_check') return 'cull_check';
  if (cr?.qa_type === 'angles' || cr?.type === 'angles') return 'angles';
  if (cr?.qa_type === 'humidity') return 'humidity';
  // Machine-wide temp entries write temp_avg_overall + no explicit type discriminator
  if (entry.temp_avg_overall != null || cr?.temperatures) return 'temperature';
  return null;
}

function checkInRange(entry: QAEntry, type: QACheckType | null): boolean {
  const cr = parseCR(entry.candling_results);
  switch (type) {
    case 'temperature': {
      const t = entry.temp_avg_overall ?? entry.temperature;
      return t == null || (t >= 99.5 && t <= 100.5);
    }
    case 'humidity': {
      const h = entry.humidity;
      return h == null || (h >= 53 && h <= 58);
    }
    case 'tray_wash': {
      const temps = [cr?.firstCheck, cr?.secondCheck, cr?.thirdCheck].filter((v: any) => typeof v === 'number');
      const tempsOK = temps.every((v: number) => v >= 140);
      const ppms = [1, 2, 3, 4, 5]
        .map((i) => cr?.[`ppm_check_${i}`])
        .filter((v: any) => typeof v === 'number');
      const ppmOK = ppms.every((v: number) => v >= 50 && v <= 200);
      return tempsOK && ppmOK;
    }
    case 'rectal_temperature': {
      const loc = cr?.location;
      const t = cr?.temperature ?? entry.temperature;
      if (t == null) return true;
      if (loc === 'chick_room') return t >= 103 && t <= 105;
      return t >= 104 && t <= 106;
    }
    case 'angles': {
      const angles = [cr?.angle_top_left, cr?.angle_mid_left, cr?.angle_bottom_left,
                      cr?.angle_top_right, cr?.angle_mid_right, cr?.angle_bottom_right]
        .filter((v: any) => typeof v === 'number');
      // Expected 40–45 degrees typical setter tilt tolerance
      return angles.every((a: number) => a >= 38 && a <= 47);
    }
    case 'hatch_progression': return true; // no range — it's a counter
    case 'gravity': return true;
    case 'cull_check': return true;
    default: return true;
  }
}

const HOURS = (ms: number) => ms / (1000 * 60 * 60);

export function useQAOverviewData(referenceDate?: string) {
  return useQuery({
    queryKey: ['qa-overview', referenceDate ?? null],
    refetchInterval: 60_000,
    queryFn: async (): Promise<QAOverviewData> => {
      const realNow = new Date();
      const todayStr = realNow.toISOString().split('T')[0];
      const today = referenceDate || todayStr;
      // Anchor = end-of-day of referenceDate, capped to actual now if today.
      const anchor = referenceDate && referenceDate !== todayStr
        ? new Date(`${referenceDate}T23:59:59`)
        : realNow;
      const now = anchor;
      const weekAgo = new Date(anchor.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const dayAgo = new Date(anchor.getTime() - 24 * 3600 * 1000).toISOString();

      // 1. Active machines (per hatcheries)
      const { data: machinesRaw } = await supabase
        .from('machines')
        .select('id, machine_number, machine_type, setter_mode, status')
        .eq('status', 'active');
      const machines = machinesRaw ?? [];
      const setters = machines.filter((m: any) => ['setter', 'combo'].includes(m.machine_type));
      const hatchers = machines.filter((m: any) => ['hatcher', 'combo'].includes(m.machine_type));

      // 2. Pull last 7 days of QA rows once — most of the panels derive from this.
      const { data: qaRowsRaw } = await supabase
        .from('qa_monitoring')
        .select(`
          id, check_date, check_time, created_at, entry_mode, inspector_name,
          temperature, humidity, temp_avg_overall, day_of_incubation, notes,
          machine_id, batch_id, candling_results,
          batch:batches!qa_monitoring_batch_id_fkey(id, batch_number,
            flock:flocks!batches_flock_id_fkey(flock_name, flock_number)),
          machine:machines!qa_monitoring_machine_id_fkey(id, machine_number)
        `)
        .gte('check_date', weekAgo)
        .order('created_at', { ascending: false })
        .limit(500);
      const qa = (qaRowsRaw ?? []) as any as QAEntry[];

      const todayRows = qa.filter((r) => r.check_date === today);
      const anchorMs = anchor.getTime();
      const last24h = qa.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= new Date(dayAgo).getTime() && t <= anchorMs;
      });

      // 3. KPIs
      const outOfRange24h = last24h.reduce((acc, r) => {
        const t = inferType(r);
        return acc + (t && !checkInRange(r, t) ? 1 : 0);
      }, 0);
      const activeMachinesToday = new Set(todayRows.map((r) => r.machine_id).filter(Boolean)).size;

      // 4. Compliance per type
      const buildCells = (
        targets: { key: string; label: string }[],
        rowsForType: QAEntry[],
        targetFor: (r: QAEntry) => string | null,
        type: QACheckType,
      ): ComplianceCell[] => {
        return targets.map((tgt) => {
          const rowsHere = rowsForType.filter((r) => targetFor(r) === tgt.key);
          if (rowsHere.length === 0) {
            return { key: tgt.key, label: tgt.label, status: 'missing' as const };
          }
          const latest = rowsHere[0];
          const ok = checkInRange(latest, type);
          const cr = parseCR(latest.candling_results);
          const val =
            type === 'temperature' ? `${(latest.temp_avg_overall ?? latest.temperature)?.toFixed(1) ?? '—'}°F`
            : type === 'humidity'  ? `${latest.humidity?.toFixed(1) ?? '—'}%`
            : type === 'tray_wash' ? 'Logged'
            : type === 'rectal_temperature' ? `${(cr?.temperature ?? latest.temperature)?.toFixed(1) ?? '—'}°F`
            : 'Logged';
          return {
            key: tgt.key,
            label: tgt.label,
            status: (ok ? 'ok' : 'warn') as 'ok' | 'warn',
            lastValue: val,
            entryId: latest.id,
          };
        });
      };

      const todayByType = (t: QACheckType) => todayRows.filter((r) => inferType(r) === t);

      const setterTargets = setters.map((m: any) => ({ key: m.id, label: m.machine_number }));
      const hatcherTargets = hatchers.map((m: any) => ({ key: m.id, label: m.machine_number }));

      const compliance: ComplianceRow[] = [
        { type: 'temperature',        label: CHECK_TYPE_LABEL.temperature,
          cells: buildCells(setterTargets, todayByType('temperature'), (r) => r.machine_id, 'temperature'),
          doneCount: 0, totalCount: setterTargets.length },
        { type: 'angles',             label: CHECK_TYPE_LABEL.angles,
          cells: buildCells(setterTargets, todayByType('angles'), (r) => r.machine_id, 'angles'),
          doneCount: 0, totalCount: setterTargets.length },
        { type: 'humidity',           label: CHECK_TYPE_LABEL.humidity,
          cells: buildCells(setterTargets, todayByType('humidity'), (r) => r.machine_id, 'humidity'),
          doneCount: 0, totalCount: setterTargets.length },
        { type: 'hatch_progression',  label: CHECK_TYPE_LABEL.hatch_progression,
          cells: buildCells(hatcherTargets, todayByType('hatch_progression'), (r) => r.machine_id, 'hatch_progression'),
          doneCount: 0, totalCount: hatcherTargets.length },
        { type: 'tray_wash',          label: CHECK_TYPE_LABEL.tray_wash,
          cells: buildCells([{ key: 'process', label: 'Daily Log' }],
            todayByType('tray_wash'), () => 'process', 'tray_wash'),
          doneCount: 0, totalCount: 1 },
        { type: 'rectal_temperature', label: CHECK_TYPE_LABEL.rectal_temperature,
          cells: buildCells(RECTAL_ROOMS, todayByType('rectal_temperature'),
            (r) => parseCR(r.candling_results)?.location ?? null, 'rectal_temperature'),
          doneCount: 0, totalCount: RECTAL_ROOMS.length },
      ];
      compliance.forEach((row) => {
        row.doneCount = row.cells.filter((c) => c.status !== 'missing').length;
      });

      // 5. Attention items
      const attention: AttentionItem[] = [];

      // out-of-range readings in last 24h
      last24h.forEach((r) => {
        const t = inferType(r);
        if (!t) return;
        if (!checkInRange(r, t)) {
          const cr = parseCR(r.candling_results);
          const target =
            r.machine?.machine_number ??
            (cr?.location ? String(cr.location).replace(/_/g, ' ') : null) ??
            r.batch?.batch_number ?? '—';
          let reason = 'Out of range';
          if (t === 'temperature') {
            const v = r.temp_avg_overall ?? r.temperature;
            reason = `Temp ${v?.toFixed(1)}°F outside 99.5–100.5`;
          } else if (t === 'humidity') {
            reason = `Humidity ${r.humidity?.toFixed(1)}% outside 53–58`;
          } else if (t === 'tray_wash') {
            reason = 'Tray wash temp/PPM outside spec';
          } else if (t === 'rectal_temperature') {
            const v = cr?.temperature ?? r.temperature;
            reason = `Rectal ${v?.toFixed(1)}°F outside target`;
          } else if (t === 'angles') {
            reason = 'Angle outside 38–47°';
          }
          attention.push({
            id: `oor-${r.id}`,
            severity: 'critical',
            type: t,
            target,
            reason,
            timestamp: r.created_at,
            entryId: r.id,
          });
        }
      });

      // overdue targets — no reading in last 24h
      const lastByTypeTarget = new Map<string, number>();
      qa.forEach((r) => {
        const t = inferType(r);
        if (!t) return;
        const cr = parseCR(r.candling_results);
        const key =
          t === 'rectal_temperature' ? `${t}::${cr?.location ?? 'unknown'}`
          : t === 'tray_wash'          ? `${t}::process`
          : `${t}::${r.machine_id ?? 'null'}`;
        const ts = new Date(r.created_at).getTime();
        const prev = lastByTypeTarget.get(key);
        if (!prev || ts > prev) lastByTypeTarget.set(key, ts);
      });

      const nowMs = now.getTime();
      const pushOverdue = (type: QACheckType, targetKey: string, targetLabel: string, thresholdH: number) => {
        const last = lastByTypeTarget.get(`${type}::${targetKey}`);
        const hrs = last ? HOURS(nowMs - last) : Infinity;
        if (hrs > thresholdH) {
          attention.push({
            id: `overdue-${type}-${targetKey}`,
            severity: 'warning',
            type: 'overdue',
            target: targetLabel,
            reason: `${CHECK_TYPE_LABEL[type]} overdue · ${last ? `${Math.floor(hrs)}h ago` : 'never'}`,
            timestamp: new Date(last ?? nowMs - thresholdH * 3600 * 1000).toISOString(),
          });
        }
      };
      setters.forEach((m: any) => {
        pushOverdue('temperature', m.id, m.machine_number, 24);
        pushOverdue('humidity', m.id, m.machine_number, 24);
        pushOverdue('angles', m.id, m.machine_number, 24);
      });
      RECTAL_ROOMS.forEach((r) => pushOverdue('rectal_temperature', r.key, r.label, 24));
      pushOverdue('tray_wash', 'process', 'Tray Wash', 24);

      attention.sort((a, b) =>
        a.severity === b.severity
          ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          : a.severity === 'critical' ? -1 : 1
      );

      return {
        kpis: {
          today: todayRows.length,
          week: qa.length,
          outOfRange24h,
          overdue: attention.filter((a) => a.type === 'overdue').length,
          activeMachinesToday,
          totalActiveMachines: setters.length + hatchers.length,
        },
        compliance,
        attention: attention.slice(0, 50),
        recent: qa.slice(0, 25),
      };
    },
  });
}
