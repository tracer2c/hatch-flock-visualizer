# Weekly Clears, Injected & Hatch Sheet

Turn the Clears & Injected screen into one weekly sheet for the flock, with a line
for every set record of that week, so numbers can be typed in on the day they are
counted (Mon, Tue, Thu, Fri) and the week fills itself in as you go.

## What the sheet looks like

One line per set record (set date + house), sorted by set date:

```text
Set Date   House   Sample Size   Clears   Injected   Injection %   Hatch   Hatch %
Mon Jun 15   1        97,848      3,120     94,728       96.8%    82,540   84.4%
Mon Jun 15   2        92,988      2,880     90,108       96.9%          —       —
Thu Jun 18   3        97,848          —          —           —          —       —
------------------------------------------------------------------------------
Flock total              288,684    6,000    184,836       …      82,540    …
```

- **Set Date** and **House** come straight from the set sheet — read only.
- **Sample Size** is pre-filled with the eggs set on that line and can be typed
  over if the real count differs.
- **Clears** is typed in.
- **Injected** calculates itself as Sample Size − Clears.
- **Injection %** is Injected ÷ Sample Size.
- **Hatch** (chicks hatched) is typed in on the same line.
- **Hatch %** is Hatch ÷ Sample Size, and HOI % (Hatch ÷ Injected) sits beside it.
- A totals line at the bottom sums the week and shows the weighted percentages.

## How entry works through the week

- Nothing is locked to "today". Open the week, fill in the lines that were counted,
  press Save, and come back Thursday to fill in the rest — saved lines come back
  filled with the technician name and notes for the week.
- Lines you have not touched stay blank; saving only writes the lines you changed.
- Typing moves down a column with Enter and the arrow keys, and each column has a
  fill-down arrow for repeated values.
- Print button top right prints the filled sheet (company name, flock, set week,
  technician, who printed it and when), same paper style as the set sheets.
- Staff (read-only) see the sheet and can print, but get no Save button.

## What else changes

- The Clears & Injected button on the flock screen opens this sheet.
- The separate Hatch / HOI page stays exactly as it is, unchanged.

## Technical notes

- New `src/components/data-entry/WeeklyClearsSheet.tsx`: rows built from
  `useFlockWeekBatches` (already gives id, set_date, house_number,
  total_eggs_set, eggs_injected, eggs_cleared, chicks_hatched, machine_number).
  Local state per `batch_id` for sample size / clears / hatch, dirty tracking,
  derived injected + percentages, totals footer, keyboard nav + fill-down —
  mirroring `HouseMatrixEntry`.
- Save writes per row directly to `batches` (`eggs_cleared`, `eggs_injected`,
  `chicks_hatched`) for the dirty rows only, so no proportional redistribution is
  needed and partial weeks stay correct. After the row writes it upserts the
  flock/week roll-up into `flock_weekly_clears` (company_id, flock_id,
  period_start, period_end, eggs_set_total, eggs_cleared, chicks_hatched,
  hatch_percent, technician_name, notes) using the existing
  `flock_id,period_start,period_end` conflict target, so the rollup, By House
  views and analytics all keep reading the same numbers. Invalidates
  `flock-weekly-clears`, `batches`, `complete-data`, `weekly-flock-rollup`.
- Sample size is a sheet-side value used for the percentages and for Injected;
  it is not persisted separately (defaults back to the line's eggs set).
- `FlockClearsInjectedEntryPage.tsx` renders the new sheet instead of
  `ClearsInjectedDataEntry` and gains the Print button using `usePrintMeta` plus
  a print view modelled on `HouseMatrixPrintView`.
- No database changes.
