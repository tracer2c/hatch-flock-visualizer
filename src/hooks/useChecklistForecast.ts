import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

/**
 * A single task occurrence: one checklist item due on one batch on one calendar day.
 */
export interface ForecastTask {
  batchId: string;
  batchNumber: string;
  flockName: string;
  flockNumber: number | string;
  houseNumber: string | number | null;
  unitId: string | null;
  unitName: string;
  machineNumber: string | null;
  date: string;            // YYYY-MM-DD
  dayLabel: string;        // e.g. "Mon, Jun 16"
  dayOfIncubation: number;
  itemId: string;
  task: string;
  description: string | null;
  category: string | null;
  isRequired: boolean;
  status: 'Completed' | 'Pending';
  completedBy: string | null;
  completedAt: string | null;
}

interface ForecastInput {
  activeBatches: any[] | undefined;
  units: { id: string; name: string }[];
  horizonDays: number;
  hatcheryFilter: string; // unit id or "all"
}

/**
 * Pull everything needed to compute a multi-day checklist forecast:
 * batch-type checklist items + already-recorded completions (so the export
 * can show what's done vs. still pending).
 */
export function useChecklistForecastData() {
  const itemsQuery = useQuery({
    queryKey: ['forecast-checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checklist_items')
        .select('*')
        .or('target_type.eq.batch,target_type.is.null')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const completionsQuery = useQuery({
    queryKey: ['forecast-checklist-completions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_completions')
        .select('checklist_item_id, batch_id, day_of_incubation, completed_by, completed_at')
        .not('batch_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  return {
    items: itemsQuery.data,
    completions: completionsQuery.data,
    isLoading: itemsQuery.isLoading || completionsQuery.isLoading,
  };
}

/**
 * Build the flat list of forecast tasks for the given horizon + hatchery.
 * Pure function so the export tab can call it directly with already-loaded data.
 */
export function buildForecastTasks(
  input: ForecastInput,
  items: any[] | undefined,
  completions: any[] | undefined
): ForecastTask[] {
  const { activeBatches, units, horizonDays, hatcheryFilter } = input;
  if (!activeBatches || !items) return [];

  const unitName = (id: string | null) =>
    units.find((u) => u.id === id)?.name || 'Unassigned';

  // Index completions by `${itemId}|${batchId}|${day}` for O(1) lookup
  const completionMap = new Map<string, any>();
  (completions || []).forEach((c) => {
    completionMap.set(`${c.checklist_item_id}|${c.batch_id}|${c.day_of_incubation}`, c);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const batches = activeBatches.filter(
    (b) => hatcheryFilter === 'all' || b.unit_id === hatcheryFilter
  );

  const tasks: ForecastTask[] = [];

  for (const batch of batches) {
    if (!batch.set_date) continue;
    const setDate = new Date(batch.set_date);
    setDate.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < horizonDays; offset++) {
      const calDate = addDays(today, offset);
      const dayOfIncubation =
        Math.floor((calDate.getTime() - setDate.getTime()) / 86400000) + 1;

      // Skip days outside a sensible incubation window
      if (dayOfIncubation < 1 || dayOfIncubation > 21) continue;

      const dueItems = items.filter((it) =>
        Array.isArray(it.applicable_days) && it.applicable_days.includes(dayOfIncubation)
      );

      for (const it of dueItems) {
        const key = `${it.id}|${batch.id}|${dayOfIncubation}`;
        const completion = completionMap.get(key);
        tasks.push({
          batchId: batch.id,
          batchNumber: batch.batch_number,
          flockName: batch.flocks?.flock_name || 'Unknown',
          flockNumber: batch.flocks?.flock_number ?? '',
          houseNumber: batch.flocks?.house_number ?? null,
          unitId: batch.unit_id ?? null,
          unitName: unitName(batch.unit_id ?? null),
          machineNumber: batch.machines?.machine_number ?? null,
          date: format(calDate, 'yyyy-MM-dd'),
          dayLabel: format(calDate, 'EEE, MMM d'),
          dayOfIncubation,
          itemId: it.id,
          task: it.title,
          description: it.description ?? null,
          category: it.sop_templates?.category ?? null,
          isRequired: !!it.is_required,
          status: completion ? 'Completed' : 'Pending',
          completedBy: completion?.completed_by ?? null,
          completedAt: completion?.completed_at ?? null,
        });
      }
    }
  }

  // Sort: house → date → required first → task
  tasks.sort((a, b) => {
    if (a.batchNumber !== b.batchNumber) return a.batchNumber.localeCompare(b.batchNumber);
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
    return a.task.localeCompare(b.task);
  });

  return tasks;
}
