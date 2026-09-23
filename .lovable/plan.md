# One shared flock across hatcheries

## Goal
When a new flock goes to several hatcheries, create **one** flock record instead of one copy per hatchery. Each house still records which hatchery it went to. Existing copies stay as they are.

## What users will see
- **Create Flock**: choosing several hatcheries (or "Select all") creates one flock. The blue box says "1 shared flock, available in: DHN, ENT, SAM, Troy" instead of "Total flocks to create: 4".
- **Flock list**: a shared flock shows once, with a "Shared · 4 hatcheries" badge that lists the hatcheries. Searching by hatchery still finds it.
- **Edit Flock**: you can add or remove hatcheries for a shared flock. Name, age and notes are edited once for all of them.
- **Set sheets and house creation**: a shared flock appears in every hatchery it belongs to. The house takes its hatchery from the setter or the selected hatchery, not from the flock.
- **Reports and rollups**: results are combined across hatcheries by default. The existing hatchery filter splits them, using each house's hatchery.

## Technical details
- New table `flock_units (flock_id, unit_id, company_id)` with a unique key on `(flock_id, unit_id)`, grants, and RLS scoped to the company through `get_user_company`. Staff can read only; admins and operations heads can write.
- Backfill one `flock_units` row per existing flock from `flocks.unit_id`. Existing flocks are not merged.
- Shared flocks keep `flocks.unit_id` set to NULL. Single-hatchery flocks keep their `unit_id` and a matching `flock_units` row.
- `FlockManager.tsx`: on create, insert one flock plus N `flock_units` rows. On edit, compare and update the links. Add the badge to list rows, and search across all linked hatchery names.
- Hatchery-filtered flock pickers (house creation, `SingleStageSetSheetGrid`, multi-stage grid, `MachineAllocationWizard`, QA flock shell) filter through `flock_units` instead of `flocks.unit_id`.
- Batch inserts set `unit_id` from the machine or the selected hatchery. The existing trigger already fills it from the machine. If no hatchery can be found, show an error.
- Rollup and timeline hatchery filters use `batches.unit_id`. Change any that filter on the flock's hatchery.
- Uniqueness check: stop a new flock number from clashing with an existing flock in any of the chosen hatcheries.

## Out of scope
- Merging existing duplicate flocks. This can be done later if wanted.
