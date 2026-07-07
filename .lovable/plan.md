
# Data Entry – Weekly-Flock Consolidation (Corey feedback)

Scope: **Data Entry section only** (`/data-entry/*`). QA Hub and Data Sheet are untouched. Machine number stays for QA Hub (Temps, Angles, Humidity, Hatch Progression).

---

## 1. FlockDrillDown — remove buggy-card default, add missing actions

File: `src/components/dashboard/FlockDrillDown.tsx`

- Remove the pre-selection "Select house #" dropdown gate from the **Record Data** block. Clicking a form type opens the form directly with the flock/week context; the house is picked inside the form.
- Update copy: "Egg Pack Quality, Fertility, and Residue are recorded per house — you'll pick the house inside the form."
- Add two more action buttons alongside EPQ / Fertility / Residue:
  - **Clears & Injected** → `/data-entry/flock/:flockKey/clears-injected?week=YYYY-MM-DD`
  - **Hatch / HOI** → `/data-entry/flock/:flockKey/hoi?week=YYYY-MM-DD` (route already exists per-house; we'll add a flock-week entry that reuses the same page with a house dropdown, same pattern as EPQ).
- Header line: replace `Set MMM d, yyyy` mentions with **Set Week: {weekStart} – {weekEnd}**.
- Keep the "View house-level detail" collapsible section as an *optional* drill-down (already collapsed by default — leave as-is, just relabel to "Investigate individual houses (optional)").
- Remove `machine_number` from the collapsible house tile subtitle.

## 2. Route changes for flock-week entry

New routes (in `src/App.tsx`):
```
/data-entry/flock/:flockKey/egg-pack?week=YYYY-MM-DD
/data-entry/flock/:flockKey/fertility?week=YYYY-MM-DD
/data-entry/flock/:flockKey/residue?week=YYYY-MM-DD
/data-entry/flock/:flockKey/clears-injected?week=YYYY-MM-DD
/data-entry/flock/:flockKey/hoi?week=YYYY-MM-DD
```

`flockKey` = normalized flock number (same key used by `useWeeklyFlockRollup`). `week` = Monday ISO. From those two params we resolve the list of `batches` (houses) in that flock+week.

Existing house-scoped routes (`/data-entry/house/:houseId/...`) stay working for the drill-down path — no removals.

## 3. Entry pages — add House # dropdown

Files: `src/pages/EggPackEntryPage.tsx`, `FertilityEntryPage.tsx`, `ResidueEntryPage.tsx`, `ClearsInjectedEntryPage.tsx`, `pages/*HOIEntry*` (the HOI page used from house route).

Refactor each so the page can be reached in either mode:

- **House mode** (`/data-entry/house/:houseId/...`) — current behavior, no dropdown, single locked house (kept for back-compat and drill-down).
- **Flock-week mode** (`/data-entry/flock/:flockKey/...?week=...`) — fetch all `batches` matching flock+week, render a **House #** `<Select>` at the top of the form; changing it re-binds the batch context (batch_id, total_eggs_set, etc.) that the entry form already uses. Existing form logic stays untouched below the dropdown.

Shared helper (new): `src/hooks/useFlockWeekHouses.ts`
- Input: `flockKey`, `weekStart`.
- Output: list of `{ batch_id, house_number, set_date, total_eggs_set, ... }` for houses in that flock+week, plus a `selectedBatchId` state helper.

## 4. Header context row — Set Week, no Machine

Wherever the entry pages render the "Flock / Machine: TROY-10 / Set Date: 5/25/2026 / Total Eggs" header (visible in EPQ / Fertility / Residue / Clears-Injected pages):

- Replace `Set Date: 5/25/2026` with **Set Week: May 25 – May 31, 2026** (compute from the batch's set_date using `startOfWeek/endOfWeek`, `weekStartsOn: 1`).
- Remove the `Machine: TROY-10` field from the header for these Data-Entry pages only.
- `Total Eggs` stays; in flock-week mode it reflects the selected house.

QA Hub pages (`QAEntryPage`, `MultiSetterQAWorkflow`, `SingleSetterQAWorkflow`, etc.) are **not** modified.

## 5. Wiring in `DataEntryPage`

- No structural change — `FlockDrillDown` continues to render inside the Weekly view.
- Pass `weekStart` down to `FlockDrillDown` so the new action buttons can construct the `?week=` param (already available via `onOpenFlock(row, weekStart, weekEnd)` in `DataEntryPage.tsx`, currently discarded — start using them).

## 6. Out of scope (confirming with plan, not doing)

- No changes to Weekly Flock Rollup table columns/rows.
- No changes to QA Hub, Data Sheet, Timeline, or any analytics view.
- No DB migrations. Everything is presentation/routing.

---

## Technical notes

- `flockKey` normalization already exists via `normalizeFlockNumber` in `src/utils/dataSheetAggregation.ts`; reuse it so the URL and the rollup key agree.
- Week label formatting: `startOfWeek(setDate, { weekStartsOn: 1 })` .. `endOfWeek(...)` from `date-fns`, format `"MMM d"` – `"MMM d, yyyy"`.
- Use `parseLocalDate` from `src/utils/localDate.ts` when converting `set_date` strings so we don't hit the UTC-shift bug.
- Guard flock-week mode when `batches` is empty → show "No houses found for this flock this week." with a Back link to the rollup.

## Verification

1. Data Entry → Weekly Flock Rollup → click a flock. Land directly on the consolidated weekly block; no house cards visible; header shows Set Week range.
2. Click Egg Pack Quality → form opens with a House # dropdown at top, pre-selected to first house; header shows Set Week, no machine.
3. Same for Fertility, Residue, Clears & Injected, Hatch/HOI.
4. Old deep link `/data-entry/house/:houseId/egg-pack` still works with the locked-house header (drill-down path).
5. QA Hub flows still show machine context — unchanged.
