# QA Hub Overview — Weekly Hatchery Dashboard

## Goal
Replace the broad daily overview with an operations-focused weekly dashboard for one selected hatchery. The existing date picker will determine the Monday–Sunday week, and the dashboard will emphasize the checks Wayne reviews under the current SOP.

## Dashboard layout

1. **Weekly context and filters**
   - Add a hatchery selector to the Overview and keep the existing date picker.
   - Clearly show the selected Monday–Sunday date range.
   - Keep the rest of QA Hub unchanged; only the Overview tab receives this redesign.

2. **Hatch Progression first**
   - Place a full-width Hatch Progression section at the top.
   - Show each active hatcher with its latest stage, hatched/total count, percentage out, last-check time, and status.
   - Add a compact weekly progression chart grouped by day and machine, with clear empty and overdue states.
   - Allow a row or chart item to open the existing QA entry details and provide a direct action to log hatch progression.

3. **Weekly SOP metric cards**
   - Average rectal temperature, with location breakdown and in-range rate.
   - Average tray wash temperature, Quat PPM compliance, and completed-day count.
   - Average eggshell temperature using the existing machine temperature checks, including front/middle/back where available.
   - Setter angle averages split into Left and Right, with out-of-range counts.
   - Overall QA completion: completed checks versus expected checks for the selected week and hatchery.
   - Each card will show coverage/sample count so an average is never presented without context.

4. **Trends and exceptions**
   - Add a seven-day trend view for the core temperature and angle metrics.
   - Add an “Attention Needed” panel for out-of-range readings, missing expected checks, and stale hatch progression.
   - Use existing SOP limits consistently, correcting tray wash compliance to Quat 800–1000 PPM.
   - Keep quick links to the relevant entry screens, but make them secondary to the operational dashboard.

5. **Weekly QA coverage table**
   - Show each day of the selected week with completion status for Hatch Progression, Eggshell Temperature, Setter Angles, Rectal Temperature, and Tray Wash.
   - Make missing checks immediately visible while retaining entry-detail access.
   - Include clear no-data states rather than misleading zero averages.

## Data and filtering

- Replace the current rolling seven-day calculation with the calendar week containing the selected date.
- Scope machines and QA readings to the selected hatchery and the signed-in user’s company.
- Add hatchery linkage to `qa_monitoring` so room/process records such as Rectal Temperature and Tray Wash can be filtered correctly; existing rows will remain visible in an “unassigned” fallback when their hatchery cannot be determined safely.
- Update QA save paths so new room/process and machine records retain hatchery context.
- Keep current role rules: staff remains read-only, while permitted roles can enter or edit checks.
- Paginate or fully fetch the selected week rather than silently limiting the dashboard to 500 readings.

## Technical details

- Refactor `useQAOverviewData` into a hatchery-aware weekly aggregation that returns hatch progression, metric summaries, daily trends, compliance coverage, exceptions, and recent entries.
- Rebuild `QAOverviewDashboard` with existing design-system cards, charts, tooltips, detail sheet, and semantic status colors.
- Preserve the existing QA navigation and query-parameter behavior.
- Add the database migration with explicit grants, RLS-compatible hatchery linkage, and indexes needed for week/hatchery queries.
- Validate calculations with focused tests for calendar-week boundaries, weighted averages, left/right angle aggregation, empty data, hatchery isolation, and Quat limits.
- Verify the completed Overview at desktop and mobile sizes, including hatchery switching, week switching, drill-downs, and read-only behavior.
