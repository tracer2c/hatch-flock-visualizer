

## Simplify Permissions: Role-Based Read/Write

### Goal
Replace the complex per-feature permission matrix with a simple role-based rule:
- **Company Admin** and **Operations Head**: Full read + write access to all pages
- **Staff**: View-only access to all pages (can see everything, cannot edit)

### Changes

#### 1. `src/hooks/usePermissions.ts`
Simplify `hasWriteAccess` to be purely role-based -- no database lookup needed:

```typescript
const hasWriteAccess = (featureKey: FeatureKey): boolean => {
  // Company admins and operations heads always have full access
  if (isAdmin()) return true;
  if (roles.some(r => r.role === 'operations_head')) return true;
  // Staff = view only
  return false;
};
```

`hasFeatureAccess` stays the same (everyone can view all pages).

#### 2. `src/components/dashboard/UserManager.tsx`
Remove or simplify the per-feature permission matrix UI. Replace it with a simple explanation:
- "Company Admin and Operations Head have full access. Staff have view-only access."
- No dropdowns or toggles needed per feature anymore.

### What stays the same
- All the `ReadOnlyBanner` components already wired into pages continue to work -- they call `hasWriteAccess()` which will now simply return `false` for staff users.
- All the `readOnly` props already passed to tab components (EmbrexHOITab, EggPackQualityTab, etc.) continue to work.
- No database migration needed -- the `role_permissions` table can remain but won't be actively used for write-access decisions.
- Route protection via `RoleProtectedRoute` and `hasFeatureAccess` remains unchanged.

### Technical summary
This is a 2-file change:
1. **usePermissions.ts** -- simplify `hasWriteAccess` to a role check (3 lines of logic)
2. **UserManager.tsx** -- remove the per-feature permission dropdowns, replace with a simple role-based description

