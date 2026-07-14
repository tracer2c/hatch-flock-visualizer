## Goal
Replace the plain shadcn calendar popover on **Data Entry → Weekly Flock Rollup** with the Untitled UI-styled Range Calendar Card already used elsewhere, and add a small dot indicator under each day that has any batch data (set_date).

## Changes

### 1. New hook — `src/hooks/useDatesWithBatches.ts`
- Accepts `{ from: Date; to: Date }` (visible month range).
- Queries `batches` for distinct `set_date` in that window (respecting the current company via RLS).
- Returns a `Set<string>` of `yyyy-MM-dd` for O(1) day lookup.
- Cached via react-query, keyed by the range.

### 2. Extend `src/components/uui/RangeCalendarCard.tsx` (and underlying `Calendar`)
- Add an optional `markedDates?: Set<string>` prop.
- Pass through to the inner `Calendar` via `modifiers={{ hasData: (d) => markedDates.has(fmt(d)) }}` and `modifiersClassNames={{ hasData: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary" }}`.
- Keep the ring for the selected day; dot stays visible on unselected days (hidden on selected via an override class).

### 3. New week-picker wrapper — `src/components/uui/WeekPickerCard.tsx`
- Same visual shell as `RangeCalendarCard` (preset rail + calendar + Apply/Cancel).
- `mode="single"`, but on hover/select of a day, highlights the full ISO week (Mon–Sun) using `modifiers`.
- Presets: **This week**, **Last week**, **2 weeks ago**, **Most recent with data** (uses `useLatestBatchDate`), **This month**.
- Fetches `markedDates` via the new hook for the currently-displayed month(s) and renders dots on days with data.
- Emits `onChange(anchorDate)`; parent computes `weekStart/weekEnd`.

### 4. Wire into `src/components/dashboard/WeeklyRollupView.tsx`
- Remove the existing `Popover` + `CalendarComponent` block (lines ~93–109).
- Replace with `<WeekPickerCard value={anchor} onChange={setAnchor} />`.
- Keep the ChevronLeft/Right and "This week" buttons unchanged.

## Out of scope
- No changes to the Analytics-page range picker (already UUI).
- No schema changes; dot data is read-only from `batches.set_date`.
- No changes to drill-down pages.

## Verification
- Typecheck.
- Manually confirm: open Data Entry → Weekly Flock Rollup, click the date button → UUI card opens with preset rail; days that have batches show a small primary-color dot; picking a day snaps the rollup to that ISO week.
