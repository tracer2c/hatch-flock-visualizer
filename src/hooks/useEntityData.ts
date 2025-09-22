import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EntityOption {
  id: string;
  name: string;
  number: number;
  color: string;
}

const ENTITY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8B5CF6',
  '#06B6D4',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#F97316',
  '#6366F1',
];

export const useFlockOptions = () => {
  return useQuery({
    queryKey: ['flock-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flocks')
        .select('id, flock_name, flock_number')
        .order('flock_number');

      if (error) throw error;

      const options: EntityOption[] = data?.map((flock, index) => ({
        id: flock.id,
        name: flock.flock_name,
        number: flock.flock_number,
        color: ENTITY_COLORS[index % ENTITY_COLORS.length]
      })) || [];

      return options;
    },
  });
};

export const useHouseOptions = () => {
  return useQuery({
    queryKey: ['house-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flocks')
        .select('id, flock_name, house_number')
        .not('house_number', 'is', null)
        .order('house_number');

      if (error) throw error;

      // Group by house number and create unique house options
      const houseMap = new Map<string, EntityOption>();
      
      data?.forEach((flock, index) => {
        if (flock.house_number) {
          const houseKey = flock.house_number;
          if (!houseMap.has(houseKey)) {
            houseMap.set(houseKey, {
              id: houseKey,
              name: `House ${houseKey}`,
              number: parseInt(houseKey) || index + 1,
              color: ENTITY_COLORS[index % ENTITY_COLORS.length]
            });
          }
        }
      });

      return Array.from(houseMap.values()).sort((a, b) => a.number - b.number);
    },
  });
};

export const useHatcherOptions = () => {
  return useQuery({
    queryKey: ['hatcher-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, code')
        .order('name');

      if (error) throw error;

      const options: EntityOption[] = data?.map((unit, index) => ({
        id: unit.id,
        name: unit.name,
        number: parseInt(unit.code || '0') || index + 1,
        color: ENTITY_COLORS[index % ENTITY_COLORS.length]
      })) || [];

      return options;
    },
  });
};

export const useEntityOptions = (mode: 'flocks' | 'houses' | 'hatchers') => {
  const flockOptions = useFlockOptions();
  const houseOptions = useHouseOptions();
  const hatcherOptions = useHatcherOptions();

  switch (mode) {
    case 'flocks':
      return flockOptions;
    case 'houses':
      return houseOptions;
    case 'hatchers':
      return hatcherOptions;
    default:
      return flockOptions;
  }
};