

## Replicate Hatcheries and Machines to Wayne Sanderson Farms

### Overview
Copy all 4 hatcheries and 186 machines from the Default Company to Wayne Sanderson Farms so that Wayne Sanderson users see the exact same setup.

### What will be created

**4 Hatcheries:**
| Name | Code | Description |
|------|------|-------------|
| DHN | DHN | - |
| ENT | ENT | - |
| SAM | SAM | - |
| Troy | TROY | Troy, AL |

**186 Machines** (same names, types, capacities, and setter modes), linked to the correct new hatchery under Wayne Sanderson Farms.

### Technical Approach

A single database migration will:

1. **Insert 4 new units** into the `units` table with `company_id = '31165db9-014c-4d69-bd04-8d170699d7f2'` (Wayne Sanderson Farms), using the same name, code, description, and status as the Default Company units.

2. **Insert 186 new machines** into the `machines` table, copying `machine_number`, `machine_type`, `capacity`, `status`, `setter_mode`, `location`, `notes`, and `data_type` from the Default Company machines. Each machine's `unit_id` will be mapped to the corresponding **new** Wayne Sanderson hatchery (not the Default Company one).

3. The SQL will use a CTE (Common Table Expression) to:
   - First insert the 4 hatcheries and capture their new IDs
   - Then create a mapping between old unit IDs and new unit IDs
   - Finally insert all 186 machines with the correctly mapped `unit_id`

### No code changes needed
This is a data-only operation. The existing `UnitManager` and `MachineManager` components already filter by the logged-in user's `company_id` via RLS, so Wayne Sanderson users will automatically see their own hatcheries and machines after this migration.

