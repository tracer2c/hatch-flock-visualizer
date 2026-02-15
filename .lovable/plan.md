

## Show User Role in the Profile Dropdown Menu

### What
Add a role badge (e.g., "Company Admin", "Operations Head", "Staff") beneath the user's email in the TopBar dropdown menu, so users can quickly see their current access level.

### Where
The change is in the user profile section of the dropdown in `src/components/TopBar.tsx`.

### Design
Inside the existing profile `DropdownMenuItem`, add a small styled badge below the email showing the user's primary role in a human-readable format (e.g., "Company Admin" instead of "company_admin").

### Technical Details

**File: `src/components/TopBar.tsx`**

1. Import `roles` from the existing `useAuth()` hook (already available, just destructure it).
2. Add a helper to format the role name: `company_admin` -> `Company Admin`, `operations_head` -> `Operations Head`, `staff` -> `Staff`.
3. Below the email `<span>` in the profile dropdown item, render a small badge with the formatted role using existing `Badge` component or a simple styled span with appropriate colors:
   - Company Admin: primary/blue badge
   - Operations Head: amber/orange badge  
   - Staff: gray badge

The dropdown will look like:

```
  Sai Sruthi Neerukonda
  sruthineerukonda@gmail.com
  [Company Admin]            <-- new badge
```

No new dependencies or database changes needed -- the `roles` array is already loaded in the auth context.

