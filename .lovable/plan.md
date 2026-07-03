
# Data Entry — Weekly Flock Rollup

## The problem the client is describing

Today Data Entry is **house-first**. A single flock can be spread across many houses (and each house across multiple setter machines), so one flock's weekly numbers live as dozens of small rows. When they set 388 houses in a week and want a weekly total for a flock, they have to open each house tile, read the number, and add it by hand.

Meanwhile the **Embrex Data Sheet → By Flock** view already sums those house rows into one tidy flock line. That mismatch is what he was pointing at when he said "sample size is small, then I try to add manually" — after seeing a nice flock total on Embrex, he flips to Data Entry and only sees the small per-house sample sizes, and starts hand-reconciling.

## What we're going to change

Make Data Entry default to a **Flock + Set Date weekly rollup** view. House data stays the source of truth (traceability, QA-by-position, all existing entry screens continue to work). We just add a summed layer on top and let the user drill down.

### 1. New default landing view — "Weekly Totals"

Replace the current house-tile grid on Data Entry with a **Weekly Rollup table** that shows one row per **Flock + Set Date week** (Mon–Sun of the set date).

Columns (all summed from the underlying house records for that flock/week):

- Flock (name + number)
- Set Date week (e.g. `Mon Jun 29 – Sun Jul 5, 2026`)
- # Houses in the flock this week
- Total Eggs Set
- Total Eggs Injected
- Total Clears
- Total Chicks Hatched
- Egg Pack Quality: weighted Grade A %
- Fertility: weighted Fertility %
- Residue: weighted HOF % and HOI %
- Status pill (worst-status wins: In Setter / In Hatcher / Completed)
- Action: **Open** → drill-down

Percentages are **weighted from summed totals**, never averaged from per-house percentages (same rule the Embrex sheet already uses in `dataSheetAggregation.ts`).

### 2. Week picker at the top

- Defaults to the **current Set Date week** (Mon–Sun containing today).
- Left/right arrows + a date picker to jump to any historical week.
- "This week" quick button.
- The exact per-house Set Dates are preserved and shown in the drill-down.

### 3. Drill-down = existing per-house entry

Clicking a rollup row opens a **Flock Drill-Down panel** showing:

- The flock's houses for that week as the same house tiles that exist today.
- Per-house totals (eggs set, eggs injected, sample size, latest EPQ / Fertility / Residue counts) so the user can immediately see which house is contributing what.
- Each house tile still leads into the existing Egg Pack Quality / Fertility / Residue / Clears & Injected worksheets — no change to those forms.
- A "Back to Weekly Totals" button.

House-level records remain the only writable surface. Nothing on the rollup row is directly editable.

### 4. View toggle (safety net)

A small toggle at the top of Data Entry: **Weekly Flock Rollup (default) / By House (classic)**. The classic house grid stays available unchanged, persisted via `localStorage` like the Embrex view toggle.

### 5. Where the numbers come from

Reuse the aggregation utilities already in `src/utils/dataSheetAggregation.ts` (`aggregateByHouse`, `aggregateResidueByFlock`, `aggregateEggPackByFlock`, `aggregateHatchByFlock`). No new database tables and no schema migration.

The rollup fetch runs one Supabase query per source table filtered by `set_date` between the week's Monday and Sunday, then groups client-side by normalized flock number.

## Technical section (for the dev pass)

- **New page component:** `src/components/dashboard/WeeklyRollupView.tsx` — week picker, rollup table, empty state.
- **New hook:** `src/hooks/useWeeklyFlockRollup.ts` — takes `{ weekStart, weekEnd }`, returns one row per flock combining:
  - `batches` → eggs set / injected / chicks hatched summed via `aggregateByHouse`
  - `egg_pack_quality` → via `aggregateEggPackByFlock`
  - `fertility_analysis` → via `aggregateHatchByFlock`
  - `residue_analysis` → via `aggregateResidueByFlock`
  - Joined on normalized `flock_number`.
- **New drill-down component:** `src/components/dashboard/FlockDrillDown.tsx` — reuses the existing house tile from `HouseManager` (extract the tile into a small subcomponent so both views share it).
- **`src/pages/DataEntryPage.tsx`:** add a view mode state (`"weekly" | "houses"`) persisted in `localStorage` under `data-entry-view`; default `"weekly"`. `"houses"` renders today's `HouseManager` unchanged. `"weekly"` renders `WeeklyRollupView` → on click, renders `FlockDrillDown` which internally reuses the house tiles.
- **No schema changes, no new tables, no RLS changes.** All aggregation is client-side over rows the user can already read.
- **QA Hub, Embrex Data Sheet, Single/Multi Stage Setter pages are untouched.**

## Out of scope

- Editing at the flock level / auto-splitting a flock total back to houses (the client confirmed house-level stays the source of truth).
- Any changes to Embrex Data Sheet, QA Hub, or the four entry worksheets themselves.
- Any DB migrations.
