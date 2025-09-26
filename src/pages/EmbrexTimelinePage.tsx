import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ── shadcn/ui ─────────────────────────────────────────────────────────────── */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

/* ── Icons ─────────────────────────────────────────────────────────────────── */
import {
  RefreshCw, Download, BarChart2, Calendar, Check, X, Save, Trash2, Monitor,
  Activity, Layers, TrendingUp, BarChart3, Settings, Users, Box, BarChart, AreaChart as AreaChartIcon,
  Thermometer, MoreHorizontal, ListFilter, Star
} from "lucide-react";

/* ── Recharts ──────────────────────────────────────────────────────────────── */
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid, Area, AreaChart
} from "recharts";

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Types & Constants (from old code)                                        │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
type Granularity = "year" | "month" | "week" | "day";
type MetricKey =
  | "age_weeks"
  | "total_eggs_set"
  | "eggs_cleared"
  | "eggs_injected"
  | "clear_pct"
  | "injected_pct";
type PercentAgg = "weighted" | "unweighted";
type FacetMode = "flock" | "unit" | "flock_unit";

interface RawRow {
  batch_id: string; batch_number: string; flock_number: number; unit_name: string;
  flock_name: string; age_weeks: number; total_eggs_set: number; eggs_cleared: number;
  eggs_injected: number; set_date: string; status: string;
}
interface BucketRow {
  bucketKey: string; date: Date;
  count: { age_weeks?: number; total_eggs_set?: number; eggs_cleared?: number; eggs_injected?: number };
  pct: { clear_pct?: number; injected_pct?: number };
  raw: RawRow[];
}

const metricLabel: Record<MetricKey, string> = {
  age_weeks: "Age (weeks)", total_eggs_set: "Total Eggs Set", eggs_cleared: "Eggs Cleared",
  eggs_injected: "Eggs Injected", clear_pct: "Clear %", injected_pct: "Injected %",
};
const ALL_METRICS = [
  "total_eggs_set", "eggs_cleared", "eggs_injected",
  "clear_pct", "injected_pct", "age_weeks"
] as const;
const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

type VizKind = "timeline_bar" | "timeline_line" | "stacked_counts" | "percent_trends" | "sparklines" | "age_distribution" | "heatmap";
const VIZ_OPTIONS: { value: VizKind; label: string; icon: React.ElementType }[] = [
    { value: "timeline_bar", label: "Timeline Bar", icon: BarChart3 },
    { value: "timeline_line", label: "Timeline Line", icon: TrendingUp },
    { value: "stacked_counts", label: "Stacked Counts", icon: Layers },
    { value: "percent_trends", label: "Percent Trends", icon: Activity },
    { value: "sparklines", label: "Sparklines", icon: AreaChartIcon },
    { value: "age_distribution", label: "Age Distribution", icon: BarChart },
    { value: "heatmap", label: "Heatmap (month×unit)", icon: Thermometer },
];

