## Two errors observed (Wayne side)

### 1. "Could not find the 'early_dead' column of 'fertility_analysis' in the schema cache"
The Edit Fertility Analysis / Hatch Results dialog (`HatchPerformanceTab.tsx`) writes `early_dead` and `late_dead` to the `fertility_analysis` table, but those columns don't exist in the DB. Current columns: `sample_size, fertile_eggs, infertile_eggs, fertility_percent, hatch_percent, hof_percent, hoi_percent, if_dev_percent, technician_name, notes, ...` — no early/late dead.

### 2. "update or delete on table 'batches' violates foreign key constraint 'single_stage_operation_rows_batch_id_fkey'"
House delete (`HouseManager.handleDeleteHouse`) runs `DELETE FROM batches WHERE id=?`. Five FKs pointing at `batches.id` are defined with NO ACTION, so any related row blocks the delete:

- `single_stage_operation_rows.batch_id` ← this is the one in the screenshot
- `fertility_analysis.batch_id`
- `egg_pack_quality.batch_id`
- `qa_monitoring.batch_id`
- `residue_analysis.batch_id`

All other batch-referencing tables already have `ON DELETE CASCADE` or `SET NULL`, so Default Company users rarely hit it; Wayne does because their houses have single‑stage operation rows + QA/residue/fertility data attached.

---

## Fix

### Migration A — add the two missing columns
```sql
ALTER TABLE public.fertility_analysis
  ADD COLUMN IF NOT EXISTS early_dead integer,
  ADD COLUMN IF NOT EXISTS late_dead  integer;
```
No code change needed afterwards — the dialog already reads/writes these fields and `chicks_hatched = fertile - early_dead - late_dead` already works once the columns exist.

### Migration B — make house delete actually cascade
Drop + recreate the five FKs with `ON DELETE CASCADE` so deleting a house cleans up its child rows (matches the behavior already in place for alerts, checklists, weight_tracking, machine_transfers, etc.):

```sql
ALTER TABLE public.single_stage_operation_rows
  DROP CONSTRAINT single_stage_operation_rows_batch_id_fkey,
  ADD  CONSTRAINT single_stage_operation_rows_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.fertility_analysis
  DROP CONSTRAINT fertility_analysis_batch_id_fkey,
  ADD  CONSTRAINT fertility_analysis_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.egg_pack_quality
  DROP CONSTRAINT egg_pack_quality_batch_id_fkey,
  ADD  CONSTRAINT egg_pack_quality_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.qa_monitoring
  DROP CONSTRAINT qa_monitoring_batch_id_fkey,
  ADD  CONSTRAINT qa_monitoring_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.residue_analysis
  DROP CONSTRAINT residue_analysis_batch_id_fkey,
  ADD  CONSTRAINT residue_analysis_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
```

Note: this means deleting a house permanently removes its fertility/QA/residue/egg-pack/operation-row history. The confirm dialog (`HouseManager.handleDeleteHouse`) already warns "removes the house and its data entirely and cannot be undone" and points users at Archive to retain history, so semantics match. No frontend changes required.

### Chained risks reviewed
- No code paths assume those FKs are RESTRICT — nothing else breaks.
- Other delete blockers (`flocks`, `machines`, etc.) are not in scope for these two reports.
- After Migration A, the existing INSERT/UPDATE in `HatchPerformanceTab.tsx` will succeed; no client edits.

## Summary
Run two migrations: add `early_dead`/`late_dead` to `fertility_analysis`, and switch the five remaining `batches` child FKs to `ON DELETE CASCADE` so house deletion works end-to-end.
