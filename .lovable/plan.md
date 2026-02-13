

## Make Role Permissions Editable by Company Admin (Route-Level Enforcement)

### What This Does

Currently, the "Role Permissions" tab in User Management shows a static, read-only matrix. This plan converts it into a fully dynamic system where the company admin can toggle which roles (Staff, Operations Head) can access each feature -- and those permissions are enforced at the route level in real-time.

### Changes Overview

#### 1. New Database Table: `role_permissions`

Stores per-company, per-feature, per-role access settings.

```text
role_permissions
+--------------+----------------------------------------------+
| Column       | Type                                         |
+--------------+----------------------------------------------+
| id           | uuid (PK)                                    |
| company_id   | uuid (FK -> companies)                       |
| feature_key  | text (e.g. 'dashboard', 'data_entry', etc.)  |
| role         | user_role (staff, operations_head, etc.)      |
| has_access   | boolean (default true)                       |
| updated_by   | uuid                                         |
| created_at   | timestamptz                                  |
| updated_at   | timestamptz                                  |
+--------------+----------------------------------------------+
Unique constraint: (company_id, feature_key, role)
```

RLS policies:
- SELECT: All company users can read their company's permissions
- INSERT/UPDATE/DELETE: Only `company_admin` role

A seed function will populate default permissions for each company based on the current hardcoded matrix (Staff gets access to Dashboard, Data Entry, QA Hub, etc. but not management features).

#### 2. Feature-to-Route Mapping

A shared constant mapping feature keys to routes:

```text
Feature Key            Routes
--------------------   ----------------------------------------
dashboard              /
performance            /performance
process_flow           /process-flow
data_entry             /data-entry/**, /data-entry/house/**
qa_hub                 /qa-hub
checklist              /checklist/**
analytics              /analytics
embrex_data_sheet      /embrex-data-sheet
embrex_timeline        /embrex-timeline
live_tracking          /live-tracking
machine_utilization    /machine-utilization
residue_breakout       /residue-breakout
house_flow             /house-flow
bulk_import            /bulk-import
report                 /report
chat                   /chat
sop_dashboard          /management/sop-dashboard
sop_manager            /management/sop-manager
residue_schedule       /management/residue-schedule
flocks_management      /management/flocks
machines_management    /management/machines
user_management        /management/users
targets                /management/targets
hatcheries             /management/hatcheries
house_automation       /management/house-automation
reports                /management/reports
activity_log           /management/activity-log
```

Company admins always have full access (cannot be toggled off).

#### 3. New Hook: `usePermissions`

A React Query-based hook that:
- Fetches the company's `role_permissions` from the database
- Provides a `hasFeatureAccess(featureKey)` function that checks the current user's role against the permissions
- Company admins always return `true`
- Caches the result and includes `company_id` in the query key

#### 4. Update `RoleProtectedRoute` Component

Instead of checking against a hardcoded `allowedRoles` array, it will also accept a `featureKey` prop and use the `usePermissions` hook to check dynamic access:

```text
<RoleProtectedRoute featureKey="flocks_management">
  <FlocksPage />
</RoleProtectedRoute>
```

This keeps backward compatibility -- existing `allowedRoles` prop still works as a fallback.

#### 5. Update `App.tsx` Routes

Replace hardcoded `allowedRoles` with `featureKey` on all protected routes. Routes that are currently open (like data entry, QA hub) will also get a `featureKey` so they can be restricted by admin if desired.

#### 6. Update the Permissions Matrix UI in `UserManager.tsx`

Convert the static table to an interactive one:
- Each cell becomes a toggleable Switch component
- Company Admin column stays locked (always checked, non-editable)
- Staff and Operations Head columns are editable by the admin
- Changes save to the `role_permissions` table in real-time
- Shows a toast confirmation on save

#### 7. Update Sidebar Visibility

The `ModernSidebar` will use `usePermissions` to hide menu items the current user's role doesn't have access to, so users don't see links they can't navigate to.

### Technical Details

**Migration SQL:**
- Create `role_permissions` table with unique constraint on `(company_id, feature_key, role)`
- Enable RLS with company-scoped SELECT and admin-only mutation policies
- Insert default permission rows for all existing companies using the current hardcoded matrix

**Files to Create:**
- `src/hooks/usePermissions.ts` -- New hook for dynamic permission checks
- `src/lib/featureKeys.ts` -- Shared feature key constants and route mapping

**Files to Modify:**
- `src/components/RoleProtectedRoute.tsx` -- Add `featureKey` prop support
- `src/components/dashboard/UserManager.tsx` -- Make permissions matrix editable
- `src/App.tsx` -- Add `featureKey` to all routes
- `src/components/ModernSidebar.tsx` -- Filter menu items by permission

