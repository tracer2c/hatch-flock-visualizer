## Goal

When a user enters a record page from **Weekly Flock Rollup**, the header must show **flock/week totals**, not one house. The **house number becomes an optional field inside the form** (1–6). **Clears & Injected** is flock-only (no house selector at all).

## Scope (Data Entry only — does not touch Data Sheet)

Affected pages:
- `EggPackEntryPage.tsx`
- `FertilityEntryPage.tsx`
- `ResidueEntryPage.tsx`
- `ClearsInjectedEntryPage.tsx`
- `HatchHOIEntryPage.tsx` (already flock-level; only header polish)
- `FlockDrillDown.tsx` (Record Data buttons)

## Changes

### 1. Route by flock+week, not by houseId

Add flock-week entry routes and use them from `FlockDrillDown`'s Record Data buttons:

```
/data-entry/flock/:flockKey/egg-pack
/data-entry/flock/:flockKey/fertility
/data-entry/flock/:flockKey/residue
/data-entry/flock/:flockKey/clears-injected
/data-entry/flock/:flockKey/hoi   (already exists)
```

`flockKey` encodes flock_id + period_start + period_end (same helper as HOI page uses today).

The old `/data-entry/house/:houseId/...` routes stay for the "Investigate individual houses" drilldown, so nothing regresses.

### 2. Unified flock-week header (all 4 pages)

Replace the current per-house blue header block with a shared flock summary card showing:

- Flock #, Flock name
- Set Week range
- **Total Eggs Set (flock-week)** — sum across houses
- Status badge (aggregated from batches in the week)
- No machine field, no per-house eggs

Create `src/components/dashboard/FlockEntryHeader.tsx` reused by all four pages.

### 3. Optional House # inside the form (Egg Pack, Fertility, Residue)

Remove the top `FlockWeekHouseSwitcher` (which navigates between houses) from these three pages. Inside the entry form, add:

- **"House # (optional)"** dropdown listing the flock's houses for that week (1–6) plus a "Whole flock / not specified" option.
- The selected house drives `batch_id` on save (picks that house's batch row). "Not specified" saves against the flock's primary/first batch of the week so existing house-scoped tables (`egg_pack_quality`, `fertility_analysis`, `residue_analysis`) keep working without schema changes.

Files:
- `EggPackDataEntry.tsx` — add optional house select in the form
- `FertilityAnalysisEntry` used by `FertilityEntryPage`
- Residue entry component used by `ResidueEntryPage`

### 4. Clears & Injected → flock-only

`ClearsInjectedEntryPage.tsx`:
- Remove house switcher and any house selector entirely.
- Header shows only flock-week summary.
- Save path uses `useSaveFlockTotalsToBatches` (already exists in `useFlockWeeklyClears.ts`) — proportionally splits `clear_number` / `injected_number` across the flock's batches by `total_eggs_set` and upserts a `flock_weekly_clears` row.
- `ClearsInjectedDataEntry.tsx`: the header/summary line uses **flock-week Total Eggs Set**, not one house.

### 5. FlockDrillDown Record Data buttons

Point all 5 buttons to the new `/data-entry/flock/:flockKey/*` routes. Remove the House # dropdown from the Record Data card (it is no longer needed — house is chosen inside the form for the 3 pages that still support it, and Clears/HOI never take a house).

### 6. Keep house-level entry reachable

The "Investigate individual houses (optional)" section in `FlockDrillDown` continues to open the existing `/data-entry/house/:houseId` page, so per-house entry stays possible for anyone who needs it.

## Non-goals

- No schema migrations. `egg_pack_quality` / `fertility_analysis` / `residue_analysis` remain keyed by `batch_id`; we just default to the flock's primary batch when the user leaves the optional house blank.
- No changes to Data Sheet or Analytics.
- No changes to QA Hub.

## Verification

1. From Dashboard → Weekly Flock Rollup → click flock → Record Data → Residue: header shows flock total eggs (e.g., 212,000), not one house's 92,000.
2. Inside Residue form, House # dropdown is present and optional; save with and without a house both succeed.
3. Clears & Injected page shows only flock summary, no house field; save distributes across batches and appears in By House view.
4. HOI page header matches the same flock summary style.
5. `tsgo` typecheck passes.
