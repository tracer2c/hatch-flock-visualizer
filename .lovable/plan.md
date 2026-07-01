## Goal

The Data Sheet's "By House / By Flock" toggle is only on the Embrex/HOI tab today. The client wants the same flock-level merger on **every** tab (Residue Analysis, Egg Quality, Hatch Results, Quality Assurance) so a flock spread across multiple houses / hatcheries appears as one row.

## Scope

- Read-only "By Flock" aggregation on the four remaining tabs.
- Editing continues to live on "By House" (unchanged).
- Same grouping rules as Embrex: group strictly by normalized `flock_number`, show a "N houses" badge when the flock spans more than one house/hatchery, and respect the current search + filter set.

## Per-tab aggregation rules

| Tab              | Group by       | Numeric roll-up (sum)                                                     | Recomputed after roll-up            |
| ---------------- | -------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| Residue Analysis | `flock_number` | sample_size, infertile, early_dead, mid_dead, late_dead, cull_chicks      | HOF %, HOI %, Total Dead %          |
| Egg Quality      | `flock_number` | sample_size, grade_a, grade_b, grade_c, cracked, dirty                    | Grade % columns                     |
| Hatch Results    | `flock_number` | total_eggs_set, fertile_eggs, chicks_hatched                              | Fertility %, Hatch %, HOF %, HOI %  |
| Quality Assurance| `flock_number` | none — take **latest** temp / humidity / CO₂ per house, then latest per flock (by `check_date` + `day_of_incubation`) | n/a — display latest reading      |

Common columns collapsed on every tab: Flock #, Flock Name, House # → "N houses" badge, earliest Set Date, max Age (weeks), technician list de-duplicated, notes concatenated with " • ".

## Implementation

### New / extended utilities — `src/utils/dataSheetAggregation.ts`
Add sibling helpers next to the existing `aggregateByHouse` / `aggregateByFlock`:
- `aggregateResidueByFlock(rows)`
- `aggregateEggQualityByFlock(rows)`
- `aggregateHatchByFlock(rows)`
- `aggregateQAByFlock(rows)` (latest-wins reducer)

Each returns rows shaped like the existing per-tab row so the tab's current table renderer works without a schema change. All use the shared `normalizeFlockNumber` from `FlockSummaryView` (extracted to the util so we don't duplicate it).

### Tab-level changes
For each of the four tabs (`ResidueBreakoutTab.tsx`, `EggPackQualityTab.tsx`, `HatchPerformanceTab.tsx`, `QAMonitoringTab.tsx`):
1. Add `view` state (`"rows" | "flock-summary"`, default `"rows"`).
2. Render the same segmented `By House / By Flock` control used in `EmbrexHOITab.tsx` (extract to a small `<ViewModeToggle />` in `src/components/dashboard/DataSheet/ViewModeToggle.tsx` so all five tabs share it).
3. When `view === "flock-summary"`, run the tab's aggregator on `filteredData` and render the same table with:
   - House # cell replaced by a "N houses" chip when > 1.
   - Row actions (edit/delete) hidden.
   - A small info banner: *"Aggregated view — edits are done on the By House tab."*
4. Preserve existing filters, search, sort, and percentage toggle — they run **before** aggregation.

### Shared components
- Extract the segmented control markup from `EmbrexHOITab` into `ViewModeToggle` so behavior stays consistent (icons, sizing, active style).
- Extract the "N houses" badge cell into a small helper for reuse.

## Non-goals

- No editing on the aggregated view for the four new tabs (client confirmed).
- No DB / RLS / migration changes.
- Embrex/HOI tab behavior unchanged.
- No changes to Timeline View or Export (exports continue to use the underlying rows).

## Verification

- Toggle appears on all five tabs with identical placement and styling.
- Wayne Sanderson flock 6343 (spans two hatcheries) shows as one row on Residue, Egg Quality, Hatch, and QA.
- Filters + search still narrow results before aggregation.
- "By House" behavior on every tab is byte-identical to today.
