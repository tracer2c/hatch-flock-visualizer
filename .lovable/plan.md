

## Update Michael Martin's Role to Staff

### What needs to happen
Update the `user_roles` record for `michael.martin@waynesanderson.com` (user_id: `7b5de566-9438-426c-bfb3-59850c553401`) from `company_admin` to `staff`.

### Technical Step
Run the following SQL using the database insert/update tool:

```sql
UPDATE user_roles 
SET role = 'staff' 
WHERE user_id = '7b5de566-9438-426c-bfb3-59850c553401';
```

### Result
After this update, the final user setup for Wayne Sanderson Farms will be:

| User | Email | Role |
|---|---|---|
| Corey Goodson | corey.goodson@waynesanderson.com | Company Admin |
| Justin Anderson | justin.anderson@waynesanderson.com | Company Admin |
| Michael Martin | michael.martin@waynesanderson.com | Staff (view-only) |

No code changes are needed -- this is a data-only update.

