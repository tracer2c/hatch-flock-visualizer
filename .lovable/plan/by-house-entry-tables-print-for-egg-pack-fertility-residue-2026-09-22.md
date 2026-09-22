# By-house entry tables + Print for Egg Pack, Fertility, Residue

## What the client is asking

In the Weekly Flock Rollup, Egg Pack, Fertility and Residue currently make the
tech pick one house at a time from a dropdown and fill a separate form for each.
If a flock has 3 houses that week, they want all 3 houses listed as rows in a
single table, so they can type straight down the page, save once, and print the
filled sheet — the same layout on all three screens.

## What will be built

For each of the three screens (Egg Pack Quality, Fertility, Residue):

1. **By-house table (new default view)**
   - One row per house of that flock in that set week, sorted by house number.
   - Each row shows the house number, its eggs set and machine for context,
     then an input for every field of that section.
   - Fields per section stay exactly as they are today:
     - Egg Pack: Sample Size, Cracked, Dirty, Small, Large, Grade A/B/C
     - Fertility: Sample Size, Fertile, Infertile, Early Dead, Late Dead
     - Residue: Sample Size, Infertile, Early/Mid/Late Dead, Live Pip,
       Dead Pip, Culls, Contaminated (and the remaining residue fields)
   - A totals row at the bottom sums every numeric column across the houses.
   - Residue keeps every column on one wide row with sideways scrolling; the
     house column stays pinned on the left so you always know which row you are in.
   - Existing saved values for each house pre-fill their row, so this is also
     how previously entered data gets corrected.
   - One "Save all houses" button writes every changed row in a single action;
     rows left untouched are not written.
   - Typing conveniences: Enter/arrow keys move down the same column, and a
     fill-down action copies the value in a column to the rows below.

2. **Scope toggle**
   - Two choices at the top: "By house" (default) and "Whole flock".
   - "Whole flock" keeps today's single consolidated form untouched.
   - The old house dropdown disappears; the by-house table replaces it.

3. **Print button (top right of each of the three screens)**
   - Prints the filled sheet only: header band with company name (falls back to
     Hatchery Pro), section title, flock name and number, set week, house count,
     printed-by name and role, and the date and time.
   - Below it the houses table exactly as entered, with the totals row.
   - Landscape, no app buttons or menus on the paper, matching the print styling
     already used by the set sheets.

## Technical notes

- New shared component `src/components/data-entry/HouseMatrixEntry.tsx`:
  takes the `FlockWeekBatch[]` from `useFlockWeekBatches`, a target table
  (`egg_pack_quality` | `fertility_analysis` | `residue_analysis`), and a field
  definition list; renders the house-rows table, dirty tracking, totals row,
  keyboard navigation, fill-down, and a batched upsert keyed on `batch_id`.
- New `src/components/data-entry/HouseMatrixPrintView.tsx`: print-only markup,
  reusing `usePrintMeta` for company name, user name and role, and the existing
  `@media print` rules in `src/index.css` (the print root id is shared).
- `FlockEggPackEntryPage.tsx`, `FlockFertilityEntryPage.tsx` and
  `FlockResidueEntryPage.tsx` each swap `HouseSelectField` for a By house /
  Whole flock toggle, render `HouseMatrixEntry` by default, keep
  `FlockWeeklyEntryCard` behind the Whole flock option, and gain a Print button.
- Residue rows are mapped through the same database column names already used by
  `FlockResidueEntryPage` so nothing changes in storage; per-house percentage
  columns stay computed, not typed.
- No database changes: per-house values continue to live in `egg_pack_quality`,
  `fertility_analysis` and `residue_analysis` against each house's `batch_id`.
- Staff (read-only) users see the table and Print but no save button, per the
  existing read-only rule.
