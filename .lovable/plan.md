# QA Hub Update — Humidity by Room & Auto Technician Name

Two focused changes to the Quality Assurance Hub. Both are UI/entry-flow changes only — no schema changes.

---

## 1. Humidity: remove the machine layer, take by room

Today, Humidity lives only under **Multi Stage Setter → pick machine** (`MachineWideHumidityEntry`). Client says humidity is not read per machine — it's a room reading (setter room / hatcher room / chick room), same idea we already use for **Rectal Temps**.

Change:
- Convert Humidity into a **room-scoped** check, mirroring the Rectal Temps flow.
- Rooms available: `Setter Room`, `Hatcher Room`, `Chick Room` (same list style as rectal temps; we can drop chick room later if not wanted — flagging as a question).
- Under QA Hub → **Humidity** tab: no machine selector, no single/multi scope. Just:
  - Room dropdown
  - Humidity % + Temperature °F (existing inputs, ideal 53–58% humidity)
  - Save button
- Persist to `qa_monitoring` with `candling_results.type = 'humidity'`, `room` field set, `machine_id = null` (room-level reading — not linked to a machine).
- Remove Humidity from the Multi Stage Setter workflow tabs so it's not duplicated.
- Keep the existing `MachineWideHumidityEntry.tsx` component code untouched for now but stop routing to it; delete only after verification.

Impact on `QAHubPage.tsx`:
- `humidity` entry in `SECTION_MAP` no longer needs `single`/`multi` — it becomes its own room-scoped section (rendered directly, bypassing the Single/Multi tabs).
- `TYPE_META.humidity.hint` changes to "Room-level — pick a room."

Historical humidity rows already saved against a machine remain readable; the "Today's entries" list will just show them without a room label.

---

## 2. Auto-fill Technician / Inspector name from the logged-in user

Every QA entry page currently asks the user to type their name into a **Technician Name** input. Client wants it locked to whoever is signed in.

Change (applies to `SingleSetterQAWorkflow.tsx` and `MultiSetterQAWorkflow.tsx`, plus the new room-scoped humidity screen):
- Pull the name from `useAuth()` profile: `` `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ``, fallback to `profile.email`.
- Replace the editable `<Input>` with a **read-only display** (badge or disabled input) showing the name — no edit affordance.
- Remove `useState('')` + `setTechnicianName` and the `!technicianName.trim()` guards (auth guarantees a value; if profile hasn't loaded yet, disable Save with a "Loading user…" state).
- All existing `inspector_name: technicianName` writes keep working — same value, just sourced from auth instead of an input.

No DB migration — `qa_monitoring.inspector_name` still holds the string, we just stop letting the user type it.

---

## Files touched

- `src/pages/QAHubPage.tsx` — route Humidity to its own room-scoped component; update `SECTION_MAP` + `TYPE_META`.
- `src/components/qa-hub/RoomHumidityEntry.tsx` — **new**, room-scoped humidity/temperature entry, modeled on `RectalTempEntry.tsx`.
- `src/components/qa-hub/SingleSetterQAWorkflow.tsx` — remove technician input, read from `useAuth`.
- `src/components/qa-hub/MultiSetterQAWorkflow.tsx` — remove technician input; remove Humidity tab.
- Save flow in `RoomHumidityEntry` inserts directly into `qa_monitoring` (same pattern used elsewhere).

## Open question

Should Humidity rooms be exactly the three rectal-temp rooms (`Hatcher`, `Chick Room`, `Separator Room`) or the setter-side rooms (`Setter Room`, `Hatcher Room`)? I'll default to **Setter Room + Hatcher Room + Chick Room** unless you say otherwise.
