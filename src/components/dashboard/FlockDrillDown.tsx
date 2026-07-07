import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";

interface HouseTile {
  id: string;
  house_number: string;
  set_date: string;
  status: string;
  total_eggs_set: number;
  eggs_injected: number | null;
  eggs_cleared: number | null;
  machine_number: string | null;
  epq_count: number;
  fertility_count: number;
  residue_count: number;
}

interface Props {
  flock: WeeklyFlockRollupRow;
  onBack: () => void;
  onOpenHouse: (houseId: string) => void;
}

const statusColor = (s: string) => {
  switch (s) {
    case "in_setter":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "in_hatcher":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString();

export default function FlockDrillDown({ flock, onBack, onOpenHouse }: Props) {
  const [houses, setHouses] = useState<HouseTile[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = flock.house_ids;
      if (!ids.length) {
        setHouses([]);
        setLoading(false);
        return;
      }
      const [batchesR, epqR, fertR, resR] = await Promise.all([
        supabase
          .from("batches")
          .select(
            `id, set_date, status, total_eggs_set, eggs_injected, eggs_cleared,
             flocks(house_number), machines(machine_number)`
          )
          .in("id", ids),
        supabase.from("egg_pack_quality").select("id, batch_id").in("batch_id", ids),
        supabase.from("fertility_analysis").select("id, batch_id").in("batch_id", ids),
        supabase.from("residue_analysis").select("id, batch_id").in("batch_id", ids),
      ]);
      if (cancelled) return;
      const count = (arr: any[] | null, id: string) =>
        (arr || []).filter((r) => r.batch_id === id).length;
      const tiles: HouseTile[] = (batchesR.data || []).map((b: any) => ({
        id: b.id,
        house_number: b.flocks?.house_number ?? "",
        set_date: b.set_date,
        status: b.status,
        total_eggs_set: Number(b.total_eggs_set) || 0,
        eggs_injected: b.eggs_injected,
        eggs_cleared: b.eggs_cleared,
        machine_number: b.machines?.machine_number ?? null,
        epq_count: count(epqR.data, b.id),
        fertility_count: count(fertR.data, b.id),
        residue_count: count(resR.data, b.id),
      }));
      tiles.sort(
        (a, b) =>
          String(a.house_number).localeCompare(String(b.house_number)) ||
          a.set_date.localeCompare(b.set_date)
      );
      setHouses(tiles);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [flock.house_ids]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Weekly Totals
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <CardTitle>{flock.flock_name || "Flock"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Flock #{flock.flock_number ?? "—"} · {flock.house_count}{" "}
                {flock.house_count === 1 ? "house" : "houses"} this week
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <div className="text-muted-foreground">Eggs Set</div>
                <div className="font-semibold">{fmtInt(flock.total_eggs_set)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Injected</div>
                <div className="font-semibold">{fmtInt(flock.total_eggs_injected)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Clears</div>
                <div className="font-semibold">{fmtInt(flock.total_eggs_cleared)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Chicks</div>
                <div className="font-semibold">{fmtInt(flock.total_chicks_hatched)}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : !houses || houses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No houses found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {houses.map((h) => (
                <button
                  key={h.id}
                  onClick={() => onOpenHouse(h.id)}
                  className="text-left rounded-lg border bg-card hover:bg-muted/50 transition p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <Home className="h-4 w-4 text-primary" />
                      House {h.house_number || "—"}
                    </div>
                    <Badge variant="outline" className={statusColor(h.status)}>
                      {h.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Set {format(new Date(h.set_date), "MMM d, yyyy")}
                    {h.machine_number ? ` · ${h.machine_number}` : ""}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Eggs</div>
                      <div className="font-medium">{fmtInt(h.total_eggs_set)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Injected</div>
                      <div className="font-medium">{fmtInt(h.eggs_injected)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Clears</div>
                      <div className="font-medium">{fmtInt(h.eggs_cleared)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">
                      EPQ {h.epq_count}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Fert {h.fertility_count}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Residue {h.residue_count}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
