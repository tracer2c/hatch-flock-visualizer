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

### Phase 4 — Tray Wash PPM (5 checks/day) ✅ DONE
- 3 temperature fields + 5 fixed PPM check fields (each with optional check-time input).
- Persisted inside `qa_monitoring.candling_results` JSON blob to avoid a migration and preserve history.

**Verify:** Round-trip save/read of all 5 PPM values in QA Hub → Tray Wash.

---

### Phase 5 — Data Sheet: weekly flock-level entry (not per-buggy) ✅ DONE
- Weekly Flock Rollup row click now opens a **single consolidated flock block for the whole set week**:
  - Total Eggs Set (week), Injected, Clears, Chicks Hatched, worst status.
  - House count + earliest set date subtitle.
- Per-house tiles are no longer the default view. They're an optional drill-down behind a "View house-level detail" toggle, lazy-loaded on expand.
- No schema changes; hook `useWeeklyFlockRollup` already returns weekly aggregates.

**Verify:** Data Sheet → Weekly Flock Rollup → click any flock row. You should see one consolidated flock block with weekly totals matching the row. Click "View house-level detail" to expand into house tiles (unchanged behaviour from there).

---

### Phase 6 — House-level dropdowns for Egg Pack Quality / Fertility / Residue ✅ DONE
Entry-level matrix:
| Data | Entry level |
|---|---|
| Hatch, HOI | Flock |
| Fertility, Residue | Flock summary + **house-level detail (house dropdown)** |
| Egg Pack Quality | **House-level (house dropdown required)** |
| Temps/Angles/Humidity/Hatch Progression | Machine |
| Tray Wash | Process |

Implementation:
- `FlockDrillDown` now preloads the flock's houses for the week and exposes a **"Record Data"** panel with a **House # dropdown** (scoped to that flock) plus three action buttons: **Egg Pack Quality**, **Fertility**, **Residue**.
- Selecting a house + clicking a button routes to `/data-entry/house/{houseId}/{type}`, which opens the existing entry form already bound to that batch — so `batch_id` (house) is persisted automatically on save.
- If the flock has only one house that week, it's auto-selected. Buttons are disabled until a house is chosen.
- No schema change; existing forms already write `batch_id`.

**Verify:** Data Sheet → Weekly Rollup → open a flock → in the Record Data panel, pick a house and click Egg Pack / Fertility / Residue. Confirm the form opens for that house and the saved row has `batch_id` matching the selected house.

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
