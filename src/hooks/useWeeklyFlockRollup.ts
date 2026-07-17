import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  aggregateByHouse,
  aggregateEggPackByFlock,
  aggregateHatchByFlock,
  aggregateResidueByFlock,
  normalizeFlockNumber,
} from "@/utils/dataSheetAggregation";

export interface WeeklyFlockRollupRow {
  key: string;
  flock_id: string | null;
  flock_number: string | number | null;
  flock_name: string | null;
  house_count: number;
  house_ids: string[];
  set_dates: string[];
  earliest_set_date: string | null;
  total_eggs_set: number;
  total_eggs_injected: number;
  total_eggs_cleared: number;
  total_chicks_hatched: number;
  grade_a_pct: number | null;
  fertility_pct: number | null;
  hof_pct: number | null;
  hoi_pct: number | null;
  hof_hoi_source: "override" | "residue" | "fertility" | "batch" | null;
  statuses: string[];
  worst_status: string;
  /** Which metrics were sourced from a whole-flock entry (override) */
  flock_level_source: {
    egg_pack: boolean;
    fertility: boolean;
    residue: boolean;
  };
  /** House-aggregated values when a flock-level override is applied */
  house_sum_alt: {
    grade_a_pct: number | null;
    fertility_pct: number | null;
    hof_pct: number | null;
    hoi_pct: number | null;
  };
}

interface Params {
  weekStart: Date; // inclusive
  weekEnd: Date; // inclusive
}

const STATUS_RANK: Record<string, number> = {
  scheduled: 0,
  in_setter: 1,
  in_hatcher: 2,
  completed: 3,
  cancelled: 4,
};

