## Bugs & Fixes

### 1. Rectal Temp + Humidity save but don't appear in "Today's entries"
Root cause: `ProcessScopedShell.handleRectalTemp` / `handleHumidity` invalidate the wrong React Query key (`['qa_monitoring']`) after inserting. The list hook keys on `['todays-qa-entries', ...]`, so it never refetches. Rows are in the DB (confirmed via query) but the UI list stays empty until a hard reload.

Fix: invalidate `['todays-qa-entries']` (and `['tray-wash-daily']` where relevant) after every insert in `ProcessScopedShell.tsx`.

### 2. Tray Wash has no visible "Today's entries" list
`TrayWashEntry` only prefills the form from `existingRow`, so users don't see confirmation that a save landed. Add a `TodaysEntriesList` beneath the form (type `tray_wash`, `entryMode='room'`, `machineId=null`) with a compact summary (avg temp + how many PPM checks filled) so the client can see each day's saved log.

### 3. Add "Check date" picker to Rectal Temp + Tray Wash
Both currently use the header date only. Add a per-entry date picker (shadcn DatePicker with `pointer-events-auto`) defaulting to the header `checkDate`, so users can back-date individual readings just like Hatch Progression. Pass the selected date through the existing `onSubmit` payload (`checkDate` / `washDate`) — no schema change needed.

### 4. Rename Chlorine PPM → Quat PPM, range 800–1000
In `TrayWashEntry.tsx`:
- Update `PPM_MIN = 800`, `PPM_MAX = 1000`.
- Change all labels/placeholders/legend text from "Chlorine PPM" → "Quat PPM".
- Update header subtitle and badges to reflect the new range.
- Keep DB payload keys (`ppm_check_1..5`) unchanged — the values are just Quat readings now, so historical rows remain readable. No migration needed.

## Files to edit
- `src/components/qa-hub/shells/ProcessScopedShell.tsx` — fix query invalidation keys.
- `src/components/qa-hub/TrayWashEntry.tsx` — Quat PPM rename + 800–1000 range + per-entry date picker + embedded TodaysEntriesList.
- `src/components/qa-hub/RectalTempEntry.tsx` — per-entry date picker (replace/augment the header date), keep list as-is.

## Verification
- Enter a rectal temp on today's date → row appears immediately in "Today's entries" without reload.
- Enter a tray wash → new list beneath the form shows the day's saved log.
- Back-date a rectal temp to yesterday → row saves with that `check_date`; list reflects when the header date matches.
- Tray Wash form shows "Quat PPM (800–1000)" everywhere; a value of 900 is green, 700 is amber.
