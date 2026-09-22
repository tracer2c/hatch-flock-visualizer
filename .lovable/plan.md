# Multi-Stage set sheet: T/S buggy sizes, A/B/C lines, typed house number

Bring the Multi-Stage set sheet in line with the Single-Stage sheet so a tech fills both the same way.

## What changes on the Multi-Stage sheet

1. **Tall / Short per line** — each of the three lines in a setter card gets a T/S selector, exactly like Single-Stage:
   - T = 5,508 eggs, S = 4,860 eggs by default.
   - Each setter card keeps its own editable Tall and Short sizes (pre-filled with the defaults, changeable from the size dropdowns) for houses that run different buggies.
   - Switching a line between T and S instantly recalculates that line's eggs and the setter total.
   - The single setter-wide "Buggy size" dropdown is replaced by the two Tall/Short size boxes.

2. **Lines labelled A, B, C** — the three lines read A, B, C instead of 1, 2, 3 on the card, in the fill-down tooltip ("fill A down to B & C") and in any line references on the page. What gets saved underneath stays as it is today, so existing reports and the timeline are unaffected.

3. **House number typed by the tech** — each line gets a small house box (1-6). It auto-fills from the flock as soon as the flock number is typed, and the tech can overwrite it. The typed value is what gets saved for that line, and it appears in the line's summary text under the flock name.

4. **Setter footer totals** — each card footer shows the same summary style as Single-Stage: how many T, how many S, total buggies and total eggs, so the machine total is verifiable at a glance.

No change to how sets are saved, to house/flock records, or to the Single-Stage sheet.

## Technical notes

- `src/components/data-entry/SetReportGrid.tsx`: add a `HeightCode` ("T" | "S") per line, per-machine `sizeOverrides` state and `sizesOf()` helper mirroring `SingleStageSetSheetGrid.tsx`; set each row's `eggs_per_buggy` from its own height rather than one setter-wide value; drop `setSetterBuggySize`.
- Move `TALL_BUGGY_EGGS`, `SHORT_BUGGY_EGGS`, `HeightCode` and `DEFAULT_HEIGHT_SIZES` from `SingleStageSetSheetGrid.tsx` into `src/config/multiStage.ts` and import in both grids (re-export from the single-stage file so existing imports keep working).
- Height is a sheet-side concept only: it drives `eggs_per_buggy` on each `DraftRow`; the persisted shape in `useMultiStage.ts` is unchanged.
- `POSITIONS` stays `[1, 2, 3]`; add a `POSITION_LABELS = { 1: "A", 2: "B", 3: "C" }` map used for display only.
- House: bind the new input to `patchCell(..., { house_number })`; flock resolution in `onFlockInput` keeps pre-filling it, but a tech-entered value is not overwritten on re-resolve of the same flock.
- Footer totals via existing `rowEggsSet` from `src/config/multiStage.ts`.
- Verify with `bunx tsgo --noEmit -p tsconfig.app.json`.
