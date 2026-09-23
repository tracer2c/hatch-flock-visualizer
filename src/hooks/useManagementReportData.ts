import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 500;
const CHILD_CHUNK_SIZE = 150;
const numberOf = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const percent = (part: number, whole: number) => whole > 0 ? (part / whole) * 100 : null;

type AnalysisRow = Record<string, unknown> & { batch_id: string; analysis_date?: string | null; inspection_date?: string | null; created_at?: string | null };
type BatchRecord = {
  id: string; batch_number: string; flock_id: string; machine_id: string | null; unit_id: string | null;
  set_date: string; total_eggs_set: number; chicks_hatched: number;
  flock: { id: string; flock_number: string | number; flock_name: string; house_number: string | number | null; age_weeks: number | null; breed: string | null } | null;
  unit: { id: string; name: string; code: string | null } | null;
  machine: { id: string; machine_number: string } | null;
};
type GroupedBatch = BatchRecord & { houseNumber: string };

export interface ReportRow {
  key: string;
  batchIds: string[];
  flockId: string;
  flockNumber: string;
  flockName: string;
  breed: string;
  ageWeeks: number | null;
  houseNumber: string;
  unitId: string;
  unitName: string;
  machineNames: string[];
  firstSetDate: string;
  lastSetDate: string;
  eggsSet: number;
  chicksHatched: number;
  fertilitySample: number;
  fertileEggs: number;
  fertilityPercent: number | null;
  earlyDead: number;
  residueSample: number;
  contaminatedEggs: number;
  contaminationPercent: number | null;
  lateDead: number;
  lateDeadPercent: number | null;
  upsideDown: number;
  hatchPercent: number | null;
  completeness: number;
}

