

## Replicate Default Company Templates to Wayne Sanderson Farms

### What will be replicated

| Data Type | Count | Details |
|-----------|-------|---------|
| Alert Configs | 11 | Temperature, humidity, CO2, ventilation, turning, mortality, maintenance, critical days, hatch approaching, batch status, daily QA |
| Batch Automation Rules | 3 | Start Setter, Start Hatcher (day 18), Complete House (day 21) |
| SOP Templates | 8 | Daily monitoring, day 10 candling, day 18 transfer, hatch day, emergency response, weekly maintenance, monthly calibration, staff training |
| Daily Checklist Items | 18 | 11 batch-type items + 7 machine-type items, with proper SOP template linkage |

### Technical Approach

A single database migration will be created with a PL/pgSQL `DO` block that:

1. Inserts all 11 **alert configs** with Wayne Sanderson's `company_id`
2. Inserts all 3 **batch status automation rules**
3. Inserts all 8 **SOP templates**, capturing old-to-new ID mappings in a temp table
4. Inserts all 18 **daily checklist items**, remapping `sop_template_id` references to the newly created Wayne Sanderson SOP template IDs

The SOP template ID remapping is critical because checklist items reference SOP templates by ID -- we need the new Wayne Sanderson SOP template IDs, not the Default Company ones.

### No code changes needed

This is purely a data seeding operation. The application already filters by `company_id` via RLS, so Wayne Sanderson users will automatically see their new templates once the data is inserted.
