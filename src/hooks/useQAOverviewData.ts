import { useQuery } from '@tanstack/react-query';
import { eachDayOfInterval, endOfWeek, format, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export type QACheckType = 'temperature' | 'angles' | 'humidity' | 'hatch_progression' | 'tray_wash' | 'rectal_temperature' | 'gravity' | 'cull_check';

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
  temp_avg_front: number | null;
  temp_avg_middle: number | null;
  temp_avg_back: number | null;
  angle_top_left: number | null;
  angle_mid_left: number | null;
  angle_bottom_left: number | null;
  angle_top_right: number | null;
  angle_mid_right: number | null;
  angle_bottom_right: number | null;
  day_of_incubation: number | null;
  notes: string | null;
  machine_id: string | null;
  batch_id: string | null;
  unit_id: string | null;
  candling_results: any;
  batch?: { id: string; batch_number: string; flock?: { flock_name: string; flock_number: number } | null } | null;
  machine?: { id: string; machine_number: string; machine_type?: string | null } | null;
}

export interface WeeklyMetric {
  value: number | null;
  count: number;
  inRange: number;
  total: number;
}

export interface HatchProgressRow {
  machineId: string;
  machineLabel: string;
  stage: string;
  hatched: number;
  total: number;
  percentage: number;
  checkedAt: string;
  entryId: string;
  stale: boolean;
}

export interface DailyTrend {
  date: string;
  day: string;
  eggshell: number | null;
  rectal: number | null;
  trayWash: number | null;
  leftAngle: number | null;
  rightAngle: number | null;
  hatch: number | null;
}

export interface CoverageDay {
  date: string;
  day: string;
  isFuture: boolean;
  values: Record<'hatch' | 'temperature' | 'angles' | 'rectal' | 'trayWash', { done: number; expected: number }>;
}

export interface AttentionItem {
  id: string;
  type: QACheckType;
  target: string;
  reason: string;
  entryId?: string;
}

export interface QAOverviewData {
  weekStart: string;
  weekEnd: string;
  entries: QAEntry[];
  hatchProgress: HatchProgressRow[];
  trend: DailyTrend[];
  coverage: CoverageDay[];
  metrics: {
    rectal: WeeklyMetric;
    trayWash: WeeklyMetric & { ppmInRange: number; ppmTotal: number; completedDays: number };
    eggshell: WeeklyMetric & { front: number | null; middle: number | null; back: number | null };
    angles: { left: number | null; right: number | null; count: number; outOfRange: number };
    completion: { done: number; expected: number; percentage: number };
  };
  attention: AttentionItem[];
}

const average = (values: Array<number | null | undefined>) => {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};

const parseResults = (value: any) => {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return {}; }
};

export const inferQAType = (entry: QAEntry): QACheckType | null => {
  const results = parseResults(entry.candling_results);
  const type = results.type ?? results.qa_type;
  if (type === 'setter_angles' || type === 'angles') return 'angles';
  if (['tray_wash', 'rectal_temperature', 'hatch_progression', 'humidity', 'cull_check'].includes(type)) return type as QACheckType;
  if (entry.temp_avg_overall != null || entry.temp_avg_front != null || results.temperatures) return 'temperature';
  if (entry.angle_top_left != null || entry.angle_top_right != null) return 'angles';
  return null;
};

const entryTimestamp = (entry: QAEntry) => new Date(`${entry.check_date}T${entry.check_time || '23:59:59'}`).getTime();
const isBetween = (value: number, min: number, max: number) => value >= min && value <= max;

