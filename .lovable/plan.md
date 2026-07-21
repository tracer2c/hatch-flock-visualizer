
## Diagnosis

All three issues are **logic/wiring bugs**, not bad data. I traced each one to the exact source.

### 1. Data Sheet showing 600%+ hatch values (worst offender)

In `src/components/dashboard/CompleteDataView.tsx` (line ~215), the row's `chicks_hatched` is set from **`batches.chicks_hatched`** — the total chicks for the entire batch (e.g. ~4,270). But the row's `sample_size` is set to **648** (the fertility/residue inspection sample). These two fields describe different populations.

Then in `HatchPerformanceTab.tsx` line 394, the "Hatch" column renders:
```
formatValue(item.chicks_hatched, item.sample_size)
```
When the % toggle at the top of Data Sheet is ON, `formatValue` computes `chicks_hatched / sample_size × 100` → `4272 / 648 × 100 = 659.4%`. That's exactly what the screenshot shows. The number itself is not wrong — the denominator is.

Same conflation causes the "Hatch %" column to look inflated in aggregated (By Flock) rows via `aggregateHatchByFlock` (`dataSheetAggregation.ts` line 423), which does `pct(chicks, sample)` where `chicks` is the sum of batch-total chicks but `sample` is the sum of 648-per-record inspection samples.

### 2. Dashboard hatch rate 86.5% vs actual 78% (Wayne Sanderson)

Two compounding causes:
- The dashboard averages **`fertility_analysis.hatch_percent`**, which `FertilityAnalysisTab.handleSave` writes as `(fertile − early_dead − late_dead) / 648 × 100`. That formula ignores mid-dead, culls, live pips, and dead pips, so the stored value is systematically higher than the real hatch. Wayne Sanderson's real 78% vs displayed 86.5% is consistent with that overstatement.
- The dashboard takes a **plain mean** of that value across records instead of weighting by eggs set, so small-batch inspections skew the number further.

The correct hatch % for the KPI is `sum(batches.chicks_hatched) / sum(batches.total_eggs_set)` over the selected week — a single egg-weighted figure that matches the operational number the customer sees.

### 3. Custom targets not appearing

`KpiRow.tsx` has the targets **hardcoded**: `Target: 85%`, `Target: 88%`, `Target: 75%`. The `custom_targets` table is only read by `TargetManager` (settings screen) and `BatchOverviewDashboard`. The main dashboard never queries it, so anything the user saves in Targets has no effect on Fertility / Hatch / HOI cards.

## Fix plan

**A. Data Sheet Hatch tab (row-level, By House and By Flock)**
1. In `CompleteDataView.tsx`, add a second field `sample_chicks_hatched` (from `residue_analysis.chicks_hatched` / fertility sample-derived chicks) and keep `chicks_hatched` as the batch total. Do **not** mix them.
2. In `HatchPerformanceTab.tsx`, the "Hatch" column should render the **batch total chicks** as a raw count only (no % toggle for that column), and the "Hatch %" column should use the pre-computed `hatch_percent` from residue, OR compute `chicks_hatched / total_eggs_set × 100` when the % toggle is on. That kills the 600% display.
3. In `dataSheetAggregation.ts::aggregateHatchByFlock`, change `hatch_percent` to `pct(chicks, totalEggsSet)` (add `total_eggs_set` to the sum) instead of `pct(chicks, sample)`.

**B. Dashboard hatch %**
1. Fix the aggregation in the dashboard hook (`useUnitWeeklyMetrics` / wherever `avgHatch` is fed to `KpiRow`) to compute `sum(chicks_hatched) / sum(total_eggs_set) × 100` from `batches` for the selected range, instead of averaging `fertility_analysis.hatch_percent`.
2. Fix `FertilityAnalysisTab.handleSave` so the stored `hatch_percent` uses `calculateChicksHatched(...)` (which already subtracts mid-dead, culls, pips) rather than the shortcut `fertile − early_dead − late_dead`. This stops future rows from being overstated.

**C. Custom targets wiring**
1. Add a small `useCustomTargets(companyId)` hook that reads `custom_targets` filtered by company for the metrics `fertility_percent`, `hatch_percent`, `hoi_percent` (falling back to 85 / 88 / 75).
2. Pass the resolved targets into `KpiRow` as props; replace the hardcoded `85 / 88 / 75` and the `Target: XX%` sub-labels with those values. Also use them to compute the "vs target" delta.

**D. Verify**
- Reload the Data Sheet Hatch tab with % toggle on — values should now be realistic (70–90% range).
- Reload dashboard for Wayne Sanderson, current week — hatch rate should match ~78%.
- Change a target in Settings → Targets → confirm the KPI card sub-label and delta update on next dashboard load.

## Files touched

- `src/components/dashboard/CompleteDataView.tsx` — separate sample chicks vs batch chicks
- `src/components/dashboard/HatchPerformanceTab.tsx` — correct Hatch / Hatch % column denominators
- `src/utils/dataSheetAggregation.ts` — fix `aggregateHatchByFlock` denominator
- `src/components/dashboard/FertilityAnalysisTab.tsx` — use full residue formula for stored `hatch_percent`
- `src/hooks/useUnitWeeklyMetrics.ts` (and/or the dashboard's hatch aggregator) — egg-weighted hatch %
- `src/hooks/useCustomTargets.ts` (new) — read `custom_targets` per company
- `src/components/dashboard/sections/KpiRow.tsx` — accept target props, drop hardcoded values
- `src/pages/AnalyticsDashboard.tsx` / `DashboardHome.tsx` — pass targets down

No schema/migration changes required.