async function fetchBatchPages(from: string, to: string) {
  const collected: BatchRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from("batches").select(`
      id, batch_number, flock_id, machine_id, unit_id, set_date, total_eggs_set, chicks_hatched,
      flock:flocks!batches_flock_id_fkey(id, flock_number, flock_name, house_number, age_weeks, breed),
      unit:units!batches_unit_fk(id, name, code),
      machine:machines!batches_machine_id_fkey(id, machine_number)
    `).is("archived_at", null).gte("set_date", from).lte("set_date", to)
      .order("set_date", { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    collected.push(...((data || []) as unknown as BatchRecord[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return collected;
}

async function fetchChildren(table: "fertility_analysis" | "residue_analysis", ids: string[]) {
  const rows: AnalysisRow[] = [];
  for (let index = 0; index < ids.length; index += CHILD_CHUNK_SIZE) {
    const { data, error } = await supabase.from(table).select("*").in("batch_id", ids.slice(index, index + CHILD_CHUNK_SIZE)).is("archived_at", null);
    if (error) throw error;
    rows.push(...((data || []) as AnalysisRow[]));
  }
  return rows;
}

function latestByBatch(rows: AnalysisRow[]) {
  const latest = new Map<string, AnalysisRow>();
  const rank = (row: AnalysisRow) => new Date(row.analysis_date || row.inspection_date || row.created_at || 0).getTime();
  rows.forEach((row) => {
    const current = latest.get(row.batch_id);
    if (!current || rank(row) >= rank(current)) latest.set(row.batch_id, row);
  });
  return latest;
}

function aggregateRows(batches: BatchRecord[], fertilityRows: AnalysisRow[], residueRows: AnalysisRow[]) {
  const fertilityByBatch = latestByBatch(fertilityRows);
  const residueByBatch = latestByBatch(residueRows);
  const groups = new Map<string, GroupedBatch[]>();
  batches.forEach((batch) => {
    const flock = batch.flock;
    const unit = batch.unit;
    const machine = batch.machine;
    const houseNumber = String(flock?.house_number || batch.batch_number || "Not recorded");
    const key = [batch.flock_id || "unassigned", houseNumber.toLowerCase(), batch.unit_id || "unassigned"].join("|");
    groups.set(key, [...(groups.get(key) || []), { ...batch, flock, unit, machine, houseNumber }]);
  });
  return Array.from(groups.entries()).map(([key, bucket]): ReportRow => {
    const first = bucket[0];
    const batchIds = bucket.map((batch) => batch.id);
    const fertility = batchIds.map((id) => fertilityByBatch.get(id)).filter(Boolean) as AnalysisRow[];
    const residue = batchIds.map((id) => residueByBatch.get(id)).filter(Boolean) as AnalysisRow[];
    const eggsSet = bucket.reduce((sum, batch) => sum + numberOf(batch.total_eggs_set), 0);
    const chicksHatched = bucket.reduce((sum, batch) => sum + numberOf(batch.chicks_hatched), 0);
    const fertilitySample = fertility.reduce((sum, row) => sum + numberOf(row.sample_size), 0);
    const fertileEggs = fertility.reduce((sum, row) => sum + numberOf(row.fertile_eggs), 0);
    const residueSample = residue.reduce((sum, row) => sum + numberOf(row.sample_size), 0);
    const contaminatedEggs = residue.reduce((sum, row) => sum + numberOf(row.contaminated_eggs), 0);
    const lateDead = residue.reduce((sum, row) => sum + numberOf(row.late_dead), 0);
    const fertilityEarlyDead = fertility.reduce((sum, row) => sum + numberOf(row.early_dead), 0);
    const residueEarlyDead = residue.reduce((sum, row) => sum + numberOf(row.early_dead), 0);
    const upsideDown = residue.reduce((sum, row) => sum + numberOf(row.upside_down), 0);
    const setDates = bucket.map((batch) => batch.set_date).sort();
    return {
      key, batchIds, flockId: first.flock_id || "", flockNumber: String(first.flock?.flock_number ?? "Not recorded"),
      flockName: first.flock?.flock_name || "Unnamed flock", breed: first.flock?.breed || "Not recorded",
      ageWeeks: first.flock?.age_weeks == null ? null : numberOf(first.flock.age_weeks), houseNumber: first.houseNumber,
      unitId: first.unit_id || "", unitName: first.unit?.name || first.unit?.code || "Unassigned hatchery",
      machineNames: Array.from(new Set(bucket.map((batch) => batch.machine?.machine_number).filter(Boolean))) as string[],
      firstSetDate: setDates[0] || "", lastSetDate: setDates[setDates.length - 1] || "", eggsSet, chicksHatched,
      fertilitySample, fertileEggs, fertilityPercent: percent(fertileEggs, fertilitySample), earlyDead: fertilityEarlyDead || residueEarlyDead,
      residueSample, contaminatedEggs, contaminationPercent: percent(contaminatedEggs, residueSample), lateDead,
      lateDeadPercent: percent(lateDead, residueSample), upsideDown, hatchPercent: percent(chicksHatched, eggsSet),
      completeness: [eggsSet > 0, fertility.length > 0, residue.length > 0, chicksHatched > 0].filter(Boolean).length,
    };
  });
}

async function loadRange(from: Date, to: Date) {
  const batches = await fetchBatchPages(format(from, "yyyy-MM-dd"), format(to, "yyyy-MM-dd"));
  const ids = batches.map((batch) => batch.id);
  const [fertility, residue] = ids.length ? await Promise.all([fetchChildren("fertility_analysis", ids), fetchChildren("residue_analysis", ids)]) : [[], []];
  return aggregateRows(batches, fertility, residue);
}

export function useManagementReportData({ from, to }: { from: Date; to: Date }) {
  const fromString = format(from, "yyyy-MM-dd");
  const toString = format(to, "yyyy-MM-dd");
  return useQuery({
    queryKey: ["management-report-data", fromString, toString],
    queryFn: async () => {
      const duration = Math.max(1, differenceInCalendarDays(to, from) + 1);
      const previousTo = addDays(from, -1);
      const previousFrom = addDays(previousTo, -(duration - 1));
      const [rows, previousRows] = await Promise.all([loadRange(from, to), loadRange(previousFrom, previousTo)]);
      return { rows, previousRows };
    },
    staleTime: 60_000,
  });
}