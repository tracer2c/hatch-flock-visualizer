import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MachineMetricsFilters {
  dateFrom?: string;
  dateTo?: string;
  unitId?: string;
  machineType?: 'setter' | 'hatcher' | 'combo' | 'all';
  setterMode?: 'single_setter' | 'multi_setter' | 'all';
  machineIds?: string[];
}

export interface MachineWithMetrics {
  id: string;
  machine_number: string;
  machine_type: 'setter' | 'hatcher' | 'combo';
  setter_mode: 'single_setter' | 'multi_setter' | null;
  capacity: number;
  status: string | null;
  location: string | null;
  unit_id: string | null;
  unit_name: string | null;
  utilization_percent: number;
  eggs_loaded: number;
  active_batches: number;
}

export interface MachineKPIs {
  avgSetterUtilization: number;
  avgHatcherUtilization: number;
  housesInSetters: number;
  housesInHatchers: number;
  totalSetterCapacity: number;
  totalHatcherCapacity: number;
  totalSetterEggs: number;
  totalHatcherEggs: number;
}

export const useMachineMetrics = (filters: MachineMetricsFilters) => {
  return useQuery({
    queryKey: ['machine-metrics', filters],
    queryFn: async () => {
      // Fetch machines with unit info
      let machinesQuery = supabase
        .from('machines')
        .select(`
          id,
          machine_number,
          machine_type,
          setter_mode,
          capacity,
          status,
          location,
          unit_id,
          units(name)
        `);

      if (filters.unitId && filters.unitId !== 'all') {
        machinesQuery = machinesQuery.eq('unit_id', filters.unitId);
      }
      if (filters.machineType && filters.machineType !== 'all') {
        machinesQuery = machinesQuery.eq('machine_type', filters.machineType);
      }
      if (filters.setterMode && filters.setterMode !== 'all') {
        machinesQuery = machinesQuery.eq('setter_mode', filters.setterMode);
      }
      if (filters.machineIds && filters.machineIds.length > 0) {
        machinesQuery = machinesQuery.in('id', filters.machineIds);
      }

      const { data: machines, error: machinesError } = await machinesQuery;
      if (machinesError) throw machinesError;

      // Fetch active batches within date range
      let batchesQuery = supabase
        .from('batches')
        .select('id, machine_id, total_eggs_set, status, set_date')
        .in('status', ['in_setter', 'in_hatcher']);

      if (filters.dateFrom) {
        batchesQuery = batchesQuery.gte('set_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        batchesQuery = batchesQuery.lte('set_date', filters.dateTo);
      }

      const { data: batches, error: batchesError } = await batchesQuery;
      if (batchesError) throw batchesError;

      // Calculate metrics per machine
      const machineMetrics: MachineWithMetrics[] = (machines || []).map((machine: any) => {
        const machineBatches = (batches || []).filter(b => b.machine_id === machine.id);
        const eggsLoaded = machineBatches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
        const utilizationPercent = machine.capacity > 0 
          ? Math.min(Math.round((eggsLoaded / machine.capacity) * 100), 100)
          : 0;

        return {
          id: machine.id,
          machine_number: machine.machine_number,
          machine_type: machine.machine_type,
          setter_mode: machine.setter_mode,
          capacity: machine.capacity,
          status: machine.status,
          location: machine.location,
          unit_id: machine.unit_id,
          unit_name: machine.units?.name || null,
          utilization_percent: utilizationPercent,
          eggs_loaded: eggsLoaded,
          active_batches: machineBatches.length,
        };
      });

      // Calculate KPIs
      const setters = machineMetrics.filter(m => m.machine_type === 'setter' || m.machine_type === 'combo');
      const hatchers = machineMetrics.filter(m => m.machine_type === 'hatcher' || m.machine_type === 'combo');

      const totalSetterCapacity = setters.reduce((sum, m) => sum + m.capacity, 0);
      const totalHatcherCapacity = hatchers.reduce((sum, m) => sum + m.capacity, 0);
      
      // Use STATUS only for counting - machine_id may not be updated on transfer
      const setterBatches = (batches || []).filter(b => b.status === 'in_setter');
      const hatcherBatches = (batches || []).filter(b => b.status === 'in_hatcher');

      const totalSetterEggs = setterBatches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);
      const totalHatcherEggs = hatcherBatches.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);

      const avgSetterUtilization = totalSetterCapacity > 0
        ? Math.round((totalSetterEggs / totalSetterCapacity) * 100)
        : 0;
      const avgHatcherUtilization = totalHatcherCapacity > 0
        ? Math.round((totalHatcherEggs / totalHatcherCapacity) * 100)
        : 0;

      const kpis: MachineKPIs = {
        // Show actual utilization percentage (can be >100% if over capacity)
        avgSetterUtilization,
        avgHatcherUtilization,
        housesInSetters: setterBatches.length,
        housesInHatchers: hatcherBatches.length,
        totalSetterCapacity,
        totalHatcherCapacity,
        totalSetterEggs,
        totalHatcherEggs,
      };

      return {
        machines: machineMetrics,
        kpis,
      };
    },
    staleTime: 30000,
  });
};

