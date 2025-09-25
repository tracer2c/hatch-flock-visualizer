/* EmbrexTimelinePage.tsx — premium controls + multi-view analytics */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ── shadcn/ui ── */
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

/* ── Icons ── */
import {
  Loader2, Calendar as CalendarIcon, RefreshCw, ChevronsUpDown, Check, X,
  Download, Save, SlidersHorizontal, LineChart, BarChart2, Activity, Sparkles,
  Percent, Layers, Rows, Grid2X2, Trash2, MoveRight,
} from "lucide-react";

/* ── Recharts ── */
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid, Area, AreaChart,
} from "recharts";

/* =============================================================================
   Types & constants
============================================================================= */

type Granularity = "year" | "month" | "week" | "day";
type ChartMode = "bar" | "line";
type MetricKey =
  | "age_weeks"
  | "total_eggs_set"
  | "eggs_cleared"
  | "eggs_injected"
  | "clear_pct"
  | "injected_pct";
type PercentAgg = "weighted" | "unweighted";

interface RawRow {
  batch_id: string;
  batch_number: string;
  flock_number: number;
  unit_name: string;
  flock_name: string;
  age_weeks: number;
  total_eggs_set: number;
  eggs_cleared: number;
  eggs_injected: number;
  set_date: string; // ISO
  status: string;
}

interface BucketRow {
  bucketKey: string;
  date: Date;
  count: {
    age_weeks?: number;
    total_eggs_set?: number;
    eggs_cleared?: number;
    eggs_injected?: number;
  };
  pct: {
    clear_pct?: number;
    injected_pct?: number;
  };
  raw: RawRow[];
}

const metricLabel: Record<MetricKey, string> = {
  age_weeks: "Age (weeks)",
  total_eggs_set: "Total Eggs",
  eggs_cleared: "Clears",
  eggs_injected: "Injected",
  clear_pct: "Clear %",
  injected_pct: "Injected %",
};
const ALL_METRICS = [
  "total_eggs_set",
  "eggs_cleared",
  "eggs_injected",
  "clear_pct",
  "injected_pct",
  "age_weeks",
] as const;

const seriesColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"] as const;

const DEFAULTS = {
  scale: "month" as Granularity,
  metrics: ["total_eggs_set", "clear_pct"] as MetricKey[],
  view: "bar" as ChartMode,
  facetBy: "flock" as "flock" | "unit" | "flock_unit",
  unitFilter: "all",
  percentAgg: "weighted" as PercentAgg,
  from: "",
  to: "",
};

const validScale = (s: any): s is Granularity => ["year", "month", "week", "day"].includes(s);
const isPercentMetric = (m: MetricKey) => m === "clear_pct" || m === "injected_pct";
const isMetricKey = (x: string): x is MetricKey => (ALL_METRICS as readonly string[]).includes(x as any);
const metricKind = (m: MetricKey) => (isPercentMetric(m) ? "pct" : "count") as "pct" | "count";

/* Dates */
const fmtBucketLabel = (d: Date, g: Granularity) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (g === "year") return `${y}`;
  if (g === "month") return `${y}-${m}`;
  if (g === "week") {
    const start = new Date(y, 0, 1);
    const wk = Math.floor((+d - +start) / (7 * 86400000)) + 1;
    return `${y}-W${String(wk).padStart(2, "0")}`;
  }
  return `${y}-${m}-${day}`;
};
const startOfBucket = (d: Date, g: Granularity) => {
  const y = d.getFullYear();
  if (g === "year") return new Date(y, 0, 1);
  if (g === "month") return new Date(y, d.getMonth(), 1);
  if (g === "week") {
    const tmp = new Date(d);
    const day = tmp.getDay();
    const diff = (day + 6) % 7; // Monday start
    tmp.setDate(tmp.getDate() - diff);
    tmp.setHours(0, 0, 0, 0);
    return tmp;
  }
  const exact = new Date(d);
  exact.setHours(0, 0, 0, 0);
  return exact;
};

