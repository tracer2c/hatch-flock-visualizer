/**
 * Aggregates per-machine Data Sheet rows into one row per
 * Flock + House + Set Date, so the sheet matches the House Management
 * card total (e.g. 87,480 eggs) instead of showing TROY-15 / TROY-20 /
 * TROY-18 as separate rows.
 *
 * Percentages are recomputed from the summed totals — never averaged
 * from per-machine percentages (which would be mathematically wrong).
 */

const SUM_FIELDS = [
  "total_eggs_set",
  "eggs_cleared",
  "eggs_injected",
  "sample_size",
  "fertile_eggs",
  "infertile_eggs",
  "early_dead",
  "mid_dead",
  "late_dead",
  "pipped_not_hatched",
  "contaminated_eggs",
  "malformed_chicks",
  "chicks_hatched",
  "chicks",
] as const;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(v as string);
  return Number.isFinite(n) ? n : 0;
}

function pct(part: number, whole: number): number | null {
  if (!whole || whole <= 0) return null;
  return (part / whole) * 100;
}

export function aggregateByFlockHouse(rows: any[]): any[] {
  const groups = new Map<string, any[]>();

  for (const row of rows) {
    // Group by flock + house + set date + data_type so QA / Fertility / Embrex
    // rows don't collapse into each other.
    const key = [
      row.flock_number ?? row.flock_id ?? "",
      row.house_number ?? "",
      row.set_date ?? "",
      row.data_type ?? "embrex",
    ].join("|");
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const out: any[] = [];
  for (const [, bucket] of groups) {
    if (bucket.length === 1) {
      out.push({ ...bucket[0], _aggregated_count: 1 });
      continue;
    }

    const base = { ...bucket[0] };
    const sums: Record<string, number> = {};
    for (const f of SUM_FIELDS) sums[f] = 0;

    for (const r of bucket) {
      for (const f of SUM_FIELDS) sums[f] += num(r[f]);
    }

    // Replace summable fields
    for (const f of SUM_FIELDS) {
      base[f] = sums[f] || null;
    }

    // Recompute percentages from summed totals
    const total = sums.total_eggs_set;
    const sample = sums.sample_size || total || 0;
    const fertile = sums.fertile_eggs;
    const injected = sums.eggs_injected;
    const chicks = sums.chicks_hatched || sums.chicks;

    // HOF % = chicks / fertile
    base.hof_percent = pct(chicks, fertile);
    // HOI % = chicks / injected
    base.hoi_percent = pct(chicks, injected);
    // I/F Dev % = (infertile) / sample (best-effort — kept as-is if unusable)
    base.if_dev_percent = pct(sums.infertile_eggs, sample);
    // Fertility %
    base.fertility_percent = pct(fertile, sample);
    // Hatch %
    base.hatch_percent = pct(chicks, total);

    // Clear a single machine_number so the UI doesn't show a misleading one
    base.machine_number = null;

    base._aggregated_count = bucket.length;
    base._source_ids = bucket.map((r) => r.id).filter(Boolean);
    out.push(base);
  }

  return out;
}

/**
 * Collapse per-machine `batches` rows into one row per House
 * (flock_id + house_number + set_date). Used by the Embrex/HOI "By House"
 * view so a house shows its full 87,480 total instead of TROY-15 /
 * TROY-20 / TROY-18 as separate rows.
 */
const HOUSE_SUM_FIELDS = [
  "total_eggs_set",
  "eggs_cleared",
  "eggs_injected",
  "chicks_hatched",
] as const;

export type BatchSlice = { id: string; total_eggs_set: number };

export function aggregateByHouse(rows: any[]): any[] {
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = [
      row.flock_id ?? "",
      row.house_number ?? "",
      row.set_date ?? "",
    ].join("|");
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const out: any[] = [];
  for (const [, bucket] of groups) {
    const slices: BatchSlice[] = bucket
      .map((r) => ({ id: r.id, total_eggs_set: num(r.total_eggs_set) }))
      .filter((s) => !!s.id);

    if (bucket.length === 1) {
      out.push({
        ...bucket[0],
        _aggregated_count: 1,
        _batch_slices: slices,
      });
      continue;
    }

    const base = { ...bucket[0] };
    const sums: Record<string, number> = {};
    for (const f of HOUSE_SUM_FIELDS) sums[f] = 0;
    for (const r of bucket) {
      for (const f of HOUSE_SUM_FIELDS) sums[f] += num(r[f]);
    }
    for (const f of HOUSE_SUM_FIELDS) base[f] = sums[f];

    // Blank out fields that only make sense per-machine
    base.machine_number = null;
    base.machine_id = null;

    base._aggregated_count = bucket.length;
    base._batch_slices = slices;
    base._batch_ids = slices.map((s) => s.id);
    out.push(base);
  }

  return out;
}

/**
 * Split a total across batch slices proportionally by total_eggs_set.
 * Rounds each slice to an integer and pushes the rounding drift onto the
 * last slice so the sum matches the input exactly.
 */
export function proportionalSplit(
  total: number | null,
  slices: BatchSlice[]
): Array<{ id: string; value: number | null }> {
  if (total == null) return slices.map((s) => ({ id: s.id, value: null }));
  const denom = slices.reduce((a, s) => a + (s.total_eggs_set || 0), 0);
  if (!denom) {
    // Even split when we can't weight (shouldn't normally happen).
    const each = Math.floor(total / slices.length);
    const rem = total - each * slices.length;
    return slices.map((s, i) => ({
      id: s.id,
      value: each + (i === slices.length - 1 ? rem : 0),
    }));
  }
  const raw = slices.map((s) => (total * (s.total_eggs_set || 0)) / denom);
  const rounded = raw.map((v) => Math.round(v));
  const drift = total - rounded.reduce((a, v) => a + v, 0);
  if (drift !== 0 && rounded.length) {
    rounded[rounded.length - 1] += drift;
  }
  return slices.map((s, i) => ({ id: s.id, value: rounded[i] }));
}
