# Fix: HOF % and HOI % showing 0.0% / — in Weekly Flock Rollup

## Root cause (verified against the database)

The Weekly Flock Rollup reads HOF % / HOI % **only** from `residue_analysis.hof_percent` / `hoi_percent` (falling back to the same columns on `fertility_analysis`). For every batch in Jun 15 – Jun 21, 2026 those columns are `NULL`, even though `batches.chicks_hatched` and `batches.eggs_injected` are populated with real values (e.g. `chicks=3218`, `injected=3385`).

So the client is right — the underlying data ("both are in there") lives on the batches, but the rollup never derives HOF/HOI from those numbers.

Sample rows confirming this:

```
batch                                    chicks   injected   fa_hof  fa_hoi  ra_hof  ra_hoi
MS-2026-06-18-Lott-Line-3&4-64           3218     3385       NULL    NULL    NULL    NULL
MS-2026-06-16-Rip-Farm-29                4287     4564       NULL    NULL    NULL    NULL
MS-2026-06-16-Cedar-Hill-1&2-3           3792     4153       NULL    NULL    NULL    NULL
```

`fertility_analysis` sometimes stores a small `fertile_eggs` count (374, 624, 584) — that's a candling sample, not total fertile eggs, and neither `fertility_analysis` nor `residue_analysis` has a `chicks_hatched` column at all. So the aggregation in `dataSheetAggregation.ts` that does `pct(chicks, fertile)` for those tables always gets `chicks = 0` and produces `0.0%`.

## Fix (frontend only, no schema change)

Extend `src/hooks/useWeeklyFlockRollup.ts` to compute a **batch-derived HOF/HOI** per flock and use it whenever the residue/fertility-derived value is missing or zero.

Per flock bucket, compute:

- `totalChicks   = Σ batches.chicks_hatched`
- `totalInjected = Σ batches.eggs_injected`
- `totalSet      = Σ batches.total_eggs_set`
- `fertilityPct  = overrideFertPct ?? houseFertPct` (already computed)
- `fertileFromFertility = totalSet × fertilityPct / 100` (only when `fertilityPct` is known)

Then:

- `batchHoiPct = totalInjected > 0 ? (totalChicks / totalInjected) × 100 : null`
- `batchHofPct = fertileFromFertility > 0 ? (totalChicks / fertileFromFertility) × 100 : null`

Precedence when picking what to display:

```text
hof_pct = overrideHofPct
       ?? (houseHofPct && houseHofPct > 0 ? houseHofPct : null)
       ?? batchHofPct
hoi_pct = overrideHoiPct
       ?? (houseHoiPct && houseHoiPct > 0 ? houseHoiPct : null)
       ?? batchHoiPct
```

The `> 0` guard prevents an all-zero residue row (which is what currently exists in the DB when residue was never actually captured) from beating the real batch-derived value.

The `flock_level_source` flags stay as-is (they mark whether a *whole-flock override* was applied). Add a new tag `hof_hoi_source: 'override' | 'residue' | 'fertility' | 'batch' | null` on each row so the UI can show a small hint (e.g. subtle "· from batch totals" tooltip on the `●` marker) — no visual redesign, just a tooltip string change in `WeeklyRollupView.tsx`.

## Files touched

- `src/hooks/useWeeklyFlockRollup.ts` — compute `batchHofPct`, `batchHoiPct`, apply the new precedence, expose `hof_hoi_source`.
- `src/components/dashboard/WeeklyRollupView.tsx` — extend the existing `●` tooltip on HOF % / HOI % columns to note when the value is batch-derived. No layout change.

## Out of scope

- No changes to `residue_analysis` / `fertility_analysis` schema.
- No changes to the "By House" tab (its rows already show batch-level chicks/injected directly).
- No changes to the Dashboard KPI cards in this pass — call that out separately if needed.

## Validation

1. Reload Data Entry → Weekly Flock Rollup on Jun 15 – Jun 21, 2026 and confirm HOF % and HOI % are non-zero for flocks that have `chicks_hatched` + `eggs_injected` on their batches (A&M farm, Barron, Big Creek 1&2, etc.).
2. Confirm a flock with a real whole-flock residue override still displays the override value (unchanged behavior).
3. Confirm a flock with `fertility_pct = null` still shows `—` for HOF % (we don't invent fertility), but shows HOI % as long as `eggs_injected > 0`.
