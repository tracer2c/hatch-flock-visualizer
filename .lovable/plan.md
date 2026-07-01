## Goal
Fix the client's actual complaints on `/embrex-data-sheet` — the page they're using — where **By House** shows duplicate/split rows and **By Flock** input cells go to a disconnected table, forcing double entry.

## Root causes found

1. **By House view** renders one row per `batches` record — and each batch is one house-machine allocation. So flock 6343 shows as `Hen valley 120,000` + `Hen valley 92,000` instead of one house with the full total.
2. **By Flock view** groups by `flock_id`, so the same flock number reused across hatcheries (e.g. 6343 at two farms) appears as two "flock" rows.
3. **"Entering data twice"** — Hatch / Culls / Clear cells on By Flock save to a **separate table** (`flock_weekly_clears`) that never touches `batches`. So values entered here never show up on By House, in exports, in analytics, or anywhere else.
4. **Date off-by-one** — `format(new Date("2026-05-25"))` parses as UTC midnight → May 24 in local time. Same bug on the "Period: …" line and the Set Date column.
5. **Empty input boxes** in By Flock have no hint that they're auto-computable or where the value comes from.

---

## What will change (user-visible)

### By House tab (Embrex/HOI)
- Rows collapse to **one row per House per Set Date** (flock_id + house_number + set_date). Machine-level breakdown moves under an expandable detail (kept for QA/audit).
- `Total Eggs Set`, `Clears`, `Injected`, `Chicks Hatched` are **summed** across all machine allocations for that house — matches the "House Management card" total (e.g. 87,480).
- `Clear %` and `Injected %` recompute from the summed totals (not averaged).
- `Set Date` uses timezone-safe formatting.
- Edit dialog shows an info line: "This house has N machine allocations — edits distribute proportionally by eggs set."

### By Flock tab (FlockSummaryView)
- Grouping key changes from `flock_id` to `flock_number + flock_name` (case-insensitive, trimmed). Same flock across hatcheries collapses into one row. A small "2 houses" / "3 machines" badge on the row shows what it consolidates.
- Hatch / Culls / Clear inputs now **write back to `batches`** (distributed proportionally by each batch's share of `total_eggs_set`) instead of the disconnected `flock_weekly_clears` table. On save:
  - `chicks_hatched` → distributed across the flock's batches
  - `eggs_cleared` → distributed across the flock's batches
  - `eggs_culled` → distributed across the flock's batches (uses existing `cull_chicks` or `eggs_culled` column on batches; verified during build)
  - `hatch_percent` becomes a read-only computed value from `Σ chicks_hatched / Σ total_eggs_set` — the manual override is removed to eliminate the "which number wins" confusion.
- Because everything lands in `batches`, By House refreshes and shows the same totals — **no more re-entry**.
- A helper line appears above the table: "Values you enter here are saved to each house in the flock, split by egg count. They will appear in By House, exports, and analytics."
- Inputs show placeholder text with the current stored total so users see what's already saved.
- "Period: …" line uses timezone-safe date formatting.

### What's kept
- `flock_weekly_clears` table is NOT dropped — existing saved values continue to display as fallback if a flock has no batches yet. New writes just prefer `batches`. This preserves history and avoids a destructive migration.
- Machine View / audit detail still available.
- All other tabs (Residue, Egg Quality, Hatch Results, QA) unchanged in this pass.

---

## Technical details

**Files touched (frontend only):**

- `src/components/dashboard/EmbrexHOITab.tsx`
  - New `aggregateByHouse(batches)` helper: group by `flock_id|house_number|set_date`, sum numeric fields, recompute %.
  - Swap `format(new Date(...))` for `formatLocalDate` from `@/utils/localDate.ts`.
  - Edit handler: when editing an aggregated house row, split saves across the underlying batch IDs proportionally.
  - Expandable row (optional in v1) to reveal the per-machine breakdown.

- `src/components/dashboard/FlockSummaryView.tsx`
  - Change grouping key to `${flock_number}|${flock_name.toLowerCase().trim()}`. Track the list of `batch_id`s per group.
  - Replace `useSaveFlockWeeklyClear` save with a new `saveFlockTotalsToBatches` mutation that:
    1. Reads each batch's `total_eggs_set` in the group.
    2. Computes a proportional split: `share_i = round(value * total_eggs_set_i / Σ total_eggs_set)`. Adjust the last batch to absorb rounding drift so the sum matches exactly.
    3. Runs a single batched `update` against `batches` per row via `supabase.rpc` or a small helper (`Promise.all` of `update().eq('id', ...)` is fine for the current volume).
  - Read Hatch/Clear/Cull display values from `Σ` of `batches` fields, falling back to `flock_weekly_clears` for legacy rows that have no batch data.
  - Remove the editable `hatch_percent` cell; render it as computed text.
  - Swap `format(new Date(periodStart))` for `formatLocalDate`.
  - Add helper banner + input placeholders.

- `src/utils/dataSheetAggregation.ts` — extend with `aggregateByHouse` (or add a sibling helper). Reuse the sum/pct utilities from the existing file.

- `src/hooks/useFlockWeeklyClears.ts` — keep the read side. Add or replace the write path with the batches-distribution mutation. Invalidate both the `batches` query and any dependent dashboard queries on save.

**Column verification during build:** confirm the `batches` table has `chicks_hatched`, `eggs_cleared`, and a culls column (`cull_chicks` or similar). If the culls column is missing on `batches`, culls stays in `flock_weekly_clears` for now and I'll flag it for a schema migration.

**No DB migrations, no RLS changes, no changes to Data Entry / QA Hub / Allocation Wizard.**

---

## Out of scope (flag for later)
- Retiring `flock_weekly_clears` entirely (needs a data migration and confirmation that no reports depend on it).
- Making the Residue / Egg Quality / Hatch Results / QA tabs also flock-aggregated (same pattern can be applied later if the client asks).
- Undo / audit trail for the proportional split.
