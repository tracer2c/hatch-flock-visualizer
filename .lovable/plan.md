# By-Flock Editing on Data Sheet — Residue, EPQ, Hatch/Fertility

## Why the tabs behave differently today

- **Embrex/HOI By House** is editable because HOI numbers live on `batches` and there is a clean, defined proportional split (`proportionalSplit` in `dataSheetAggregation.ts`).
- **Residue / Egg Pack Quality / Hatch (Fertility) / QA** By-Flock rows are pure rollups from separate worksheet tables. They were left read-only because there is no "flock record" to write to, and splitting a flock total back to N house rows is ambiguous (different sample sizes, notes-encoded fields, time-series data).

You've asked for something new: **flock-level values should be first-class and authoritative, not derived and not split**. The house rows stay for traceability and, where it makes sense, remain editable in place.

## What we're building

A single **Flock Detail Editor** (modal) opened from the "Edit" button on a By-Flock row in Residue, EPQ, and Hatch/Fertility.

### Layout of the editor

```text
┌───────────────────────────────────────────────────────────────┐
│  Flock 1234 · Set Date week Mon 22 Jun – Sun 28 Jun · Hatchery│
├───────────────────────────────────────────────────────────────┤
│  ▸ Flock-Level Values  (authoritative, editable)              │
│    – tab-specific fields (see below)                          │
│    – Save writes to flock-level record; does NOT touch houses │
├───────────────────────────────────────────────────────────────┤
│  ▾ House Breakdown  (traceability; some fields editable)      │
│    House 1 · sample / % / notes …  [Edit]                     │
│    House 2 · …                                                │
│    House 3 · …                                                │
│    (Totals row shown for reference; may differ from flock-    │
│     level values by design — banner explains why.)            │
└───────────────────────────────────────────────────────────────┘
```

### Per-tab behavior

| Tab | Flock-level editable fields | House breakdown |
|---|---|---|
| **Hatch Results / Fertility** | Chicks Hatched, HOF %, HOI %, Fertility %, Hatch Date, Technician, Notes | Read-only summary + **Edit per house** for Fertility fields (sample size, infertile, early/mid/late dead) |
| **Residue Analysis** | Total Sample, Contaminated, Pips, Cull Chicks, Malformed, Early/Mid/Late Dead, Residue Notes | Read-only summary + **Edit per house** for the same fields at house scope |
| **Egg Pack Quality** | Sample Size, Grade A, Cracked, Dirty, Small, Large, Misshapen, Stained, Abnormal, Contaminated, USD, Notes | Read-only breakdown per house with a **Drill-down** link that opens the house's EPQ worksheet in Data Entry |
| **HOI (Embrex)** | Already editable per house today | Stays as-is; add matching "Flock-Level Values" top card that reads/writes the same new flock override record so HOI can be maintained at the flock level too |
| **QA Monitoring** | Not exposed — QA rows are timestamped readings | Stays read-only at flock level |

### Important UX rules

- Saving flock-level values **never rewrites house rows**. A small info banner in the editor states: *"Flock-level values are maintained independently. House totals are shown for investigation and may differ."*
- On the By-Flock table, when a flock-level record exists, its values take precedence over the computed rollup for display, and the row shows a subtle **"Flock-level"** pill so users know they're looking at maintained values, not a sum. A tooltip shows the computed-from-houses value alongside.
- The house breakdown section reuses the existing per-house entry components (`FertilityDataEntry`, `ResidueDataEntry`, `EggPackEntry`) inside a compact accordion — no new house-editing UI to maintain.

## Data model

Add one new table to store authoritative flock-level worksheet values without touching the existing house-scoped tables:

- **`flock_worksheet_values`**
  - `id` (uuid, pk)
  - `company_id` (uuid, tenant scope for RLS)
  - `flock_id` (uuid, fk → `flocks`)
  - `set_date_week_start` (date, Monday of the Set Date week — matches the Weekly Rollup grouping)
  - `worksheet_type` (enum: `hatch_fertility` | `residue` | `egg_pack` | `hoi`)
  - `values` (jsonb — tab-specific fields, keeps schema flexible so we don't need a migration per field)
  - `notes` (text)
  - `updated_by` (uuid), `updated_at` (timestamptz), `created_at` (timestamptz)
  - Unique constraint on `(flock_id, set_date_week_start, worksheet_type)`
  - RLS: company-scoped read/write for `authenticated`, following the same pattern as `residue_analysis` / `egg_pack_quality`. `service_role` full access. No `anon` access.
  - GRANTs written in the same migration.

Existing tables (`residue_analysis`, `egg_pack_quality`, `fertility_analysis`, `qa_monitoring`, `batches`) are **not modified**.

## Frontend changes

1. **New component** `src/components/data-sheet/FlockDetailEditor.tsx` — the modal above. Takes `flockId`, `weekStart`, `worksheetType`.
2. **New hook** `src/hooks/useFlockWorksheetValues.ts` — read/upsert `flock_worksheet_values` for a given key; invalidates the Data Sheet queries on save.
3. **Update aggregation display** in the four tab components (`ResidueBreakoutTab`, `EggPackQualityTab`, `HatchPerformanceTab`, `EmbrexHOITab`):
   - Fetch any matching `flock_worksheet_values` for the visible flocks/weeks.
   - When a flock override exists, render the stored values (with the "Flock-level" pill and tooltip) instead of the computed rollup.
   - Add an **Edit** action on each By-Flock row that opens `FlockDetailEditor`.
4. **House breakdown** inside the editor reuses existing per-house entry components (Fertility, Residue) or a deep-link to Data Entry (EPQ).
5. **QA Monitoring tab** — no change, retains its read-only By-Flock rollup.

## Out of scope

- No changes to the Weekly Flock Rollup on Data Entry, the four per-house worksheets, or existing HOI By-House splitting logic.
- No auto-split, no reconciliation job, no history diffing between computed and stored flock values (beyond the tooltip).
- QA-Monitoring editing at flock level.

## Migration & rollout

1. Migration creates `flock_worksheet_values` with GRANTs + RLS + policies (company-scoped, same pattern as sibling worksheet tables).
2. Frontend ships the editor + hook + tab updates in one pass.
3. No backfill — existing rollups continue to compute from houses until a user saves a flock-level value.
