## Phased Implementation Plan — QA Hub + Data Sheet Restructure

Each phase ships independently. After each phase I will verify (build passes, form insert works, screenshot check) before starting the next. I will confirm with you at each phase gate.

---

### Phase 1 — QA Hub Reorganization (navigation shell only)
Restructure QA Hub primary tabs from *Single Stage / Multi Stage / Machine* to **QA-type-first**:

Tabs: `Temps | Angles | Humidity | Rectal Temps | Tray Wash | Culls | Specific Gravity | Hatch Progression`

- Move existing forms under the new tab structure (no logic change yet).
- Inside each tab, add filters/dropdowns as needed (machine, house, flock).
- Mark which tabs are machine-scoped vs flock/process-scoped (metadata used by later phases).

**Scope matrix applied:**
| QA type | Scope |
|---|---|
| Temps, Angles, Humidity, Hatch Progression | Machine |
| Rectal Temps, Tray Wash | Process / room |
| Culls, Gravity | Flock/house (confirm) |

**Verify:** Every existing QA record still opens/edits from the new tab. No data loss.

---

### Phase 2 — Fix Hatch Progression bug + tie to machine ✅ DONE
- Root cause of the "Add Record does nothing" bug: `HatchProgressionEntry.handleSubmit` silently `return`ed when `selectedFlockId`/`batchId` was missing, gave no toast, and didn't react to async-loaded defaults (`defaultFlockId` arrived after mount but state was frozen at `''`).
- Fixes applied:
  - Explicit validation with toast feedback: technician name, flock, house, total > 0, hatched ≤ total, check hour 0-24.
  - `useEffect` syncs `defaultFlockId` prop → `selectedFlockId` state when it loads asynchronously.
  - Header now shows a `Machine …` and `House …` badge so the operator can confirm what the record ties to.
  - Single-setter submit now hard-blocks when the selected machine has no house assigned (previously silent).
  - `machine_id`, `batch_id`, `flock_id` are all now stored inside `candling_results` JSON alongside `stage/hour/counts` for downstream analytics.
  - `day_of_incubation` falls back to 0 if `daysInIncubation` is undefined (no more NaN insert).
  - Submit re-throws on failure so the form does not clear its values on error.

**Verify:** Open QA Hub → Hatch Progression → pick a hatcher with a house → fill fields → Add Record. Row should land in `qa_monitoring` with `machine_id` set and `candling_results.type = 'hatch_progression'`.

---

### Phase 3 — Setter Angles simplification
- Remove Top / Mid / Bottom rows.
- Keep only **Left Side** and **Right Side** inputs.
- Update form, validation, and any chart/summary that reads those fields.
- Existing rows with top/mid/bottom stay readable but new entry only writes left/right.

**Verify:** New entry saves; historical records still render without crash.

---

### Phase 4 — Tray Wash PPM (5 checks/day)
- Add fields: `ppm_check_1 … ppm_check_5` (plus existing temperature).
- Migration on `qa_monitoring` (or tray-wash-specific table) to add 5 numeric columns.
- UI: five inputs in a row, each with optional time stamp label (1st–5th check).

**Verify:** Round-trip save/read of all 5 PPM values.

---

### Phase 5 — Data Sheet: weekly flock-level entry (not per-buggy)
- Weekly Flock Rollup card click → opens a **single flock block for the whole set week** showing total eggs set for the week.
- Remove per-buggy split on the entry view. Buggy-level detail becomes an optional drill-down, not the default.
- Keep the rollup summary UI you already like.

**Verify:** Open a week for one flock — one consolidated block, correct weekly totals matching sum of underlying batches.

---

### Phase 6 — House-level dropdowns for Egg Pack Quality / Fertility / Residue
Entry-level matrix:
| Data | Entry level |
|---|---|
| Hatch, HOI | Flock |
| Fertility, Residue | Flock summary + **house-level detail (house dropdown)** |
| Egg Pack Quality | **House-level (house dropdown required)** |
| Temps/Angles/Humidity/Hatch Progression | Machine |
| Tray Wash | Process |

- Add House # dropdown (scoped to the selected flock) to those three forms.
- Persist `batch_id` (house) on each row; backfill not required.

**Verify:** Create one record per form with house selected; confirm row + house association in DB.

---

### Phase 7 — Cleanup + regression pass
- Remove dead Single/Multi-Stage QA scaffolding no longer referenced.
- Update knowledge-base copy for new QA structure.
- Full click-through of QA Hub + Data Sheet + Dashboard filters (hatchery/flock/house) to confirm nothing regressed.

---

### Open questions before I start Phase 1
1. **Culls** and **Specific Gravity** — house-level or flock-level? (Corey didn't confirm.)
2. **Tray Wash PPM** — five fixed columns per day (one row per day) OR one row per check with a check-number field? I'll default to **five fixed columns per day-row** since he said "5 columns."
3. Keep historical Top/Mid/Bottom angle data visible in read-only history, or hide entirely?

I'll wait for approval (and answers to the 3 questions if you have preferences) before touching code.
