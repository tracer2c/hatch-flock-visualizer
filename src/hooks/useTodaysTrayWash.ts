import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Phase A — Tray Wash daily-log resume.
 *
 * Fetches today's (or the selected date's) tray-wash row for a given machine,
 * so the entry form can pre-populate what's already been logged that day and
 * let the user continue where they left off.
 *
 * Key: `(machine_id, check_date, candling_results->>type = 'tray_wash')`.
 * If more than one row exists (legacy), we take the most recent.
 */
export interface TrayWashRow {
  id: string;
  check_date: string;
  check_time: string | null;
  updated_at?: string | null;
  created_at: string;
  candling_results: any;
}

export function useTodaysTrayWash(
  machineId: string | null | undefined,
  checkDate: string | null | undefined
) {
  return useQuery({
    queryKey: ['tray-wash-daily', machineId, checkDate],
    enabled: !!machineId && !!checkDate,
    queryFn: async (): Promise<TrayWashRow | null> => {
      const { data, error } = await supabase
        .from('qa_monitoring')
        .select('id, check_date, check_time, created_at, candling_results')
        .eq('machine_id', machineId as string)
        .eq('check_date', checkDate as string)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const parsed = rows
        .map((r) => {
          let cr: any = r.candling_results;
          if (typeof cr === 'string') {
            try {
              cr = JSON.parse(cr);
            } catch {
              cr = null;
            }
          }
          return { ...r, candling_results: cr };
        })
        .filter((r) => r.candling_results?.type === 'tray_wash');
      return (parsed[0] as TrayWashRow) ?? null;
    },
  });
}
