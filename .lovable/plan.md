

## Change Sruthi Neerukonda to Company Admin

### What
Update the role for **Sai Sruthi Neerukonda** (`sruthineerukonda@gmail.com`, user ID `95bb6b5a-c4f5-4a3e-8671-62d7005e4333`) from `staff` back to `company_admin`.

### How
Run a single SQL UPDATE:

```sql
UPDATE user_roles
SET role = 'company_admin'
WHERE user_id = '95bb6b5a-c4f5-4a3e-8671-62d7005e4333';
```

### Impact
- Sruthi will regain full read and write access to all pages and features
- She will be able to manage users, targets, hatcheries, and all admin-only features
- No code changes needed -- only a data update in the `user_roles` table
- She should log out and log back in for the new role to take effect

### Technical Details
- Single data update using the database insert tool (not a migration, since this is a data change)
- The `has_role()` security definer function will immediately reflect the new role for all RLS policy checks
