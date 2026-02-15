

## Add 3 Users to Wayne Sanderson Farms

### Domain Mismatch Fix

The company "Wayne Sanderson Farms" was created with domain `waynesandersonfarms.com`, but the user emails use `@waynesanderson.com`. We need to first update the company domain to `waynesanderson.com` so the auto-assignment trigger correctly links new sign-ups.

### Users to Create

| Email | Role |
|---|---|
| corey.goodson@waynesanderson.com | Company Admin |
| justin.anderson@waynesanderson.com | Company Admin |
| michael.martin@waynesanderson.com | Staff |

### Steps

1. **Update company domain** -- Change the domain from `waynesandersonfarms.com` to `waynesanderson.com` in the `companies` table so the `handle_new_user` trigger matches correctly.

2. **Create the 3 user accounts** -- Each user needs to be created via the Supabase Auth system (sign-up). The `handle_new_user` trigger will automatically:
   - Create their `user_profiles` entry linked to Wayne Sanderson Farms
   - Assign them the default `company_admin` role

3. **Update role for the staff user** -- After creation, update `michael.martin@waynesanderson.com`'s role in `user_roles` from `company_admin` to `staff`.

### Technical Details

- **Step 1**: SQL UPDATE on `companies` table to fix the domain.
- **Step 2**: Three `supabase.auth.signUp()` calls (or via Supabase Dashboard > Authentication > Users > Add User). A temporary password will be set for each user, which they can reset on first login.
- **Step 3**: SQL UPDATE on `user_roles` to change the third user's role to `staff`.

### Important Note
Since creating auth users cannot be done via SQL migrations, the simplest approach is to create them through the **Supabase Dashboard** (Authentication > Add User) or programmatically via sign-up calls. After all three are created, we fix the third user's role with an SQL update.

