

## Backend Enforcement: Staff Users Cannot Write (RLS Policies)

### Goal
Add database-level Row Level Security policies so that even if the frontend fails or is bypassed, staff users physically cannot insert, update, or delete data. Only `company_admin` and `operations_head` roles can write.

### Approach
Split existing `ALL` policies into separate `SELECT` (everyone) and `INSERT/UPDATE/DELETE` (non-staff only) policies using the existing `has_role()` database function.

The write-blocking condition is:
```sql
NOT has_role(auth.uid(), 'staff'::user_role)
```

### Will this break anything?
No. Here is why:
- Admin and Operations Head users are unaffected -- they keep full read+write
- Staff users already see "View Only" banners on the frontend, so they are not attempting writes. This just adds a safety net.
- The `has_role` function already exists and is used elsewhere in the database

### Tables to Update

**Group 1 -- Tables with `ALL` + company_id check (split into SELECT + write policies with staff block):**
1. `batches`
2. `flocks`
3. `machines`
4. `alert_configs`
5. `custom_targets`
6. `daily_checklist_items`
7. `data_entry_images`
8. `house_machine_allocations`
9. `machine_transfers`
10. `multi_setter_sets`
11. `residue_analysis_schedule`
12. `sop_templates`
13. `specific_gravity_tests`
14. `units`

For each: drop the existing `ALL` policy, create:
- `SELECT` with `USING (company_id = get_user_company(auth.uid()))`
- `INSERT` with `WITH CHECK (company_id = get_user_company(auth.uid()) AND NOT has_role(auth.uid(), 'staff'::user_role))`
- `UPDATE` with same condition on both `USING` and `WITH CHECK`
- `DELETE` with same condition on `USING`

**Group 2 -- Tables with `ALL` + `true` (wide open, need staff block on writes):**
1. `residue_analysis`
2. `fertility_analysis`
3. `egg_pack_quality`
4. `checklist_completions`

For each: drop the existing `ALL` policy, create:
- `SELECT` with `USING (true)`
- `INSERT` with `WITH CHECK (NOT has_role(auth.uid(), 'staff'::user_role))`
- `UPDATE` and `DELETE` with same staff block

**Tables left unchanged:**
- `qa_monitoring` -- already has separate SELECT/INSERT/UPDATE/DELETE policies; we just add the staff check to the write policies
- `role_permissions` -- already admin-only for writes
- `companies` -- already restricted
- `batch_status_history` -- already restricted (no UPDATE/DELETE)
- `flock_history` -- already restricted (no UPDATE/DELETE)
- `push_subscriptions` -- per-user, not relevant
- `mfa_recovery_codes` -- per-user, not relevant
- `device_requests` -- has its own fine-grained policies

### Technical Details (Single SQL Migration)

One migration with all the `DROP POLICY` + `CREATE POLICY` statements for the ~18 tables listed above. The pattern per table is:

```sql
-- Example for 'batches'
DROP POLICY IF EXISTS "Company users can access their batches" ON batches;

CREATE POLICY "Company users can view their batches"
  ON batches FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Non-staff can insert batches"
  ON batches FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND NOT has_role(auth.uid(), 'staff'::user_role)
  );

CREATE POLICY "Non-staff can update batches"
  ON batches FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND NOT has_role(auth.uid(), 'staff'::user_role)
  );

CREATE POLICY "Non-staff can delete batches"
  ON batches FOR DELETE TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND NOT has_role(auth.uid(), 'staff'::user_role)
  );
```

### No Code Changes Required
The frontend already handles the UI (ReadOnlyBanner, hidden buttons). This is purely a database-level safety net -- no TypeScript changes needed.

