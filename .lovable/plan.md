

## Add "View Only" Mode to Role Permissions — IMPLEMENTED ✅

### What Was Done

1. **Database Migration**: Added `can_write` boolean column (default `true`) to `role_permissions` table
2. **Updated `usePermissions` Hook**: Added `hasWriteAccess(featureKey)` function + updated `updatePermission` mutation to support `canWrite` parameter
3. **Updated Feature Keys**: Added `WRITABLE_FEATURES` array listing features that support write protection
4. **Updated UserManager Permissions Matrix**: Replaced binary Switch toggles with 3-option Select dropdowns (Full Access / View Only / No Access)
5. **Added ReadOnlyBanner Component**: Reusable amber warning banner for view-only pages
6. **Applied Write Protection Banners** to key pages:
   - DataEntryPage, QAHubPage, ChecklistPage, BulkDataImportPage
   - Management pages: FlocksPage, MachinesPage, SOPManagerPage, HatcheriesPage, UsersPage, TargetsPage
7. **Added `readOnly` prop** to ClearsInjectedDataEntry and HOIEntry components

### Three Permission States
```
has_access=false              → No Access (hidden from sidebar + route blocked)
has_access=true, can_write=true  → Full Access (view + write)
has_access=true, can_write=false → View Only (can see data, action buttons disabled)
```
