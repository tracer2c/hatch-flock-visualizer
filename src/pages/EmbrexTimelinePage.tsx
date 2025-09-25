import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ── shadcn/ui ─────────────────────────────────────────────────────────────── */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Icons ────────────────────────────────────────────────────────────────── */
import {
  Loader2, Calendar as CalendarIcon, RefreshCw, ChevronsUpDown, Check, X,
  Download, Save, PlusCircle, SlidersHorizontal, LineChart, BarChart2, Activity
} from "lucide-react";

/* ── Charts (Recharts) ────────────────────────────────────────────────────── */
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid
} from "recharts";

/* =============================================================================
   Enterprise Embrex Timeline Page
   - KPI header
   - Dual-axis charts (counts + %)
   - Weighted/Unweighted % toggle
   - Rolling average overlay & benchmark line
   - Drill-down modal per bucket
   - Saved views (localStorage)
   - CSV export of bucketed data
   - Deep-link URL sync & robust validation
   - Facet Tabs (Flocks/Units/Flock×Unit)
   - Skeleton loaders & polished UI
============================================================================= */

/** ---------- Types ---------- */
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
  eggs_cleared: number | null;
  eggs_injected: number | null;
  set_date: string; // ISO date
  status: string;
}

interface BucketRow {
  bucketKey: string;
  date: Date;
  count: {
    age_weeks?: number;            // sum
    total_eggs_set?: number;       // sum
    eggs_cleared?: number;         // sum
    eggs_injected?: number;        // sum
  };
  pct: {
    clear_pct?: number;            // per bucket (weighted/unweighted)
    injected_pct?: number;         // per bucket (weighted/unweighted)
  };
  raw: RawRow[];
}

interface Facet {
  key: string;
  title: string;
  rows: RawRow[];
}

/** ---------- Constants ---------- */
const metricLabel: Record<MetricKey, string> = {
  age_weeks: "Age (weeks)",
  total_eggs_set: "Total Eggs",
  eggs_cleared: "Clears",
  eggs_injected: "Injected",
  clear_pct: "Clear %",
  injected_pct: "Injected %",
};
const ALL_METRICS = [
  "age_weeks",
  "total_eggs_set",
  "eggs_cleared",
  "eggs_injected",
  "clear_pct",
  "injected_pct",
] as const;

const isPercentMetric = (m: MetricKey) => m === "clear_pct" || m === "injected_pct";
const metricKind = (m: MetricKey) => (isPercentMetric(m) ? "pct" : "count") as "pct" | "count";

const seriesColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"] as const;

const DEFAULTS = {
  scale: "month" as Granularity,
  metrics: ["total_eggs_set"] as MetricKey[],
  view: "bar" as ChartMode,
  facetBy: "flock" as "flock" | "unit" | "flock_unit",
  unitFilter: "all",
  percentAgg: "weighted" as PercentAgg,
  from: "",
  to: "",
};

/** ---------- Helpers ---------- */
const validScale = (s: any): s is Granularity => ["year", "month", "week", "day"].includes(s);
const isMetricKey = (x: string): x is MetricKey => (ALL_METRICS as readonly string[]).includes(x as any);

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

const formatVal = (m: MetricKey, v: number) =>
  isPercentMetric(m) ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString();

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

/** ========================================================================== */

