/**
 * Local-date helpers to avoid the classic UTC-shift bug where
 * `new Date("2026-05-25")` becomes May 24 in US timezones.
 *
 * Use these anywhere we read a DATE (no time) column from Supabase
 * and want to display/filter it as a calendar date.
 */

/** Parse a `YYYY-MM-DD` (or ISO w/ time) string as a *local* Date. */
export function parseLocalDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  // Match YYYY-MM-DD optionally followed by anything (T..., space...)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Format a date-only string as M/d/yyyy without timezone drift. */
export function formatLocalDate(
  value: string | Date | null | undefined,
  fallback = "-"
): string {
  const d = parseLocalDate(value);
  if (!d) return fallback;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** ISO week-ish number based on the local date (matches existing behavior). */
export function calculateWeekLocal(value: string | Date | null | undefined): number | null {
  const date = parseLocalDate(value);
  if (!date) return null;
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const numberOfDays = Math.floor(
    (date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
}

/** Local today as YYYY-MM-DD (safe for export filenames). */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