export const useUnitsForFilter = () => {
  return useQuery({
    queryKey: ['units-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, code')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
};

export interface DailyUtilization {
  date: string;
  setterUtilization: number;
  hatcherUtilization: number;
  setterEggs: number;
  hatcherEggs: number;
}

export interface DailyUtilizationFilters {
  dateFrom: string;
  dateTo: string;
  unitId?: string;
}

export const useDailyUtilizationMetrics = (filters: DailyUtilizationFilters) => {
  return useQuery({
    queryKey: ['daily-utilization-metrics', filters],
    queryFn: async (): Promise<DailyUtilization[]> => {
      // Get all machines for capacity calculation
      let machinesQuery = supabase
        .from('machines')
        .select('id, machine_type, capacity');

      if (filters.unitId) {
        machinesQuery = machinesQuery.eq('unit_id', filters.unitId);
      }

      const { data: machines, error: machinesError } = await machinesQuery;
      if (machinesError) throw machinesError;

      const setterMachineIds = (machines || [])
        .filter(m => m.machine_type === 'setter' || m.machine_type === 'combo')
        .map(m => m.id);
      const hatcherMachineIds = (machines || [])
        .filter(m => m.machine_type === 'hatcher' || m.machine_type === 'combo')
        .map(m => m.id);

      const totalSetterCapacity = (machines || [])
        .filter(m => m.machine_type === 'setter' || m.machine_type === 'combo')
        .reduce((sum, m) => sum + m.capacity, 0);
      const totalHatcherCapacity = (machines || [])
        .filter(m => m.machine_type === 'hatcher' || m.machine_type === 'combo')
        .reduce((sum, m) => sum + m.capacity, 0);

      // Get all batches in date range
      let batchesQuery = supabase
        .from('batches')
        .select('id, machine_id, total_eggs_set, status, set_date, expected_hatch_date')
        .lte('set_date', filters.dateTo)
        .or(`expected_hatch_date.gte.${filters.dateFrom},status.eq.in_setter,status.eq.in_hatcher`);

      if (filters.unitId) {
        batchesQuery = batchesQuery.eq('unit_id', filters.unitId);
      }

      const { data: batches, error: batchesError } = await batchesQuery;
      if (batchesError) throw batchesError;

      // Generate daily data points
      const dailyData: DailyUtilization[] = [];
      const startDate = new Date(filters.dateFrom);
      const endDate = new Date(filters.dateTo);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        // Calculate eggs in setters on this day (days 1-18 of incubation)
        const setterEggs = (batches || [])
          .filter(b => {
            if (!setterMachineIds.includes(b.machine_id)) return false;
            const setDate = new Date(b.set_date);
            const daysSinceSet = Math.floor((d.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceSet >= 0 && daysSinceSet <= 18;
          })
          .reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);

        // Calculate eggs in hatchers on this day (days 19-21)
        const hatcherEggs = (batches || [])
          .filter(b => {
            if (!hatcherMachineIds.includes(b.machine_id)) return false;
            const setDate = new Date(b.set_date);
            const daysSinceSet = Math.floor((d.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceSet >= 19 && daysSinceSet <= 21;
          })
          .reduce((sum, b) => sum + (b.total_eggs_set || 0), 0);

        const setterUtilization = totalSetterCapacity > 0
          ? Math.min(Math.round((setterEggs / totalSetterCapacity) * 100), 100)
          : 0;
        const hatcherUtilization = totalHatcherCapacity > 0
          ? Math.min(Math.round((hatcherEggs / totalHatcherCapacity) * 100), 100)
          : 0;

        dailyData.push({
          date: dateStr,
          setterUtilization,
          hatcherUtilization,
          setterEggs,
          hatcherEggs,
        });
      }

      return dailyData;
    },
    staleTime: 30000,
  });
};
