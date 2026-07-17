import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDays, format, startOfWeek } from "date-fns";
import { ArrowLeft, Egg, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { useDayScopedEntry } from "@/hooks/useDayScopedEntry";
import {
  useSaveFlockTotalsToBatches,
  useFlockWeeklyClearsMap,
} from "@/hooks/useFlockWeeklyClears";
import { formatSetWeekLabel } from "@/hooks/useFlockWeekHouses";
import { normalizeFlockNumber } from "@/utils/dataSheetAggregation";
import { parseLocalDate } from "@/utils/localDate";
import { useQuery } from "@tanstack/react-query";

interface FlockWeekBatch {
  id: string;
  set_date: string;
  house_number: string;
  total_eggs_set: number;
  eggs_injected: number | null;
  chicks_hatched: number | null;
  flock_id: string;
  flock_name: string;
  flock_number: number | string;
}

const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString();

export default function HatchHOIEntryPage() {
  const { flockKey = "" } = useParams<{ flockKey: string }>();
  const [params] = useSearchParams();
  const weekParam = params.get("week");
  const navigate = useNavigate();
  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess("data_entry");

  const weekMonday = weekParam
    ? startOfWeek(parseLocalDate(weekParam)!, { weekStartsOn: 1 })
    : null;
  const periodStart = weekMonday ? format(weekMonday, "yyyy-MM-dd") : "";
  const periodEnd = weekMonday
    ? format(addDays(weekMonday, 6), "yyyy-MM-dd")
    : "";

  const { data: batches = [], isLoading, refetch } = useQuery({
    queryKey: ["hoi-flock-week-batches", flockKey, periodStart, periodEnd],
    enabled: Boolean(flockKey && periodStart && periodEnd),
    queryFn: async (): Promise<FlockWeekBatch[]> => {
      const { data, error } = await supabase
        .from("batches")
        .select(
          `id, set_date, total_eggs_set, eggs_injected, chicks_hatched,
           flocks!inner(id, flock_name, flock_number, house_number)`
        )
        .is("archived_at", null)
        .gte("set_date", periodStart)
        .lte("set_date", periodEnd);
      if (error) throw error;
      const norm = normalizeFlockNumber(flockKey);
      return (data || [])
        .filter((b: any) => normalizeFlockNumber(b.flocks?.flock_number) === norm)
        .map((b: any) => ({
          id: b.id,
          set_date: b.set_date,
          house_number: String(b.flocks?.house_number ?? ""),
          total_eggs_set: Number(b.total_eggs_set) || 0,
          eggs_injected: b.eggs_injected,
          chicks_hatched: b.chicks_hatched,
          flock_id: b.flocks?.id,
          flock_name: b.flocks?.flock_name ?? "",
          flock_number: b.flocks?.flock_number,
        }))
        .sort(
          (a, b) =>
            String(a.house_number).localeCompare(String(b.house_number)) ||
            a.set_date.localeCompare(b.set_date)
        );
    },
  });

  const { byFlock } = useFlockWeeklyClearsMap(periodStart, periodEnd);

  const totalEggsSet = batches.reduce((a, b) => a + (b.total_eggs_set || 0), 0);
  const totalInjected = batches.reduce(
    (a, b) => a + (Number(b.eggs_injected) || 0),
    0
  );
  const existingChicksSum = batches.reduce(
    (a, b) => a + (Number(b.chicks_hatched) || 0),
    0
  );
  const flockId = batches[0]?.flock_id ?? null;
  const flockName = batches[0]?.flock_name ?? "";
  const flockNumber = batches[0]?.flock_number ?? "";
  const existingRow = flockId ? byFlock[flockId] : undefined;

  // Prefill: prefer flock_weekly_clears snapshot; fall back to sum from batches.
  const [chicksInput, setChicksInput] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || isLoading) return;
    if (!batches.length) return;
    const val =
      existingRow?.chicks_hatched != null
        ? existingRow.chicks_hatched
        : existingChicksSum || 0;
    setChicksInput(val ? String(val) : "");
    setNotes(existingRow?.notes ?? "");
    setPrefilled(true);
  }, [prefilled, isLoading, batches.length, existingRow, existingChicksSum]);

  const chicksNum = chicksInput === "" ? null : Number(chicksInput);
  const hoiPct =
    chicksNum != null && totalInjected > 0
      ? (chicksNum / totalInjected) * 100
      : null;
  const hatchPct =
    chicksNum != null && totalEggsSet > 0
      ? (chicksNum / totalEggsSet) * 100
      : null;

  // Day scope: past week → view-only. Use last day of week as the "check date".
  const day = useDayScopedEntry({
    checkDate: weekMonday
      ? format(addDays(weekMonday, 6), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
  });
  const isPastWeek = day.isPastDay;
  const canEdit = !readOnly;

  const [showDetail, setShowDetail] = useState(false);
  const save = useSaveFlockTotalsToBatches();

  const handleSave = async () => {
    if (!flockId) {
      toast.error("No houses found for this flock/week — cannot save.");
      return;
    }
    if (chicksNum == null || Number.isNaN(chicksNum)) {
      toast.error("Enter total chicks hatched.");
      return;
    }
    await save.mutateAsync({
      flock_id: flockId,
      period_start: periodStart,
      period_end: periodEnd,
      eggs_set_total: totalEggsSet,
      chicks_hatched: chicksNum,
      eggs_culled: existingRow?.eggs_culled ?? null,
      eggs_cleared: existingRow?.eggs_cleared ?? null,
      batch_slices: batches.map((b) => ({
        id: b.id,
        total_eggs_set: b.total_eggs_set,
      })),
    });
    toast.success("Hatch / HOI saved for flock/week.");
    await refetch();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <ReadOnlyBanner show={readOnly} />

      <Button variant="ghost" size="sm" onClick={() => navigate("/data-entry")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Weekly Flock Rollup
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Egg className="h-5 w-5 text-primary" />
                Hatch / HOI Entry
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {flockName ? `${flockName} · ` : ""}Flock #{flockNumber || "—"}
              </p>
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">Set Week: </span>
                <span className="font-medium">
                  {formatSetWeekLabel(weekMonday)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {batches.length}{" "}
                {batches.length === 1 ? "house" : "houses"} this week ·
                Recorded at flock level
              </p>
            </div>
            {isPastWeek && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Editing past week
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading…
            </div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No houses found for this flock in the selected week.
            </div>
          ) : (
            <>
              {/* Flock-week totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border bg-muted/30 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Eggs Set
                  </div>
                  <div className="text-xl font-semibold">
                    {fmtInt(totalEggsSet)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Eggs Injected
                  </div>
                  <div className="text-xl font-semibold">
                    {fmtInt(totalInjected)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">HOI %</div>
                  <div className="text-xl font-semibold">
                    {hoiPct == null ? "—" : `${hoiPct.toFixed(2)}%`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Hatch %</div>
                  <div className="text-xl font-semibold">
                    {hatchPct == null ? "—" : `${hatchPct.toFixed(2)}%`}
                  </div>
                </div>
              </div>

              {/* Flock-level entry */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="chicks">Total Chicks Hatched (flock/week)</Label>
                  <Input
                    id="chicks"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={chicksInput}
                    onChange={(e) => setChicksInput(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Enter total chicks hatched"
                  />
                  {totalInjected === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No eggs injected recorded for this flock/week — HOI %
                      cannot be computed until Clears &amp; Injected is entered.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!canEdit}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={!canEdit || save.isPending}
                  >
                    {save.isPending ? "Saving…" : "Save Hatch / HOI"}
                  </Button>
                </div>
              </div>

              {/* Optional per-house breakdown (read-only) */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetail((v) => !v)}
                >
                  {showDetail ? (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  {showDetail
                    ? "Hide per-house breakdown"
                    : "Show per-house breakdown (optional)"}
                </Button>

                {showDetail && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-muted-foreground border-b">
                        <tr>
                          <th className="py-2 pr-3">House</th>
                          <th className="py-2 pr-3">Set Date</th>
                          <th className="py-2 pr-3 text-right">Eggs Set</th>
                          <th className="py-2 pr-3 text-right">Injected</th>
                          <th className="py-2 pr-3 text-right">
                            Chicks (current)
                          </th>
                          <th className="py-2 pr-3 text-right">HOI %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((b) => {
                          const inj = Number(b.eggs_injected) || 0;
                          const ch = Number(b.chicks_hatched) || 0;
                          const pct = inj > 0 ? (ch / inj) * 100 : null;
                          return (
                            <tr key={b.id} className="border-b last:border-0">
                              <td className="py-2 pr-3 font-medium">
                                House {b.house_number || "—"}
                              </td>
                              <td className="py-2 pr-3 text-muted-foreground">
                                {format(new Date(b.set_date), "MMM d")}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {fmtInt(b.total_eggs_set)}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {fmtInt(b.eggs_injected)}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {fmtInt(b.chicks_hatched)}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {pct == null ? "—" : `${pct.toFixed(2)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-2">
                      Per-house values shown for reference. Saving above
                      distributes the flock total proportionally across houses
                      by eggs set.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
