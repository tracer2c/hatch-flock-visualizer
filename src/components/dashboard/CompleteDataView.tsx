import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AllDataTab } from "./AllDataTab";
import { EmbrexHOITab } from "./EmbrexHOITab";
import { ResidueBreakoutTab } from "./ResidueBreakoutTab";
import { EggPackQualityTab } from "./EggPackQualityTab";
import { FertilityAnalysisTab } from "./FertilityAnalysisTab";
import { HatchPerformanceTab } from "./HatchPerformanceTab";
import { QAMonitoringTab } from "./QAMonitoringTab";
import { calculateChicksHatched, calculateEmbryonicMortality } from "@/utils/hatcheryFormulas";

interface CompleteDataViewProps {
  activeTab: string;
  searchTerm: string;
  filters: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    selectedHatcheries: string[];
    selectedMachines: string[];
    technicianSearch: string;
    dateFrom: string;
    dateTo: string;
    dataType: 'all' | 'original' | 'dummy';
  };
}

export const CompleteDataView = ({ activeTab, searchTerm, filters }: CompleteDataViewProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompleteData();
  }, []);

  const loadCompleteData = async () => {
    try {
      setLoading(true);

      // Fetch all batches with LEFT JOINs to related data
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select(`
          *,
          flocks (
            flock_number,
            flock_name,
            age_weeks,
            house_number
          ),
          machines (
            machine_number
          ),
          units (
            id,
            name
          ),
          fertility_analysis (
            id,
            batch_id,
            analysis_date,
            sample_size,
            fertile_eggs,
            infertile_eggs,
            late_dead,
            cull_chicks,
            fertility_percent,
            hatch_percent,
            hof_percent,
            hoi_percent,
            if_dev_percent,
            technician_name,
            notes,
            created_at
          ),
          residue_analysis (
            id,
            batch_id,
            analysis_date,
            sample_size,
            total_residue_count,
            fertile_eggs,
            infertile_eggs,
            early_dead,
            mid_dead,
            late_dead,
            unhatched_fertile,
            pipped_not_hatched,
            malformed_chicks,
            contaminated_eggs,
            pip_number,
            live_pip_number,
            dead_pip_number,
            handling_cracks,
            transfer_crack,
            mold,
            abnormal,
            brain_defects,
            dry_egg,
            malpositioned,
            upside_down,
            microscopy_results,
            pathology_findings,
            hatch_percent,
            hof_percent,
            hoi_percent,
            if_dev_percent,
            residue_percent,
            lab_technician,
            notes,
            created_at
          ),
          egg_pack_quality (
            *
          ),
          qa_monitoring (
            *
          )
        `)
        .order("set_date", { ascending: false });

      if (batchesError) {
        throw batchesError;
      }

      // Map batches with all their related data
      const enrichedBatches = (batchesData || []).map((batch: any) => {
        // Extract house number from batch_number if not in flocks table
        let houseNumber = batch.flocks?.house_number || '';
        if (!houseNumber && batch.batch_number?.includes('#')) {
          const parts = batch.batch_number.split('#');
          houseNumber = parts[1]?.trim() || '';
        }
        
        return {
          ...batch,
          flock_number: batch.flocks?.flock_number,
          flock_name: batch.flocks?.flock_name,
          age_weeks: batch.flocks?.age_weeks,
          house_number: houseNumber,
          machine_number: batch.machines?.machine_number,
          unit_id: batch.units?.id,
          unit_name: batch.units?.name,
          batch_id: batch.id,
          data_type: batch.data_type || 'original', // Include data_type
        // Flatten fertility data
        fertility_technician_name: batch.fertility_analysis?.[0]?.technician_name,
        fertile_eggs: batch.fertility_analysis?.[0]?.fertile_eggs,
        infertile_eggs: batch.fertility_analysis?.[0]?.infertile_eggs,
        cull_chicks: batch.fertility_analysis?.[0]?.cull_chicks,
        fertility_percent: batch.fertility_analysis?.[0]?.fertility_percent,
        hatch_percent: batch.fertility_analysis?.[0]?.hatch_percent,
        hof_percent: batch.fertility_analysis?.[0]?.hof_percent,
        hoi_percent: batch.fertility_analysis?.[0]?.hoi_percent,
        if_dev_percent: batch.fertility_analysis?.[0]?.if_dev_percent,
        analysis_date: batch.fertility_analysis?.[0]?.analysis_date,
        sample_size: batch.fertility_analysis?.[0]?.sample_size,
        technician_name: batch.fertility_analysis?.[0]?.technician_name,
        fertility_notes: batch.fertility_analysis?.[0]?.notes,
        fertility_id: batch.fertility_analysis?.[0]?.id,
        // Flatten residue data
        lab_technician: batch.residue_analysis?.[0]?.lab_technician,
        total_residue_count: batch.residue_analysis?.[0]?.total_residue_count,
        unhatched_fertile: batch.residue_analysis?.[0]?.unhatched_fertile,
        pipped_not_hatched: batch.residue_analysis?.[0]?.pipped_not_hatched,
        malformed_chicks: batch.residue_analysis?.[0]?.malformed_chicks,
        contaminated_eggs: batch.residue_analysis?.[0]?.contaminated_eggs,
        pip_number: batch.residue_analysis?.[0]?.pip_number,
        live_pip_number: batch.residue_analysis?.[0]?.live_pip_number,
        dead_pip_number: batch.residue_analysis?.[0]?.dead_pip_number,
        early_dead: batch.residue_analysis?.[0]?.early_dead,
        mid_dead: batch.residue_analysis?.[0]?.mid_dead,
        late_dead: batch.residue_analysis?.[0]?.late_dead,
        residue_percent: batch.residue_analysis?.[0]?.residue_percent,
        residue_hatch_percent: batch.residue_analysis?.[0]?.hatch_percent,
        residue_hof_percent: batch.residue_analysis?.[0]?.hof_percent,
        residue_hoi_percent: batch.residue_analysis?.[0]?.hoi_percent,
        residue_if_dev_percent: batch.residue_analysis?.[0]?.if_dev_percent,
        residue_analysis_date: batch.residue_analysis?.[0]?.analysis_date,
        residue_fertile_eggs: batch.residue_analysis?.[0]?.fertile_eggs,
        residue_infertile_eggs: batch.residue_analysis?.[0]?.infertile_eggs,
        residue_notes: batch.residue_analysis?.[0]?.notes,
        residue_sample_size: batch.residue_analysis?.[0]?.sample_size,
        residue_id: batch.residue_analysis?.[0]?.id,
        // Calculate chicks_hatched using standardized formula
        chicks_hatched: (() => {
          const residueSampleSize = batch.residue_analysis?.[0]?.sample_size || 648;
          const residueInfertile = batch.residue_analysis?.[0]?.infertile_eggs || 0;
          const residueEarlyDead = batch.residue_analysis?.[0]?.early_dead || 0;
          const residueMidDead = batch.residue_analysis?.[0]?.mid_dead || 0;
          const residueLateDead = batch.residue_analysis?.[0]?.late_dead || 0;
          const residueCulls = batch.residue_analysis?.[0]?.malformed_chicks || 0;
          const residueLivePips = batch.residue_analysis?.[0]?.live_pip_number || 0;
          const residueDeadPips = batch.residue_analysis?.[0]?.dead_pip_number || 0;
          
          return calculateChicksHatched(
            residueSampleSize, residueInfertile, residueEarlyDead, residueMidDead,
            residueLateDead, residueCulls, residueLivePips, residueDeadPips
          );
        })(),
        // Calculate embryonic_mortality using standardized formula
        embryonic_mortality: (() => {
          const residueEarlyDead = batch.residue_analysis?.[0]?.early_dead || 0;
          const residueMidDead = batch.residue_analysis?.[0]?.mid_dead || 0;
          const residueLateDead = batch.residue_analysis?.[0]?.late_dead || 0;
          const residueLivePips = batch.residue_analysis?.[0]?.live_pip_number || 0;
          const residueDeadPips = batch.residue_analysis?.[0]?.dead_pip_number || 0;
          
          return calculateEmbryonicMortality(
            residueEarlyDead, residueMidDead, residueLateDead, residueLivePips, residueDeadPips
          );
        })(),
        // Residue characteristics
        mold: batch.residue_analysis?.[0]?.mold,
        abnormal: batch.residue_analysis?.[0]?.abnormal,
        malpositioned: batch.residue_analysis?.[0]?.malpositioned,
        upside_down: batch.residue_analysis?.[0]?.upside_down,
        dry_egg: batch.residue_analysis?.[0]?.dry_egg,
        brain_defects: batch.residue_analysis?.[0]?.brain_defects,
        transfer_crack: batch.residue_analysis?.[0]?.transfer_crack,
        handling_cracks: batch.residue_analysis?.[0]?.handling_cracks,
        microscopy_results: batch.residue_analysis?.[0]?.microscopy_results,
        pathology_findings: batch.residue_analysis?.[0]?.pathology_findings,
        // Flatten egg pack data
        inspector_name: batch.egg_pack_quality?.[0]?.inspector_name,
        inspection_date: batch.egg_pack_quality?.[0]?.inspection_date,
        grade_a: batch.egg_pack_quality?.[0]?.grade_a,
        grade_b: batch.egg_pack_quality?.[0]?.grade_b,
        grade_c: batch.egg_pack_quality?.[0]?.grade_c,
        large: batch.egg_pack_quality?.[0]?.large,
        small: batch.egg_pack_quality?.[0]?.small,
        dirty: batch.egg_pack_quality?.[0]?.dirty,
        cracked: batch.egg_pack_quality?.[0]?.cracked,
        weight_avg: batch.egg_pack_quality?.[0]?.weight_avg,
        shell_thickness_avg: batch.egg_pack_quality?.[0]?.shell_thickness_avg,
        egg_pack_sample_size: batch.egg_pack_quality?.[0]?.sample_size,
        egg_pack_notes: batch.egg_pack_quality?.[0]?.notes,
        egg_pack_id: batch.egg_pack_quality?.[0]?.id,
        // Flatten QA data
        qa_inspector_name: batch.qa_monitoring?.[0]?.inspector_name,
        check_date: batch.qa_monitoring?.[0]?.check_date,
        check_time: batch.qa_monitoring?.[0]?.check_time,
        day_of_incubation: batch.qa_monitoring?.[0]?.day_of_incubation,
        temperature: batch.qa_monitoring?.[0]?.temperature,
        humidity: batch.qa_monitoring?.[0]?.humidity,
        co2_level: batch.qa_monitoring?.[0]?.co2_level,
        ventilation_rate: batch.qa_monitoring?.[0]?.ventilation_rate,
        turning_frequency: batch.qa_monitoring?.[0]?.turning_frequency,
        mortality_count: batch.qa_monitoring?.[0]?.mortality_count,
        candling_results: batch.qa_monitoring?.[0]?.candling_results,
        qa_notes: batch.qa_monitoring?.[0]?.notes,
        qa_id: batch.qa_monitoring?.[0]?.id,
        };
      });

      // Apply data type filter
      const filteredBatches = filters.dataType === 'all' 
        ? enrichedBatches 
        : enrichedBatches.filter(batch => batch.data_type === filters.dataType);

      setData(filteredBatches);
    } catch (error) {
      console.error("Error loading complete data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading data...</p>
        </div>
      </div>
    );
  }

  switch (activeTab) {
    case "embrex":
      return <EmbrexHOITab data={data} searchTerm={searchTerm} filters={filters} onDataUpdate={loadCompleteData} />;
    case "residue":
      return <ResidueBreakoutTab data={data} searchTerm={searchTerm} filters={filters} onDataUpdate={loadCompleteData} />;
    case "egg-pack":
      return <EggPackQualityTab data={data} searchTerm={searchTerm} filters={filters} onDataUpdate={loadCompleteData} />;
    case "hatch":
      return <HatchPerformanceTab data={data} searchTerm={searchTerm} filters={filters} onDataUpdate={loadCompleteData} />;
    case "qa":
      return <QAMonitoringTab data={data} searchTerm={searchTerm} filters={filters} onDataUpdate={loadCompleteData} />;
    default:
      return <AllDataTab data={data} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
  }
};
