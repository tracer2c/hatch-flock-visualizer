import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useViewMode } from '@/contexts/ViewModeContext';

export interface MachinePerformanceFilters {
  dateFrom?: string;
  dateTo?: string;
  unitId?: string;
  machineType?: 'setter' | 'hatcher' | 'combo';
}

export interface MachinePerformance {
  machineId: string;
  machineNumber: string;
  machineType: string;
  unitName: string | null;
  avgFertility: number;
  avgHOF: number;
  avgHOI: number;
  housesProcessed: number;
  eggsProcessed: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PerformanceSummary {
  setters: {
    avgFertility: number;
    avgHOF: number;
    machineCount: number;
    housesProcessed: number;
  };
  hatchers: {
    avgHOF: number;
    avgHOI: number;
    machineCount: number;
    housesProcessed: number;
  };
  combo: {
    avgFertility: number;
    avgHOF: number;
    machineCount: number;
    housesProcessed: number;
  };
  topPerformers: MachinePerformance[];
  bottomPerformers: MachinePerformance[];
  allMachinePerformance: MachinePerformance[];
}

export const useMachinePerformanceMetrics = (filters: MachinePerformanceFilters) => {
  const { viewMode } = useViewMode();

  return useQuery({
    queryKey: ['machine-performance-metrics', filters, viewMode],
    queryFn: async (): Promise<PerformanceSummary> => {
      // Fetch machines
      let machinesQuery = supabase
        .from('machines')
        .select('id, machine_number, machine_type, unit_id, capacity')
        .eq('data_type', viewMode);

      if (filters.unitId) {
        machinesQuery = machinesQuery.eq('unit_id', filters.unitId);
      }
      if (filters.machineType) {
        machinesQuery = machinesQuery.eq('machine_type', filters.machineType);
      }

      const { data: machines, error: machinesError } = await machinesQuery;
      if (machinesError) throw machinesError;

      // Fetch units for names
      const { data: units } = await supabase.from('units').select('id, name');
      const unitMap = new Map(units?.map(u => [u.id, u.name]) || []);

      // Fetch batches with fertility and residue data
      let batchesQuery = supabase
        .from('batches')
        .select(`
          id,
          machine_id,
          total_eggs_set,
          chicks_hatched,
          status,
          set_date,
          fertility_analysis (
            fertility_percent,
            sample_size
          ),
          residue_analysis (
            hof_percent,
            hoi_percent
          )
        `)
        .eq('data_type', viewMode)
        .in('status', ['completed', 'hatching', 'incubating']);

      if (filters.dateFrom) {
        batchesQuery = batchesQuery.gte('set_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        batchesQuery = batchesQuery.lte('set_date', filters.dateTo);
      }

      const { data: batches, error: batchesError } = await batchesQuery;
      if (batchesError) throw batchesError;

      // Calculate performance per machine
      const machinePerformanceMap = new Map<string, {
        fertilitySum: number;
        hofSum: number;
        hoiSum: number;
        fertilityCount: number;
        hofCount: number;
        hoiCount: number;
        housesProcessed: number;
        eggsProcessed: number;
      }>();

      // Initialize machines
      machines?.forEach(machine => {
        machinePerformanceMap.set(machine.id, {
          fertilitySum: 0,
          hofSum: 0,
          hoiSum: 0,
          fertilityCount: 0,
          hofCount: 0,
          hoiCount: 0,
          housesProcessed: 0,
          eggsProcessed: 0,
        });
      });

      // Aggregate batch data
      batches?.forEach(batch => {
        const perf = machinePerformanceMap.get(batch.machine_id);
        if (!perf) return;

        perf.housesProcessed++;
        perf.eggsProcessed += batch.total_eggs_set || 0;

        const fertility = batch.fertility_analysis as any;
        const residue = batch.residue_analysis as any;

        if (fertility?.fertility_percent != null) {
          perf.fertilitySum += Number(fertility.fertility_percent);
          perf.fertilityCount++;
        }

        if (residue?.hof_percent != null) {
          perf.hofSum += Number(residue.hof_percent);
          perf.hofCount++;
        }

        if (residue?.hoi_percent != null) {
          perf.hoiSum += Number(residue.hoi_percent);
          perf.hoiCount++;
        }
      });

      // Build machine performance array
      const allMachinePerformance: MachinePerformance[] = (machines || []).map(machine => {
        const perf = machinePerformanceMap.get(machine.id)!;
        return {
          machineId: machine.id,
          machineNumber: machine.machine_number,
          machineType: machine.machine_type,
          unitName: unitMap.get(machine.unit_id || '') || null,
          avgFertility: perf.fertilityCount > 0 ? Math.round((perf.fertilitySum / perf.fertilityCount) * 10) / 10 : 0,
          avgHOF: perf.hofCount > 0 ? Math.round((perf.hofSum / perf.hofCount) * 10) / 10 : 0,
          avgHOI: perf.hoiCount > 0 ? Math.round((perf.hoiSum / perf.hoiCount) * 10) / 10 : 0,
          housesProcessed: perf.housesProcessed,
          eggsProcessed: perf.eggsProcessed,
          trend: perf.hofCount > 0 ? (perf.hofSum / perf.hofCount > 80 ? 'up' : perf.hofSum / perf.hofCount > 75 ? 'stable' : 'down') : 'stable',
        };
      });

      // Sort by HOF for top/bottom performers (only machines with data)
      const machinesWithData = allMachinePerformance.filter(m => m.housesProcessed > 0);
      const sortedByHOF = [...machinesWithData].sort((a, b) => b.avgHOF - a.avgHOF);

      const topPerformers = sortedByHOF.slice(0, 3);
      const bottomPerformers = sortedByHOF.slice(-3).reverse();

      // Calculate summary by type
      const setterMachines = allMachinePerformance.filter(m => m.machineType === 'setter');
      const hatcherMachines = allMachinePerformance.filter(m => m.machineType === 'hatcher');
      const comboMachines = allMachinePerformance.filter(m => m.machineType === 'combo');

      const calcAvg = (arr: MachinePerformance[], key: keyof MachinePerformance) => {
        const values = arr.filter(m => (m[key] as number) > 0);
        if (values.length === 0) return 0;
        return Math.round((values.reduce((sum, m) => sum + (m[key] as number), 0) / values.length) * 10) / 10;
      };

      return {
        setters: {
          avgFertility: calcAvg(setterMachines, 'avgFertility'),
          avgHOF: calcAvg(setterMachines, 'avgHOF'),
          machineCount: setterMachines.length,
          housesProcessed: setterMachines.reduce((sum, m) => sum + m.housesProcessed, 0),
        },
        hatchers: {
          avgHOF: calcAvg(hatcherMachines, 'avgHOF'),
          avgHOI: calcAvg(hatcherMachines, 'avgHOI'),
          machineCount: hatcherMachines.length,
          housesProcessed: hatcherMachines.reduce((sum, m) => sum + m.housesProcessed, 0),
        },
        combo: {
          avgFertility: calcAvg(comboMachines, 'avgFertility'),
          avgHOF: calcAvg(comboMachines, 'avgHOF'),
          machineCount: comboMachines.length,
          housesProcessed: comboMachines.reduce((sum, m) => sum + m.housesProcessed, 0),
        },
        topPerformers,
        bottomPerformers,
        allMachinePerformance,
      };
    },
    staleTime: 30000,
  });
};