export default function EmbrexTimelinePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── State: controls ────────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);

  const [granularity, setGranularity] = useState<Granularity>(() => {
    const s = searchParams.get("scale");
    return validScale(s) ? s : DEFAULTS.scale;
  });

  const [metrics, setMetrics] = useState<MetricKey[]>(() => {
    const m = searchParams.get("metrics") ?? searchParams.get("metric") ?? "";
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

  // Saved views in localStorage
  const [savedName, setSavedName] = useState("");

  /* ── Derived: flocks & units lists ──────────────────────────────────────── */
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

  /* ── Effects ────────────────────────────────────────────────────────────── */
  useEffect(() => { document.title = "Embrex Timeline | Hatchery Dashboard"; }, []);

  // Load data
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
          age_weeks: b.flocks.age_weeks,
          total_eggs_set: b.total_eggs_set ?? 0,
          eggs_cleared: b.eggs_cleared ?? 0,
          eggs_injected: b.eggs_injected ?? 0,
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

  // URL sync
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
    if (rollingAvg) sp.set("roll", "1");
    else sp.delete("roll");
    if (benchmark !== "" && Number.isFinite(Number(benchmark))) sp.set("bench", String(benchmark));
    else sp.delete("bench");

    setSearchParams(sp, { replace: true });
    sessionStorage.setItem("embrexTimelineQS", sp.toString());
  }, [
    granularity, metrics, chartMode, selectedFlocks, selectedUnits, unitFilter,
    facetBy, dateFrom, dateTo, percentAgg, rollingAvg, benchmark, setSearchParams
  ]);

  /* ── Filtering ──────────────────────────────────────────────────────────── */
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
    if (dateFrom) {
      const from = new Date(dateFrom);
      out = out.filter(r => new Date(r.set_date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      out = out.filter(r => new Date(r.set_date) <= to);
    }
    return out;
  }, [rows, unitFilter, selectedUnits, dateFrom, dateTo]);

  /* ── Facets ─────────────────────────────────────────────────────────────── */
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
    // flock_unit
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

  /* ── Bucketing & series ─────────────────────────────────────────────────── */
  const buildBuckets = (subset: RawRow[]): BucketRow[] => {
    const map = new Map<string, BucketRow>();
    for (const r of subset) {
      const d = new Date(r.set_date);
      const start = startOfBucket(d, granularity);
      const key = fmtBucketLabel(start, granularity);

      if (!map.has(key)) {
        map.set(key, { bucketKey: key, date: start, count: {}, pct: {}, raw: [] });
      }
      const b = map.get(key)!;
      // counts
      b.count.total_eggs_set = (b.count.total_eggs_set ?? 0) + (r.total_eggs_set ?? 0);
      b.count.eggs_cleared = (b.count.eggs_cleared ?? 0) + (r.eggs_cleared ?? 0);
      b.count.eggs_injected = (b.count.eggs_injected ?? 0) + (r.eggs_injected ?? 0);
      b.count.age_weeks = (b.count.age_weeks ?? 0) + (r.age_weeks ?? 0);
      b.raw.push(r);
    }

    const out: BucketRow[] = [];
    map.forEach((b) => {
      // percent metrics
      const sumSet = b.count.total_eggs_set ?? 0;
      const sumClr = b.count.eggs_cleared ?? 0;
      const sumInj = b.count.eggs_injected ?? 0;

      if (percentAgg === "weighted") {
        b.pct.clear_pct = sumSet > 0 ? (sumClr / sumSet) * 100 : 0;
        b.pct.injected_pct = sumSet > 0 ? (sumInj / sumSet) * 100 : 0;
      } else {
        // unweighted: mean of per-row percents
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

  // chart rows per facet (merge counts & pct into recharts-friendly rows)
  const chartDataForFacet = (facetRows: RawRow[]) => {
    const buckets = buildBuckets(facetRows);
    // rolling average on selected metric[0] (if enabled)
    const firstMetric = metrics[0] ?? "total_eggs_set";
    const values = buckets.map(b =>
      isPercentMetric(firstMetric)
        ? (b.pct as any)[firstMetric] ?? 0
        : (b.count as any)[firstMetric] ?? 0
    );

    const rollWindow = 3; // 3-bucket simple moving average
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
      // counts
      age_weeks: b.count.age_weeks ?? 0,
      total_eggs_set: b.count.total_eggs_set ?? 0,
      eggs_cleared: b.count.eggs_cleared ?? 0,
      eggs_injected: b.count.eggs_injected ?? 0,
      // pct
      clear_pct: b.pct.clear_pct ?? 0,
      injected_pct: b.pct.injected_pct ?? 0,
      // rolling
      rolling: rollingAvg ? rolling[i] : undefined,
      // for drill-down
      _raw: b.raw,
      _sumSet: b.count.total_eggs_set ?? 0,
      _sumClr: b.count.eggs_cleared ?? 0,
      _sumInj: b.count.eggs_injected ?? 0,
    }));
  };

  /* ── KPIs ───────────────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const all = baseFilteredRows;
    const totalSet = all.reduce((a, r) => a + (r.total_eggs_set ?? 0), 0);
    const totalClr = all.reduce((a, r) => a + (r.eggs_cleared ?? 0), 0);
    const totalInj = all.reduce((a, r) => a + (r.eggs_injected ?? 0), 0);
    const clrPct = totalSet ? (totalClr / totalSet) * 100 : 0;
    const injPct = totalSet ? (totalInj / totalSet) * 100 : 0;
    return { totalSet, clrPct, injPct };
  }, [baseFilteredRows]);

  /* ── Drill-down modal ───────────────────────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState<RawRow[]>([]);

  const openDrill = (facetTitle: string, bucketLabel: string, raw: RawRow[]) => {
    setModalTitle(`${facetTitle} • ${bucketLabel}`);
    setModalRows(raw);
    setModalOpen(true);
  };

  /* ── Saved Views ───────────────────────────────────────────────────────── */
  const saveCurrentView = () => {
    if (!savedName.trim()) {
      toast({ title: "Name required", description: "Provide a name to save this view." });
      return;
    }
    const qs = searchParams.toString();
    const key = `embrexView:${savedName.trim()}`;
    localStorage.setItem(key, qs);
    toast({ title: "View saved", description: `"${savedName}" saved.` });
    setSavedName("");
  };

  const applySavedView = (name: string) => {
    const key = `embrexView:${name}`;
    const qs = localStorage.getItem(key);
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
  }, [modalOpen, searchParams]); // cheap invalidation

  /* ── Export CSV ─────────────────────────────────────────────────────────── */
  const exportBucketsCsv = () => {
    // build combined export for the active facet (or all facets concatenated)
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

  /* ── Reset ──────────────────────────────────────────────────────────────── */
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

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Embrex Timeline</h1>
          <p className="text-muted-foreground">
            Analyze counts and percentages over time by flock and unit, with drill-down, benchmarks, and saved views.
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

      {/* Controls */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">Controls</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Save view as…"
              value={savedName}
              onChange={e => setSavedName(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" className="gap-2" onClick={saveCurrentView}>
              <Save className="h-4 w-4" /> Save View
            </Button>
            {savedViews.length > 0 && (
              <Select onValueChange={applySavedView}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Load saved view" /></SelectTrigger>
                <SelectContent>
                  {savedViews.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-6">
          {/* Compare flocks */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-muted-foreground">Compare flocks (up to 4)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="justify-between">
                  {selectedFlocks.length ? `${selectedFlocks.length} selected` : "Select flocks"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0">
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

          {/* Compare units */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-muted-foreground">Compare units (up to 4)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="justify-between">
                  {selectedUnits.length ? `${selectedUnits.length} selected` : "Select units"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0">
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

          {/* Facet by */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-muted-foreground">Facet by</label>
            <Select value={facetBy} onValueChange={(v: FacetMode) => setFacetBy(v)}>
              <SelectTrigger><SelectValue placeholder="Facet by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flock">Flocks</SelectItem>
                <SelectItem value="unit">Units</SelectItem>
                <SelectItem value="flock_unit">Flock × Unit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-muted-foreground">Metrics (up to 4)</label>
            <Select
              value=""
              onValueChange={(m) => {
                if (!isMetricKey(m)) return;
                setMetrics(prev => {
                  const set = new Set(prev);
                  if (set.has(m)) set.delete(m); else set.add(m);
                  return Array.from(set).slice(0, 4);
                });
              }}
            >
              <SelectTrigger className="justify-between">
                <div className="truncate">{metrics.length ? metrics.map(m => metricLabel[m]).join(", ") : "Select…"}</div>
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </SelectTrigger>
              <SelectContent>
                {ALL_METRICS.map(m => (
                  <SelectItem key={m} value={m}>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={metrics.includes(m)} className="pointer-events-none" />
                      <span>{metricLabel[m]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time scale */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-muted-foreground">Time scale</label>
            <Select value={granularity} onValueChange={(v: Granularity) => setGranularity(v)}>
              <SelectTrigger><SelectValue placeholder="Scale" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Years</SelectItem>
                <SelectItem value="month">Months</SelectItem>
                <SelectItem value="week">Weeks</SelectItem>
                <SelectItem value="day">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm text-muted-foreground">View</label>
            <Select value={chartMode} onValueChange={(v: ChartMode) => setChartMode(v)}>
              <SelectTrigger><SelectValue placeholder="View" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar"><div className="flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Bar</div></SelectItem>
                <SelectItem value="line"><div className="flex items-center gap-2"><LineChart className="h-4 w-4" /> Line</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Date range
            </label>
            <div className="flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" />
              <span className="text-muted-foreground text-xs">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" />
            </div>
            <p className="text-xs text-muted-foreground">Leave blank to include all dates.</p>
          </div>

          {/* Advanced toggles */}
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Percent aggregation</span>
              <Select value={percentAgg} onValueChange={(v: PercentAgg) => setPercentAgg(v)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Weighted" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weighted">Weighted</SelectItem>
                  <SelectItem value="unweighted">Unweighted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="rolling" checked={rollingAvg} onCheckedChange={(v) => setRollingAvg(Boolean(v))} />
              <label htmlFor="rolling" className="text-sm">Rolling avg (3 buckets)</label>
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
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
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

                  {facets.map((facet, idx) => {
                    const data = chartDataForFacet(facet.rows);
                    const hasPct = metrics.some(isPercentMetric);
                    const hasCount = metrics.some(m => !isPercentMetric(m));
                    return (
                      <TabsContent key={facet.key} value={facet.key} className="mt-4">
                        <div className="rounded-lg border bg-card">
                          <div className="border-b p-3 text-xs text-muted-foreground flex items-center gap-3">
                            <Activity className="h-4 w-4" />
                            {metrics.map(m => metricLabel[m]).join(", ")} • {granularity}
                          </div>
                          <div className="p-3" style={{ height: 360 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={data} onClick={(e: any) => {
                                if (!e?.activePayload?.length) return;
                                const payload = e.activePayload[0]?.payload;
                                if (!payload) return;
                                const bucket = payload.bucket as string;
                                const raw = payload._raw as RawRow[];
                                openDrill(facet.title, bucket, raw);
                              }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                {hasCount && <YAxis yAxisId="left" allowDecimals={false} />}
                                {hasPct && <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />}
                                <Tooltip
                                  formatter={(value: any, name: string) => {
                                    const m = name as MetricKey;
                                    return [isMetricKey(m) ? formatVal(m, Number(value)) : value, metricLabel[m as MetricKey] ?? name];
                                  }}
                                />
                                <Legend />
                                {/* Reference benchmark line (on right axis as percent) */}
                                {benchmark !== "" && Number.isFinite(Number(benchmark)) && (
                                  <ReferenceLine yAxisId="right" y={Number(benchmark)} stroke="#ef4444" strokeDasharray="4 4" label={`Benchmark ${benchmark}%`} />
                                )}

                                {/* Bars / Lines per metric */}
                                {metrics.map((m, i) => {
                                  const color = seriesColors[i % seriesColors.length];
                                  const yAxis = isPercentMetric(m) ? "right" : "left";
                                  if (chartMode === "bar") {
                                    return <Bar key={m} dataKey={m} yAxisId={yAxis} fill={color} radius={[6, 6, 0, 0]} />;
                                  }
                                  return <Line key={m} type="monotone" dataKey={m} yAxisId={yAxis} stroke={color} dot strokeWidth={2} />;
                                })}

                                {/* Rolling average on primary metric */}
                                {rollingAvg && (
                                  <Line type="monotone" dataKey="rolling"
                                        yAxisId={isPercentMetric(metrics[0] ?? "total_eggs_set") ? "right" : "left"}
                                        stroke="#64748b" dot={false} strokeDasharray="5 5" name="Rolling Avg" />
                                )}
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
    </div>
  );
}
