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

// ---------------------------------------------------------------------------
// Flock-level aggregation for the non-Embrex Data Sheet tabs.
// Read-only rollups keyed strictly by normalized flock_number so a flock
// spread across multiple houses / hatcheries collapses to one row.
// ---------------------------------------------------------------------------

export function normalizeFlockNumber(v: unknown): string {
  if (v == null) return "";
  return String(v).trim().toLowerCase();
}

function uniqStr(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = (v ?? "").toString().trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function joinList(values: (string | null | undefined)[], sep = " • "): string {
  const parts = uniqStr(values);
  return parts.length ? parts.join(sep) : "";
}

function earliest(dates: (string | null | undefined)[]): string | null {
  const parsed = dates
    .filter((d): d is string => !!d)
    .map((d) => ({ d, t: new Date(d).getTime() }))
    .filter((x) => Number.isFinite(x.t));
  if (!parsed.length) return null;
  parsed.sort((a, b) => a.t - b.t);
  return parsed[0].d;
}

function maxNum(values: unknown[]): number | null {
  const nums = values.map(num).filter((n) => n > 0);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function groupByFlock<T extends { flock_number?: unknown; flock_id?: unknown }>(
  rows: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key =
      normalizeFlockNumber(row.flock_number) ||
      String(row.flock_id ?? "") ||
      "__ungrouped__";
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return groups;
}

function commonFlockFields(bucket: any[]) {
  const houseCount = new Set(
    bucket.map((r) => String(r.house_number ?? "").trim().toLowerCase()).filter(Boolean)
  ).size;
  return {
    flock_number: bucket[0].flock_number,
    flock_name: joinList(bucket.map((r) => r.flock_name)) || bucket[0].flock_name || null,
    house_number: houseCount > 1 ? null : bucket[0].house_number,
    age_weeks: maxNum(bucket.map((r) => r.age_weeks)),
    set_date: earliest(bucket.map((r) => r.set_date)),
    _flock_house_count: houseCount || 1,
    _aggregated_count: bucket.length,
  };
}

/** Residue Analysis: sum sample & mortality; recompute HOF/HOI %. */
export function aggregateResidueByFlock(rows: any[]): any[] {
  const out: any[] = [];
  for (const [, bucket] of groupByFlock(rows)) {
    const sample = bucket.reduce(
      (a, r) => a + num(r.residue_sample_size ?? r.sample_size),
      0
    );
    const infertile = bucket.reduce((a, r) => a + num(r.infertile_eggs), 0);
    const earlyD = bucket.reduce((a, r) => a + num(r.early_dead), 0);
    const midD = bucket.reduce((a, r) => a + num(r.mid_dead), 0);
    const lateD = bucket.reduce((a, r) => a + num(r.late_dead), 0);
    const cull = bucket.reduce((a, r) => a + num(r.malformed_chicks), 0);
    const livePips = bucket.reduce((a, r) => a + num(r.live_pip_number), 0);
    const deadPips = bucket.reduce((a, r) => a + num(r.dead_pip_number), 0);
    const handlingCracks = bucket.reduce((a, r) => a + num(r.handling_cracks), 0);
    const transferCrack = bucket.reduce((a, r) => a + num(r.transfer_crack), 0);
    const contaminated = bucket.reduce((a, r) => a + num(r.contaminated_eggs), 0);
    const mold = bucket.reduce((a, r) => a + num(r.mold), 0);
    const abnormal = bucket.reduce((a, r) => a + num(r.abnormal), 0);
    const brainDefects = bucket.reduce((a, r) => a + num(r.brain_defects), 0);
    const dryEgg = bucket.reduce((a, r) => a + num(r.dry_egg), 0);
    const malpositioned = bucket.reduce((a, r) => a + num(r.malpositioned), 0);
    const upsideDown = bucket.reduce((a, r) => a + num(r.upside_down), 0);
    const chicks = bucket.reduce((a, r) => a + num(r.chicks_hatched), 0);
    const injected = bucket.reduce((a, r) => a + num(r.eggs_injected), 0);
    const fertile = Math.max(0, sample - infertile);

    out.push({
      ...commonFlockFields(bucket),
      batch_id: `flock-${normalizeFlockNumber(bucket[0].flock_number)}`,
      residue_sample_size: sample || null,
      sample_size: sample || null,
      infertile_eggs: infertile || null,
      fertile_eggs: fertile || null,
      early_dead: earlyD || null,
      mid_dead: midD || null,
      late_dead: lateD || null,
      malformed_chicks: cull || null,
      live_pip_number: livePips || null,
      dead_pip_number: deadPips || null,
      pip_number: livePips + deadPips || null,
      handling_cracks: handlingCracks || null,
      transfer_crack: transferCrack || null,
      contaminated_eggs: contaminated || null,
      mold: mold || null,
      abnormal: abnormal || null,
      brain_defects: brainDefects || null,
      dry_egg: dryEgg || null,
      malpositioned: malpositioned || null,
      upside_down: upsideDown || null,
      chicks_hatched: chicks || null,
      eggs_injected: injected || null,
      hof_percent: pct(chicks, fertile),
      hoi_percent: pct(chicks, injected),
      lab_technician: joinList(bucket.map((r) => r.lab_technician)),
      notes: joinList(bucket.map((r) => r.notes ?? r.residue_notes)),
    });
  }
  return out;
}

/** Egg Pack Quality: sum sample + defects. */
export function aggregateEggPackByFlock(rows: any[]): any[] {
  const out: any[] = [];
  for (const [, bucket] of groupByFlock(rows)) {
    const sample = bucket.reduce((a, r) => a + num(r.epq_sample_size), 0);
    const sum = (f: string) => bucket.reduce((a, r) => a + num(r[f]), 0) || null;
    // Extract stained/abnormal/contaminated/usd from notes string of each row
    const extract = (notes: string | null | undefined, field: string): number => {
      if (!notes) return 0;
      const m = notes.match(new RegExp(`${field}:\\s*(\\d+)`));
      return m ? parseInt(m[1]) : 0;
    };
    const stained = bucket.reduce((a, r) => a + extract(r.notes, "Stained"), 0);
    const abnormal = bucket.reduce((a, r) => a + extract(r.notes, "Abnormal"), 0);
    const contaminated = bucket.reduce((a, r) => a + extract(r.notes, "Contaminated"), 0);
    const usd = bucket.reduce((a, r) => a + extract(r.notes, "USD"), 0);
    const setWeek =
      bucket
        .map((r) => {
          const m = (r.notes ?? "").match(/Set Week:\s*([^,]+)/);
          return m ? m[1].trim() : "";
        })
        .find((v) => v) || "";

    // Build a merged notes string so the existing table extractor still works
    const notesMerged =
      `Stained: ${stained}, Abnormal: ${abnormal}, Contaminated: ${contaminated}, USD: ${usd}` +
      (setWeek ? `, Set Week: ${setWeek}` : "");

    out.push({
      ...commonFlockFields(bucket),
      batch_id: `flock-${normalizeFlockNumber(bucket[0].flock_number)}`,
      epq_sample_size: sample || null,
      sample_size: sample || null,
      cracked: sum("cracked"),
      dirty: sum("dirty"),
      small: sum("small"),
      large: sum("large"),
      grade_a: sum("grade_a"),
      grade_b: sum("grade_b"),
      grade_c: sum("grade_c"),
      inspector_name: joinList(bucket.map((r) => r.inspector_name)),
      notes: notesMerged,
    });
  }
  return out;
}

/** Hatch Results: sum eggs/fertile/chicks; recompute all %. */
export function aggregateHatchByFlock(rows: any[]): any[] {
  const out: any[] = [];
  for (const [, bucket] of groupByFlock(rows)) {
    const sample = bucket.reduce((a, r) => a + num(r.sample_size), 0);
    const fertile = bucket.reduce((a, r) => a + num(r.fertile_eggs), 0);
    const infertile = bucket.reduce((a, r) => a + num(r.infertile_eggs), 0);
    const chicks = bucket.reduce((a, r) => a + num(r.chicks_hatched), 0);
    const injected = bucket.reduce((a, r) => a + num(r.eggs_injected), 0);

    out.push({
      ...commonFlockFields(bucket),
      batch_id: `flock-${normalizeFlockNumber(bucket[0].flock_number)}`,
      sample_size: sample || null,
      fertile_eggs: fertile || null,
      infertile_eggs: infertile || null,
      chicks_hatched: chicks || null,
      eggs_injected: injected || null,
      fertility_percent: pct(fertile, sample),
      hatch_percent: pct(chicks, sample),
      hof_percent: pct(chicks, fertile),
      hoi_percent: pct(chicks, injected),
      if_dev_percent: pct(infertile, fertile),
      technician_name: joinList(bucket.map((r) => r.technician_name)),
      notes: joinList(bucket.map((r) => r.notes)),
    });
  }
  return out;
}

/** QA Monitoring: latest reading per house, then latest per flock. */
export function aggregateQAByFlock(rows: any[]): any[] {
  const rank = (r: any) => {
    const t = r.check_date ? new Date(r.check_date).getTime() : 0;
    const d = num(r.day_of_incubation);
    return (Number.isFinite(t) ? t : 0) + d * 1000;
  };
  const out: any[] = [];
  for (const [, bucket] of groupByFlock(rows)) {
    // Per-house latest
    const byHouse = new Map<string, any>();
    for (const r of bucket) {
      const hk = String(r.house_number ?? "").trim().toLowerCase() || "__nohouse__";
      const cur = byHouse.get(hk);
      if (!cur || rank(r) > rank(cur)) byHouse.set(hk, r);
    }
    const latestPerHouse = Array.from(byHouse.values());
    latestPerHouse.sort((a, b) => rank(b) - rank(a));
    const latest = latestPerHouse[0] ?? bucket[0];

    out.push({
      ...latest,
      ...commonFlockFields(bucket),
      id: `flock-${normalizeFlockNumber(bucket[0].flock_number)}`,
      inspector_name: joinList(latestPerHouse.map((r) => r.inspector_name)),
      notes: joinList(latestPerHouse.map((r) => r.notes)),
    });
  }
  return out;
}

