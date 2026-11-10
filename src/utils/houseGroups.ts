import type { FlockWeekBatch } from "@/hooks/useFlockWeekBatches";

/**
 * A grower house of a flock for one set week. A house is set across several
 * set records ("buggies"), so weekly sample sheets are entered once per house
 * rather than once per buggy.
 */
export interface HouseGroup {
  /** Stable key: the house number, or "__none__" for records with no house. */
  key: string;
  houseNumber: string;
  /** Every set record (batch) that belongs to this house this week. */
  batchIds: string[];
  /** Set record that carries the house-level saved values. */
  repId: string;
  batches: FlockWeekBatch[];
  eggsSet: number;
  /** Buggies set for this house (counts one per set record when unknown). */
  buggyCount: number;
  machineNumbers: string[];
}

export const NO_HOUSE_KEY = "__none__";

export const houseLabel = (houseNumber: string) =>
  houseNumber ? `House ${houseNumber}` : "No house number";

/** Group a flock-week's set records by grower house, sorted by house number. */
export function groupBatchesByHouse(batches: FlockWeekBatch[]): HouseGroup[] {
  const byKey = new Map<string, FlockWeekBatch[]>();
  batches.forEach((b) => {
    const key = b.house_number ? b.house_number : NO_HOUSE_KEY;
    const list = byKey.get(key);
    if (list) list.push(b);
    else byKey.set(key, [b]);
  });

  return Array.from(byKey.entries())
    .map(([key, list]) => {
      const sorted = [...list].sort(
        (a, b) => a.set_date.localeCompare(b.set_date) || a.id.localeCompare(b.id)
      );
      return {
        key,
        houseNumber: key === NO_HOUSE_KEY ? "" : key,
        batchIds: sorted.map((b) => b.id),
        repId: sorted[0].id,
        batches: sorted,
        eggsSet: sorted.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0),
        buggyCount: sorted.reduce((sum, b) => sum + (b.buggies ?? 1), 0),
        machineNumbers: Array.from(
          new Set(sorted.map((b) => b.machine_number).filter((m): m is string => !!m))
        ),
      } satisfies HouseGroup;
    })
    .sort((a, b) => {
      if (a.key === NO_HOUSE_KEY) return 1;
      if (b.key === NO_HOUSE_KEY) return -1;
      return a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true });
    });
}

/**
 * Split an integer total across weights (e.g. eggs set per buggy) so the parts
 * add up to exactly the total (largest-remainder method).
 */
export function allocateByWeight(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  const safe = sum > 0 ? weights : weights.map(() => 1);
  const safeSum = sum > 0 ? sum : weights.length;
  const exact = safe.map((w) => (total * w) / safeSum);
  const parts = exact.map((x) => Math.floor(x));
  let remainder = Math.round(total) - parts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    parts[order[k].i] += 1;
  }
  return parts;
}
