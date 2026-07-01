## Goal
Fix the 5 client complaints about the Data Sheet on Single-Stage Setter view, and the off-by-one date bug — without breaking the existing Data Entry workflow.

---

## What will change (user-visible)

### 1. Data Sheet becomes flock-level by default
Today: one row per machine/buggy/set for the same flock (TROY-15, TROY-20, TROY-18…) — cluttered.
After: **one consolidated row per Flock + House + Set Date**, showing the full flock total (e.g. 87,480 eggs) — matching the House Management card.

A new toggle at the top of the Data Sheet:
- **"Flock View"** (default) — one row per flock/house/set-date, totals summed across machines.
- **"Machine View"** — the current granular per-machine rows (kept for people who need it).

### 2. Data Sheet total matches House Management
The consolidated row will sum `total_eggs_set`, `eggs_cleared`, `eggs_injected`, sample counts, fertile/infertile/dead, chicks, etc. across all machine allocations for that house. Percent columns (Clears %, HOF %, HOI %, I/F %) recompute from the summed totals so they stay mathematically correct — not an average of averages.

### 3. Removes the "enter data twice" pain
Root cause: to make the Data Sheet show 87k eggs, users were re-entering flock-level data on top of the per-machine rows created by the allocation wizard. Once Flock View aggregates automatically, that duplication is unnecessary. We will also add a small info banner: *"Totals are summed from all machine allocations for this house — no need to re-enter."*

### 4. Inline edit from the Data Sheet (scoped)
The Data Sheet stays a **read + edit** surface, not a create surface (create still happens in House Management / Data Entry, which handles multi-setter splits properly). We will:
- Replace the "please use the X tab" toast on the Edit button with an actual inline edit dialog for the fields on that row (Hatch Results, Egg Quality, Residue, QA).
- Embrex/HOI edit stays routed to the wizard because it touches machine allocations.

If they truly want full create-from-Data-Sheet, that's a separate larger project — noted, not in this plan.

### 5. Date filter off-by-one (May 25 → May 24)
Cause: `new Date("2026-05-25")` parses as UTC midnight, then renders in local time (CDT), showing May 24. Fix: parse `set_date` / filter dates as **local calendar dates** (no timezone shift) everywhere the Data Sheet reads/writes/filters/displays them. Same fix applied to `calculateWeek` and the `format(new Date(...))` display.

---

## Technical details

**Files touched (frontend only, no schema changes):**
- `src/components/dashboard/AllDataTab.tsx` — add Flock/Machine view toggle, aggregation reducer, inline edit dialog wiring, local-date parsing.
- `src/pages/EmbrexDataSheetPage.tsx` (and any parent that assembles `allData`) — pass raw rows through; aggregation done in the tab.
- New helper `src/utils/dataSheetAggregation.ts` — groups rows by `flock_id + house_number + set_date`, sums numeric fields, recomputes % from summed totals.
- New helper `src/utils/localDate.ts` — `parseLocalDate(str)` and `formatLocalDate(str)` to eliminate UTC shift.
- New small dialogs (or reuse existing entry forms in "edit mode") for inline edit of Hatch Results / Egg Quality / Residue / QA rows.

**No DB migrations, no RLS changes, no changes to Data Entry / QA Hub / wizards.**

**Aggregation rules:**
- Sum: `total_eggs_set`, `eggs_cleared`, `eggs_injected`, `sample_size`, `fertile_eggs`, `infertile_eggs`, `early_dead`, `mid_dead`, `late_dead`, `pipped_not_hatched`, `contaminated_eggs`, `malformed_chicks`, `chicks_hatched`.
- Recompute from sums: `clear %`, `injected %`, `fertility %`, `HOF %`, `HOI %`, `I/F %`, per-category %.
- Group key: `flock_id | house_number | set_date | data_type`.

---

## What stays the same
- Data Entry / QA Hub / Machine Allocation Wizard — unchanged.
- Database schema and RLS — unchanged.
- Machine-level detail — still available via the toggle, and still the source of truth for QA linkage.

---

## Out of scope (flagging for later if they want it)
- Making the Data Sheet a full create surface (would need to route new rows through machine-split logic).
- Bulk edit across multiple flocks.
