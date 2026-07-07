import { useMemo } from 'react';

/**
 * Phase D — Shared edit-vs-view rule for daily QA log entries.
 *
 * Any form that persists a "one row per day" (or "many rows per day") record
 * should derive its edit/view mode from this hook so behavior stays consistent
 * across the app:
 *   - checkDate === today → mode 'edit', save enabled
 *   - checkDate <  today  → mode 'view', save disabled, inputs read-only
 *   - checkDate >  today  → mode 'view' (future dates are look-ahead only)
 *
 * The hook is intentionally scope-agnostic: it does not fetch the existing
 * row itself. Callers pair it with a purpose-specific fetch hook (e.g.
 * `useTodaysTrayWash`) or `useTodaysQAEntries` and pass the row through.
 */
export type DayScopedMode = 'edit' | 'view';

export interface DayScopedEntry<T = unknown> {
  mode: DayScopedMode;
  isToday: boolean;
  isPastDay: boolean;
  isFutureDay: boolean;
  todayISO: string;
  /** Existing row for the selected date, when the caller supplies one. */
  existingRow: T | null;
  /** ISO timestamp of the last save on the existing row, if available. */
  lastSavedAt: string | null;
}

interface Options<T> {
  checkDate: string;
  existingRow?: T | null;
  /** Field name on the row that holds the "last saved" timestamp. Defaults to `created_at`. */
  savedAtField?: keyof T | 'created_at' | 'updated_at';
}

export function useDayScopedEntry<T extends Record<string, any> = Record<string, any>>(
  { checkDate, existingRow = null, savedAtField = 'created_at' }: Options<T>
): DayScopedEntry<T> {
  return useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const isToday = checkDate === todayISO;
    const isPastDay = checkDate < todayISO;
    const isFutureDay = checkDate > todayISO;
    const mode: DayScopedMode = isToday ? 'edit' : 'view';
    const lastSavedAt = existingRow
      ? ((existingRow as any)[savedAtField] ?? (existingRow as any).created_at ?? null)
      : null;
    return {
      mode,
      isToday,
      isPastDay,
      isFutureDay,
      todayISO,
      existingRow,
      lastSavedAt,
    };
  }, [checkDate, existingRow, savedAtField]);
}
