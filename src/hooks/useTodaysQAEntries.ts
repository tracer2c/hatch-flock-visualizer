import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Phase B — Shared "today's log" fetcher for QA daily entries.
 *
 * Loads every qa_monitoring row for a given machine + check_date, then
 * filters by the `candling_results.type` discriminator (e.g. 'rectal_temperature',
 * 'cull_check', 'hatch_progression', 'setter_angles', 'humidity').
 *
 * Supports room-scope (machineId is null, entry_mode='room') so process/room
 * tabs can list their entries too.
 */
export interface TodaysQAEntry {
  id: string;
  check_date: string;
  check_time: string | null;
  created_at: string;
  inspector_name: string | null;
  temperature: number | null;
  humidity: number | null;
  candling_results: any;
}

export function useTodaysQAEntries(
  machineId: string | null | undefined,
  checkDate: string | null | undefined,
  type: string | string[],
  options?: { entryMode?: 'house' | 'machine' | 'room' }
) {
  const types = Array.isArray(type) ? type : [type];
  const entryMode = options?.entryMode;
  const isRoomScope = entryMode === 'room';

  return useQuery({
    queryKey: ['todays-qa-entries', machineId ?? null, checkDate, types.join(','), entryMode ?? null],
    enabled: !!checkDate && (!!machineId || isRoomScope),
    queryFn: async (): Promise<TodaysQAEntry[]> => {
      let query = supabase
        .from('qa_monitoring')
        .select('id, check_date, check_time, created_at, inspector_name, temperature, humidity, candling_results')
        .eq('check_date', checkDate as string)
        .order('created_at', { ascending: false })
        .limit(100);

      if (isRoomScope) {
        query = query.is('machine_id', null).eq('entry_mode', 'room');
      } else if (machineId) {
        query = query.eq('machine_id', machineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((r) => {
          let cr = r.candling_results;
          if (typeof cr === 'string') {
            try { cr = JSON.parse(cr); } catch { cr = null; }
          }
          return { ...r, candling_results: cr } as TodaysQAEntry;
        })
        .filter((r) => r.candling_results && types.includes(r.candling_results.type));
    },
  });
}
