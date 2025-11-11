import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BatchStatusRule {
  id: string;
  company_id: string;
  rule_name: string;
  from_status: string;
  to_status: string;
  min_days_after_set: number;
  requires_fertility_data: boolean;
  requires_residue_data: boolean;
  requires_qa_data: boolean;
  min_qa_checks_required: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useBatchStatusRules = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['batch-status-automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batch_status_automation_rules' as any)
        .select('*')
        .order('min_days_after_set', { ascending: true });

      if (error) throw error;
      return data as unknown as BatchStatusRule[];
    },
  });

  const updateRule = useMutation({
    mutationFn: async (rule: Partial<BatchStatusRule> & { id: string }) => {
      const { error } = await supabase
        .from('batch_status_automation_rules' as any)
        .update(rule)
        .eq('id', rule.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-status-automation-rules'] });
      toast({
        title: "Rule updated",
        description: "Automation rule has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runAutomation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('batch-status-automation', {
        body: { trigger: 'manual' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast({
        title: "Automation completed",
        description: `${data.batches_updated} batch(es) updated successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error running automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    rules,
    isLoading,
    updateRule,
    runAutomation,
  };
};

export const useBatchStatusHistory = (batchId?: string) => {
  return useQuery({
    queryKey: ['batch-status-history', batchId],
    queryFn: async () => {
      let query = supabase
        .from('batch_status_history' as any)
        .select(`
          *,
          batches!inner(batch_number),
          user_profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: batchId !== undefined || batchId === undefined,
  });
};
