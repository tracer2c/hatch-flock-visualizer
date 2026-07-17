import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ResidueDataEntry from "@/components/dashboard/ResidueDataEntry";
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
import { useOfflineSubmit } from "@/hooks/useOfflineSubmit";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function FlockResidueEntryPage() {
  const { flockKey = "" } = useParams<{ flockKey: string }>();
  const [params] = useSearchParams();
  const weekParam = params.get("week");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const { submit: offlineSubmit } = useOfflineSubmit("residue_analysis", {
    invalidateQueries: ["residue_analysis", "dataCounts", "houses"],
  });
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
  const loadRows = async (bid: string) => {
    const { data, error } = await supabase
      .from("residue_analysis")
      .select("*")
      .eq("batch_id", bid);
    if (error) {
      toast({ title: "Load error", description: error.message, variant: "destructive" });
      return;
    }
    const transformed = (data || []).map((db) => {
      const TOTAL = db.sample_size || 648;
      const pct = (v: number) => Number(((v / TOTAL) * 100).toFixed(2));
      return {
        id: db.id,
        name: ctx.flockName,
        flockNumber: Number(ctx.flockNumber) || 0,
        houseNumber: Number(activeBatch?.house_number) || 1,
        infertile: db.infertile_eggs || 0,
        infertilePercent: pct(db.infertile_eggs || 0),
        chicks:
          TOTAL - (db.infertile_eggs || 0) - (db.early_dead || 0) -
          (db.mid_dead || 0) - (db.late_dead || 0) - (db.malformed_chicks || 0) -
          (db.live_pip_number || 0) - (db.dead_pip_number || 0),
        earlyDeath: db.early_dead || 0,
        earlyDeathPercent: pct(db.early_dead || 0),
        live: 0, livePercent: 0, dead: 0, deadPercent: 0,
        midDeath: db.mid_dead || 0, midDeathPercent: pct(db.mid_dead || 0),
        lateDeath: db.late_dead || 0, lateDeathPercent: pct(db.late_dead || 0),
        cullChicks: db.malformed_chicks || 0,
        handlingCracks: db.handling_cracks || 0, handlingCracksPercent: pct(db.handling_cracks || 0),
        transferCrack: db.transfer_crack || 0, transferCrackPercent: pct(db.transfer_crack || 0),
        contamination: db.contaminated_eggs || 0, contaminationPercent: pct(db.contaminated_eggs || 0),
        mold: db.mold || 0, moldPercent: pct(db.mold || 0),
        abnormal: db.abnormal || 0, abnormalPercent: pct(db.abnormal || 0),
        brain: db.brain_defects || 0, brainPercent: pct(db.brain_defects || 0),
        dryEgg: db.dry_egg || 0, dryEggPercent: pct(db.dry_egg || 0),
        malpositioned: db.malpositioned || 0, malpositionedPercent: pct(db.malpositioned || 0),
        upsideDown: db.upside_down || 0, upsideDownPercent: pct(db.upside_down || 0),
        livePipNumber: db.live_pip_number || 0,
        deadPipNumber: db.dead_pip_number || 0,
        pipNumber: db.pip_number || 0,
        totalEggs: TOTAL,
        sampleSize: db.sample_size || 648,
        fertileEggs: db.fertile_eggs || 0,
        hatchPercent: db.hatch_percent || 0,
        hofPercent: db.hof_percent || 0,
        hoiPercent: db.hoi_percent || 0,
        ifDevPercent: db.if_dev_percent || 0,
        technicianName: db.lab_technician || "",
        notes: db.notes || "",
      };
    });
    setRows(transformed);
  };

  useEffect(() => {
    if (batchId) loadRows(batchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const handleUpdate = async (newData: any[]) => {
    if (!batchId) return;
    for (const record of newData) {
      const rec = {
        id: (record.id?.startsWith("temp-") || /^\d+$/.test(record.id || ""))
          ? undefined
          : record.id,
        batch_id: batchId,
        sample_size: record.sampleSize || 648,
        infertile_eggs: record.infertile || 0,
        fertile_eggs: record.fertileEggs || 0,
        early_dead: record.earlyDeath || 0,
        mid_dead: record.midDeath || 0,
        late_dead: record.lateDeath || 0,
        live_pip_number: record.livePipNumber || 0,
        dead_pip_number: record.deadPipNumber || 0,
        pip_number: record.pipNumber || 0,
        malformed_chicks: record.cullChicks || 0,
        contaminated_eggs: record.contamination || 0,
        handling_cracks: record.handlingCracks || 0,
        transfer_crack: record.transferCrack || 0,
        mold: record.mold || 0,
        abnormal: record.abnormal || 0,
        brain_defects: record.brain || 0,
        dry_egg: record.dryEgg || 0,
        malpositioned: record.malpositioned || 0,
        upside_down: record.upsideDown || 0,
        total_residue_count:
          (record.earlyDeath || 0) + (record.midDeath || 0) +
          (record.lateDeath || 0) + (record.cullChicks || 0),
        hatch_percent: record.hatchPercent,
        hof_percent: record.hofPercent,
        hoi_percent: record.hoiPercent,
        if_dev_percent: record.ifDevPercent,
        lab_technician: record.technicianName || null,
        notes: record.notes || null,
        analysis_date: new Date().toISOString().split("T")[0],
      };
      try {
        await offlineSubmit(rec, "upsert", { batchId, serverId: rec.id });
      } catch (e: any) {
        toast({ title: "Save error", description: e.message, variant: "destructive" });
        return;
      }
    }
    if (isOnline) await loadRows(batchId);
    toast({
      title: isOnline ? "Residue saved" : "Saved offline",
      description:
        houseSel === WHOLE_FLOCK_VALUE
          ? "Recorded for the flock (default house)"
          : `Recorded for House ${activeBatch?.house_number || "—"}`,
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
          title="Residue Analysis"
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
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
                title="Residue — Whole Flock Entry"
                icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
                table="flock_weekly_residue"
                companyId={profile?.company_id ?? null}
                flockId={ctx.flockId}
                flockName={ctx.flockName}
                flockNumber={ctx.flockNumber}
                periodStart={ctx.periodStart}
                periodEnd={ctx.periodEnd}
                fields={[
                  { key: "sample_size", label: "Sample Size" },
                  { key: "infertile_eggs", label: "Infertile" },
                  { key: "early_dead", label: "Early Dead" },
                  { key: "mid_dead", label: "Mid Dead" },
                  { key: "late_dead", label: "Late Dead" },
                  { key: "live_pip_number", label: "Live Pip" },
                  { key: "dead_pip_number", label: "Dead Pip" },
                  { key: "malformed_chicks", label: "Culls" },
                  { key: "contaminated_eggs", label: "Contaminated" },
                ]}
              />
            ) : activeBatch ? (
              <ResidueDataEntry
                data={rows}
                onDataUpdate={handleUpdate}
                batchInfo={{
                  id: activeBatch.id,
                  batch_number: `${ctx.flockName} #${activeBatch.house_number || "—"}`,
                  flock_name: ctx.flockName,
                  flock_number: Number(ctx.flockNumber) || 0,
                  house_number: activeBatch.house_number,
                  eggs_injected: activeBatch.eggs_injected ?? 0,
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
