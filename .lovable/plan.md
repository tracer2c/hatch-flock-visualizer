

## Add "Wayne Sanderson Farms" as a New Company

### Current State
There are 2 companies in the database:
1. **Default Company** (default.com) -- the fallback for unmatched email domains
2. **Company One** (companyone.com) -- your current company

### What We'll Do
Insert a new company record for **Wayne Sanderson Farms** into the `companies` table.

### Details Needed
Before proceeding, we need to confirm a few things:
- **Domain**: What email domain should be associated with this company? (e.g., `waynesandersonfarms.com` or `wsf.com`). Any user who signs up with this email domain will be automatically assigned to this company.
- **Subscription type**: `trial` or `enterprise`?

### Technical Steps
1. Run a SQL INSERT to create the company record with the provided domain and subscription type
2. The existing `seed_role_permissions_for_company` trigger will automatically create all default role permissions for the new company
3. Any user who signs up with the matching email domain will be auto-assigned to this company

### Default Assumptions (if no preferences given)
- Domain: `waynesandersonfarms.com`
- Subscription: `trial`
- Status: `active`

