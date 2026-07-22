# QA Hub — Calendar dots misrepresent "has data"

## Root cause (verified)

- `DayPickerCard` always fetches dots from `useDatesWithBatches`, which returns days where a **batch was set** (`batches.set_date`).
- The QA Hub Overview reads from `qa_monitoring.check_date`, which is a completely different dataset.
- Confirmed against the DB for Jun 2026: `qa_monitoring` has entries on Jun 5, 8, 12, 15, 16, 19, 22, 26, 29 — **nothing on Jun 9**. But Jun 9 shows a blue dot because a batch was set that day. That's why the Overview is empty on a "dotted" date.

So the Overview is behaving correctly — the calendar is lying.

## Fix

Make the dot source configurable and use QA entries on the QA Hub.

### 1. New hook `src/hooks/useDatesWithQAEntries.ts`
Mirror of `useDatesWithBatches` but queries `qa_monitoring` distinct `check_date` in the visible window. Returns `Set<'yyyy-MM-dd'>`.

### 2. `src/components/uui/DayPickerCard.tsx`
- Add prop `dotsSource?: 'batches' | 'qa'` (default `'batches'` to keep other pages unchanged).
- When `'qa'`, use the new hook instead.
- Tooltip/legend copy under the calendar becomes "Days with QA entries" vs "Days with batches" (small helper text row above Cancel/Apply).

### 3. `src/pages/QAHubPage.tsx`
Pass `dotsSource="qa"` to the `DayPickerCard` at line 112.

### 4. `useLatestBatchDate` preset
Rename usage inside `DayPickerCard` so the "Most recent with data" preset uses the QA-latest date when `dotsSource='qa'`. Add a tiny `useLatestQADate` hook, or reuse a max() over the fetched set.

## Out of scope
- No changes to Overview aggregation logic — that's already correct.
- Dashboard/Data Entry pickers keep the batch-based dots.

## Verification
- Open QA Hub on Jun 2026: dots should appear on 5, 8, 12, 15, 16, 19, 22, 26, 29 (matching DB) — not Jun 9.
- Click Jun 12 → Overview populates. Click Jun 9 → correctly empty, and the calendar no longer suggests otherwise.
