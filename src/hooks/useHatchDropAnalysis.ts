import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays } from 'date-fns';

export interface HatchDropBatch {
  id: string;
  batchNumber: string;
  flockName: string;
  flockNumber: number;
  breed: string;
  houseNumber: string;
  unitName: string;
  age: number;
  totalEggs: number;
  setDate: string;
  actualHatch: number;
  expectedHatch: number;
  hatchDrop: number;
  fertility: number;
  hof: number;
  earlyDead: number;
  lateDead: number;
  avgTemp: number;
  avgHumidity: number;
  qualityScore: number;
  residuePercent: number;
  daysSinceSet: number;
}

export interface HatchDropAnalysis {
  underperformingBatch: HatchDropBatch;
  similarBatches: HatchDropBatch[];
  factors: {
    name: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    difference: number;
    unit: string;
    description: string;
  }[];
  insights: {
    primaryCause: string;
    recommendations: string[];
    confidenceScore: number;
  };
}

export const useHatchDropAnalysis = (batchId?: string) => {
  return useQuery({
    queryKey: ['hatch-drop-analysis', batchId],
    queryFn: async (): Promise<HatchDropAnalysis | null> => {
      if (!batchId) return null;

      // Get the target batch with full data
      const { data: targetBatchData, error: targetError } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          total_eggs_set,
          set_date,
          unit_id,
          flocks (
            flock_name,
            flock_number,
            age_weeks,
            breed,
            house_number
          ),
          units (
            name
          ),
          fertility_analysis (
            fertility_percent,
            hatch_percent,
            hof_percent,
            early_dead,
            late_dead,
            sample_size
          ),
          qa_monitoring (
            temperature,
            humidity,
            day_of_incubation
          ),
          egg_pack_quality (
            grade_a,
            grade_b,
            grade_c,
            cracked,
            dirty,
            sample_size
          ),
          residue_analysis (
            residue_percent,
            total_residue_count
          )
        `)
        .eq('id', batchId)
        .single();

      if (targetError || !targetBatchData) {
        throw new Error('Batch not found');
      }

      const fertility = targetBatchData.fertility_analysis?.[0];
      const qaData = targetBatchData.qa_monitoring || [];
      const eggQuality = targetBatchData.egg_pack_quality?.[0];
      const residue = targetBatchData.residue_analysis?.[0];

      if (!fertility || typeof fertility.hatch_percent !== 'number') {
        throw new Error('Fertility analysis data required for hatch drop analysis');
      }

      // Calculate expected hatch rate based on breed and age standards
      const breedStandards: Record<string, number> = {
        'ross_308': 88,
        'cobb_500': 87,
        'hubbard': 85,
        'arbor_acres': 86,
        'hy_line': 90,
        'lohmann': 89,
        'isa_brown': 88,
        'h_n': 87
      };

      const baseExpectedHatch = breedStandards[targetBatchData.flocks?.breed?.toLowerCase() || ''] || 85;
      const ageAdjustment = targetBatchData.flocks?.age_weeks ? 
        Math.max(-5, Math.min(5, (45 - targetBatchData.flocks.age_weeks) * 0.2)) : 0;
      const expectedHatch = baseExpectedHatch + ageAdjustment;

      const actualHatch = fertility.hatch_percent;
      const hatchDrop = expectedHatch - actualHatch;

      // Only analyze if there's a significant drop (>5%)
      if (hatchDrop < 5) {
        return null;
      }

      // Calculate metrics for target batch
      const targetBatch: HatchDropBatch = {
        id: targetBatchData.id,
        batchNumber: targetBatchData.batch_number,
        flockName: targetBatchData.flocks?.flock_name || 'Unknown',
        flockNumber: targetBatchData.flocks?.flock_number || 0,
        breed: targetBatchData.flocks?.breed || 'unknown',
        houseNumber: targetBatchData.flocks?.house_number || 'N/A',
        unitName: targetBatchData.units?.name || 'Unknown',
        age: targetBatchData.flocks?.age_weeks || 0,
        totalEggs: targetBatchData.total_eggs_set,
        setDate: targetBatchData.set_date,
        actualHatch,
        expectedHatch,
        hatchDrop,
        fertility: fertility.fertility_percent || 0,
        hof: fertility.hof_percent || 0,
        earlyDead: fertility.early_dead || 0,
        lateDead: fertility.late_dead || 0,
        avgTemp: qaData.length > 0 ? qaData.reduce((sum, qa) => sum + (qa.temperature || 0), 0) / qaData.length : 0,
        avgHumidity: qaData.length > 0 ? qaData.reduce((sum, qa) => sum + (qa.humidity || 0), 0) / qaData.length : 0,
        qualityScore: eggQuality ? ((eggQuality.grade_a + eggQuality.grade_b) / eggQuality.sample_size) * 100 : 0,
        residuePercent: residue?.residue_percent || 0,
        daysSinceSet: differenceInDays(new Date(), new Date(targetBatchData.set_date))
      };

      // Find all comparable batches for relative performance analysis
      const { data: comparisonBatches, error: compError } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          total_eggs_set,
          set_date,
          unit_id,
          flocks (
            flock_name,
            flock_number,
            age_weeks,
            breed,
            house_number
          ),
          units (
            name
          ),
          fertility_analysis (
            fertility_percent,
            hatch_percent,
            hof_percent,
            early_dead,
            late_dead,
            sample_size
          ),
          qa_monitoring (
            temperature,
            humidity,
            day_of_incubation
          ),
          egg_pack_quality (
            grade_a,
            grade_b,
            grade_c,
            cracked,
            dirty,
            sample_size
          ),
          residue_analysis (
            residue_percent,
            total_residue_count
          )
        `)
        .neq('id', batchId)
        .eq('status', 'completed')
        .gte('set_date', format(subDays(new Date(), 180), 'yyyy-MM-dd'))
        .not('fertility_analysis', 'is', null)
        .order('set_date', { ascending: false })
        .limit(100);

      if (compError) throw compError;

      // Process all batches and calculate actual hatch rates
      const allProcessedBatches = (comparisonBatches || [])
        .map((batch: any) => {
          const fert = batch.fertility_analysis?.[0];
          const qa = batch.qa_monitoring || [];
          const eq = batch.egg_pack_quality?.[0];
          const res = batch.residue_analysis?.[0];

          if (!fert || typeof fert.hatch_percent !== 'number') return null;

          return {
            id: batch.id,
            batchNumber: batch.batch_number,
            flockName: batch.flocks?.flock_name || 'Unknown',
            flockNumber: batch.flocks?.flock_number || 0,
            breed: batch.flocks?.breed || 'unknown',
            houseNumber: batch.flocks?.house_number || 'N/A',
            unitName: batch.units?.name || 'Unknown',
            age: batch.flocks?.age_weeks || 0,
            totalEggs: batch.total_eggs_set,
            setDate: batch.set_date,
            actualHatch: fert.hatch_percent,
            expectedHatch: (breedStandards[batch.flocks?.breed?.toLowerCase() || ''] || 85) + 
                         (batch.flocks?.age_weeks ? Math.max(-5, Math.min(5, (45 - batch.flocks.age_weeks) * 0.2)) : 0),
            hatchDrop: 0,
            fertility: fert.fertility_percent || 0,
            hof: fert.hof_percent || 0,
            earlyDead: fert.early_dead || 0,
            lateDead: fert.late_dead || 0,
            avgTemp: qa.length > 0 ? qa.reduce((sum: number, q: any) => sum + (q.temperature || 0), 0) / qa.length : 0,
            avgHumidity: qa.length > 0 ? qa.reduce((sum: number, q: any) => sum + (q.humidity || 0), 0) / qa.length : 0,
            qualityScore: eq ? ((eq.grade_a + eq.grade_b) / eq.sample_size) * 100 : 0,
            residuePercent: res?.residue_percent || 0,
            daysSinceSet: differenceInDays(new Date(), new Date(batch.set_date))
          };
        })
        .filter((batch): batch is HatchDropBatch => batch !== null);

      // First, try to find batches with similar characteristics (same breed, similar age)
      let candidateBatches = allProcessedBatches.filter(batch => 
        batch.breed === targetBatch.breed && 
        Math.abs(batch.age - targetBatch.age) <= 15
      );

      // If no similar batches found, expand to any breed but similar age
      if (candidateBatches.length < 3) {
        candidateBatches = allProcessedBatches.filter(batch => 
          Math.abs(batch.age - targetBatch.age) <= 20
        );
      }

      // If still not enough, use all available batches
      if (candidateBatches.length < 3) {
        candidateBatches = allProcessedBatches;
      }

      // Sort by hatch rate and take the top 25% as "high-performing"
      candidateBatches.sort((a, b) => b.actualHatch - a.actualHatch);
      const topPercentileCount = Math.max(3, Math.floor(candidateBatches.length * 0.25));
      const similarBatches = candidateBatches.slice(0, topPercentileCount).slice(0, 5);

      // If no comparable batches exist, provide industry standard comparison
      if (similarBatches.length === 0) {
        // Create synthetic comparison based on industry standards
        const industryStandard = {
          avgTemp: 99.5,
          avgHumidity: 58,
          fertility: 85,
          qualityScore: 92,
          earlyDead: 15,
          lateDead: 8,
          residuePercent: 2
        };

        const factors: {
          name: string;
          impact: 'critical' | 'high' | 'medium' | 'low';
          difference: number;
          unit: string;
          description: string;
        }[] = [
          {
            name: 'Temperature Control',
            impact: Math.abs(targetBatch.avgTemp - industryStandard.avgTemp) > 1 ? 'critical' : 'low',
            difference: targetBatch.avgTemp - industryStandard.avgTemp,
            unit: '°F',
            description: `Temperature deviation from industry standard (${industryStandard.avgTemp}°F)`
          },
          {
            name: 'Initial Fertility',
            impact: (industryStandard.fertility - targetBatch.fertility) > 5 ? 'critical' : 'medium',
            difference: targetBatch.fertility - industryStandard.fertility,
            unit: '%',
            description: `Fertility compared to industry average (${industryStandard.fertility}%)`
          }
        ];

        return {
          underperformingBatch: targetBatch,
          similarBatches: [],
          factors,
          insights: {
            primaryCause: 'Insufficient comparison data',
            recommendations: [
              'Collect more historical data for better analysis',
              'Review industry best practices for this breed and age group',
              'Monitor environmental conditions more closely'
            ],
            confidenceScore: 0.4
          }
        };
      }

      // Calculate average metrics for comparison batches
      const avgSimilar = {
        avgTemp: similarBatches.reduce((sum, b) => sum + b.avgTemp, 0) / similarBatches.length,
        avgHumidity: similarBatches.reduce((sum, b) => sum + b.avgHumidity, 0) / similarBatches.length,
        fertility: similarBatches.reduce((sum, b) => sum + b.fertility, 0) / similarBatches.length,
        qualityScore: similarBatches.reduce((sum, b) => sum + b.qualityScore, 0) / similarBatches.length,
        earlyDead: similarBatches.reduce((sum, b) => sum + b.earlyDead, 0) / similarBatches.length,
        lateDead: similarBatches.reduce((sum, b) => sum + b.lateDead, 0) / similarBatches.length,
        residuePercent: similarBatches.reduce((sum, b) => sum + b.residuePercent, 0) / similarBatches.length
      };

      // Analyze factors contributing to hatch drop
      const factors: {
        name: string;
        impact: 'critical' | 'high' | 'medium' | 'low';
        difference: number;
        unit: string;
        description: string;
      }[] = [
        {
          name: 'Temperature Control',
          impact: Math.abs(targetBatch.avgTemp - avgSimilar.avgTemp) > 1 ? 'critical' : 
                 Math.abs(targetBatch.avgTemp - avgSimilar.avgTemp) > 0.5 ? 'high' : 'low',
          difference: targetBatch.avgTemp - avgSimilar.avgTemp,
          unit: '°F',
          description: targetBatch.avgTemp > avgSimilar.avgTemp + 1 ? 
                      'Temperature was significantly higher than optimal batches' :
                      targetBatch.avgTemp < avgSimilar.avgTemp - 1 ?
                      'Temperature was significantly lower than optimal batches' :
                      'Temperature was within acceptable range'
        },
        {
          name: 'Humidity Control',
          impact: Math.abs(targetBatch.avgHumidity - avgSimilar.avgHumidity) > 3 ? 'high' : 
                 Math.abs(targetBatch.avgHumidity - avgSimilar.avgHumidity) > 1.5 ? 'medium' : 'low',
          difference: targetBatch.avgHumidity - avgSimilar.avgHumidity,
          unit: '%',
          description: targetBatch.avgHumidity > avgSimilar.avgHumidity + 3 ? 
                      'Humidity was significantly higher than optimal batches' :
                      targetBatch.avgHumidity < avgSimilar.avgHumidity - 3 ?
                      'Humidity was significantly lower than optimal batches' :
                      'Humidity was within acceptable range'
        },
        {
          name: 'Initial Fertility',
          impact: (avgSimilar.fertility - targetBatch.fertility) > 5 ? 'critical' : 
                 (avgSimilar.fertility - targetBatch.fertility) > 2 ? 'high' : 'low',
          difference: targetBatch.fertility - avgSimilar.fertility,
          unit: '%',
          description: targetBatch.fertility < avgSimilar.fertility - 5 ? 
                      'Initial fertility was significantly lower than comparable batches' :
                      'Initial fertility was within expected range'
        },
        {
          name: 'Egg Quality',
          impact: (avgSimilar.qualityScore - targetBatch.qualityScore) > 10 ? 'high' : 
                 (avgSimilar.qualityScore - targetBatch.qualityScore) > 5 ? 'medium' : 'low',
          difference: targetBatch.qualityScore - avgSimilar.qualityScore,
          unit: '%',
          description: targetBatch.qualityScore < avgSimilar.qualityScore - 10 ? 
                      'Egg quality was significantly lower than comparable batches' :
                      'Egg quality was within acceptable range'
        },
        {
          name: 'Early Embryonic Mortality',
          impact: (targetBatch.earlyDead - avgSimilar.earlyDead) > 10 ? 'critical' : 
                 (targetBatch.earlyDead - avgSimilar.earlyDead) > 5 ? 'high' : 'low',
          difference: targetBatch.earlyDead - avgSimilar.earlyDead,
          unit: 'count',
          description: targetBatch.earlyDead > avgSimilar.earlyDead + 10 ? 
                      'Early embryonic mortality was significantly higher than comparable batches' :
                      'Early embryonic mortality was within expected range'
        }
      ];

      // Generate insights
      const criticalFactors = factors.filter(f => f.impact === 'critical');
      const highImpactFactors = factors.filter(f => f.impact === 'high');

      let primaryCause = 'Multiple factors';
      let recommendations: string[] = [];
      let confidenceScore = 0.6;

      if (criticalFactors.length === 1) {
        primaryCause = criticalFactors[0].name;
        confidenceScore = 0.85;
      } else if (criticalFactors.length > 1) {
        primaryCause = 'Multiple critical factors';
        confidenceScore = 0.75;
      } else if (highImpactFactors.length > 0) {
        primaryCause = highImpactFactors[0].name;
        confidenceScore = 0.70;
      }

      // Generate specific recommendations
      factors.forEach(factor => {
        if (factor.impact === 'critical' || factor.impact === 'high') {
          switch (factor.name) {
            case 'Temperature Control':
              if (factor.difference > 1) {
                recommendations.push('Reduce incubation temperature by 0.5-1°F and monitor closely');
              } else if (factor.difference < -1) {
                recommendations.push('Increase incubation temperature by 0.5-1°F and ensure uniform heating');
              }
              break;
            case 'Humidity Control':
              if (factor.difference > 3) {
                recommendations.push('Reduce humidity levels during incubation period');
              } else if (factor.difference < -3) {
                recommendations.push('Increase humidity levels and check ventilation system');
              }
              break;
            case 'Initial Fertility':
              recommendations.push('Review flock nutrition and breeding management practices');
              break;
            case 'Egg Quality':
              recommendations.push('Improve egg collection, storage, and handling procedures');
              break;
            case 'Early Embryonic Mortality':
              recommendations.push('Review breeder flock health and vaccination protocols');
              break;
          }
        }
      });

      if (recommendations.length === 0) {
        recommendations.push('Monitor environmental conditions more closely during critical development stages');
        recommendations.push('Review standard operating procedures for this breed and age group');
      }

      return {
        underperformingBatch: targetBatch,
        similarBatches,
        factors,
        insights: {
          primaryCause,
          recommendations,
          confidenceScore
        }
      };
    },
    enabled: !!batchId,
  });
};

