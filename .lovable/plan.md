# QA Hub — Unified Date + Room-Based Humidity

Three coordinated changes so the QA Hub has one date, humidity is treated as a room-level check (not per machine), and rooms are managed as first-class entities users can add from Settings — with a "+ Add room" shortcut from the Hub that returns the user back with context intact.

## 1. Single date picker at the QA Hub header

Today the date is chosen twice — once inside **Process / Room Checks** and once inside **Flock-Based Checks** — wasting vertical space and letting the two scopes disagree.

- Lift a single `checkDate` state into `QAHubPage.tsx` and render it in the header row (next to the "Friday, Jul 17" badge / KPI chip), using the same UUI-styled date input already used elsewhere.
- Pass `checkDate` down to `ProcessScopedShell`, `FlockScopedShell`, and the Machine-Based workflows; remove the local Check Date fields from those shells.
- Technician stays where it is (auto-filled from the logged-in user).
- Persist the selected date in the URL (`?date=YYYY-MM-DD`) so refresh / back-nav keeps context.

## 2. Rooms as a real entity (managed in Settings)

Humidity, Rectal Temps, and any future room-scoped QA all need a **Room** — not a machine.

New table `public.rooms`:

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid | RLS scope |
| unit_id | uuid FK → units | which hatchery |
| name | text | e.g. "Chick Room A" |
| room_type | enum | `chick`, `separator`, `hatcher`, `setter`, `wash`, `other` |
| is_active | bool | default true |
| created_at / updated_at | timestamptz | |

Migration includes GRANTs for `authenticated` + `service_role`, RLS by `company_id`, and a `has_role`-gated write policy (admin / ops head).

New Settings page `src/pages/management/RoomsPage.tsx` (linked from the Management hub next to Machines / Hatcheries): list + add / edit / archive rooms per hatchery.

Seed once per company: if a company has zero rooms on first visit, auto-create "Chick Room", "Separator Room", "Hatcher Room 1" so nothing breaks for existing users.

## 3. Humidity becomes room-based, not machine-based

- Remove Humidity from the Machine-Based sub-tabs (`MACHINE_SUB` in `QAHubPage.tsx`).
- Add Humidity to the Process / Room shell alongside Rectal Temps and Tray Wash.
- New `RoomHumidityEntry.tsx` (fresh, not the old one): Room dropdown (from the new table, filtered by selected hatchery) + %RH + temperature + notes; stored in `qa_monitoring` with `check_type='humidity'` and a `room_id` reference in `candling_results` JSON.
- Historical machine-scoped humidity rows keep rendering in the Overview dashboard's Recent Activity feed — read path is untouched.

## 4. "+ Add room" shortcut with return context

Inside the Process/Room Humidity form (and Rectal Temps room picker), when the Room dropdown is open, append a **"+ Add room"** action.

- Clicking it navigates to `/management/rooms?returnTo=/qa-hub&group=process&sub=humidity&date=YYYY-MM-DD`.
- `RoomsPage` reads `returnTo` and shows a **"← Back to QA Hub"** button in its header.
- After saving a new room, we toast success and stay on the page (so they can add more), but the Back button always returns to the exact tab / date they came from.
- Back on the Hub, the new room appears in the dropdown (React Query invalidation on `rooms`).

## Technical notes

- Files touched: `src/pages/QAHubPage.tsx`, `src/components/qa-hub/shells/ProcessScopedShell.tsx`, `src/components/qa-hub/shells/FlockScopedShell.tsx`, `src/components/qa-hub/SingleSetterQAWorkflow.tsx` + `MultiSetterQAWorkflow.tsx` (drop humidity tab).
- New: `RoomsPage.tsx`, `RoomHumidityEntry.tsx`, `useRooms.ts` hook, migration `create_rooms_table`.
- Sidebar: add "Rooms" under the Admin / Management group.
- No changes to Machine-Based Temperature / Angles / Hatch Progression flows.
- Overview dashboard's Compliance heatmap: swap the "Humidity" column source from machine-scoped to room-scoped counts.

## Out of scope

- Migrating old humidity rows from machine to room (they remain queryable as-is).
- Multi-room bulk entry (single room per submission for now).
