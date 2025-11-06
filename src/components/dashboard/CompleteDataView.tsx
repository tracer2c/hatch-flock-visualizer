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

interface CompleteDataViewProps {
  activeTab: string;
  searchTerm: string;
}

export const CompleteDataView = ({ activeTab, searchTerm }: CompleteDataViewProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompleteData();
  }, []);

  const loadCompleteData = async () => {
    try {
      setLoading(true);

      // Fetch all data with necessary joins
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
          )
        `)
        .order("set_date", { ascending: false });

      const { data: fertilityData, error: fertilityError } = await supabase
        .from("fertility_analysis")
        .select(`
          *,
          batches!inner (
            id,
            batch_number,
            set_date,
            total_eggs_set,
            flocks (
              flock_number,
              flock_name,
              age_weeks,
              house_number
            )
          )
        `);

      const { data: eggPackData, error: eggPackError } = await supabase
        .from("egg_pack_quality")
        .select(`
          *,
          batches!inner (
            id,
            batch_number,
            set_date,
            total_eggs_set,
            flocks (
              flock_number,
              flock_name,
              age_weeks,
              house_number
            )
          )
        `);

      const { data: residueData, error: residueError } = await supabase
        .from("residue_analysis")
        .select(`
          *,
          batches!inner (
            id,
            batch_number,
            set_date,
            total_eggs_set,
            flocks (
              flock_number,
              flock_name,
              age_weeks,
              house_number
            )
          )
        `);

      const { data: qaData, error: qaError } = await supabase
        .from("qa_monitoring")
        .select(`
          *,
          batches!inner (
            id,
            batch_number,
            set_date,
            total_eggs_set,
            flocks (
              flock_number,
              flock_name,
              age_weeks,
              house_number
            )
          )
        `);

      if (batchesError || fertilityError || eggPackError || residueError || qaError) {
        throw new Error("Error fetching data");
      }

      // Combine all data
      const combinedData = [
        ...(batchesData || []).map((batch: any) => ({
          ...batch,
          data_type: 'batch',
          flock_number: batch.flocks?.flock_number,
          flock_name: batch.flocks?.flock_name,
          age_weeks: batch.flocks?.age_weeks,
          house_number: batch.flocks?.house_number,
          machine_number: batch.machines?.machine_number,
          batch_id: batch.id,
        })),
        ...(fertilityData || []).map((f: any) => ({
          ...f,
          data_type: 'fertility',
          batch_id: f.batches.id,
          batch_number: f.batches.batch_number,
          set_date: f.batches.set_date,
          total_eggs_set: f.batches.total_eggs_set,
          flock_number: f.batches.flocks?.flock_number,
          flock_name: f.batches.flocks?.flock_name,
          age_weeks: f.batches.flocks?.age_weeks,
          house_number: f.batches.flocks?.house_number,
        })),
        ...(eggPackData || []).map((e: any) => ({
          ...e,
          data_type: 'egg_pack',
          batch_id: e.batches.id,
          batch_number: e.batches.batch_number,
          set_date: e.batches.set_date,
          total_eggs_set: e.batches.total_eggs_set,
          flock_number: e.batches.flocks?.flock_number,
          flock_name: e.batches.flocks?.flock_name,
          age_weeks: e.batches.flocks?.age_weeks,
          house_number: e.batches.flocks?.house_number,
        })),
        ...(residueData || []).map((r: any) => ({
          ...r,
          data_type: 'residue',
          batch_id: r.batches.id,
          batch_number: r.batches.batch_number,
          set_date: r.batches.set_date,
          total_eggs_set: r.batches.total_eggs_set,
          flock_number: r.batches.flocks?.flock_number,
          flock_name: r.batches.flocks?.flock_name,
          age_weeks: r.batches.flocks?.age_weeks,
          house_number: r.batches.flocks?.house_number,
        })),
        ...(qaData || []).map((q: any) => ({
          ...q,
          data_type: 'qa',
          batch_id: q.batches.id,
          batch_number: q.batches.batch_number,
          set_date: q.batches.set_date,
          total_eggs_set: q.batches.total_eggs_set,
          flock_number: q.batches.flocks?.flock_number,
          flock_name: q.batches.flocks?.flock_name,
          age_weeks: q.batches.flocks?.age_weeks,
          house_number: q.batches.flocks?.house_number,
        })),
      ];

      setData(combinedData);
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
      return <EmbrexHOITab data={data.filter(d => d.data_type === 'batch')} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    case "residue":
      return <ResidueBreakoutTab data={data.filter(d => d.data_type === 'residue')} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    case "egg-pack":
      return <EggPackQualityTab data={data.filter(d => d.data_type === 'egg_pack')} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    case "hatch":
      return <HatchPerformanceTab data={data.filter(d => d.data_type === 'fertility')} searchTerm={searchTerm} />;
    case "qa":
      return <QAMonitoringTab data={data.filter(d => d.data_type === 'qa')} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    default:
      return <AllDataTab data={data} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
  }
};