// Use local-date formatter (avoid toISOString shifting Monday → Sunday in
// negative-UTC timezones).
function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function useWeeklyFlockRollup({ weekStart, weekEnd }: Params) {
  const startStr = toDateStr(weekStart);
  const endStr = toDateStr(weekEnd);

  return useQuery({
    queryKey: ["weekly-flock-rollup", startStr, endStr],
    queryFn: async (): Promise<WeeklyFlockRollupRow[]> => {
      // 1) Batches (houses) for this Set Date week
      const { data: batches, error: batchErr } = await supabase
        .from("batches")
        .select(
          `id, batch_number, set_date, total_eggs_set, eggs_cleared, eggs_injected, chicks_hatched, status, flock_id,
           flocks(flock_number, flock_name, house_number)`
        )
        .is("archived_at", null)
        .gte("set_date", startStr)
        .lte("set_date", endStr)
        .order("set_date", { ascending: false });
      if (batchErr) throw batchErr;

      const rows = (batches || []).map((b: any) => ({
        id: b.id,
        set_date: b.set_date,
        status: b.status,
        house_number: b.flocks?.house_number ?? "",
        flock_id: b.flock_id,
        flock_number: b.flocks?.flock_number ?? null,
        flock_name: b.flocks?.flock_name ?? null,
        total_eggs_set: Number(b.total_eggs_set) || 0,
        eggs_cleared: Number(b.eggs_cleared) || 0,
        eggs_injected: Number(b.eggs_injected) || 0,
        chicks_hatched: Number(b.chicks_hatched) || 0,
      }));

      const batchIds = rows.map((r) => r.id);

      // 2) Worksheet rows for those batches (for weighted %)
      let epq: any[] = [];
      let fert: any[] = [];
      let res: any[] = [];
      if (batchIds.length) {
        const [epqR, fertR, resR] = await Promise.all([
          supabase.from("egg_pack_quality").select("*").in("batch_id", batchIds),
          supabase.from("fertility_analysis").select("*").in("batch_id", batchIds),
          supabase.from("residue_analysis").select("*").in("batch_id", batchIds),
        ]);
        if (epqR.error) throw epqR.error;
        if (fertR.error) throw fertR.error;
        if (resR.error) throw resR.error;
        epq = epqR.data || [];
        fert = fertR.data || [];
        res = resR.data || [];
      }

      // Enrich worksheet rows with flock_number by batch_id
      const batchToFlock = new Map<string, { flock_number: any; flock_name: any; house_number: any }>();
      rows.forEach((r) =>
        batchToFlock.set(r.id, {
          flock_number: r.flock_number,
          flock_name: r.flock_name,
          house_number: r.house_number,
        })
      );
      const enrich = (arr: any[]) =>
        arr.map((r) => {
          const meta = batchToFlock.get(r.batch_id) || {};
          return {
            ...r,
            flock_number: (meta as any).flock_number ?? r.flock_number,
            flock_name: (meta as any).flock_name ?? r.flock_name,
            house_number: (meta as any).house_number ?? r.house_number,
          };
        });

      const epqAgg = aggregateEggPackByFlock(enrich(epq));
      const fertAgg = aggregateHatchByFlock(enrich(fert));
      const resAgg = aggregateResidueByFlock(enrich(res));

      const byFlockEPQ = new Map<string, any>();
      epqAgg.forEach((r) => byFlockEPQ.set(normalizeFlockNumber(r.flock_number), r));
      const byFlockFert = new Map<string, any>();
      fertAgg.forEach((r) => byFlockFert.set(normalizeFlockNumber(r.flock_number), r));
      const byFlockRes = new Map<string, any>();
      resAgg.forEach((r) => byFlockRes.set(normalizeFlockNumber(r.flock_number), r));

      // 3) Group batches by flock
      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        const key = normalizeFlockNumber(r.flock_number) || r.flock_id || "__ungrouped__";
        const bucket = groups.get(key) ?? [];
        bucket.push(r);
        groups.set(key, bucket);
      }

      // 3b) Fetch flock-level overrides for this week (by flock_id, period_start)
      const flockIds = Array.from(
        new Set(rows.map((r) => r.flock_id).filter(Boolean) as string[])
      );
      let flockEpqOverride = new Map<string, any>();
      let flockFertOverride = new Map<string, any>();
      let flockResOverride = new Map<string, any>();
      if (flockIds.length) {
        const [epqO, fertO, resO] = await Promise.all([
          supabase
            .from("flock_weekly_egg_pack")
            .select("*")
            .in("flock_id", flockIds)
            .eq("period_start", startStr),
          supabase
            .from("flock_weekly_fertility")
            .select("*")
            .in("flock_id", flockIds)
            .eq("period_start", startStr),
          supabase
            .from("flock_weekly_residue")
            .select("*")
            .in("flock_id", flockIds)
            .eq("period_start", startStr),
        ]);
        (epqO.data || []).forEach((r: any) => flockEpqOverride.set(r.flock_id, r));
        (fertO.data || []).forEach((r: any) => flockFertOverride.set(r.flock_id, r));
        (resO.data || []).forEach((r: any) => flockResOverride.set(r.flock_id, r));
      }

      const out: WeeklyFlockRollupRow[] = [];
      for (const [key, bucket] of groups) {
        const totalEggs = bucket.reduce((a, r) => a + r.total_eggs_set, 0);
        const totalCleared = bucket.reduce((a, r) => a + r.eggs_cleared, 0);
        const totalInjected = bucket.reduce((a, r) => a + r.eggs_injected, 0);
        const totalChicks = bucket.reduce((a, r) => a + r.chicks_hatched, 0);

        const houseSet = new Set(
          bucket.map((r) => String(r.house_number ?? "").trim().toLowerCase()).filter(Boolean)
        );
        const setDates = Array.from(new Set(bucket.map((r) => r.set_date))).sort();
        const statuses = Array.from(new Set(bucket.map((r) => r.status)));
        const worst = statuses.reduce(
          (best, s) => (STATUS_RANK[s] < STATUS_RANK[best] ? s : best),
          statuses[0] || "scheduled"
        );

        const epqRow = byFlockEPQ.get(key);
        const fertRow = byFlockFert.get(key);
        const resRow = byFlockRes.get(key);

        const flockId = bucket[0].flock_id ?? null;
        const epqOv = flockId ? flockEpqOverride.get(flockId) : null;
        const fertOv = flockId ? flockFertOverride.get(flockId) : null;
        const resOv = flockId ? flockResOverride.get(flockId) : null;

        const houseGradeAPct =
          epqRow && epqRow.sample_size && epqRow.grade_a
            ? (Number(epqRow.grade_a) / Number(epqRow.sample_size)) * 100
            : null;
        const overrideGradeAPct =
          epqOv && Number(epqOv.sample_size) > 0
            ? (Number(epqOv.grade_a || 0) / Number(epqOv.sample_size)) * 100
            : null;

        const houseFertPct = fertRow?.fertility_percent ?? null;
        const overrideFertPct = fertOv?.fertility_percent ?? null;

        const houseHofPct = resRow?.hof_percent ?? fertRow?.hof_percent ?? null;
        const houseHoiPct = resRow?.hoi_percent ?? fertRow?.hoi_percent ?? null;
        const overrideHofPct = resOv?.hof_percent ?? fertOv?.hof_percent ?? null;
        const overrideHoiPct = resOv?.hoi_percent ?? fertOv?.hoi_percent ?? null;

        out.push({
          key,
          flock_id: flockId,
          flock_number: bucket[0].flock_number,
          flock_name: bucket[0].flock_name,
          house_count: houseSet.size || bucket.length,
          house_ids: bucket.map((r) => r.id),
          set_dates: setDates,
          earliest_set_date: setDates[0] ?? null,
          total_eggs_set: totalEggs,
          total_eggs_cleared: totalCleared,
          total_eggs_injected: totalInjected,
          total_chicks_hatched: totalChicks,
          grade_a_pct: overrideGradeAPct ?? houseGradeAPct,
          fertility_pct: overrideFertPct ?? houseFertPct,
          hof_pct: overrideHofPct ?? houseHofPct,
          hoi_pct: overrideHoiPct ?? houseHoiPct,
          statuses,
          worst_status: worst,
          flock_level_source: {
            egg_pack: Boolean(epqOv),
            fertility: Boolean(fertOv),
            residue: Boolean(resOv),
          },
          house_sum_alt: {
            grade_a_pct: overrideGradeAPct != null ? houseGradeAPct : null,
            fertility_pct: overrideFertPct != null ? houseFertPct : null,
            hof_pct: overrideHofPct != null ? houseHofPct : null,
            hoi_pct: overrideHoiPct != null ? houseHoiPct : null,
          },
        });
      }

      out.sort((a, b) => {
        const an = String(a.flock_name ?? a.flock_number ?? "");
        const bn = String(b.flock_name ?? b.flock_number ?? "");
        return an.localeCompare(bn);
      });
      return out;
    },
  });
}
