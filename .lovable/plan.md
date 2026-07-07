## Goal
Add a dedicated **flock-week Hatch/HOI entry page** and wire the "Hatch / HOI" button on the Weekly Flock Rollup drill-down to it. No DB migration. No QA Hub / Data Sheet changes.

## Persistence (confirmed)
- **Weekly Flock Rollup** aggregates `batches.chicks_hatched` per flock+week — that's the source of truth the rollup reads back.
- The existing hook **`useFlockWeeklyClears.saveFlockWeekly`** already:
  - Takes a single flock-week `chicks_hatched` total
  - Proportionally splits it across the week's `batches` and updates `batches.chicks_hatched`
  - Upserts a `flock_weekly_clears` snapshot (`chicks_hatched` + `hatch_percent`)
- Reusing this hook means: **one flock-level entry → rollup reflects it immediately on refresh**. No new tables, no schema change.

## Changes

### 1. New route in `src/App.tsx`
```
/data-entry/flock/:flockKey/hoi  →  <HatchHOIEntryPage />
```
Reads `?week=YYYY-MM-DD` from the query string.

### 2. New page `src/pages/HatchHOIEntryPage.tsx` — flock-week first
**Header (no Machine field):**
- Flock name · Flock #
- **Set Week:** `May 25 – May 31, 2026` (via `formatSetWeekLabel`)
- House count for the week (informational only)

**Main entry block (flock-level, single input):**
- Read-only stat: **Total Eggs Injected (flock/week)** — summed from `batches.eggs_injected` via `useFlockWeekHouses`
- Read-only stat: **Total Eggs Set (flock/week)**
- Editable input: **Total Chicks Hatched (flock/week)**
- Live computed: **HOI %** = `chicks_hatched / total_eggs_injected × 100` (fallback dash if injected = 0)
- Live computed: **Hatch %** = `chicks_hatched / total_eggs_set × 100` (for parity with rollup)
- Optional textarea: Notes
- **Save** button → calls `useFlockWeeklyClears().saveFlockWeekly({ flockKey, weekStart, chicks_hatched, notes })` → hook splits and writes to `batches` + `flock_weekly_clears`.
- On save success: invalidate `weekly-flock-rollup` and `flock-week-houses` queries, toast confirmation.

**Optional supporting detail (collapsed by default):**
- "Show per-house breakdown" toggle → renders a read-only table of houses in the week with their current `chicks_hatched` / `eggs_injected` / per-house HOI %. **View-only** — no per-house editing on this page. Keeps the flow flock-first.

**Behavior rules:**
- `useDayScopedEntry` gate: past weeks render in view mode (read-only), current/future week in edit mode.
- `usePermissions().hasWriteAccess('data_entry')` — show `ReadOnlyBanner` and disable Save for staff.
- Pre-fill the input from the existing `flock_weekly_clears` row for that flock+week if present; otherwise from `sum(batches.chicks_hatched)`.

### 3. Fix Hatch/HOI button in `src/components/dashboard/FlockDrillDown.tsx`
Replace the current button (which calls `openEntry("fertility")` with a misleading tooltip) with:
```tsx
<Button
  size="sm"
  variant="outline"
  disabled={!weekISO}
  onClick={() =>
    navigate(`/data-entry/flock/${encodeURIComponent(flockKey)}/hoi?week=${weekISO}`)
  }
>
  <Egg className="h-4 w-4 mr-2" />
  Hatch / HOI
</Button>
```
Remove the "Hatch / HOI fields live inside the Fertility form" tooltip.

### 4. No changes to
- Weekly Flock Rollup table / consolidated block (already correct)
- EPQ / Fertility / Residue / Clears & Injected pages
- QA Hub, Data Sheet, Timeline, analytics
- Database schema (reusing existing `batches.chicks_hatched` + `flock_weekly_clears`)

## Verification
1. Data Entry → Weekly Flock Rollup → click a flock → confirm the consolidated Weekly Flock Totals block (already working) shows Set Week range.
2. Click **Hatch / HOI** → lands on `/data-entry/flock/:flockKey/hoi?week=…`. Header shows Set Week, no Machine.
3. Enter a flock-level Chicks Hatched value → HOI % and Hatch % update live. Save.
4. Navigate back to the Weekly Flock Rollup → the flock's **Chicks** column reflects the entered total (proof it wrote to `batches.chicks_hatched`).
5. Reopen the Hatch/HOI page → the input pre-fills with the saved value.
6. Open the page for a past week → renders read-only.
7. `tsgo --noEmit` clean.
