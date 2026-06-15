/**
 * Multi-stage hatchery operation constants & helpers.
 *
 * Centralizing these so changes (per-company overrides later, breed
 * variations, etc.) only happen here.
 */

import { addDays, differenceInWeeks } from "date-fns";

// Standard broiler timing. Different breeds (turkey, duck) would override.
export const SET_TO_HATCH_DAYS = 21;
export const SET_TO_TRANSFER_DAYS = 18;

// Default Wayne-style operation capacity.
export const DEFAULT_TOTAL_BUGGIES = 42;

// Wayne currently runs 3 buggy sizes. The tech picks one per operation;
// totals math uses the chosen size. Order matches the dropdown.
export const BUGGY_SIZES = [4860, 5184, 5508] as const;
export type BuggySize = (typeof BUGGY_SIZES)[number];
export const DEFAULT_BUGGY_SIZE: BuggySize = 5184;

// Back-compat alias for old call sites. New code should pass eggs_per_buggy explicitly.
export const EGGS_PER_BUGGY = DEFAULT_BUGGY_SIZE;

// Set color choices in display order (matches the physical color tags
// technicians put on buggies inside the setter).
export const SET_COLORS = [
  "black",
  "red",
  "orange",
  "blue",
  "purple",
  "green",
  "brown",
] as const;
export type SetColor = (typeof SET_COLORS)[number];

/** Tailwind-friendly color swatches for the picker. */
export const SET_COLOR_HEX: Record<SetColor, string> = {
  black: "#1f2937",
  red: "#dc2626",
  orange: "#ea580c",
  blue: "#2563eb",
  purple: "#7e22ce",
  green: "#16a34a",
  brown: "#78350f",
};

/** Compute hatch date from a set date. */
export function computeHatchDate(setDate: Date | string): Date {
  return addDays(new Date(setDate), SET_TO_HATCH_DAYS);
}

/** Compute transfer date from a set date. */
export function computeTransferDate(setDate: Date | string): Date {
  return addDays(new Date(setDate), SET_TO_TRANSFER_DAYS);
}

/** Compute flock age in weeks given arrival_date. Returns null if unknown. */
export function computeFlockAgeWeeks(
  arrivalDate?: string | null,
  baseAgeAtArrival = 0
): number | null {
  if (!arrivalDate) return null;
  const weeks = differenceInWeeks(new Date(), new Date(arrivalDate));
  return weeks + baseAgeAtArrival;
}

/** Total eggs for a row, given buggies set and the buggy size in use. */
export function rowEggsSet(buggiesSet: number, eggsPerBuggy: number = DEFAULT_BUGGY_SIZE): number {
  return Math.max(0, Math.round(buggiesSet * eggsPerBuggy));
}

/** Projected hatch count for a row. */
export function rowProjectedHatch(
  buggiesSet: number,
  expectedPercent?: number | null,
  eggsPerBuggy: number = DEFAULT_BUGGY_SIZE
): number {
  if (!expectedPercent || expectedPercent <= 0) return 0;
  return Math.round(rowEggsSet(buggiesSet, eggsPerBuggy) * (expectedPercent / 100));
}

/** Format YYYY-MM-DD without timezone drift. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
