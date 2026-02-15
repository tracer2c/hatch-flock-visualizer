

## Add "View Only" Mode to Role Permissions

### Problem
Currently each feature permission is binary: full access or no access. You want a middle ground where a user can **view** a page (see data) but **cannot write** (create, edit, delete).

### Simplest Approach: Add `can_write` Column

Rather than restructuring the existing system, we add a single boolean column `can_write` to the existing `role_permissions` table. This gives three effective states per feature/role:

```text
has_access=false              --> No Access (can't see the page at all)
has_access=true, can_write=true  --> Full Access (view + write)
has_access=true, can_write=false --> View Only (can see data, buttons disabled)
```

### Changes

#### 1. Database Migration
- Add `can_write` boolean column to `role_permissions`, defaulting to `true` (so all existing permissions keep working as-is -- zero disruption)

#### 2. Update `usePermissions` Hook
- Add a new function: `hasWriteAccess(featureKey): boolean`
- Returns `true` for company admins (always full access)
- Returns the `can_write` value from the database for other roles
- Falls back to `true` if no permission row found (safe default)

#### 3. Update Permissions Matrix UI (`UserManager.tsx`)
Replace each single toggle with a **3-option dropdown** per cell:

```text
Feature          | Staff          | Operations Head | Company Admin
-----------------+----------------+-----------------+--------------
Dashboard        | [Full Access v]| [Full Access v] | Full (locked)
Data Entry       | [View Only  v] | [Full Access v] | Full (locked)
QA Hub           | [No Access  v] | [Full Access v] | Full (locked)
```

Dropdown options:
- **No Access** -- hides route and sidebar item
- **View Only** -- can navigate and see data, but save/edit/delete buttons are disabled
- **Full Access** -- current behavior

#### 4. Provide a Reusable `readOnly` Check for Components
- Export `hasWriteAccess` from `usePermissions`
- The key data entry and management pages will use this to conditionally disable mutation UI elements (buttons, forms, delete icons)
- This is **UI-level enforcement only** -- the simplest approach that doesn't require changing any RLS policies or touching dozens of component internals

#### 5. Apply Write Protection to Key Pages
The following pages will check `hasWriteAccess` and disable their "Save", "Add", "Edit", "Delete" buttons when the user is view-only:

- **Data Entry pages** (BatchDataEntry, FertilityDataEntry, ResidueDataEntry, EggPackDataEntry, ClearsInjectedDataEntry, QADataEntry, HOIEntry)
- **QA Hub** (all entry workflows)
- **Checklist** (completion buttons)
- **Bulk Import** (upload/import buttons)
- **Management pages** (FlockManager, MachineManager, SOPManager, TargetManager, etc.)

Each page wraps its action buttons with a simple check:

```text
const { hasWriteAccess } = usePermissions();
const readOnly = !hasWriteAccess('data_entry');

<Button disabled={readOnly}>Save</Button>
```

Pages that are purely read-only already (Dashboard, Performance, Analytics, Process Flow, Live Tracking) don't need changes since they have no write actions.

### What This Does NOT Change
- No RLS policy changes needed (keeps things simple and safe)
- No changes to routing logic -- `RoleProtectedRoute` still uses `has_access` for page visibility
- No changes to sidebar filtering logic
- Existing permissions (all currently `has_access=true, can_write=true` by default) work identically

### Technical Details

**Migration:** Single `ALTER TABLE` to add `can_write` with default `true`

**Files to modify:**
- `supabase/migrations/` -- new migration adding `can_write` column
- `src/hooks/usePermissions.ts` -- add `hasWriteAccess()` function
- `src/lib/featureKeys.ts` -- add config for which features support write protection
- `src/components/dashboard/UserManager.tsx` -- replace toggles with 3-option dropdowns
- ~10-12 data entry/management components -- add `disabled={readOnly}` to action buttons

**Files NOT touched:** `App.tsx`, `RoleProtectedRoute.tsx`, `ModernSidebar.tsx` -- routing and navigation stay exactly the same.

