## Problem

On the Data Sheet → Embrex/HOI → **By Flock** view, editing "Hatch" appears to revert (e.g. Barron: 56,152 → 8,424).

Root cause: two sources of truth for `chicks_hatched`.

- **Write path (what our By-Flock input saves):** `useSaveFlockTotalsToBatches` → `batches.chicks_hatched` + `flock_weekly_clears.chicks_hatched`. This works.
- **Display path (what the row actually renders):** `CompleteDataView.tsx` recomputes `chicks_hatched` on every fetch from the residue-analysis formula (`sample_size − infertile − dead − culls + pips`). This overrides whatever we saved.

Result: the save succeeds, refetch happens, formula wins, UI shows the derived number again. It looks like the edit "reverts".

## Fix

Make the manually-entered value authoritative when it exists, and fall back to the residue-derived formula only when it doesn't.

### 1. `src/components/dashboard/CompleteDataView.tsx`
Change the row mapping so `chicks_hatched` prefers the DB column:

```ts
chicks_hatched:
  batch.chicks_hatched != null && batch.chicks_hatched > 0
    ? batch.chicks_hatched
    : calculateChicksHatched(/* residue-derived fallback, unchanged */),
```

Keep `chicks_hatched_db` as-is so anything reading the raw column still works. This is the single behavioural change that makes Corey's 56,152 stick.

### 2. `src/components/dashboard/FlockSummaryView.tsx`
`storedFor("chicks_hatched")` currently prefers `batches_chicks_hatched > 0` then falls back to `flock_weekly_clears`. That's already correct — but because the aggregated `data` prop now carries the DB-preferred value (from step 1), the fallback will trigger far less often. No code change required; verify it still renders correctly with a single-house flock like Barron.

### 3. Analytics / exports sanity check (read-only audit, no code changes unless needed)
Grep for other consumers of `chicks_hatched` to confirm none of them assume the residue-derived formula:
- `HatchPerformanceTab.tsx`
- `useMachinePerformanceMetrics.ts`
- Export column maps in `EmbrexDataSheetPage.tsx`

If any of them independently recompute Hatch from residue, apply the same "prefer stored value" pattern.

### 4. Verify

1. Log in as a Wayne Sanderson user, open `/embrex-data-sheet` → Embrex/HOI → By Flock.
2. Change Barron's Hatch from 8,424 → 56,152, tab out.
3. Confirm toast success, refetch shows 56,152, Hatch % becomes ~88.9%.
4. Switch to By House view — same house shows 56,152.
5. Reload the page — value persists.
6. Re-open By Flock — still 56,152.

## What this does NOT change

- No DB schema changes. No migration.
- Residue-analysis formula is preserved as a fallback for rows that were never manually entered (backwards compatible with existing derived displays).
- `flock_weekly_clears` continues to store culls (no `batches` column for that).
- No changes to the four previously-closed client items (flock rollup, single-source entry, date sweep, aggregation).

## Technical note

The formula fallback was originally there because early data didn't have `batches.chicks_hatched` populated. Now that users are entering Hatch directly, the stored value must win. This is a one-line precedence flip in `CompleteDataView.tsx`.
