

## Replicate Default Company Templates to Wayne Sanderson Farms

### Overview

This will insert all configuration templates from the Default Company into Wayne Sanderson Farms (`31165db9-014c-4d69-bd04-8d170699d7f2`) using direct SQL inserts. No code changes are needed -- the app already filters by `company_id` via RLS.

### What will be inserted

| Data Type | Count |
|-----------|-------|
| Alert Configs | 11 |
| Batch Automation Rules | 3 |
| SOP Templates | 8 |
| Daily Checklist Items | 18 (11 batch + 7 machine) |

### Technical Approach

A single SQL script using a PL/pgSQL `DO` block will:

1. Insert all 11 **alert configs** with Wayne Sanderson's company_id
2. Insert all 3 **batch automation rules**
3. Insert all 8 **SOP templates**, storing old-to-new ID mappings in a temp table
4. Insert all 18 **daily checklist items**, remapping `sop_template_id` references using the temp table so they point to the new Wayne Sanderson SOP template IDs instead of the Default Company ones

The SOP ID remapping is critical because 6 of the 18 checklist items reference specific SOP templates. Without remapping, they would incorrectly point to the Default Company's SOP templates.

### Checklist items with SOP linkage (will be remapped)

- "Check Temperature Reading" and "Monitor Humidity Levels" and "Ventilation Check" link to "Daily Environmental Monitoring" SOP
- "Candling Inspection" links to "Day 10 Candling Procedure" SOP
- "Transfer to Hatcher" links to "Day 18 Transfer Protocol" SOP
- "Hatch Management" links to "Hatch Day Procedures" SOP

### After completion

Wayne Sanderson Farms users (Corey Goodson, Justin Anderson, Michael Martin) will immediately see all SOP templates, checklist items, alert configurations, and batch automation rules when they log in -- no app restart needed.

