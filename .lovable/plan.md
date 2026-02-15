

## Change Sruthi Neerukonda to Staff Role

### What
Update the role for **Sai Sruthi Neerukonda** (`sruthineerukonda@gmail.com`, user ID `95bb6b5a-c4f5-4a3e-8671-62d7005e4333`) from `company_admin` to `staff` in the `user_roles` table.

### How
Run a single SQL UPDATE using the database insert tool:

```sql
UPDATE user_roles
SET role = 'staff'
WHERE user_id = '95bb6b5a-c4f5-4a3e-8671-62d7005e4333';
```

### Impact
- Sruthi will become a **view-only** user -- she can see all permitted pages but cannot edit, save, or delete any data
- She will lose access to admin-only features like User Management, Targets, and Hatcheries (based on current permission settings)
- All write operations will be blocked at the database level by the existing RLS policies (`NOT has_role(auth.uid(), 'staff')`)
- No code changes needed