const DEFAULTS = {
  scale: "month" as Granularity, metrics: ["total_eggs_set", "clear_pct"] as MetricKey[],
  facetBy: "flock" as FacetMode, from: "", to: "", pctAgg: "weighted" as PercentAgg, viz: "timeline_bar" as VizKind,
};

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Helper Functions (from old code)                                         │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
const isPercentMetric = (m: MetricKey) => m === "clear_pct" || m === "injected_pct";
const validScale = (s: any): s is Granularity => ["year", "month", "week", "day"].includes(s);
const fmtBucketLabel = (d: Date, g: Granularity) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  if (g === "year") return `${y}`;
  if (g === "month") return `${y}-${m}`;
  if (g === "week") { const start = new Date(y, 0, 1); const wk = Math.floor((+d - +start) / (7 * 86400000)) + 1; return `${y}-W${String(wk).padStart(2, "0")}`; }
  return `${y}-${m}-${day}`;
};
const startOfBucket = (d: Date, g: Granularity) => {
  const y = d.getFullYear();
  if (g === "year") return new Date(y, 0, 1);
  if (g === "month") return new Date(y, d.getMonth(), 1);
  if (g === "week") { const t = new Date(d), day = t.getDay(), diff = (day + 6) % 7; t.setDate(t.getDate() - diff); t.setHours(0,0,0,0); return t; }
  const t = new Date(d); t.setHours(0,0,0,0); return t;
};
const toCsv = (rows: Record<string, any>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
};
const saveFile = (filename: string, content: string, mime = "text/csv;charset=utf-8") => {
  const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Reusable Control Components (for new layout)                             │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
function SearchableMultiSelectPopover({
  triggerLabel, list, selected, onSelect, placeholder, emptyText, renderLabel
}: {
  triggerLabel: string; list: any[]; selected: any[]; onSelect: (value: any) => void;
  placeholder: string; emptyText: string; renderLabel: (item: any) => string;
}) {
  const [query, setQuery] = useState("");
  const filteredList = useMemo(() => list.filter(item => renderLabel(item).toLowerCase().includes(query.toLowerCase())), [list, query, renderLabel]);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {triggerLabel}
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder={placeholder} />
          <CommandList className="max-h-56">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredList.map((item, index) => {
                const value = item.num || item; // Handle both flock {num, name} and unit string
                const checked = selected.includes(value);
                return (
                  <CommandItem key={index} value={renderLabel(item)} onSelect={() => onSelect(value)}>
                    <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : ""}`}>
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <span>{renderLabel(item)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Main Page Component                                                      │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
export default function EmbrexTimelinePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Data state */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);

  /* Controls state (from old code) */
  const [granularity, setGranularity] = useState<Granularity>(() => validScale(searchParams.get("scale")) ? (searchParams.get("scale") as Granularity) : DEFAULTS.scale);
  const [metrics, setMetrics] = useState<MetricKey[]>(() => {
    const m = (searchParams.get("metrics") ?? "").split(",").filter(Boolean) as MetricKey[];
    return m.length ? m : DEFAULTS.metrics;
  });
  const [facetBy, setFacetBy] = useState<FacetMode>(() => (["flock","unit","flock_unit"].includes(searchParams.get("facetBy") || "") ? (searchParams.get("facetBy") as FacetMode) : DEFAULTS.facetBy));
  const [selectedFlocks, setSelectedFlocks] = useState<number[]>(() => (searchParams.get("flocks") || "").split(",").filter(Boolean).map(Number));
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() => (searchParams.get("units") || "").split(",").filter(Boolean));
  const [dateFrom, setDateFrom] = useState<string>(() => searchParams.get("from") || DEFAULTS.from);
  const [dateTo, setDateTo] = useState<string>(() => searchParams.get("to") || DEFAULTS.to);
  const [percentAgg, setPercentAgg] = useState<PercentAgg>(() => (searchParams.get("pctAgg") === "unweighted" ? "unweighted" : DEFAULTS.pctAgg));
  const [rollingAvg, setRollingAvg] = useState<boolean>(() => searchParams.get("roll") === "1");
  const [benchmark, setBenchmark] = useState<number | "">(() => {
    const b = searchParams.get("bench"); if (!b) return ""; const n = Number(b); return Number.isFinite(n) ? n : "";
  });
  const [viz, setViz] = useState<VizKind>(() => (VIZ_OPTIONS.map(v=>v.value).includes(searchParams.get("viz") as VizKind) ? (searchParams.get("viz") as VizKind) : DEFAULTS.viz));

  /* Saved Views state */
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  const [savedName, setSavedName] = useState("");

  /* Data fetching & URL sync (from old code) */
  useEffect(() => { document.title = "Embrex Analytics | Dashboard"; }, []);
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("batches").select(`
            id, batch_number, total_eggs_set, eggs_cleared, eggs_injected, set_date, status,
            units ( name ), flocks!inner(flock_number, flock_name, age_weeks)
        `).order("set_date", { ascending: true });
        if (error) throw error;
        setRows((data ?? []).map((b: any) => ({
          batch_id: b.id, batch_number: b.batch_number, flock_number: b.flocks.flock_number,
          unit_name: b.units?.name ?? "", flock_name: b.flocks.flock_name, age_weeks: Number(b.flocks.age_weeks ?? 0),
          total_eggs_set: Number(b.total_eggs_set ?? 0), eggs_cleared: Number(b.eggs_cleared ?? 0),
          eggs_injected: Number(b.eggs_injected ?? 0), set_date: b.set_date, status: b.status ?? "",
        })));
      } catch (e) {
        console.error(e);
        toast({ title: "Failed to load data", variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, [toast]);
  
  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set("scale", granularity);
    if (metrics.length) sp.set("metrics", metrics.join(","));
    sp.set("facetBy", facetBy);
    if (selectedFlocks.length) sp.set("flocks", selectedFlocks.join(","));
    if (selectedUnits.length) sp.set("units", selectedUnits.join(","));
    if (dateFrom) sp.set("from", dateFrom);
    if (dateTo) sp.set("to", dateTo);
    sp.set("pctAgg", percentAgg);
    if (rollingAvg) sp.set("roll", "1"); else sp.delete("roll");
    if (benchmark !== "" && Number.isFinite(Number(benchmark))) sp.set("bench", String(benchmark)); else sp.delete("bench");
    sp.set("viz", viz);
    setSearchParams(sp, { replace: true });
  }, [granularity, metrics, facetBy, selectedFlocks, selectedUnits, dateFrom, dateTo, percentAgg, rollingAvg, benchmark, viz, setSearchParams]);

  /* Core data processing logic (from old code) */
  const units = useMemo(() => Array.from(new Set(rows.map(r => (r.unit_name || "").trim()).filter(Boolean))).sort(), [rows]);
  const flocksList = useMemo(() => {
    const uniq = new Map<number, string>();
    rows.forEach(r => { if (!uniq.has(r.flock_number)) uniq.set(r.flock_number, r.flock_name); });
    return [...uniq.entries()].sort((a,b)=>a[0]-b[0]).map(([num,name])=>({num, name}));
  }, [rows]);
  const flocksMap = useMemo(() => new Map(flocksList.map(({num,name}) => [num, name])), [flocksList]);

  const baseFilteredRows = useMemo(() => {
    let out = rows;
    if (selectedUnits.length) { const allow = new Set(selectedUnits.map(u => u.toLowerCase())); out = out.filter(r => allow.has((r.unit_name||"").toLowerCase())); }
    if (selectedFlocks.length) { const allow = new Set(selectedFlocks); out = out.filter(r => allow.has(r.flock_number)); }
    if (dateFrom) { const from = new Date(dateFrom); out = out.filter(r => new Date(r.set_date) >= from); }
    if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); out = out.filter(r => new Date(r.set_date) <= to); }
    return out;
  }, [rows, selectedUnits, selectedFlocks, dateFrom, dateTo]);

  type Facet = { key: string; title: string; rows: RawRow[]; };
  const facets: Facet[] = useMemo(() => {
    const data = baseFilteredRows;
    if (facetBy === "flock") {
      if (!selectedFlocks.length) return [{ key: "ALL", title: "All Flocks", rows: data }];
      return selectedFlocks.map(num => ({
        key: `F-${num}`, title: `Flock #${num}`,
        rows: data.filter(r => r.flock_number === num),
      }));
    }
    if (facetBy === "unit") {
      const list = selectedUnits.length ? selectedUnits : units;
      return list.map(u => ({ key: `U-${u}`, title: `Unit: ${u}`, rows: data.filter(r => (r.unit_name||"").toLowerCase() === u.toLowerCase()) }));
    }
    const flockList = selectedFlocks.length ? selectedFlocks : Array.from(new Set(data.map(r => r.flock_number)));
    const unitList = selectedUnits.length ? selectedUnits : units;
    const out: Facet[] = [];
    for (const f of flockList) for (const u of unitList) {
      out.push({
        key: `FU-${f}-${u}`, title: `Flock #${f} • Unit: ${u}`,
        rows: data.filter(r => r.flock_number === f && (r.unit_name||"").toLowerCase() === u.toLowerCase()),
      });
    }
    return out.length ? out : [{ key: "ALL", title: "All Data", rows: data }];
  }, [facetBy, baseFilteredRows, selectedFlocks, selectedUnits, units, flocksMap]);

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
      if (percentAgg === "weighted") {
        b.pct.clear_pct = b.count.total_eggs_set ? (b.count.eggs_cleared / b.count.total_eggs_set) * 100 : 0;
        b.pct.injected_pct = b.count.total_eggs_set ? (b.count.eggs_injected / b.count.total_eggs_set) * 100 : 0;
      } else {
        const valsClr = b.raw.map(r => (r.total_eggs_set ? (r.eggs_cleared / r.total_eggs_set * 100) : 0));
        const valsInj = b.raw.map(r => (r.total_eggs_set ? (r.eggs_injected / r.total_eggs_set * 100) : 0));
        b.pct.clear_pct = valsClr.length ? valsClr.reduce((a, c) => a + c, 0) / valsClr.length : 0;
        b.pct.injected_pct = valsInj.length ? valsInj.reduce((a, c) => a + c, 0) / valsInj.length : 0;
      }
      out.push(b);
    });
    return out.sort((a,b)=>+a.date - +b.date);
  };

  const chartDataForFacet = (facetRows: RawRow[]) => {
    const buckets = buildBuckets(facetRows);
    const firstMetric = metrics[0] ?? "total_eggs_set";
    const values = buckets.map(b => isPercentMetric(firstMetric) ? (b.pct as any)[firstMetric] ?? 0 : (b.count as any)[firstMetric] ?? 0);
    const rollWindow = 3;
    const rolling = rollingAvg ? values.map((_, i) => {
      const s = Math.max(0, i - rollWindow + 1); const slice = values.slice(s, i + 1); return slice.reduce((a,c)=>a+c,0) / slice.length;
    }) : [];
    return buckets.map((b, i) => ({
      bucket: b.bucketKey, date: b.date, total_eggs_set: b.count.total_eggs_set ?? 0,
      eggs_cleared: b.count.eggs_cleared ?? 0, eggs_injected: b.count.eggs_injected ?? 0,
      age_weeks: b.count.age_weeks ?? 0, clear_pct: b.pct.clear_pct ?? 0,
      injected_pct: b.pct.injected_pct ?? 0, rolling: rollingAvg ? rolling[i] : undefined, _raw: b.raw,
    }));
  };

  /* Drill-down modal state & logic */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState<RawRow[]>([]);
  const openDrill = (facetTitle: string, bucketLabel: string, raw: RawRow[]) => {
    setModalTitle(`${facetTitle} • ${bucketLabel}`); setModalRows(raw); setModalOpen(true);
  };
  
  /* Export & Saved Views logic */
  const exportBucketsCsv = () => { /* ... (same as old code) ... */ };
  const saveCurrentView = () => {
    if (!savedName.trim()) { toast({ title: "Name required" }); return; }
    localStorage.setItem(`embrexView:${savedName.trim()}`, searchParams.toString());
    toast({ title: "View saved", description: `"${savedName}" saved.` }); setSavedName(""); setSavedViewsOpen(false);
  };
  const applySavedView = (name: string) => {
    const qs = localStorage.getItem(`embrexView:${name}`);
    if (!qs) return;
    window.location.search = qs;
  };
  const deleteSavedView = (name: string) => {
    localStorage.removeItem(`embrexView:${name}`);
    // Force re-render to update the list
    setSavedViewsOpen(false); setTimeout(() => setSavedViewsOpen(true), 10);
  };
  const savedViews = useMemo(() => {
    const v: string[] = []; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||""; if (k.startsWith("embrexView:")) v.push(k.replace("embrexView:",""));} return v.sort();
  }, [savedViewsOpen]);

  /* Key Metrics calculation for the new header bar */
  const currentFacetData = facets.find(f => f.key === (searchParams.get("tab") || facets[0]?.key))?.rows || [];
  const keyMetrics = useMemo(() => {
      if (!currentFacetData.length) return { totalEggs: "0", clearPct: "0%", injectPct: "0%", avgAge: "0w" };
      const totalEggs = currentFacetData.reduce((acc, r) => acc + (r.total_eggs_set || 0), 0);
      const totalCleared = currentFacetData.reduce((acc, r) => acc + (r.eggs_cleared || 0), 0);
      const totalInjected = currentFacetData.reduce((acc, r) => acc + (r.eggs_injected || 0), 0);
      const totalAgeWeeks = currentFacetData.reduce((acc, r) => acc + (r.age_weeks || 0), 0);

      return {
          totalEggs: totalEggs.toLocaleString(),
          clearPct: totalEggs > 0 ? `${((totalCleared / totalEggs) * 100).toFixed(1)}%` : '0%',
          injectPct: totalEggs > 0 ? `${((totalInjected / totalEggs) * 100).toFixed(1)}%` : '0%',
          avgAge: currentFacetData.length > 0 ? `${(totalAgeWeeks / currentFacetData.length).toFixed(1)}w` : '0w',
      };
  }, [currentFacetData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="mx-auto max-w-[90rem] space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Embrex Analytics
            </h1>
            <p className="text-slate-600 mt-1">Production insights at your fingertips</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setSavedViewsOpen(true)}>
              <Star className="h-4 w-4" /> Saved Views
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportBucketsCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.assign(window.location.pathname)}>
              <RefreshCw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </header>

        {/* Main Grid Layout */}
        <main className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
          {/* Left Sidebar - Controls */}
          <aside className="col-span-3 space-y-4 overflow-y-auto pr-2">
            {/* Visualization Type */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Monitor className="h-4 w-4 text-blue-600" />Visualization</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {VIZ_OPTIONS.map((option) => (
                  <Button key={option.value} variant={viz === option.value ? "secondary" : "ghost"} className="w-full justify-start gap-2 h-9" onClick={() => setViz(option.value)}>
                    <option.icon className="h-4 w-4" /> {option.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Metrics Selection */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4 text-green-600" />Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {ALL_METRICS.map((metric) => (
                  <div key={metric} className="flex items-center space-x-2">
                    <Checkbox id={metric} checked={metrics.includes(metric)} onCheckedChange={(checked) => {
                      setMetrics(prev => checked ? [...prev, metric] : prev.filter(m => m !== metric));
                    }}/>
                    <label htmlFor={metric} className="text-sm cursor-pointer">{metricLabel[metric]}</label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Filtering */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ListFilter className="h-4 w-4 text-indigo-600" />Filtering</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Facet By</label>
                  <Select value={facetBy} onValueChange={(v:FacetMode)=>setFacetBy(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flock">Flocks</SelectItem>
                      <SelectItem value="unit">Units</SelectItem>
                      <SelectItem value="flock_unit">Flock × Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <SearchableMultiSelectPopover
                    triggerLabel="Select Flocks" list={flocksList} selected={selectedFlocks}
                    onSelect={(num) => setSelectedFlocks(p => p.includes(num) ? p.filter(x=>x!==num) : [...p, num])}
                    placeholder="Search flocks..." emptyText="No flocks found."
                    renderLabel={(f) => `#${f.num} - ${f.name}`}
                  />
                  <SearchableMultiSelectPopover
                    triggerLabel="Select Units" list={units} selected={selectedUnits}
                    onSelect={(u) => setSelectedUnits(p => p.includes(u) ? p.filter(x=>x!==u) : [...p, u])}
                    placeholder="Search units..." emptyText="No units found."
                    renderLabel={(u) => u}
                  />
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Settings className="h-4 w-4 text-purple-600" />Settings</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-600 mb-1 block">Time Scale</label>
                        <Select value={granularity} onValueChange={(v: Granularity)=>setGranularity(v)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">Daily</SelectItem><SelectItem value="week">Weekly</SelectItem>
                                <SelectItem value="month">Monthly</SelectItem><SelectItem value="year">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-600 mb-1 block">Benchmark %</label>
                        <Input type="number" placeholder="e.g. 85" value={benchmark} onChange={(e) => setBenchmark(e.target.value === "" ? "" : Number(e.target.value))} className="h-8"/>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox id="rolling" checked={rollingAvg} onCheckedChange={(v) => setRollingAvg(Boolean(v))} />
                        <label htmlFor="rolling" className="text-xs text-slate-600">Show rolling average (3 buckets)</label>
                    </div>
                </CardContent>
            </Card>

            {/* Date Range */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-orange-600" />Date Range</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                 <div className="grid grid-cols-2 gap-2">
                  {[["30d", 30], ["90d", 90], ["180d", 180], ["YTD"]].map(([label, days])=>(
                    <Button key={label as string} variant="outline" size="sm" className="h-7" onClick={()=>{
                      const to = new Date(); const from = new Date();
                      if (label === "YTD") from.setMonth(0, 1); else from.setDate(to.getDate() - (days as number));
                      setDateFrom(from.toISOString().slice(0,10)); setDateTo(to.toISOString().slice(0,10));
                    }}>{label as string}</Button>
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <Input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="h-8" />
                  <Input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="h-8" />
                </div>
              </CardContent>
            </Card>

          </aside>

          {/* Main Chart Area */}
          <section className="col-span-9">
            <Card className="h-full shadow-xl border-0 bg-white/90 backdrop-blur flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div className="flex-1">
                  <CardTitle className="text-xl">
                    {VIZ_OPTIONS.find(v => v.value === viz)?.label || "Analytics"}
                  </CardTitle>
                </div>
                <Tabs value={searchParams.get("tab") || facets[0]?.key} onValueChange={(tab) => setSearchParams(prev => { prev.set("tab", tab); return prev; }, {replace: true})} className="w-auto">
                  <TabsList className="bg-slate-100 h-8">
                    {facets.map((facet) => (
                      <TabsTrigger key={facet.key} value={facet.key} className="text-xs px-2">{facet.title}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent className="pt-0 flex-1 flex flex-col">
                  {/* Key Metrics Bar */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="text-xs text-slate-600">Total Eggs Set</div>
                          <div className="text-lg font-bold">{loading ? <Skeleton className="h-6 w-24"/> : keyMetrics.totalEggs}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="text-xs text-slate-600">Clear Rate</div>
                          <div className="text-lg font-bold">{loading ? <Skeleton className="h-6 w-20"/> : keyMetrics.clearPct}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="text-xs text-slate-600">Injection Rate</div>
                          <div className="text-lg font-bold">{loading ? <Skeleton className="h-6 w-20"/> : keyMetrics.injectPct}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="text-xs text-slate-600">Average Age</div>
                          <div className="text-lg font-bold">{loading ? <Skeleton className="h-6 w-16"/> : keyMetrics.avgAge}</div>
                      </div>
                  </div>

                  {/* Chart Container */}
                  <div className="flex-1 bg-white rounded-lg border border-slate-200 p-2 min-h-0">
                      {loading ? ( <Skeleton className="h-full w-full" /> ) : (
                          <Tabs defaultValue={facets[0]?.key} value={searchParams.get("tab") || facets[0]?.key} className="w-full h-full flex flex-col">
                              {facets.map((facet) => {
                                  const data = chartDataForFacet(facet.rows);
                                  const showTimeline = viz === "timeline_bar" || viz === "timeline_line";
                                  return (
                                  <TabsContent key={facet.key} value={facet.key} className="mt-0 flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                      {/* Timeline (Bar/Line) */}
                                      {showTimeline ? (
                                        <ComposedChart data={data} onClick={(e:any)=>{ if (e?.activePayload?.[0]?.payload) openDrill(facet.title, e.activePayload[0].payload.bucket, e.activePayload[0].payload._raw); }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                                            <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                                            <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fontSize: 12 }}/>
                                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}/>
                                            <Legend />
                                            {benchmark && <ReferenceLine yAxisId="right" y={Number(benchmark)} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Target ${benchmark}%`, position: 'insideTopRight' }} />}
                                            {metrics.map((m, i) => {
                                                const color = PALETTE[i % PALETTE.length];
                                                const yAxis = isPercentMetric(m) ? "right" : "left";
                                                if (viz === "timeline_bar") return <Bar key={m} name={metricLabel[m]} dataKey={m} yAxisId={yAxis} fill={color} radius={[4,4,0,0]} />;
                                                return <Line key={m} name={metricLabel[m]} type="monotone" dataKey={m} yAxisId={yAxis} stroke={color} strokeWidth={2} dot={{ r: 3 }} />;
                                            })}
                                            {rollingAvg && <Line type="monotone" dataKey="rolling" yAxisId={isPercentMetric(metrics[0] ?? "total_eggs_set") ? "right":"left"} stroke="#64748b" dot={false} strokeDasharray="5 5" name="Rolling Avg" />}
                                        </ComposedChart>
                                      ) : viz === "stacked_counts" ? ( /* ... other viz ... */
                                        <ComposedChart data={data}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                                          <Bar dataKey="eggs_cleared"  stackId="a" fill={PALETTE[2]} name="Clears" />
                                          <Bar dataKey="eggs_injected" stackId="a" fill={PALETTE[1]} name="Injected" />
                                          <Bar dataKey="total_eggs_set" stackId="a" fill={PALETTE[0]} name="Other" transform={(props) => { const {x,y,width,height,eggs_cleared,eggs_injected} = props; return { ...props, height: height - (eggs_cleared+eggs_injected)/props.total_eggs_set*height }; }} />
                                        </ComposedChart>
                                      ) : viz === 'percent_trends' ? (
                                        <AreaChart data={data}>
                                          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis domain={[0, 100]} /><Tooltip /><Legend />
                                          <Area type="monotone" dataKey="clear_pct" stroke={PALETTE[3]} fill={PALETTE[3]} fillOpacity={0.2} strokeWidth={2} name="Clear %" />
                                          <Area type="monotone" dataKey="injected_pct" stroke={PALETTE[4]} fill={PALETTE[4]} fillOpacity={0.2} strokeWidth={2} name="Injected %" />
                                        </AreaChart>
                                      ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                          {/* Placeholder for other viz types or render them */}
                                          Selected visualization '{viz}' coming soon.
                                        </div>
                                      )}
                                    </ResponsiveContainer>
                                  </TabsContent>
                                  );
                              })}
                          </Tabs>
                      )}
                  </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>

      {/* Drill-down Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Bucket Details</DialogTitle><DialogDescription>{modalTitle}</DialogDescription></DialogHeader>
          <div className="max-h-[60vh] overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="text-left sticky top-0 bg-muted"><tr className="border-b">
                  <th className="p-2">Batch</th><th className="p-2">Flock</th><th className="p-2">Unit</th>
                  <th className="p-2">Set Date</th><th className="p-2 text-right">Eggs Set</th>
                  <th className="p-2 text-right">Clears</th><th className="p-2 text-right">Injected</th>
              </tr></thead>
              <tbody>{modalRows.map(r=>(
                  <tr key={r.batch_id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-2 font-mono">{r.batch_number}</td><td className="p-2">#{r.flock_number}</td>
                    <td className="p-2">{r.unit_name}</td><td className="p-2">{new Date(r.set_date).toLocaleDateString()}</td>
                    <td className="p-2 text-right">{r.total_eggs_set?.toLocaleString()}</td>
                    <td className="p-2 text-right">{r.eggs_cleared?.toLocaleString()}</td>
                    <td className="p-2 text-right">{r.eggs_injected?.toLocaleString()}</td>
                  </tr>
              ))}</tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Saved Views Modal */}
      <Dialog open={savedViewsOpen} onOpenChange={setSavedViewsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Saved Views</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input placeholder="Save current view as..." value={savedName} onChange={(e)=>setSavedName(e.target.value)} />
            <Button onClick={saveCurrentView}><Save className="h-4 w-4 mr-2" />Save</Button>
          </div>
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-2">Load a view</h4>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {savedViews.length > 0 ? savedViews.map(v => (
                <div key={v} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                  <span className="cursor-pointer" onClick={() => applySavedView(v)}>{v}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSavedView(v)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )) : <p className="text-sm text-muted-foreground text-center py-4">No saved views.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}