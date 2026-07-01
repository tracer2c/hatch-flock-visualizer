
# Full Date Sweep — Item #4 Closure

## Goal
Every `YYYY-MM-DD` date column read from Supabase must render as the same calendar date the user typed, in every US timezone. Today, most Data Sheet displays still call `new Date(item.set_date).toLocaleDateString()` which parses as UTC midnight and shifts back one day west of Greenwich.

## Findings from audit

**Already safe (no change needed):**
- Filter range comparisons (`item.set_date >= filters.dateFrom`) — string vs string, no Date involved.
- `DataSheetFilterSheet` / `DataSheetCenteredFilterDialog` — use `date-fns format(date, 'yyyy-MM-dd')` on a local Date from the picker (correct).
- `DateRangeSlider` — operates on "now", no stored-date parsing.
- `AllDataTab` + `EmbrexHOITab` main tables — already migrated to `formatLocalDate`.

**Unsafe — will be migrated to `formatLocalDate`:**

| File | Line(s) | Column |
|---|---|---|
| `EmbrexDataTable.tsx` | 148 (CSV export), 272 (table row) | `set_date` |
| `EmbrexTab.tsx` | 55 | `set_date` |
| `HatchPerformanceTab.tsx` | 345 | `set_date` |
| `EmbrexTimelinePage.tsx` | 2129 | `set_date` |
| `EmbrexDataSheetPage.tsx` | 252, 270 (export filename) | today's date — replace with `formatLocalDate(new Date())` variant |
| `HouseManager.tsx` | 928 | `set_date` |
| `FlockManager.tsx` | 910 | `arrival_date` |
| `MultiSetterSetsManager.tsx` | 873, 999 | `set_date`, `check_date` |
| `MachineTransfersTab.tsx` | 160, 254 | `transfer_date` |
| `TransferManager.tsx` | 169, 250 | `set_date`, `transfer_date` |
| `BatchDataEntry.tsx` | 221, 287, 308, 324 | `set_date`, `transfer_date` |
| `ClearsInjectedEntryPage.tsx` | 232 | `set_date` |
| `EggPackEntryPage.tsx` | 214 | `set_date` |
| `FertilityEntryPage.tsx` | 223 | `set_date` |
| `ResidueEntryPage.tsx` | 336 | `set_date` |
| `QAEntryPage.tsx` | 609 | `set_date` |
| `DataTypeSelection.tsx` | 191 | `set_date` |
| `FertilityDataEntry.tsx` | 539 | `analysis_date` |
| `UserManager.tsx` | 436 | `created_at` (timestamp — keep `toLocaleDateString` but wrap safely) |
| `MachineManager.tsx` | 800 | `last_maintenance` |

**Sorting risk (low):** `EmbrexHOITab.tsx:108-109` uses `new Date(str).getTime()` for sort. Sort order stays consistent even with UTC shift, so no functional bug — leave as-is.

## Approach

1. **Extend `src/utils/localDate.ts`** — add one helper `todayLocalISO()` returning `YYYY-MM-DD` for local today (for export filenames), so we don't shift dates westward at midnight UTC.

2. **Search-and-replace pass** on the ~20 files above:
   - `new Date(X).toLocaleDateString()` → `formatLocalDate(X)`
   - `new Date().toISOString().split('T')[0]` (export filenames) → `todayLocalISO()`
   - Add `import { formatLocalDate } from "@/utils/localDate";` where missing.

3. **Timestamps with time-of-day** (`created_at`, `last_maintenance` if it's a timestamptz): these legitimately carry a time. Keep them on `toLocaleDateString()` but route through a small `formatTimestampDate` wrapper that guards nulls consistently. Only truly date-only columns get `formatLocalDate`.

4. **Sanity check** with a quick grep after edits — ensure no remaining `new Date(...).toLocaleDateString()` on the known DATE columns (`set_date`, `hatch_date`, `transfer_date`, `arrival_date`, `analysis_date`, `check_date`).

## Out of scope
- Timeline analysis charts (numeric axis math is timezone-agnostic).
- QA hub filter behavior (already string-based).
- Backend/edge functions (they use ISO end-to-end).

## Verification
- Load `/embrex-data-sheet`, pick a row with `set_date = 2026-05-25`, confirm it renders `5/25/2026` and not `5/24/2026`.
- Export CSV/XLSX at 8pm CDT and confirm the filename uses today's local date, not tomorrow's UTC.
- Open a Batch Data Entry drawer and confirm the header date matches the sheet.
