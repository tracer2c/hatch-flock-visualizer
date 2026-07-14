## Problem

On Data Entry → Weekly Flock Rollup → Egg Pack / Fertility / Residue / Clears & Injected / Hatch-HOI:

1. The header says "Whole flock (unspecified)" but the form below still shows **House # = 1** (fixed, disabled). The user can't tell whether the entry is flock-scoped or house-scoped.
2. Under the hood, "Whole flock" silently saves against the **first batch** of the flock/week (see `resolveBatchId` in `HouseSelectField.tsx` → falls back to `batches[0].id`). So flock-level and House 1 collide in the same row of `egg_pack_quality` / `fertility_analysis` / `residue_analysis` / `flock_weekly_clears`.
3. Because everything is stored per-batch, there is no clean way to compare a user's flock-level number against the sum of per-house entries in the Data Sheet.

## Goal

- Flock-level entries live in their own weekly-flock rows, not glued to House 1.
- The form clearly reflects the current scope: "Whole flock" → House # shows **N/A / Whole flock** (disabled); a specific house → House # shows that house number.
- Data Sheet keeps showing per-house detail, but when a flock-level entry exists **and** house entries also exist for the same flock/week, we:
  - Use the flock-level entry as the source of truth for the flock/week total.
  - Show a note: *"House aggregation sums to X. Weekly flock rollup entry is Y (used as the authoritative value)."*

## Phased plan (each phase verified before moving on)

### Phase 1 — Data model: weekly flock-scoped tables
Add sibling tables that mirror the existing per-batch entry tables, keyed by `(company_id, flock_id, week_start)` instead of `batch_id`:

- `flock_weekly_egg_pack` — mirrors columns used by `egg_pack_quality`
- `flock_weekly_fertility` — mirrors `fertility_analysis`
- `flock_weekly_residue` — mirrors `residue_analysis`
- `flock_weekly_hatch_hoi` — mirrors the fields written by Hatch/HOI page
- `flock_weekly_clears` already exists → reuse as-is (it's already flock-scoped weekly)

Each table:
- `id`, `company_id`, `flock_id`, `week_start` (Mon), unique `(company_id, flock_id, week_start)`
- All domain fields from the corresponding per-batch table (same names/types so UI mapping stays trivial)
- `sample_size` default 648 where applicable
- `notes`, `technician_name`, `created_at`, `updated_at`, standard update trigger
- Full GRANT block + RLS by `company_id`

### Phase 2 — Form scope UX
`HouseSelectField.tsx` + all 5 flock entry pages (`FlockEggPackEntryPage`, `FlockFertilityEntryPage`, `FlockResidueEntryPage`, `FlockClearsInjectedEntryPage`, `HatchHOIEntryPage`):

- When selector = "Whole flock (unspecified)":
  - Form's read-only **House #** field shows `"N/A · Whole flock"` (not `1`).
  - Save writes to the new `flock_weekly_*` table, not to any batch row.
- When selector = a specific house:
  - Form's House # shows that house number.
  - Save writes to the existing per-batch table (current behavior).
- Remove the silent `batches[0]` fallback from `resolveBatchId`; return `null` and let the page branch on scope.
- Show a small badge in the entry header: **"Scope: Whole flock"** or **"Scope: House {n}"**.

### Phase 3 — Read path in Weekly Flock Rollup
Update `useWeeklyFlockRollup` / drill-down and `useFlockWorksheetValues`:

- For each metric, prefer `flock_weekly_*` row if present, else sum from per-batch rows.
- Expose both values so the UI can display the reconciliation note.

### Phase 4 — Data Sheet reconciliation note
In `EmbrexDataSheetPage` (and `ResidueBreakoutPage` where applicable):

- When a flock/week has both a `flock_weekly_*` entry and per-house entries, render an inline note under the flock row:
  > "House aggregation sums to **X**. Weekly flock rollup entry is **Y** — using **Y** as the authoritative value."
- Use `UUIAlert` (info variant) for consistency.

### Phase 5 — Cleanup & verification
- Backfill guidance: existing rows saved as "Whole flock → House 1" stay where they are; no migration of historical data (users can re-enter at flock scope if they want).
- Typecheck, click through all 5 entry pages in both scopes, confirm reconciliation note appears when both scopes exist.

## Technical notes

- New tables follow the exact 4-step migration order (CREATE → GRANT → ENABLE RLS → POLICIES) with `authenticated` + `service_role` grants; no `anon`.
- Reuse `useFlockWeekBatches` for the house dropdown; only the resolver and save target change.
- The Data Sheet already renders per-house rows — the note is additive, no schema-breaking display changes.

## Open questions before I start

1. For **Hatch/HOI**, the current flock page proportionally distributes chicks into each batch. Should whole-flock Hatch/HOI stop writing to batches entirely (Phase 1 pattern), or keep distributing *and* also store the flock-level totals for reconciliation? I recommend the former (cleaner), but it changes how the Data Sheet's per-house chick columns look for flock-scoped entries.
2. Confirm that **"Whole flock" wins over per-house sums** whenever both exist (my current assumption). Alternative: newest-wins by timestamp.
