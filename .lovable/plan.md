# Single-Stage Set Sheet Grid

Bring the paper-style grid entry experience from Multi-Stage over to Single Stage, matching Corey's single-stage set sheet.

## What the paper sheet looks like

Header line: Set Date, Embrex (transfer) Date, Hatch Date. Then one block per setter, each with 20 numbered buggy lines (1–10 left column, 11–20 right column), each line holding a flock number and a Tall/Short code. A separate Carry-Over block lists leftover flock/buggy entries.

## What we build

1. New `SingleStageSetSheetGrid` component (modelled on `SetReportGrid`):
   - Top set-info strip: Set Date, Embrex/Transfer Date (auto), Hatch Date (auto), day of week, set colour, buggy size.
   - One card per single-stage setter with 20 numbered buggy lines split into two columns of 10, mirroring the sheet.
   - Each line: flock number typed directly (auto-resolves flock, house, age in weeks) + Tall/Short selector + optional per-line note.
   - Helpers: fill-down, copy previous setter, clear setter, "show only filled", setter search, keyboard navigation (Enter/arrows move down the column).
   - Live totals per setter and overall: buggies used, eggs set, projected hatch.
   - Carry-Over panel matching the sheet (Tall/Short + flock-buggy entries), stored with the operation.

2. Wire into `SingleStagePage`:
   - "Sheet grid" becomes the default view; the existing sequential "Row list" stays available as a toggle fallback.
   - Reuse the existing resumable autosave draft so a half-finished sheet survives a closed tab.

3. Save path in `useSingleStage`:
   - Group filled buggy lines by setter + flock into one batch/operation row per flock group, carrying buggies_set, buggy numbers, Tall/Short, slot/location, eggs set.
   - Auto-compute hatch/transfer dates, day of week and flock age; keep the existing rollback-on-failure behaviour.

## Notes

- Multi-Stage code stays untouched; shared helpers in `src/config/multiStage.ts` are reused, not modified.
- Unknown flock numbers warn inline instead of blocking, same as the multi-stage grid.
- Validation before save: at least one filled line, every filled line has a resolvable flock, buggy total not exceeding setter capacity.
