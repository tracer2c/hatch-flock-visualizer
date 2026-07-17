import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Egg } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FertilityDataEntry from "@/components/dashboard/FertilityDataEntry";
import { useFlockWeekBatches } from "@/hooks/useFlockWeekBatches";
import { FlockEntryHeader } from "@/components/dashboard/FlockEntryHeader";
import {
  HouseSelectField,
  WHOLE_FLOCK_VALUE,
  resolveBatchId,
  isWholeFlock,
} from "@/components/dashboard/HouseSelectField";
import { FlockWeeklyEntryCard } from "@/components/dashboard/FlockWeeklyEntryCard";
import { useAuth } from "@/hooks/useAuth";

export default function FlockFertilityEntryPage() {
  const { flockKey = "" } = useParams<{ flockKey: string }>();
  const [params] = useSearchParams();
  const weekParam = params.get("week");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const ctx = useFlockWeekBatches(flockKey, weekParam);
  const [houseSel, setHouseSel] = useState<string>(WHOLE_FLOCK_VALUE);
  const wholeFlock = isWholeFlock(houseSel);
  const batchId = useMemo(
    () => resolveBatchId(houseSel, ctx.batches),
    [houseSel, ctx.batches]
  );
  const activeBatch = ctx.batches.find((b) => b.id === batchId) ?? null;

  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!batchId) {
      setRows([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("fertility_analysis")
        .select("*")
        .eq("batch_id", batchId);
      if (error) toast({ title: "Load error", description: error.message, variant: "destructive" });
      else setRows(data || []);
    })();
  }, [batchId, toast]);

  const handleUpdate = async (newData: any[]) => {
    if (!batchId) return;
    setRows(newData.map((r) => ({ ...r, batch_id: batchId })));
    toast({
      title: "Fertility saved",
      description: `Recorded for House ${activeBatch?.house_number || "—"}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Weekly Flock Rollup
        </Button>

        <FlockEntryHeader
          ctx={ctx}
          title="Fertility Analysis"
          icon={<Egg className="h-5 w-5 text-primary" />}
        />

        {ctx.isLoading ? (
          <Card><CardContent className="p-8 text-center">Loading…</CardContent></Card>
        ) : ctx.batches.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No houses found for this flock in the selected week.
          </CardContent></Card>
        ) : (
          <>
            <HouseSelectField
              batches={ctx.batches}
              value={houseSel}
              onChange={setHouseSel}
            />
            {wholeFlock ? (
              <FlockWeeklyEntryCard
                title="Fertility — Whole Flock Entry"
                icon={<Egg className="h-5 w-5 text-primary" />}
                table="flock_weekly_fertility"
                companyId={profile?.company_id ?? null}
                flockId={ctx.flockId}
                flockName={ctx.flockName}
                flockNumber={ctx.flockNumber}
                periodStart={ctx.periodStart}
                periodEnd={ctx.periodEnd}
                fields={[
                  { key: "sample_size", label: "Sample Size" },
                  { key: "fertile_eggs", label: "Fertile Eggs" },
                  { key: "infertile_eggs", label: "Infertile Eggs" },
                  { key: "early_dead", label: "Early Dead" },
                  { key: "late_dead", label: "Late Dead" },
                ]}
              />
            ) : activeBatch ? (
              <FertilityDataEntry
                data={rows}
                onDataUpdate={handleUpdate}
                batchInfo={{
                  id: activeBatch.id,
                  batch_number: `${ctx.flockName} #${activeBatch.house_number || "—"}`,
                  flock_name: ctx.flockName,
                  flock_number: Number(ctx.flockNumber) || 0,
                  set_date: activeBatch.set_date,
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
