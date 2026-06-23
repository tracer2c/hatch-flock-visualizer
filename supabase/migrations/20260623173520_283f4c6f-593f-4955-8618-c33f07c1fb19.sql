
ALTER TABLE public.fertility_analysis
  ADD COLUMN IF NOT EXISTS early_dead integer,
  ADD COLUMN IF NOT EXISTS late_dead  integer;

ALTER TABLE public.single_stage_operation_rows
  DROP CONSTRAINT IF EXISTS single_stage_operation_rows_batch_id_fkey,
  ADD  CONSTRAINT single_stage_operation_rows_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.fertility_analysis
  DROP CONSTRAINT IF EXISTS fertility_analysis_batch_id_fkey,
  ADD  CONSTRAINT fertility_analysis_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.egg_pack_quality
  DROP CONSTRAINT IF EXISTS egg_pack_quality_batch_id_fkey,
  ADD  CONSTRAINT egg_pack_quality_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.qa_monitoring
  DROP CONSTRAINT IF EXISTS qa_monitoring_batch_id_fkey,
  ADD  CONSTRAINT qa_monitoring_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.residue_analysis
  DROP CONSTRAINT IF EXISTS residue_analysis_batch_id_fkey,
  ADD  CONSTRAINT residue_analysis_batch_id_fkey
       FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
