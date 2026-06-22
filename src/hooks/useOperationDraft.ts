import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StageDraftType = "multi" | "single";

type DraftRecord<H, R> = {
  header: H;
  rows: R[];
  updated_at: string;
};

/**
 * Per-user autosave for an in-progress Multi/Single-Stage entry. One draft
 * row per (user, stage_type) — saving overwrites the same row so leaving and
 * coming back always finds exactly the latest in-progress set, never a pile
 * of stale drafts.
 */
export function useOperationDraft<H, R>(stageType: StageDraftType) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["operation-draft", stageType, user?.id];

  const draftQuery = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async (): Promise<DraftRecord<H, R> | null> => {
      const { data, error } = await supabase
        .from("operation_drafts")
        .select("header, rows, updated_at")
        .eq("stage_type", stageType)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        header: data.header as H,
        rows: data.rows as R[],
        updated_at: data.updated_at,
      };
    },
    // Always re-check on mount, never serve a persisted/cached answer — the
    // whole point of this query is "is there a draft to resume right now."
    // The app persists React Query's cache to IndexedDB across reloads, so a
    // long staleTime here would freeze in whatever this query returned the
    // very first time the page was ever visited (typically "no draft"),
    // permanently hiding the resume banner even after later autosaves.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ header, rows }: { header: H; rows: R[] }) => {
      if (!user?.id || !profile?.company_id) return;
      const { error } = await supabase.from("operation_drafts").upsert(
        {
          user_id: user.id,
          company_id: profile.company_id,
          stage_type: stageType,
          header: header as any,
          rows: rows as any,
        },
        { onConflict: "user_id,stage_type" }
      );
      if (error) {
        console.warn("[draft] autosave failed", error);
        return;
      }
      setLastSavedAt(new Date());
    },
  });

  const clearDraft = async () => {
    if (!user?.id) return;
    await supabase
      .from("operation_drafts")
      .delete()
      .eq("user_id", user.id)
      .eq("stage_type", stageType);
    queryClient.setQueryData(queryKey, null);
    setLastSavedAt(null);
  };

  return {
    draft: draftQuery.data ?? null,
    isLoadingDraft: draftQuery.isLoading,
    saveDraft: (header: H, rows: R[]) => saveMutation.mutate({ header, rows }),
    lastSavedAt,
    clearDraft,
  };
}
