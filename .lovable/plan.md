
## Problem (confirmed)

The QA Hub header has a date picker (`checkDate` in `QAHubPage.tsx`), but the Overview tab ignores it:

- `QAOverviewDashboard` takes no `checkDate` prop.
- `useQAOverviewData()` hardcodes `today = new Date()` and derives `weekAgo` / `dayAgo` / overdue thresholds from the wall clock.
- Query key is a constant `['qa-overview']`, so changing the header date can't even invalidate the cache.

Result: KPIs, Today's Compliance, Attention Needed and Recent Activity always show "today (real world)" numbers no matter which date the user picks.

## Fix

1. **`src/hooks/useQAOverviewData.ts`**
   - Accept a `referenceDate: string` (YYYY-MM-DD) argument.
   - Include it in the `queryKey` so React Query refetches per date.
   - Compute all windows from an anchor = end-of-day of `referenceDate` (or "now" if the reference date is today):
     - `today` = `referenceDate`
     - `weekAgo` = anchor − 7d
     - `dayAgo` = anchor − 24h
     - `nowMs` for overdue math = anchor time (so past-date views measure "was it overdue as of that day", not "as of right now")
   - Everything else (filters, overdue thresholds, compliance building) already keys off these values — no logic change needed.

2. **`src/components/qa-hub/overview/QAOverviewDashboard.tsx`**
   - Add `checkDate: string` prop.
   - Pass it to `useQAOverviewData(checkDate)`.
   - Show the active date in the "Today's Compliance" / KPI labels when it's not the real today (e.g. "Checks on Jun 5" instead of "Today's Checks") so managers viewing history aren't confused.

3. **`src/pages/QAHubPage.tsx`**
   - Pass `checkDate` down: `<QAOverviewDashboard checkDate={checkDate} onJumpTo={handleJumpTo} />`.

## Out of scope

- No DB/schema changes.
- No changes to Machine / Process / Flock tabs (they already consume `checkDate`).
- No changes to entry forms.
