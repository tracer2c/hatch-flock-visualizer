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
    out.push(base);
  }

  return out;
}
