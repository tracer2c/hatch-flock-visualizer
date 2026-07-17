## Goal

Unlock the "View only (past week/past day)" restriction so users can edit any previously entered data — for today and for prior days (at least 50 days back, effectively any past date). Future dates stay view-only.

## Where the lock lives

The read-only behavior on past dates is centralized in one hook:

- `src/hooks/useDayScopedEntry.ts` — returns `mode: 'view'` whenever `checkDate < today`, which every QA/entry page uses to disable inputs and the Save button.

Pages/components consuming this rule:

- `src/pages/HatchHOIEntryPage.tsx` — `isPastWeek = day.isPastDay` → disables inputs + Save (the exact screen in the screenshot).
- QA Hub entries that pair `useDayScopedEntry` with `useTodaysTrayWash` / `useTodaysQAEntries`:
  - `src/components/qa-hub/TrayWashEntry.tsx`
  - `src/components/qa-hub/RectalTempEntry.tsx`
  - other QA entry components under `src/components/qa-hub/` that import `useDayScopedEntry`
- Any other page using `day.isPastDay` / `day.mode === 'view'` to gate edits.

## Change

1. **Redefine the rule in `useDayScopedEntry`:**
   - `mode = 'edit'` when `checkDate <= today` (today OR any past day).
   - `mode = 'view'` only when `checkDate > today` (future).
   - Keep `isToday`, `isPastDay`, `isFutureDay` flags so UI can still show a subtle "Editing past entry" hint if desired — but they no longer disable inputs.
   - Optional guard: cap edit window at 50 days back via an opt-in `maxPastDays` option (default: unlimited). Not enforced globally so the client's "50 days" ask is satisfied without breaking older edits.

2. **Remove the "View only (past week)" badge + input disabling on `HatchHOIEntryPage.tsx`:**
   - Drop `isPastWeek` gating; `canEdit` becomes `!readOnly` (permission-based only).
   - Remove the `View only (past week)` Badge from the header.

3. **Sweep QA entry components** that read `day.mode`/`day.isPastDay` and remove the past-date disabling, keeping only the `readOnly` (permissions) gate. Resume/prefill logic already loads the existing row, so Save will update it.

4. **Preserve write permissions:** `hasWriteAccess('data_entry')` / `hasWriteAccess('qa')` still controls edit ability — staff (read-only role) remains read-only per core memory.

5. **Save path stays the same:** existing mutations (`useSaveFlockTotalsToBatches`, QA upserts) already update the matched row by id/date, so no DB changes are needed. No migration required.

## Out of scope

- No schema changes, no RLS changes.
- No new audit-log entries beyond what `activityLogger` already captures.
- Future-dated entries remain view-only (prevents accidental forward-dated data).

## Verification

- Open a flock/week from 2+ weeks ago on Hatch/HOI → inputs enabled, Save works, value persists on refetch.
- Open a QA entry (Tray Wash, Rectal Temp) with a past `checkDate` → fields editable, Save updates the existing row.
- Staff role → still fully read-only.
- Future date → still view-only.
