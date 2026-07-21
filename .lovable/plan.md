## What I found

- The QA Hub save error is a database/code mismatch, not Corey’s permission.
  - Corey is a `company_admin` for Wayne Sanderson Farms, so he has write access.
  - `qa_monitoring.entry_mode` currently only allows `house` or `machine`.
  - The newer Process / Room QA forms save `entry_mode: 'room'`, which is why Tray Wash / room Humidity / room checks fail with `valid_entry_mode`.
- Wayne Sanderson’s status automation rules already exist, but they are disabled.
  - Their rules are currently day 19 to `in_hatcher` and day 21 to `completed`, but disabled.
  - Some rules also require fertility/residue data; per your answer, day 21 should complete regardless and data entry should stay editable.
- Hatch Progression is being blocked by UI logic when no house/batch is linked to the selected machine/flock. That is app logic, not RLS.

## Plan

### Phase 1 — Fix QA Hub save errors
1. Update the `qa_monitoring` database constraint so it accepts the scopes the app now uses:
   - `house`
   - `machine`
   - `room`
2. Update QA save code so Process / Room forms consistently save room-level checks without needing a machine or house.
3. Make Tray Wash resume properly for room/process entries, not only machine-based Tray Wash.
4. Improve user-facing errors so users see a clear message like “Room QA save failed” only if something truly remains wrong.

### Phase 2 — Fix Hatch Progression blocking
1. Keep Hatch Progression linked to `batch_id` when the selected machine/flock has an active house.
2. If a multi-setter record has a flock but no linked house, allow the save as machine/flock-level QA instead of blocking the user.
3. Show a small warning that the record is not tied to a specific house when the batch link is missing.
4. Preserve QA linkage records when possible so Data Sheet / QA Overview can still show the entry in the right context.

### Phase 3 — Automatic status progression
Per your answers:
- Day 19: status only, no automatic hatcher machine assignment.
- Day 21: always complete, even if final data is missing.

Implementation:
1. Enable/update Wayne Sanderson automation rules:
   - `scheduled` → `in_setter` at day 0
   - `in_setter` → `in_hatcher` at day 19
   - `in_hatcher` → `completed` at day 21
2. Remove required fertility/residue checks from the day-21 rule.
3. Keep historical editing open after completion so users can still add Hatch/HOI, residue, QA, etc.
4. Record status changes in `batch_status_history` so managers can audit why a house moved.

### Phase 4 — Make machine views reflect the selected date
1. Update single-setter machine occupancy logic to look at the selected date, not only “today.”
2. Show houses in the correct phase for that selected date:
   - Set date through day 18/19 = setter phase
   - Day 19+ = hatcher status
   - Day 21+ = completed
3. Ensure QA machine selection pages use that same selected date so temps, angles, Hatch Progression, and machine lookups show what was in the machine for the filtered date.

### Phase 5 — Verification
1. Test as Wayne Sanderson context where possible.
2. Verify Corey is not blocked by role/RLS.
3. Save Tray Wash, room Humidity, and Hatch Progression.
4. Run/trigger status automation and confirm Wayne houses move to `in_hatcher` at day 19 and `completed` at day 21.
5. Confirm completed houses still allow past/historical data entry.

## Technical notes

- This requires one database migration for the `qa_monitoring.entry_mode` constraint.
- Updating Wayne’s automation rules is a data update, not a schema migration.
- No hatcher machine will be auto-selected; only the house status changes to `in_hatcher`.