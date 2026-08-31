# Fix Single-Stage egg totals: Tall vs Short buggy sizes

## The problem

On the Single-Stage sheet grid each setter has **one** buggy size, and the T/S selector is only a label. So a setter with 16 tall + 2 short buggies is calculated as 18 × 5,508 = 99,144 eggs (as shown in the screenshot) instead of the correct 16 × 5,508 + 2 × 4,860 = 97,848.

## What changes

1. Egg counts become height-aware:
   - Tall (T) buggy = 5,508 eggs
   - Short (S) buggy = 4,860 eggs
   - A setter's eggs set = (tall lines × tall size) + (short lines × short size).
2. The single "Buggy size" dropdown per setter is replaced with two small selectors — **Tall size** and **Short size** — pre-filled with 5,508 and 4,860 so other buggy configurations (e.g. 5,184) still work. Changing one only affects lines with that height.
3. Per-setter footer shows the breakdown, e.g. `16 T · 2 S · 18 buggies · 97,848 eggs`.
4. Switching a line's T/S immediately recalculates that setter's total and the page-level totals (total eggs set, projected hatch).
5. Saving keeps per-row `eggs_per_buggy` equal to the height's size, so each saved batch/operation row and the operation header totals reflect the mixed set. No database or save-path structure changes are needed — rows already carry their own buggy size.

## Technical notes

- `src/components/data-entry/SingleStageSetSheetGrid.tsx`: add `TALL_BUGGY_EGGS` / `SHORT_BUGGY_EGGS` defaults and per-setter tall/short size state; `cellsToRows` assigns `eggs_per_buggy` from the group's height instead of one setter-wide size; setter totals sum `rowEggsSet(buggies, row.eggs_per_buggy)` per row rather than using a single size.
- `src/pages/SingleStagePage.tsx`: header/summary totals already aggregate per row via `rowEggsSet`; verify the displayed grand totals use the per-row size (adjust if they use the header size).
- `src/config/multiStage.ts` stays untouched apart from (optionally) exporting the tall/short defaults; Multi-Stage code is not modified.
