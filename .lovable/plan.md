## Problem

When a Wayne Sanderson Farms user (or any non–Default Company user) tries to create a flock, the insert fails with:
`new row violates row-level security policy for table 'flocks'`

## Root cause

`src/components/dashboard/FlockManager.tsx` (lines 222–245) builds the flock insert payload **without `company_id`**. The column then falls back to its DB default of `'00000000-0000-0000-0000-000000000001'` (Default Company).

The RLS INSERT policy on `flocks` requires:
```
company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff')
```

For users belonging to Wayne Sanderson Farms (or any non-default company), the default-injected `company_id` does not match `get_user_company(auth.uid())`, so the insert is rejected.

This is the exact same multi-tenant RLS gap previously fixed in `machineService.ts` and `UnitManager.tsx` (per the architecture memory), but `FlockManager` was missed.

## Fix

In `src/components/dashboard/FlockManager.tsx`:

1. Before building `flocksToCreate`, fetch the user's `company_id` from `user_profiles`:
   ```ts
   const { data: profile } = await supabase
     .from('user_profiles')
     .select('company_id')
     .eq('id', user.id)
     .single();
   ```
2. Guard against missing profile/company_id with a clear toast error (so we never silently fall back to Default Company).
3. Add `company_id: profile.company_id` to every object in `flocksToCreate`.
4. Apply the same `company_id` inclusion to the **edit/update** path further down in `handleSubmit` if it re-inserts or upserts (verify and patch if needed — update path normally doesn't need it because RLS UPDATE uses USING on existing row, but we'll confirm during implementation).

## Out of scope

- No DB migration needed — `company_id` column and RLS policies are already correct.
- No changes to other tables; this is isolated to flock creation in `FlockManager.tsx`.

## Verification

- Log in as a Wayne Sanderson user (e.g., Justin Anderson) and create a flock across one and multiple hatcheries → should succeed.
- Confirm the new flock rows have `company_id` matching the Wayne Sanderson company, not the Default Company.
- Staff role users should still be blocked (UI already hides the action; RLS still enforces).
