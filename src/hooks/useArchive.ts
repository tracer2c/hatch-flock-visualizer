import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Archivable entity types. Each maps to a Supabase table with `archived_at`
 * and `archived_by` columns added by the
 * `add_archive_columns_to_flocks_machines_units` migration.
 */
export type ArchivableEntity =
  | "flocks"
  | "machines"
  | "units"
  | "batches"
  | "qa_monitoring"
  | "fertility_analysis"
  | "residue_analysis"
  | "egg_pack_quality";

const LABELS: Record<ArchivableEntity, string> = {
  flocks: "Flock",
  machines: "Machine",
  units: "Hatchery",
  batches: "House",
  qa_monitoring: "QA record",
  fertility_analysis: "Fertility record",
  residue_analysis: "Residue record",
  egg_pack_quality: "Egg-pack record",
};

/**
 * Archive / restore mutations + query-invalidation glue.
 *
 * Usage:
 *   const { archive, restore, isMutating } = useArchive("flocks");
 *   await archive("<flock-id>");
 *
 * The hook invalidates a broad set of React-Query keys so list views,
 * dropdowns, and dashboards re-fetch and reflect the change immediately.
 */
export function useArchive(entity: ArchivableEntity) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    // Conservatively invalidate everything that might depend on this entity.
    // Specific keys: 'flocks-list', 'machines-list', 'units-list', and any
    // joined batch view that pulls flocks/machines/units. Cheap to over-invalidate.
    queryClient.invalidateQueries({ queryKey: [entity] });
    queryClient.invalidateQueries({ queryKey: [`${entity}-list`] });
    queryClient.invalidateQueries({ queryKey: ["archive"] });
    queryClient.invalidateQueries({ queryKey: ["batches"] });
    // House lists (data entry cards, data sheet) key off these.
    queryClient.invalidateQueries({ queryKey: ["houses"] });
    queryClient.invalidateQueries({ queryKey: ["active-batches"] });
  };

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from(entity)
        .update({
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${LABELS[entity]} archived`);
      invalidate();
    },
    onError: (e: any) => {
      toast.error(`Failed to archive: ${e.message || "unknown error"}`);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(entity)
        .update({
          archived_at: null,
          archived_by: null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${LABELS[entity]} restored`);
      invalidate();
    },
    onError: (e: any) => {
      toast.error(`Failed to restore: ${e.message || "unknown error"}`);
    },
  });

  return {
    archive: archiveMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isMutating: archiveMutation.isPending || restoreMutation.isPending,
  };
}
