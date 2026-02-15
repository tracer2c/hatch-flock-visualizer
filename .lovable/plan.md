

## Fix: Data Sheet "View Only" Not Enforced

### Problem
The Data Sheet page (`/embrex-data-sheet`) was added to `WRITABLE_FEATURES` but the actual components were never updated to check `hasWriteAccess('embrex_data_sheet')`. The edit and delete buttons in all tab components remain visible and functional regardless of permission settings.

### Root Cause
The write protection was applied to dedicated data entry pages (DataEntryPage, QAHubPage, etc.) but the Data Sheet page uses its own tab components (`EmbrexHOITab`, `EggPackQualityTab`, `HatchPerformanceTab`, `QAMonitoringTab`) that render edit/delete buttons independently -- and these were never given a `readOnly` prop.

### Fix (5 files)

#### 1. `src/pages/EmbrexDataSheetPage.tsx`
- Import `usePermissions` hook and `ReadOnlyBanner`
- Call `hasWriteAccess('embrex_data_sheet')` to compute a `readOnly` flag
- Show the `ReadOnlyBanner` when `readOnly` is true
- Pass `readOnly` prop down to `CompleteDataView`

#### 2. `src/components/dashboard/CompleteDataView.tsx`
- Accept a new `readOnly` prop
- Pass it through to all tab components (`EmbrexHOITab`, `EggPackQualityTab`, `HatchPerformanceTab`, `QAMonitoringTab`, `ResidueBreakoutTab`)

#### 3. `src/components/dashboard/EmbrexHOITab.tsx`
- Accept `readOnly` prop
- When `readOnly` is true: hide the Actions column header and the edit/delete buttons entirely
- Disable the Save button in the edit dialog (as a safety net)

#### 4. `src/components/dashboard/EggPackQualityTab.tsx`
- Same pattern: accept `readOnly` prop, hide edit/delete buttons when true

#### 5. `src/components/dashboard/HatchPerformanceTab.tsx`
- Same pattern: accept `readOnly` prop, hide edit/delete buttons when true

#### 6. `src/components/dashboard/QAMonitoringTab.tsx`
- Same pattern: accept `readOnly` prop, hide edit/delete buttons when true

### What stays the same
- No database or RLS changes needed
- No routing changes
- `ResidueBreakoutTab` has no edit/delete actions so no changes needed there
- Export and filter functionality remains available in view-only mode (reading data is fine)

