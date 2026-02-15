

## Make Sruthi Neerukonda a Company Admin

### What
Update the role for **Sai Sruthi Neerukonda** (`sruthineerukonda@gmail.com`, user ID `95bb6b5a-c4f5-4a3e-8671-62d7005e4333`) from `operations_head` to `company_admin` in the `user_roles` table.

### How
Run a single SQL UPDATE via a database migration:

```sql
UPDATE user_roles
SET role = 'company_admin'
WHERE user_id = '95bb6b5a-c4f5-4a3e-8671-62d7005e4333';
```

### Impact
- Sruthi will now have full read + write access to all pages (same as your current access level)
- She will be able to manage users, targets, hatcheries, and all other admin-only features
- No code changes needed -- the existing role-based logic will automatically grant her full access

