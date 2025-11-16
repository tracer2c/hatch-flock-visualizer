import { supabase } from '@/integrations/supabase/client';

export interface FlockChange {
  field_changed: string;
  old_value: string;
  new_value: string;
}

export class FlockHistoryService {
  static async logFlockUpdate(
    flockId: string,
    changes: FlockChange[],
    userId: string,
    technicianName: string
  ) {
    const historyEntries = changes.map(change => ({
      flock_id: flockId,
      change_type: 'update',
      changed_by: userId,
      field_changed: change.field_changed,
      old_value: change.old_value,
      new_value: change.new_value,
      notes: `Updated by ${technicianName}`
    }));

    const { error } = await supabase
      .from('flock_history')
      .insert(historyEntries);

    if (error) {
      console.error('Error logging flock history:', error);
    }
  }

  static async logFlockCreation(flockId: string, userId: string, technicianName: string) {
    const { error } = await supabase
      .from('flock_history')
      .insert({
        flock_id: flockId,
        change_type: 'create',
        changed_by: userId,
        field_changed: 'flock',
        old_value: null,
        new_value: 'created',
        notes: `Created by ${technicianName || 'system'}`
      });

    if (error) {
      console.error('Error logging flock creation:', error);
    }
  }

  static async getFlockHistory(flockId: string) {
    const { data, error } = await supabase
      .from('flock_history')
      .select(`
        *,
        user_profiles!flock_history_changed_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('flock_id', flockId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching flock history:', error);
      return [];
    }

    return data;
  }
}
