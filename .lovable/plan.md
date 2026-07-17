# QA Hub — Reorganize by Scope (Machine / Process / Flock)

Client's new mental model: not every QA check is machine-based. Today the UI forces users through machine → tabs even for room-level or flock-level checks. We'll restructure QA Hub into three clean groups matching how inspections actually happen.

---

## 1. New top-level structure

Replace the current 9-tab type row with **3 scope groups**, each with its own sub-tabs:

```text
QA Hub
├─ Overview  (recent entries — unchanged)
├─ 🏭 Machine-Based        → pick hatchery → pick machine → tab
│    • Temperature
│    • Angles
│    • Hatch Progression
│    • Humidity            ← moved here (client wants machine dropdown back)
├─ 🧪 Process / Room       → pick room → form (no machine)
│    • Tray Wash           (throughout-the-day, resumable — already built)
│    • Rectal Temperatures (Chick Room / Separator Room / Hatcher)
├─ 🐣 Flock-Based          → pick flock/house → form (no machine)
│    • Specific Gravity
│    • Culls
```

Overview tab stays as-is.

> ⚠️ Reversal note: last turn we removed the machine layer from Humidity per an earlier request. The current draft says *"Humidity — Include a Machine dropdown."* We will restore the machine-scoped humidity flow (`MachineWideHumidityEntry`) and delete `RoomHumidityEntry`. Flagging in case that's not what you want — see open question below.

---

## 2. Flow per group

**Machine-Based (Temperature / Angles / Hatch Progression / Humidity)**
Single header shared across all 4 tabs:
1. Hatchery dropdown (defaults to "All")
2. Machine picker (single-setter list or multi-setter list — auto-detected from machine type; no more "Single Stage / Multi Stage" scope toggle for the user)
3. Date picker
4. Tabs: Temperature · Angles · Hatch Progression · Humidity

Reuses existing `SingleSetterQAWorkflow` / `MultiSetterQAWorkflow` internals, but the scope toggle is hidden — we branch on `machine.machine_type` after selection.

**Process / Room (Tray Wash, Rectal Temps)**
No machine picker at all. Header:
1. Date picker
2. Tabs: Tray Wash · Rectal Temperatures

Each form owns its own Room dropdown:
- Tray Wash: current 5-PPM daily form, resumable (unchanged).
- Rectal Temps: Room = Chick Room / Separator Room / Hatcher — existing `RectalTempEntry` room list.

Persisted with `machine_id = null`, room stored in `candling_results.room`.

**Flock-Based (Specific Gravity, Culls)**
No machine picker. Header:
1. Hatchery dropdown (optional filter)
2. Flock / House picker (reuses the flock-week picker style from Data Entry)
3. Date picker
4. Tabs: Specific Gravity · Culls

Persisted with `flock_id` + `house_id` (batch_id), `machine_id = null`.

---

## 3. Navigation UX polish

- Sticky scope-group tab bar at top; sub-tabs (Temperature/Angles/etc.) appear below the selection header so users always see *what they picked* + *what they're entering*.
- Deep-link `?houseId=…&action=candling` continues to open Machine-Based → Hatch Progression with the right house preselected.
- Breadcrumb-style crumb inside the page body: `QA Hub / Machine / Hatchery 6 / Setter #3 / Temperature`.
- Empty states with a one-line hint ("Pick a machine to start") so nothing feels broken before selection.
- Read-only banner + past-day rules unchanged (edits allowed for past dates per prior turn).

---

## 4. Files touched

- `src/pages/QAHubPage.tsx` — replace `SECTION_MAP` / `TYPE_META` with the 3-group model above; render one of three shells:
  - `MachineScopedShell` (new small wrapper) — hatchery + machine picker + machine-type-aware inner workflow, tabs: temp / angles / hatch / humidity.
  - `ProcessScopedShell` (new) — date + room-based forms (Tray Wash, Rectal Temps).
  - `FlockScopedShell` (new) — flock/house + date, forms: Specific Gravity, Culls.
- `src/components/qa-hub/SingleSetterQAWorkflow.tsx` / `MultiSetterQAWorkflow.tsx` — remove Rectal Temps, Tray Wash, Culls, Specific Gravity tabs (they graduate to Process/Flock shells). Add Humidity tab to single-setter workflow (currently multi only) so machine-scoped humidity works for both.
- `src/components/qa-hub/RoomHumidityEntry.tsx` — **delete** (superseded by machine-scoped humidity per new spec).
- New: `src/components/qa-hub/shells/MachineScopedShell.tsx`, `ProcessScopedShell.tsx`, `FlockScopedShell.tsx` — thin composition layers around existing entry components.
- Keep `MachineWideHumidityEntry`, `MachineWideAnglesEntry`, `HatchProgressionEntry`, `RectalTempEntry`, `TrayWashEntry`, `SpecificGravityEntry`, `CullChecksEntry` — no rewrites, just re-parented.

No DB migrations. No changes to `qa_monitoring` schema — we just stop requiring `machine_id` on room/flock scopes (already nullable in existing rows).

---

## 5. Delivery order

1. **Phase 1** — Introduce the 3-group tab shell in `QAHubPage`, keep old workflows behind it for smoke test.
2. **Phase 2** — Build `ProcessScopedShell` (Tray Wash + Rectal Temps room-only flow), remove those tabs from single/multi workflows.
3. **Phase 3** — Build `FlockScopedShell` (Specific Gravity + Culls flock/house picker), remove from single/multi.
4. **Phase 4** — Build `MachineScopedShell` unifying single/multi, add Humidity tab to single-setter, delete `RoomHumidityEntry`.
5. **Phase 5** — Polish: crumbs, empty states, deep-link verification, cleanup.

Each phase verified in preview before the next.

---

## Open questions

1. **Humidity scope** — draft says "Include a Machine dropdown," but two turns ago we made it room-only. Confirm: machine-scoped (revert), room-scoped (keep current), or both?
2. **Culls placement** — currently exists on both single & multi workflows. Client's draft doesn't list Culls explicitly. Assume flock-based (matches prior guidance "Culls/Gravity are flock/house scoped") — OK?
3. **Hatchery dropdown on Process shell** — Tray Wash and Rectal Temps are room-level and today aren't hatchery-tagged. Add an optional Hatchery filter for multi-site companies, or omit?
