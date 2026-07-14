## Diagnosis

The Dashboard renders correctly — it isn't broken. It shows all zeros because the default date filter is **"this week" (Jul 13 – Jul 19, 2026)**, and the `batches` table has **no rows** in that range. The most recent data in the DB is:

- Jun 22, 2026 — 1 batch (0 eggs)
- Jun 15, 2026 — 1 batch (0 eggs)
- Jun 1, 2026 — 120 batches (603,936 eggs)
- May 25–28, 2026 — heavy activity

So every KPI, Needs Attention, and Weekly Flock Status card correctly resolves to 0/empty. The 55,000 "Finch Hollow" number you saw earlier was for a different set-week (Mar 16, 2026), not this week.

There's also a minor timezone bug in `useWeeklyFlockRollup.toDateStr` — it uses `.toISOString()` which shifts local Monday into Sunday UTC for negative-UTC users. Worth fixing while we're here.

## What to change

### 1. Smarter default date range
In `AnalyticsFilterContext.tsx`, when no saved filter exists in sessionStorage, don't hardcode "this week." Instead:
- On first mount of the provider, run a lightweight query for `MAX(set_date)` from `batches` (via a tiny hook or an initial fetch) and default `dateFrom`/`dateTo` to the Monday–Sunday week containing that date.
- Fallback to current week if the query fails or returns null.
- Persist as usual, so once the user picks a range it sticks.

### 2. Helpful empty state on Dashboard
In `DashboardHome.tsx`, when `filtered.length === 0` and `criticalCount === 0`, replace the "Nothing needs attention 🎉" message under Needs Attention with something honest:
- "No flocks set between {dateFrom} and {dateTo}."
- Add a button **"Jump to most recent week with data"** that calls a helper (same MAX(set_date) query) and updates the filter.

### 3. Fix date-string bug in rollup hook
In `src/hooks/useWeeklyFlockRollup.ts`, replace `toDateStr` with a local-date formatter (reuse `format(d, "yyyy-MM-dd")` from `date-fns`) so `weekStart`/`weekEnd` aren't shifted a day by UTC conversion.

### 4. (Optional) Show the active range in KPI subtitles
Small UX polish: KPI card subtitles currently say "This week." Change to the actual formatted range (e.g. "May 25 – May 31, 2026") so it's obvious what window the zeros/values apply to.

## Files touched

- `src/contexts/AnalyticsFilterContext.tsx` — smarter default + helper to jump-to-latest
- `src/components/dashboard/DashboardHome.tsx` — empty state CTA
- `src/components/dashboard/sections/NeedsAttention.tsx` — empty-state copy
- `src/components/dashboard/sections/KpiRow.tsx` — subtitle range (optional)
- `src/hooks/useWeeklyFlockRollup.ts` — timezone-safe date strings
- New tiny hook: `src/hooks/useLatestBatchDate.ts` (`SELECT max(set_date) FROM batches WHERE archived_at IS NULL`)

## Out of scope

- Data entry flow, form headers, or the Set Week context in per-house forms (separate open thread from your previous message — I can pick that up in the next plan).