async function fetchAllQA(start: string, end: string, unitId?: string) {
  const rows: QAEntry[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from('qa_monitoring').select(`
      id, check_date, check_time, created_at, entry_mode, inspector_name, temperature, humidity,
      temp_avg_overall, temp_avg_front, temp_avg_middle, temp_avg_back,
      angle_top_left, angle_mid_left, angle_bottom_left, angle_top_right, angle_mid_right, angle_bottom_right,
      day_of_incubation, notes, machine_id, batch_id, unit_id, candling_results,
      batch:batches!qa_monitoring_batch_id_fkey(id, batch_number, flock:flocks!batches_flock_id_fkey(flock_name, flock_number)),
      machine:machines!qa_monitoring_machine_id_fkey(id, machine_number, machine_type)
    `).gte('check_date', start).lte('check_date', end).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
    if (unitId && unitId !== 'all') query = query.eq('unit_id', unitId);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as QAEntry[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export function useQAOverviewData(referenceDate?: string, unitId?: string) {
  return useQuery({
    queryKey: ['qa-overview-weekly', referenceDate ?? null, unitId ?? 'all'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<QAOverviewData> => {
      const anchor = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
      const weekStartDate = startOfWeek(anchor, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(anchor, { weekStartsOn: 1 });
      const weekStart = format(weekStartDate, 'yyyy-MM-dd');
      const weekEnd = format(weekEndDate, 'yyyy-MM-dd');
      const days = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });

      let machineQuery = supabase.from('machines').select('id, machine_number, machine_type, unit_id').eq('status', 'active');
      if (unitId && unitId !== 'all') machineQuery = machineQuery.eq('unit_id', unitId);
      const [{ data: machineRows, error: machineError }, entries] = await Promise.all([
        machineQuery.order('machine_number'),
        fetchAllQA(weekStart, weekEnd, unitId),
      ]);
      if (machineError) throw machineError;

      const machines = machineRows ?? [];
      const setters = machines.filter((m) => m.machine_type === 'setter' || m.machine_type === 'combo');
      const hatchers = machines.filter((m) => m.machine_type === 'hatcher' || m.machine_type === 'combo');
      const typed = entries.map((entry) => ({ entry, type: inferQAType(entry), results: parseResults(entry.candling_results) }));
      const byType = (type: QACheckType) => typed.filter((row) => row.type === type);

      const rectalRows = byType('rectal_temperature');
      const rectalValues = rectalRows.map(({ entry, results }) => Number(results.temperature ?? entry.temperature)).filter(Number.isFinite);
      const rectalInRange = rectalRows.filter(({ entry, results }) => {
        const value = Number(results.temperature ?? entry.temperature);
        const location = results.location;
        return Number.isFinite(value) && isBetween(value, location === 'chick_room' ? 103 : 104, location === 'chick_room' ? 105 : 106);
      }).length;

      const trayRows = byType('tray_wash');
      const trayTemps = trayRows.flatMap(({ results }) => [results.firstCheck, results.secondCheck, results.thirdCheck]).map(Number).filter(Number.isFinite);
      const ppmValues = trayRows.flatMap(({ results }) => [1, 2, 3, 4, 5].map((i) => results[`ppm_check_${i}`])).map(Number).filter(Number.isFinite);

      const temperatureRows = byType('temperature');
      const temperatureValues = temperatureRows.map(({ entry }) => entry.temp_avg_overall ?? entry.temperature).filter((v): v is number => typeof v === 'number');
      const angleRows = byType('angles');
      const leftValues = angleRows.flatMap(({ entry }) => [entry.angle_top_left, entry.angle_mid_left, entry.angle_bottom_left]).filter((v): v is number => typeof v === 'number');
      const rightValues = angleRows.flatMap(({ entry }) => [entry.angle_top_right, entry.angle_mid_right, entry.angle_bottom_right]).filter((v): v is number => typeof v === 'number');
      const angleOutOfRange = angleRows.filter(({ entry }) => [...[entry.angle_top_left, entry.angle_mid_left, entry.angle_bottom_left], ...[entry.angle_top_right, entry.angle_mid_right, entry.angle_bottom_right]].filter((v): v is number => typeof v === 'number').some((v) => !isBetween(v, 38, 47))).length;

      const hatchByMachine = new Map<string, HatchProgressRow>();
      byType('hatch_progression').forEach(({ entry, results }) => {
        const machineId = entry.machine_id ?? `unassigned-${entry.id}`;
        const previous = hatchByMachine.get(machineId);
        if (previous && entryTimestamp(entry) <= new Date(previous.checkedAt).getTime()) return;
        const total = Number(results.totalCount) || 0;
        const hatched = Number(results.hatchedCount) || 0;
        hatchByMachine.set(machineId, {
          machineId,
          machineLabel: entry.machine?.machine_number ?? 'Unassigned hatcher',
          stage: results.stage ?? '—',
          hatched,
          total,
          percentage: total > 0 ? (hatched / total) * 100 : Number(results.percentageOut) || 0,
          checkedAt: new Date(`${entry.check_date}T${entry.check_time || '00:00:00'}`).toISOString(),
          entryId: entry.id,
          stale: Date.now() - entryTimestamp(entry) > 6 * 60 * 60 * 1000,
        });
      });

      const coverage: CoverageDay[] = days.map((dayDate) => {
        const date = format(dayDate, 'yyyy-MM-dd');
        const dayRows = typed.filter(({ entry }) => entry.check_date === date);
        const countTargets = (type: QACheckType, key: 'machine_id' | 'room', expected: number) => {
          const matching = dayRows.filter((row) => row.type === type);
          const done = key === 'machine_id'
            ? new Set(matching.map(({ entry }) => entry.machine_id).filter(Boolean)).size
            : new Set(matching.map(({ results }) => results.location ?? 'process')).size;
          return { done, expected };
        };
        return {
          date,
          day: format(dayDate, 'EEE'),
          isFuture: dayDate > new Date(),
          values: {
            hatch: countTargets('hatch_progression', 'machine_id', hatchers.length),
            temperature: countTargets('temperature', 'machine_id', setters.length),
            angles: countTargets('angles', 'machine_id', setters.length),
            rectal: countTargets('rectal_temperature', 'room', 3),
            trayWash: countTargets('tray_wash', 'room', 1),
          },
        };
      });

      const applicableCoverage = coverage.filter((day) => !day.isFuture);
      const completion = applicableCoverage.reduce((total, day) => {
        Object.values(day.values).forEach((value) => { total.done += Math.min(value.done, value.expected); total.expected += value.expected; });
        return total;
      }, { done: 0, expected: 0 });

      const trend: DailyTrend[] = days.map((dayDate) => {
        const date = format(dayDate, 'yyyy-MM-dd');
        const rows = typed.filter(({ entry }) => entry.check_date === date);
        const entriesOf = (type: QACheckType) => rows.filter((row) => row.type === type);
        const hatchRows = entriesOf('hatch_progression');
        const hatchTotal = hatchRows.reduce((sum, row) => sum + (Number(row.results.totalCount) || 0), 0);
        const hatchCount = hatchRows.reduce((sum, row) => sum + (Number(row.results.hatchedCount) || 0), 0);
        return {
          date,
          day: format(dayDate, 'EEE'),
          eggshell: average(entriesOf('temperature').map(({ entry }) => entry.temp_avg_overall ?? entry.temperature)),
          rectal: average(entriesOf('rectal_temperature').map(({ entry, results }) => Number(results.temperature ?? entry.temperature))),
          trayWash: average(entriesOf('tray_wash').flatMap(({ results }) => [results.firstCheck, results.secondCheck, results.thirdCheck]).map(Number)),
          leftAngle: average(entriesOf('angles').flatMap(({ entry }) => [entry.angle_top_left, entry.angle_mid_left, entry.angle_bottom_left])),
          rightAngle: average(entriesOf('angles').flatMap(({ entry }) => [entry.angle_top_right, entry.angle_mid_right, entry.angle_bottom_right])),
          hatch: hatchTotal > 0 ? (hatchCount / hatchTotal) * 100 : null,
        };
      });

      const attention: AttentionItem[] = [];
      temperatureRows.forEach(({ entry }) => {
        const value = entry.temp_avg_overall ?? entry.temperature;
        if (value != null && !isBetween(value, 99.5, 100.5)) attention.push({ id: `temp-${entry.id}`, type: 'temperature', target: entry.machine?.machine_number ?? 'Machine', reason: `Eggshell temperature ${value.toFixed(1)}°F`, entryId: entry.id });
      });
      angleRows.forEach(({ entry }) => {
        const left = average([entry.angle_top_left, entry.angle_mid_left, entry.angle_bottom_left]);
        const right = average([entry.angle_top_right, entry.angle_mid_right, entry.angle_bottom_right]);
        if ((left != null && !isBetween(left, 38, 47)) || (right != null && !isBetween(right, 38, 47))) attention.push({ id: `angle-${entry.id}`, type: 'angles', target: entry.machine?.machine_number ?? 'Setter', reason: `Setter angle outside 38–47°`, entryId: entry.id });
      });
      rectalRows.forEach(({ entry, results }) => {
        const value = Number(results.temperature ?? entry.temperature);
        const location = results.location;
        const ok = isBetween(value, location === 'chick_room' ? 103 : 104, location === 'chick_room' ? 105 : 106);
        if (!ok) attention.push({ id: `rectal-${entry.id}`, type: 'rectal_temperature', target: String(location ?? 'Room').replace(/_/g, ' '), reason: `Rectal temperature ${value.toFixed(1)}°F`, entryId: entry.id });
      });
      trayRows.forEach(({ entry, results }) => {
        const temps = [results.firstCheck, results.secondCheck, results.thirdCheck].map(Number).filter(Number.isFinite);
        const ppms = [1, 2, 3, 4, 5].map((i) => Number(results[`ppm_check_${i}`])).filter(Number.isFinite);
        if (temps.some((v) => v < 140) || ppms.some((v) => !isBetween(v, 800, 1000))) attention.push({ id: `wash-${entry.id}`, type: 'tray_wash', target: 'Tray Wash', reason: 'Temperature or Quat PPM outside SOP', entryId: entry.id });
      });

      return {
        weekStart,
        weekEnd,
        entries,
        hatchProgress: Array.from(hatchByMachine.values()).sort((a, b) => a.machineLabel.localeCompare(b.machineLabel)),
        trend,
        coverage,
        metrics: {
          rectal: { value: average(rectalValues), count: rectalRows.length, inRange: rectalInRange, total: rectalRows.length },
          trayWash: { value: average(trayTemps), count: trayRows.length, inRange: trayTemps.filter((v) => v >= 140).length, total: trayTemps.length, ppmInRange: ppmValues.filter((v) => isBetween(v, 800, 1000)).length, ppmTotal: ppmValues.length, completedDays: new Set(trayRows.map(({ entry }) => entry.check_date)).size },
          eggshell: { value: average(temperatureValues), count: temperatureRows.length, inRange: temperatureValues.filter((v) => isBetween(v, 99.5, 100.5)).length, total: temperatureValues.length, front: average(temperatureRows.map(({ entry }) => entry.temp_avg_front)), middle: average(temperatureRows.map(({ entry }) => entry.temp_avg_middle)), back: average(temperatureRows.map(({ entry }) => entry.temp_avg_back)) },
          angles: { left: average(leftValues), right: average(rightValues), count: angleRows.length, outOfRange: angleOutOfRange },
          completion: { ...completion, percentage: completion.expected ? (completion.done / completion.expected) * 100 : 0 },
        },
        attention: attention.slice(0, 12),
      };
    },
  });
}