export const useUnderperformingBatches = () => {
  return useQuery({
    queryKey: ['underperforming-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          set_date,
          status,
          flocks (
            flock_name,
            flock_number,
            breed,
            age_weeks
          ),
          fertility_analysis (
            hatch_percent
          )
        `)
        .eq('status', 'completed')
        .not('fertility_analysis', 'is', null)
        .gte('set_date', format(subDays(new Date(), 90), 'yyyy-MM-dd'))
        .order('set_date', { ascending: false });

      if (error) throw error;

      const breedStandards: Record<string, number> = {
        'ross_308': 88,
        'cobb_500': 87,
        'hubbard': 85,
        'arbor_acres': 86,
        'hy_line': 90,
        'lohmann': 89,
        'isa_brown': 88,
        'h_n': 87
      };

      const processedBatches = (data || [])
        .map((batch: any) => {
          const fertility = batch.fertility_analysis?.[0];
          if (!fertility || typeof fertility.hatch_percent !== 'number') return null;

          return {
            id: batch.id,
            batchNumber: batch.batch_number,
            flockName: batch.flocks?.flock_name || 'Unknown',
            flockNumber: batch.flocks?.flock_number || 0,
            breed: batch.flocks?.breed || 'unknown',
            actualHatch: fertility.hatch_percent,
            setDate: batch.set_date,
            age: batch.flocks?.age_weeks || 0,
            daysSinceSet: differenceInDays(new Date(), new Date(batch.set_date))
          };
        })
        .filter((batch): batch is NonNullable<typeof batch> => batch !== null);

      if (processedBatches.length < 3) {
        return []; // Need at least 3 batches for meaningful comparison
      }

      // Calculate the 75th percentile of hatch rates (top 25% performers)
      const hatchRates = processedBatches.map(b => b.actualHatch).sort((a, b) => b - a);
      const percentile75Index = Math.floor(hatchRates.length * 0.25);
      const benchmark = hatchRates[percentile75Index] || hatchRates[0];

      // Identify batches that are significantly below the 75th percentile
      return processedBatches
        .map(batch => ({
          ...batch,
          expectedHatch: benchmark,
          hatchDrop: benchmark - batch.actualHatch
        }))
        .filter(batch => batch.hatchDrop > 3) // Batches more than 3% below top performers
        .sort((a, b) => b.hatchDrop - a.hatchDrop); // Sort by worst performance first
    },
  });
};