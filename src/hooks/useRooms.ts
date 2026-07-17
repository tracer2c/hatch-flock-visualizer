import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type RoomType = 'chick' | 'separator' | 'hatcher' | 'setter' | 'wash' | 'other';

export interface Room {
  id: string;
  company_id: string;
  unit_id: string | null;
  name: string;
  room_type: RoomType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useRooms(unitId?: string | null) {
  return useQuery({
    queryKey: ['rooms', unitId ?? 'all'],
    queryFn: async (): Promise<Room[]> => {
      let q = supabase.from('rooms').select('*').eq('is_active', true).order('name');
      if (unitId) q = q.eq('unit_id', unitId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Room[];
    },
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; room_type: RoomType; unit_id: string | null }) => {
      if (!profile?.company_id) throw new Error('Company not resolved');
      const { data, error } = await supabase
        .from('rooms')
        .insert({ ...input, company_id: profile.company_id })
        .select()
        .single();
      if (error) throw error;
      return data as Room;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Room> & { id: string }) => {
      const { error } = await supabase.from('rooms').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}
