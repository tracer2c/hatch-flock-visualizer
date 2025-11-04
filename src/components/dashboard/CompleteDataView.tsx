import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AllDataTab } from "./AllDataTab";
import { EmbrexHOITab } from "./EmbrexHOITab";
import { ResidueBreakoutTab } from "./ResidueBreakoutTab";
import { EggPackQualityTab } from "./EggPackQualityTab";
import { FertilityAnalysisTab } from "./FertilityAnalysisTab";
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
        .select("*");

      const { data: eggPackData, error: eggPackError } = await supabase
        .from("egg_pack_quality")
        .select("*");

      const { data: residueData, error: residueError } = await supabase
        .from("residue_analysis")
        .select("*");

      const { data: qaData, error: qaError } = await supabase
        .from("qa_monitoring")
        .select("*");

      if (batchesError || fertilityError || eggPackError || residueError || qaError) {
        throw new Error("Error fetching data");
      }

      // Combine all data
      const combinedData = (batchesData || []).map((batch: any) => {
        const fertility = fertilityData?.find((f: any) => f.batch_id === batch.id);
        const eggPack = eggPackData?.find((e: any) => e.batch_id === batch.id);
        const residue = residueData?.find((r: any) => r.batch_id === batch.id);
        const qa = qaData?.find((q: any) => q.batch_id === batch.id);

        return {
          ...batch,
          flock_number: batch.flocks?.flock_number,
          flock_name: batch.flocks?.flock_name,
          age_weeks: batch.flocks?.age_weeks,
          house_number: batch.flocks?.house_number,
          machine_number: batch.machines?.machine_number,
          ...fertility,
          cracked: eggPack?.cracked,
          dirty: eggPack?.dirty,
          small: eggPack?.small,
          large: eggPack?.large,
          grade_a: eggPack?.grade_a,
          grade_b: eggPack?.grade_b,
          grade_c: eggPack?.grade_c,
          weight_avg: eggPack?.weight_avg,
          shell_thickness_avg: eggPack?.shell_thickness_avg,
          inspector_name: eggPack?.inspector_name,
          notes: eggPack?.notes,
          epq_sample_size: eggPack?.sample_size,
          ...residue,
          residue_sample_size: residue?.sample_size,
          ...qa,
        };
      });

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
    case "all":
      return <AllDataTab data={data} searchTerm={searchTerm} />;
    case "embrex":
      return <EmbrexHOITab data={data} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    case "residue":
      return <ResidueBreakoutTab data={data} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    case "egg-pack":
      return <EggPackQualityTab data={data} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    case "hatch":
      return <FertilityAnalysisTab data={data} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    case "qa":
      return <QAMonitoringTab data={data} searchTerm={searchTerm} onDataUpdate={loadCompleteData} />;
    default:
      return <AllDataTab data={data} searchTerm={searchTerm} />;
  }
};
