import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PAGE_DATA_SHEET,
  getDefaultHiddenColumns,
} from "@/config/visualPreferences";

type Row = {
  section_key: string;
  hidden_columns: string[];
};

/**
 * Loads & mutates the current user's column-visibility preferences for a page.
 *
 * Visibility logic:
 *  - If the user has a row for (page_key, section_key), its `hidden_columns`
 *    array is the source of truth.
 *  - Otherwise we fall back to the registry's `defaultHidden` columns
 *    (so previously-removed columns stay hidden for users who haven't opted in).
 *
 * Multi-tenant safety: RLS scopes all reads/writes to `auth.uid()`. We pass
 * the user's company_id from `useAuth().profile` on insert.
 */
export function useVisualPreferences(pageKey: string = PAGE_DATA_SHEET) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["visual_preferences", user?.id, pageKey];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("user_visual_preferences")
        .select("section_key, hidden_columns")
        .eq("page_key", pageKey);
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  /** section_key -> Set<columnId> (explicit user prefs only) */
  const explicitMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const row of rows) {
      m.set(row.section_key, new Set(row.hidden_columns || []));
    }
    return m;
  }, [rows]);

  /**
   * Effective hidden columns for a section.
   * Falls back to registry defaults when the user has no row.
   */
  const getHiddenColumns = (sectionKey: string): string[] => {
    const explicit = explicitMap.get(sectionKey);
    if (explicit) return Array.from(explicit);
    return getDefaultHiddenColumns(sectionKey);
  };

  const isColumnHidden = (sectionKey: string, columnId: string): boolean => {
    const explicit = explicitMap.get(sectionKey);
    if (explicit) return explicit.has(columnId);
    return getDefaultHiddenColumns(sectionKey).includes(columnId);
  };

  const upsertMutation = useMutation({
    mutationFn: async ({
      sectionKey,
      hiddenColumns,
    }: {
      sectionKey: string;
      hiddenColumns: string[];
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (!profile?.company_id) throw new Error("Missing company_id on profile");

      const { error } = await supabase
        .from("user_visual_preferences")
        .upsert(
          {
            user_id: user.id,
            company_id: profile.company_id,
            page_key: pageKey,
            section_key: sectionKey,
            hidden_columns: hiddenColumns,
          },
          { onConflict: "user_id,page_key,section_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Toggle a single column's visibility.
   * If the user has no row yet, seed it with the registry defaults first
   * so we don't accidentally reveal columns that were defaultHidden.
   */
  const toggleColumn = async (sectionKey: string, columnId: string) => {
    const current = new Set(getHiddenColumns(sectionKey));
    if (current.has(columnId)) {
      current.delete(columnId);
    } else {
      current.add(columnId);
    }
    await upsertMutation.mutateAsync({
      sectionKey,
      hiddenColumns: Array.from(current),
    });
  };

  /** Reset a section back to registry defaults (deletes the user's row). */
  const resetSection = async (sectionKey: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("user_visual_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("page_key", pageKey)
      .eq("section_key", sectionKey);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    isLoading,
    isColumnHidden,
    getHiddenColumns,
    toggleColumn,
    resetSection,
    isMutating: upsertMutation.isPending,
  };
}