const toCsv = (rows: Record<string, any>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) =>
    v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
};
const saveFile = (filename: string, content: string, mime = "text/csv;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* =============================================================================
   Component
============================================================================= */

export default function EmbrexTimelinePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);

  const [granularity, setGranularity] = useState<Granularity>(() => {
    const s = searchParams.get("scale");
    return validScale(s) ? s : DEFAULTS.scale;
  });
  const [metrics, setMetrics] = useState<MetricKey[]>(() => {
    const m = searchParams.get("metrics") ?? "";
    const list = m ? m.split(",").filter(isMetricKey) : DEFAULTS.metrics;
    return Array.from(new Set(list)).slice(0, 4);
  });
  const [chartMode, setChartMode] = useState<ChartMode>(() =>
    searchParams.get("view") === "line" ? "line" : DEFAULTS.view
  );

  type FacetMode = "flock" | "unit" | "flock_unit";
  const [facetBy, setFacetBy] = useState<FacetMode>(() => {
    const f = searchParams.get("facetBy");
    return f === "unit" || f === "flock_unit" ? f : DEFAULTS.facetBy;
  });

  const [unitFilter, setUnitFilter] = useState<string>(() => searchParams.get("unit") || DEFAULTS.unitFilter);
  const [selectedFlocks, setSelectedFlocks] = useState<number[]>(() => {
    const multi = searchParams.get("flocks");
    return multi ? multi.split(",").map(Number).filter(n => !Number.isNaN(n)).slice(0, 4) : [];
  });
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() => {
    const u = searchParams.get("units");
    return u ? u.split(",").filter(Boolean).slice(0, 4) : [];
  });

  const [dateFrom, setDateFrom] = useState<string>(() => searchParams.get("from") || DEFAULTS.from);
  const [dateTo, setDateTo] = useState<string>(() => searchParams.get("to") || DEFAULTS.to);
  const [percentAgg, setPercentAgg] = useState<PercentAgg>(() =>
    searchParams.get("pctAgg") === "unweighted" ? "unweighted" : DEFAULTS.percentAgg
  );
  const [rollingAvg, setRollingAvg] = useState<boolean>(() => searchParams.get("roll") === "1");
  const [benchmark, setBenchmark] = useState<number | "">(() => {
    const b = searchParams.get("bench");
    if (!b) return "";
    const n = Number(b);
    return Number.isFinite(n) ? n : "";
  });

  const [savedName, setSavedName] = useState("");

  /* ── Data load ── */
  useEffect(() => {
    document.title = "Embrex Timeline | Hatchery Dashboard";
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("batches")
          .select(`
            id,
            batch_number,
            total_eggs_set,
            eggs_cleared,
            eggs_injected,
            set_date,
            status,
            units ( name ),
            flocks!inner(
              flock_number,
              flock_name,
              age_weeks
            )
          `)
          .order("set_date", { ascending: true });

        if (error) throw error;

        const formatted: RawRow[] = (data ?? []).map((b: any) => ({
          batch_id: b.id,
          batch_number: b.batch_number,
          flock_number: b.flocks.flock_number,
          unit_name: b.units?.name ?? "",
          flock_name: b.flocks.flock_name,
          age_weeks: Number(b.flocks.age_weeks ?? 0),
          total_eggs_set: Number(b.total_eggs_set ?? 0),
          eggs_cleared: Number(b.eggs_cleared ?? 0),
          eggs_injected: Number(b.eggs_injected ?? 0),
          set_date: b.set_date,
          status: b.status ?? "",
        }));

        setRows(formatted);
      } catch (e) {
        console.error(e);
        toast({ title: "Failed to load", description: "Could not load timeline data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  /* ── URL sync ── */
  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set("scale", granularity);
    sp.set("metrics", metrics.join(","));
    sp.set("view", chartMode);
    if (selectedFlocks.length) sp.set("flocks", selectedFlocks.join(","));
    if (selectedUnits.length) sp.set("units", selectedUnits.join(","));
    if (unitFilter && unitFilter !== "all") sp.set("unit", unitFilter);
    sp.set("facetBy", facetBy);
    if (dateFrom) sp.set("from", dateFrom);
    if (dateTo) sp.set("to", dateTo);
    sp.set("pctAgg", percentAgg);
    if (rollingAvg) sp.set("roll", "1"); else sp.delete("roll");
    if (benchmark !== "" && Number.isFinite(Number(benchmark))) sp.set("bench", String(benchmark)); else sp.delete("bench");
    setSearchParams(sp, { replace: true });
    sessionStorage.setItem("embrexTimelineQS", sp.toString());
  }, [
    granularity, metrics, chartMode, selectedFlocks, selectedUnits, unitFilter,
    facetBy, dateFrom, dateTo, percentAgg, rollingAvg, benchmark, setSearchParams
  ]);

  /* ── Derived lists ── */
  const units = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.unit_name) set.add(r.unit_name.trim()); });
    return Array.from(set).sort();
  }, [rows]);

  const flocks = useMemo(() => {
    const uniq = new Map<number, string>();
    rows.forEach(r => { if (!uniq.has(r.flock_number)) uniq.set(r.flock_number, r.flock_name); });
    return [...uniq.entries()].sort((a, b) => a[0] - b[0])
      .map(([num, name]) => ({ value: String(num), label: `#${num} — ${name}` }));
  }, [rows]);

  const flocksMap = useMemo(() => {
    const m = new Map<number, string>();
    rows.forEach(r => { if (!m.has(r.flock_number)) m.set(r.flock_number, r.flock_name); });
    return m;
  }, [rows]);

  /* ── Filtering ── */
  const baseFilteredRows = useMemo(() => {
    const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
    let out = rows;
    if (unitFilter !== "all") {
      out = out.filter(r => norm(r.unit_name) === norm(unitFilter));
    }
    if (selectedUnits.length) {
      const allow = new Set(selectedUnits.map(u => u.trim().toLowerCase()));
      out = out.filter(r => r.unit_name && allow.has(r.unit_name.trim().toLowerCase()));
    }
    if (selectedFlocks.length) {
      const allow = new Set(selectedFlocks);
      out = out.filter(r => allow.has(r.flock_number));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      out = out.filter(r => new Date(r.set_date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      out = out.filter(r => new Date(r.set_date) <= to);
    }
    return out;
  }, [rows, unitFilter, selectedUnits, selectedFlocks, dateFrom, dateTo]);

  /* ── Faceting ── */
  type Facet = { key: string; title: string; rows: RawRow[]; };
  const facets: Facet[] = useMemo(() => {
    const data = baseFilteredRows;
    if (facetBy === "flock") {
      if (!selectedFlocks.length) return [{ key: "ALL", title: "All flocks", rows: data }];
      return selectedFlocks.map(num => ({
        key: `F-${num}`,
        title: `Flock #${num} — ${flocksMap.get(num) ?? ""}`,
        rows: data.filter(r => r.flock_number === num),
      }));
    }
    if (facetBy === "unit") {
      const unitList = selectedUnits.length
        ? selectedUnits
        : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[])).slice(0, 4);
      return unitList.map(u => ({
        key: `U-${u}`,
        title: `Unit: ${u}`,
        rows: data.filter(r => (r.unit_name ?? "").toLowerCase() === u.toLowerCase()),
      }));
    }
    // flock × unit
    const flockList = selectedFlocks.length
      ? selectedFlocks
      : Array.from(new Set(data.map(r => r.flock_number))).slice(0, 2);
    const unitList = selectedUnits.length
      ? selectedUnits
      : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[])).slice(0, 2);
    const out: Facet[] = [];
    for (const f of flockList) {
      for (const u of unitList) {
        out.push({
          key: `FU-${f}-${u}`,
          title: `Flock #${f} — ${flocksMap.get(f) ?? ""} • Unit: ${u}`,
          rows: data.filter(r => r.flock_number === f && (r.unit_name ?? "").toLowerCase() === u.toLowerCase()),
        });
      }
    }
    return out.length ? out : [{ key: "ALL", title: "All flocks", rows: data }];
  }, [facetBy, baseFilteredRows, selectedFlocks, selectedUnits, flocksMap]);

  /* ── Bucketing ── */
  const buildBuckets = (subset: RawRow[]): BucketRow[] => {
    const map = new Map<string, BucketRow>();
    for (const r of subset) {
      const d = new Date(r.set_date);
      const start = startOfBucket(d, granularity);
      const key = fmtBucketLabel(start, granularity);
      if (!map.has(key)) map.set(key, { bucketKey: key, date: start, count: {}, pct: {}, raw: [] });
      const b = map.get(key)!;
      b.count.total_eggs_set = (b.count.total_eggs_set ?? 0) + (r.total_eggs_set ?? 0);
      b.count.eggs_cleared   = (b.count.eggs_cleared   ?? 0) + (r.eggs_cleared   ?? 0);
      b.count.eggs_injected  = (b.count.eggs_injected  ?? 0) + (r.eggs_injected  ?? 0);
      b.count.age_weeks      = (b.count.age_weeks      ?? 0) + (r.age_weeks      ?? 0);
      b.raw.push(r);
    }
    const out: BucketRow[] = [];
    map.forEach((b) => {
      const sumSet = b.count.total_eggs_set ?? 0;
      const sumClr = b.count.eggs_cleared ?? 0;
      const sumInj = b.count.eggs_injected ?? 0;

      if (percentAgg === "weighted") {
        b.pct.clear_pct = sumSet > 0 ? (sumClr / sumSet) * 100 : 0;
        b.pct.injected_pct = sumSet > 0 ? (sumInj / sumSet) * 100 : 0;
      } else {
        const valsClr = b.raw.map(r => (r.total_eggs_set ? (r.eggs_cleared ?? 0) / r.total_eggs_set * 100 : 0));
        const valsInj = b.raw.map(r => (r.total_eggs_set ? (r.eggs_injected ?? 0) / r.total_eggs_set * 100 : 0));
        b.pct.clear_pct = valsClr.length ? valsClr.reduce((a, c) => a + c, 0) / valsClr.length : 0;
        b.pct.injected_pct = valsInj.length ? valsInj.reduce((a, c) => a + c, 0) / valsInj.length : 0;
      }
      out.push(b);
    });
    out.sort((a, b) => +a.date - +b.date);
    return out;
  };

  const chartDataForFacet = (facetRows: RawRow[]) => {
    const buckets = buildBuckets(facetRows);
    const firstMetric = metrics[0] ?? "total_eggs_set";
    const values = buckets.map(b =>
      isPercentMetric(firstMetric)
        ? (b.pct as any)[firstMetric] ?? 0
        : (b.count as any)[firstMetric] ?? 0
    );
    const rollWindow = 3;
    const rolling = rollingAvg
      ? values.map((_, i) => {
          const s = Math.max(0, i - rollWindow + 1);
          const slice = values.slice(s, i + 1);
          return slice.reduce((a, c) => a + c, 0) / slice.length;
        })
      : [];
    return buckets.map((b, i) => ({
      bucket: b.bucketKey,
      date: b.date,
      total_eggs_set: b.count.total_eggs_set ?? 0,
      eggs_cleared: b.count.eggs_cleared ?? 0,
      eggs_injected: b.count.eggs_injected ?? 0,
      age_weeks: b.count.age_weeks ?? 0,
      clear_pct: b.pct.clear_pct ?? 0,
      injected_pct: b.pct.injected_pct ?? 0,
      rolling: rollingAvg ? rolling[i] : undefined,
      _raw: b.raw,
      _sumSet: b.count.total_eggs_set ?? 0,
      _sumClr: b.count.eggs_cleared ?? 0,
      _sumInj: b.count.eggs_injected ?? 0,
    }));
  };

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const all = baseFilteredRows;
    const totalSet = all.reduce((a, r) => a + (r.total_eggs_set ?? 0), 0);
    const totalClr = all.reduce((a, r) => a + (r.eggs_cleared ?? 0), 0);
    const totalInj = all.reduce((a, r) => a + (r.eggs_injected ?? 0), 0);
    const clrPct = totalSet ? (totalClr / totalSet) * 100 : 0;
    const injPct = totalSet ? (totalInj / totalSet) * 100 : 0;
    return { totalSet, clrPct, injPct };
  }, [baseFilteredRows]);

  /* ── Drill-down modal ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState<RawRow[]>([]);
  const openDrill = (facetTitle: string, bucketLabel: string, raw: RawRow[]) => {
    setModalTitle(`${facetTitle} • ${bucketLabel}`);
    setModalRows(raw);
    setModalOpen(true);
  };

  /* ── Export ── */
  const exportBucketsCsv = () => {
    const rowsToExport: Record<string, any>[] = [];
    facets.forEach((f) => {
      const chartRows = chartDataForFacet(f.rows);
      chartRows.forEach(r => {
        rowsToExport.push({
          facet: f.title,
          bucket: r.bucket,
          total_eggs_set: r.total_eggs_set,
          eggs_cleared: r.eggs_cleared,
          eggs_injected: r.eggs_injected,
          clear_pct: r.clear_pct,
          injected_pct: r.injected_pct,
          rolling: r.rolling ?? "",
          sum_set: r._sumSet,
          sum_cleared: r._sumClr,
          sum_injected: r._sumInj,
        });
      });
    });
    const csv = toCsv(rowsToExport);
    saveFile("embrex_timeline.csv", csv);
  };

  /* ── Saved views ── */
  const saveCurrentView = () => {
    if (!savedName.trim()) {
      toast({ title: "Name required", description: "Provide a name to save this view." });
      return;
    }
    const qs = searchParams.toString();
    localStorage.setItem(`embrexView:${savedName.trim()}`, qs);
    toast({ title: "View saved", description: `"${savedName}" saved.` });
    setSavedName("");
  };
  const applySavedView = (name: string) => {
    const qs = localStorage.getItem(`embrexView:${name}`);
    if (!qs) {
      toast({ title: "Not found", description: "Saved view does not exist.", variant: "destructive" });
      return;
    }
    const url = new URL(window.location.href);
    url.search = qs;
    window.location.assign(url.toString());
  };
  const savedViews = useMemo(() => {
    const views: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("embrexView:")) views.push(k.replace("embrexView:", ""));
    }
    return views.sort();
  }, [modalOpen, searchParams]);

  /* ── Reset ── */
  const handleReset = () => {
    setGranularity(DEFAULTS.scale);
    setMetrics([...DEFAULTS.metrics]);
    setChartMode(DEFAULTS.view);
    setFacetBy(DEFAULTS.facetBy);
    setUnitFilter(DEFAULTS.unitFilter);
    setSelectedFlocks([]);
    setSelectedUnits([]);
    setDateFrom(DEFAULTS.from);
    setDateTo(DEFAULTS.to);
    setPercentAgg(DEFAULTS.percentAgg);
    setRollingAvg(false);
    setBenchmark("");
  };

  /* ── Helpers UI ── */
  const DatePreset = ({ label, range }: { label: string; range: () => { from?: string; to?: string } }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      onClick={() => {
        const r = range();
        setDateFrom(r.from ?? "");
        setDateTo(r.to ?? "");
      }}
    >
      {label}
    </Button>
  );

  /* =============================================================================
     Render
  ============================================================================= */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Embrex Timeline</h1>
          <p className="text-muted-foreground">
            Premium time-series analytics for eggs set, clears & injections with drill-downs, small-multiples, and saved views.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleReset} title="Reset all filters">
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
          <Button variant="secondary" className="gap-2" onClick={exportBucketsCsv} title="Export visible series">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="gap-2" variant="secondary" onClick={() =>
            navigate("/embrex-data-sheet", { state: { backToTimelineQS: searchParams.toString() } })}>
            <BarChart2 className="h-4 w-4" /> Embrex Summary
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Eggs Set</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? <Skeleton className="h-7 w-24" /> : kpis.totalSet.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Clear %</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? <Skeleton className="h-7 w-16" /> : `${kpis.clrPct.toFixed(1)}%`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Injected %</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {loading ? <Skeleton className="h-7 w-16" /> : `${kpis.injPct.toFixed(1)}%`}
          </CardContent>
        </Card>
      </div>

      {/* PREMIUM CONTROL BAR */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & View</CardTitle>
            <div className="flex items-center gap-2">
              <Input placeholder="Save view as…" value={savedName} onChange={(e) => setSavedName(e.target.value)} className="w-44" />
              <Button variant="outline" className="gap-2" onClick={saveCurrentView}><Save className="h-4 w-4" />Save</Button>
              {savedViews.length > 0 && (
                <Select onValueChange={applySavedView}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Load saved view" /></SelectTrigger>
                  <SelectContent>
                    {savedViews.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="mt-4 space-y-5">
          {/* Row 1: Facet / Compare chips / Scale / View */}
          <div className="grid gap-3 md:grid-cols-12">
            {/* Facet */}
            <div className="md:col-span-3">
              <div className="text-xs mb-1 text-muted-foreground">Facet by</div>
              <Select value={facetBy} onValueChange={(v: any) => setFacetBy(v)}>
                <SelectTrigger><SelectValue placeholder="Facet by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flock">Flocks</SelectItem>
                  <SelectItem value="unit">Units</SelectItem>
                  <SelectItem value="flock_unit">Flock × Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Compare Flocks */}
            <div className="md:col-span-4">
              <div className="text-xs mb-1 text-muted-foreground">Compare flocks (up to 4)</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedFlocks.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {selectedFlocks.map(n => (
                          <Badge key={n} variant="secondary" className="gap-1">
                            #{n}
                            <X className="h-3 w-3 cursor-pointer"
                               onClick={(e) => { e.stopPropagation(); setSelectedFlocks(prev => prev.filter(x => x !== n)); }} />
                          </Badge>
                        ))}
                      </div>
                    ) : "Select flocks"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0">
                  <Command>
                    <CommandInput placeholder="Search flocks..." />
                    <CommandEmpty>No flocks found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {flocks.map((f) => {
                          const num = Number(f.value);
                          const checked = selectedFlocks.includes(num);
                          const atLimit = selectedFlocks.length >= 4;
                          const disabled = !checked && atLimit;
                          return (
                            <CommandItem
                              key={f.value}
                              value={f.label}
                              onSelect={() => {
                                if (disabled) return;
                                setSelectedFlocks(prev => {
                                  const set = new Set(prev);
                                  if (set.has(num)) set.delete(num); else set.add(num);
                                  return Array.from(set).slice(0, 4);
                                });
                              }}
                              className={disabled ? "opacity-50 pointer-events-none" : ""}
                            >
                              <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                {checked && <Check className="h-3 w-3" />}
                              </div>
                              <span>{f.label}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="border-t p-2 text-xs text-muted-foreground">{selectedFlocks.length}/4 selected</div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Compare Units */}
            <div className="md:col-span-3">
              <div className="text-xs mb-1 text-muted-foreground">Compare units (up to 4)</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedUnits.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {selectedUnits.map(u => (
                          <Badge key={u} variant="secondary" className="gap-1">
                            {u}
                            <X className="h-3 w-3 cursor-pointer"
                               onClick={(e) => { e.stopPropagation(); setSelectedUnits(prev => prev.filter(x => x !== u)); }} />
                          </Badge>
                        ))}
                      </div>
                    ) : "Select units"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0">
                  <Command>
                    <CommandInput placeholder="Search units..." />
                    <CommandEmpty>No units found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {units.map(u => {
                          const checked = selectedUnits.includes(u);
                          const atLimit = selectedUnits.length >= 4;
                          const disabled = !checked && atLimit;
                          return (
                            <CommandItem
                              key={u}
                              value={u}
                              onSelect={() => {
                                if (disabled) return;
                                setSelectedUnits(prev => checked ? prev.filter(x => x !== u) : [...prev, u]);
                              }}
                              className={disabled ? "opacity-50 pointer-events-none" : ""}
                            >
                              <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                {checked && <Check className="h-3 w-3" />}
                              </div>
                              <span>{u}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="border-t p-2 text-xs text-muted-foreground">{selectedUnits.length}/4 selected</div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Scale / View */}
            <div className="md:col-span-2">
              <div className="text-xs mb-1 text-muted-foreground">Scale & View</div>
              <div className="flex gap-2">
                <Select value={granularity} onValueChange={(v: any) => setGranularity(v)}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="Scale" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Years</SelectItem>
                    <SelectItem value="month">Months</SelectItem>
                    <SelectItem value="week">Weeks</SelectItem>
                    <SelectItem value="day">Days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={chartMode} onValueChange={(v: any) => setChartMode(v)}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="View" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar"><div className="flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Bar</div></SelectItem>
                    <SelectItem value="line"><div className="flex items-center gap-2"><LineChart className="h-4 w-4" /> Line</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Row 2: Metrics builder + date range + advanced */}
          <div className="grid gap-3 md:grid-cols-12">
            {/* Metrics builder */}
            <div className="md:col-span-5">
              <div className="text-xs mb-1 text-muted-foreground">Metrics (toggle up to 4)</div>
              <div className="flex flex-wrap gap-2">
                {ALL_METRICS.map((m) => {
                  const active = metrics.includes(m);
                  return (
                    <Button
                      key={m}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className={`h-8 ${active ? "" : "bg-background"} gap-2`}
                      onClick={() => {
                        setMetrics(prev => {
                          const set = new Set(prev);
                          if (set.has(m)) set.delete(m); else set.add(m);
                          return Array.from(set).slice(0, 4);
                        });
                      }}
                    >
                      {isPercentMetric(m) ? <Percent className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                      {metricLabel[m]}
                      {active && <X className="h-3 w-3 opacity-70" />}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div className="md:col-span-4">
              <div className="text-xs mb-1 text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Date range
              </div>
              <div className="flex items-center gap-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" />
                <span className="text-muted-foreground text-xs">to</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" />
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="icon" onClick={() => { setDateFrom(""); setDateTo(""); }} title="Clear dates">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <DatePreset label="Last 30d" range={() => {
                  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 30);
                  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
                }} />
                <DatePreset label="90d" range={() => {
                  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 90);
                  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
                }} />
                <DatePreset label="180d" range={() => {
                  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 180);
                  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
                }} />
                <DatePreset label="365d" range={() => {
                  const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 365);
                  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
                }} />
                <DatePreset label="YTD" range={() => {
                  const to = new Date(); const from = new Date(to.getFullYear(), 0, 1);
                  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
                }} />
                <DatePreset label="All time" range={() => ({ from: "", to: "" })} />
              </div>
            </div>

            {/* Advanced */}
            <div className="md:col-span-3">
              <div className="text-xs mb-1 text-muted-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Advanced
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Pct agg</span>
                  <Select value={percentAgg} onValueChange={(v: any) => setPercentAgg(v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted">Weighted</SelectItem>
                      <SelectItem value="unweighted">Unweighted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="rolling" checked={rollingAvg} onCheckedChange={(v) => setRollingAvg(Boolean(v))} />
                  <label htmlFor="rolling" className="text-sm">Rolling avg</label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Benchmark %</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="w-24"
                    placeholder="e.g. 95"
                    value={benchmark}
                    onChange={(e) => setBenchmark(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === Visualizations ================================================== */}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Timeline ({facets.length} {facets.length === 1 ? "view" : "views"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
            </div>
          ) : (
            <>
              {facets.length === 0 || facets.every(f => f.rows.length === 0) ? (
                <div className="text-muted-foreground">No data for the current filters.</div>
              ) : (
                <Tabs defaultValue={facets[0].key} className="w-full">
                  <TabsList className="flex flex-wrap justify-start max-w-full overflow-x-auto">
                    {facets.map(f => (
                      <TabsTrigger key={f.key} value={f.key} className="truncate max-w-[260px]">
                        {f.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {facets.map((facet) => {
                    const data = chartDataForFacet(facet.rows);
                    const hasPct = metrics.some(isPercentMetric);
                    const hasCount = metrics.some(m => !isPercentMetric(m));

                    return (
                      <TabsContent key={facet.key} value={facet.key} className="mt-4 space-y-6">
                        {/* Primary composed timeline */}
                        <div className="rounded-lg border bg-card">
                          <div className="border-b p-3 text-xs text-muted-foreground flex items-center gap-3">
                            {metrics.map(m => metricLabel[m]).join(", ")} • {granularity}
                          </div>
                          <div className="p-3" style={{ height: 360 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={data} onClick={(e: any) => {
                                if (!e?.activePayload?.length) return;
                                const payload = e.activePayload[0]?.payload;
                                if (!payload) return;
                                openDrill(facet.title, payload.bucket as string, payload._raw as RawRow[]);
                              }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                {hasCount && <YAxis yAxisId="left" allowDecimals={false} />}
                                {hasPct && <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />}
                                <Tooltip />
                                <Legend />
                                {benchmark !== "" && Number.isFinite(Number(benchmark)) && (
                                  <ReferenceLine yAxisId="right" y={Number(benchmark)} stroke="#ef4444" strokeDasharray="4 4" label={`Benchmark ${benchmark}%`} />
                                )}
                                {metrics.map((m, i) => {
                                  const color = seriesColors[i % seriesColors.length];
                                  const yAxis = isPercentMetric(m) ? "right" : "left";
                                  if (chartMode === "bar") {
                                    return <Bar key={m} dataKey={m} yAxisId={yAxis} fill={color} radius={[6, 6, 0, 0]} />;
                                  }
                                  return <Line key={m} type="monotone" dataKey={m} yAxisId={yAxis} stroke={color} dot strokeWidth={2} />;
                                })}
                                {rollingAvg && (
                                  <Line type="monotone" dataKey="rolling"
                                        yAxisId={isPercentMetric(metrics[0] ?? "total_eggs_set") ? "right" : "left"}
                                        stroke="#64748b" dot={false} strokeDasharray="5 5" name="Rolling Avg" />
                                )}
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Stacked counts */}
                        <div className="rounded-lg border bg-card">
                          <div className="border-b p-3 text-xs text-muted-foreground flex items-center gap-2">
                            <Layers className="h-4 w-4" /> Stacked counts
                          </div>
                          <div className="p-3" style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total_eggs_set" stackId="a" fill={seriesColors[0]} name="Total Eggs" />
                                <Bar dataKey="eggs_cleared"  stackId="a" fill={seriesColors[2]} name="Clears" />
                                <Bar dataKey="eggs_injected" stackId="a" fill={seriesColors[1]} name="Injected" />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Percent trends */}
                        <div className="rounded-lg border bg-card">
                          <div className="border-b p-3 text-xs text-muted-foreground flex items-center gap-2">
                            <Percent className="h-4 w-4" /> Percent trends
                          </div>
                          <div className="p-3" style={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="clear_pct" stroke={seriesColors[2]} dot={false} name="Clear %" />
                                <Line type="monotone" dataKey="injected_pct" stroke={seriesColors[1]} dot={false} name="Injected %" />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Small multiples (sparklines) */}
                        <div className="rounded-lg border bg-card">
                          <div className="border-b p-3 text-xs text-muted-foreground flex items-center gap-2">
                            <Grid2X2 className="h-4 w-4" /> Small multiples
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            {["total_eggs_set", "clear_pct", "injected_pct"].map((k, i) => (
                              <div key={k} className="p-3">
                                <div className="text-xs text-muted-foreground mb-1">{metricLabel[k as MetricKey]}</div>
                                <div style={{ height: 100 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data}>
                                      <XAxis dataKey="bucket" hide />
                                      <YAxis hide domain={isPercentMetric(k as MetricKey) ? [0, 100] : ["auto", "auto"]} />
                                      <Area type="monotone" dataKey={k} stroke={seriesColors[i]} fill={seriesColors[i]} fillOpacity={0.15} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Age distribution */}
                        <div className="rounded-lg border bg-card">
                          <div className="border-b p-3 text-xs text-muted-foreground flex items-center gap-2">
                            <Rows className="h-4 w-4" /> Age (weeks) distributed across buckets
                          </div>
                          <div className="p-3" style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="age_weeks" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Drill-down modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bucket details</DialogTitle>
            <DialogDescription>{modalTitle}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="py-2 pr-2">Batch</th>
                  <th className="py-2 pr-2">Flock</th>
                  <th className="py-2 pr-2">Unit</th>
                  <th className="py-2 pr-2">Set date</th>
                  <th className="py-2 pr-2 text-right">Eggs set</th>
                  <th className="py-2 pr-2 text-right">Clears</th>
                  <th className="py-2 pr-2 text-right">Injected</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {modalRows.map(r => (
                  <tr key={r.batch_id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono">{r.batch_number}</td>
                    <td className="py-2 pr-2">#{r.flock_number} — {r.flock_name}</td>
                    <td className="py-2 pr-2">{r.unit_name}</td>
                    <td className="py-2 pr-2">{new Date(r.set_date).toLocaleDateString()}</td>
                    <td className="py-2 pr-2 text-right">{r.total_eggs_set?.toLocaleString()}</td>
                    <td className="py-2 pr-2 text-right">{r.eggs_cleared?.toLocaleString()}</td>
                    <td className="py-2 pr-2 text-right">{r.eggs_injected?.toLocaleString()}</td>
                    <td className="py-2 pr-2">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer tip */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        Pro-tip: save views for “Exec”, “Ops”, or “QA” presets, then jump between them from the loader above.
        <MoveRight className="h-4 w-4" />
      </div>
    </div>
  );
}
