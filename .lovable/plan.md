## Fixes for Hatch Progression + Process/Room entries

### 1. Hatch Progression form (`HatchProgressionEntry.tsx`)

- **Remove Check Hour field** — drop the input and stop sending `checkHour`; keep column layout tight.
- **Add "Date checked" field** on the form itself (defaults to the header date, but user can back-date per record). Passed through to `hatchDate` on submit.
- **Flock picker → searchable Combobox**:
  - Replace the `Select` with a shadcn Command/Popover combobox: type-to-search by flock number or name.
  - Fetch **all company flocks** (not just those currently linked to the selected machine) so missing flocks show up. Currently-linked flocks stay pinned to the top as "Suggested".
- **Machine total % (auto)** — under the form, show a summary card:
  `Machine total: sum(hatched) / sum(total) across today's entries for this machine`, plus per-stage breakdown (A/B/C).
  Uses the same `useTodaysQAEntries('hatch_progression')` data already loaded.
- **Edit existing entries** — in `TodaysEntriesList`, add an "Edit" pencil button per row (and a "Delete" trash). Clicking Edit loads that row's values into the form (stage, counts, date) and switches the submit button to "Update record". Save path updates `qa_monitoring` by id instead of insert.

### 2. Make edit reusable for future QA forms

- Extend `TodaysEntriesList` with optional `onEdit(entry)` and `onDelete(entry)` props so any QA entry component can opt into row-level edit/delete with the same UI.
- Wire it up now for **Hatch Progression**, **Rectal Temperature**, and **Humidity** so the pattern is consistent going forward. Other forms can adopt it later without further changes to the list component.

### 3. Process / Room entries not showing up

**Root cause (verified in code):** `useTodaysQAEntries` (used by `TodaysEntriesList`) is gated by `enabled: !!machineId` and filters `.eq('machine_id', machineId)`. Process/Room entries (Rectal Temp, Room Humidity, Tray Wash room-mode) are inserted with `machine_id = null` and `entry_mode = 'room'`, so the query never runs and the list stays empty — the data **is** being saved, it's just not being fetched.

Fix:
- Update `useTodaysQAEntries` to accept an optional `entryMode` ('machine' | 'room' | 'house') and/or a `roomScope` flag. When room-scoped, drop the machineId gate and filter `machine_id IS NULL` + `entry_mode = 'room'`.
- Update `ProcessScopedShell.tsx` to pass `machineId={null}` + `entryMode="room"` into `RectalTempEntry` and `RoomHumidityEntry` so their `TodaysEntriesList` loads the room rows for the selected date.
- Same treatment for Tray Wash's "Today's entries" area if needed (already partially handled via `useTodaysTrayWash`).

### 4. Verification

- Enter a Rectal Temp reading → confirm it appears immediately in "Today's entries" on the same tab.
- Enter a Hatch Progression record without Check Hour → confirm save works and the Machine total % card updates.
- Edit an existing Hatch Progression row → confirm the update persists and the list refreshes.
- Type a flock number that isn't currently linked to the machine → confirm it appears in the combobox and can be selected.

### Technical notes

- Files touched: `src/components/qa-hub/HatchProgressionEntry.tsx`, `src/components/qa-hub/TodaysEntriesList.tsx`, `src/components/qa-hub/RectalTempEntry.tsx`, `src/components/qa-hub/RoomHumidityEntry.tsx`, `src/components/qa-hub/shells/ProcessScopedShell.tsx`, `src/hooks/useTodaysQAEntries.ts`, and the two QA workflow files (`SingleSetterQAWorkflow.tsx`, `MultiSetterQAWorkflow.tsx`) to (a) supply the full company flock list, (b) drop `checkHour` from the submit payload, and (c) route edit/delete through `qa_monitoring`.
- No database migrations required — `qa_monitoring` already stores everything we need; edits are `UPDATE` by row id.
