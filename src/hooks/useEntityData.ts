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
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#F472B6', // Pink-400
  '#22D3EE', // Cyan-400
  '#A78BFA', // Violet-400
  '#FB923C', // Orange-400
  '#34D399', // Emerald-400
  '#FBBF24', // Amber-400
  '#F87171', // Red-400
  '#60A5FA', // Blue-400
  '#A3E635', // Lime-400
  '#C084FC', // Purple-400
  '#38BDF8', // Sky-400
  '#4ADE80', // Green-400
  '#FACC15', // Yellow-400
  '#FB7185', // Rose-400
  '#818CF8', // Indigo-400
  '#2DD4BF', // Teal-400
];

// Generate additional colors dynamically for cases with more than 30 entities
const generateColor = (index: number): string => {
  const hue = (index * 137.5) % 360; // Golden angle approximation for good color distribution
  const saturation = 70 + (index % 3) * 10; // Vary saturation: 70%, 80%, 90%
  const lightness = 50 + (index % 4) * 5; // Vary lightness: 50%, 55%, 60%, 65%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const getEntityColor = (index: number): string => {
  if (index < ENTITY_COLORS.length) {
    return ENTITY_COLORS[index];
  }
  return generateColor(index - ENTITY_COLORS.length);
};

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
        color: getEntityColor(index)
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
              color: getEntityColor(index)
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
        color: getEntityColor(index)
      })) || [];

      return options;
    },
  });
};

export const useEntityOptions = (mode: 'flocks' | 'houses' | 'hatcheries') => {
  const flockOptions = useFlockOptions();
  const houseOptions = useHouseOptions();
  const hatcherOptions = useHatcherOptions();

  switch (mode) {
    case 'flocks':
      return flockOptions;
    case 'houses':
      return houseOptions;
    case 'hatcheries':
      return hatcherOptions;
    default:
      return flockOptions;
  }
};