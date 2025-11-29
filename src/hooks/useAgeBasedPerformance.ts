import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgeRangeService, AGE_RANGES, AgeRange } from '@/services/ageRangeService';

export interface AgeRangeMetrics {
  ageRange: AgeRange;
  label: string;
  color: string;
  batchCount: number;
  avgFertility: number;
  avgHatch: number;
  avgHOF: number;
  avgHOI: number;
  totalMortality: number;
  earlyDeadAvg: number;
  midDeadAvg: number;
  lateDeadAvg: number;
}

export const useAgeBasedPerformance = () => {
  return useQuery({
    queryKey: ['age-based-performance'],
    queryFn: async () => {
      const { data: batches, error } = await supabase
        .from('batches_with_fertility')
        .select(`
          *,
          flocks (
            age_weeks
          ),
          residue_analysis (
            hof_percent,
            hoi_percent,
            early_dead,
            mid_dead,
            late_dead,
            mortality_count
          )
        `)
        .not('fertility_percent', 'is', null);
      
      if (error) throw error;
      
      const customRanges = AgeRangeService.getCustomRanges();
      
      const rangeGroups = customRanges.reduce((acc, range) => {
        acc[range.key] = [];
        return acc;
      }, {} as Record<AgeRange, any[]>);
      
      batches.forEach(batch => {
        if (!batch.flocks?.age_weeks) return;
        
        const ageRange = AgeRangeService.getAgeRange(batch.flocks.age_weeks);
        rangeGroups[ageRange.key].push(batch);
      });
      
      const metrics: AgeRangeMetrics[] = customRanges.map(range => {
        const batchesInRange = rangeGroups[range.key];
        
        if (batchesInRange.length === 0) {
          return {
            ageRange: range.key,
            label: range.label,
            color: range.color,
            batchCount: 0,
            avgFertility: 0,
            avgHatch: 0,
            avgHOF: 0,
            avgHOI: 0,
            totalMortality: 0,
            earlyDeadAvg: 0,
            midDeadAvg: 0,
            lateDeadAvg: 0
          };
        }
        
        const avgFertility = batchesInRange.reduce((sum, b) => 
          sum + (b.fertility_percent || 0), 0) / batchesInRange.length;
        
        const avgHatch = batchesInRange.reduce((sum, b) => 
          sum + (b.hatch_percent || 0), 0) / batchesInRange.length;
        
        const avgHOF = batchesInRange.reduce((sum, b) => {
          const residue = b.residue_analysis?.[0];
          return sum + (residue?.hof_percent || 0);
        }, 0) / batchesInRange.length;
        
        const avgHOI = batchesInRange.reduce((sum, b) => {
          const residue = b.residue_analysis?.[0];
          return sum + (residue?.hoi_percent || 0);
        }, 0) / batchesInRange.length;
        
        const totalMortality = batchesInRange.reduce((sum, b) => {
          const residue = b.residue_analysis?.[0];
          return sum + (residue?.mortality_count || 0);
        }, 0);
        
        const earlyDeadAvg = batchesInRange.reduce((sum, b) => {
          const residue = b.residue_analysis?.[0];
          return sum + (residue?.early_dead || 0);
        }, 0) / batchesInRange.length;
        
        const midDeadAvg = batchesInRange.reduce((sum, b) => {
          const residue = b.residue_analysis?.[0];
          return sum + (residue?.mid_dead || 0);
        }, 0) / batchesInRange.length;
        
        const lateDeadAvg = batchesInRange.reduce((sum, b) => {
          const residue = b.residue_analysis?.[0];
          return sum + (residue?.late_dead || 0);
        }, 0) / batchesInRange.length;
        
        return {
          ageRange: range.key,
          label: range.label,
          color: range.color,
          batchCount: batchesInRange.length,
          avgFertility: Number(avgFertility.toFixed(2)),
          avgHatch: Number(avgHatch.toFixed(2)),
          avgHOF: Number(avgHOF.toFixed(2)),
          avgHOI: Number(avgHOI.toFixed(2)),
          totalMortality,
          earlyDeadAvg: Number(earlyDeadAvg.toFixed(2)),
          midDeadAvg: Number(midDeadAvg.toFixed(2)),
          lateDeadAvg: Number(lateDeadAvg.toFixed(2))
        };
      });
      
      return metrics;
    },
    refetchInterval: 60000
  });
};
