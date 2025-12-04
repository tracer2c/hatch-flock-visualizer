import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { calculateChicksHatched, calculateFertileEggs } from "@/utils/hatcheryFormulas";
import { useChartExport } from "@/hooks/useChartExport";

/* ── shadcn/ui ─────────────────────────────────────────────────────────────── */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* ── Icons ─────────────────────────────────────────────────────────────────── */
import {
  Activity, BarChart3, TrendingUp, Calendar as CalendarIcon, Settings,
  Download, RefreshCw, Grid2X2, Save, X, PanelLeftClose, PanelLeftOpen, LayoutGrid,
  Monitor, ChevronDown, ChevronRight, Radio, GitBranch, PieChart as PieChartIcon
} from "lucide-react";

/* ── Recharts ──────────────────────────────────────────────────────────────── */
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid, PieChart, Pie, Cell
} from "recharts";

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Types & constants                                                        │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
type Granularity = "year" | "month" | "week" | "day";
type MetricKey =
  | "age_weeks"
  | "total_eggs_set"
  | "eggs_cleared"
  | "eggs_injected"
  | "clear_pct"
  | "injected_pct"
  | "fertility_percent"
  | "early_dead_percent"
  | "mid_dead_percent"
  | "late_dead_percent"
  | "total_mortality_percent"
  | "hatch_percent"
  | "hof_percent"
  | "hoi_percent"
  | "if_dev_percent"
  | "cull_percent"
  | "live_pip_percent"
  | "dead_pip_percent"
  | "total_pip_percent"
  | "embryonic_mortality_percent"
  | "fertile_eggs"
  | "infertile_eggs"
  | "early_dead"
  | "mid_dead"
  | "late_dead"
  | "hatch_count"
  | "sample_size"
  | "cull_chicks"
  | "live_pips"
  | "dead_pips"
  | "total_pips"
  | "embryonic_mortality_count";
type PercentAgg = "weighted" | "unweighted";
type FacetMode = "flock" | "unit" | "flock_unit";

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
  set_date: string;
  status: string;
  fertility_percent?: number;
  early_dead_percent?: number;
  mid_dead_percent?: number;
  late_dead_percent?: number;
  total_mortality_percent?: number;
  hatch_percent?: number;
  hof_percent?: number;
  hoi_percent?: number;
  if_dev_percent?: number;
  cull_percent?: number;
  live_pip_percent?: number;
  dead_pip_percent?: number;
  total_pip_percent?: number;
  embryonic_mortality_percent?: number;
  fertile_eggs?: number;
  infertile_eggs?: number;
  early_dead?: number;
  mid_dead?: number;
  late_dead?: number;
  hatch_count?: number;
  sample_size?: number;
  cull_chicks?: number;
  live_pips?: number;
  dead_pips?: number;
  total_pips?: number;
  embryonic_mortality_count?: number;
}
interface BucketRow {
  bucketKey: string;
  date: Date;
  count: { 
    age_weeks?: number; 
    total_eggs_set?: number; 
    eggs_cleared?: number; 
    eggs_injected?: number;
    fertile_eggs?: number;
    infertile_eggs?: number;
    early_dead?: number;
    mid_dead?: number;
    late_dead?: number;
    hatch_count?: number;
    sample_size?: number;
    cull_chicks?: number;
    live_pips?: number;
    dead_pips?: number;
    total_pips?: number;
    embryonic_mortality_count?: number;
  };
  pct: { 
    clear_pct?: number; 
    injected_pct?: number;
    fertility_percent?: number;
    early_dead_percent?: number;
    mid_dead_percent?: number;
    late_dead_percent?: number;
    total_mortality_percent?: number;
    hatch_percent?: number;
    hof_percent?: number;
    hoi_percent?: number;
    if_dev_percent?: number;
    cull_percent?: number;
    live_pip_percent?: number;
    dead_pip_percent?: number;
    total_pip_percent?: number;
    embryonic_mortality_percent?: number;
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
  fertility_percent: "Fertility %",
  early_dead_percent: "Early Dead %",
  mid_dead_percent: "Mid Dead %",
  late_dead_percent: "Late Dead %", 
  total_mortality_percent: "Total Mortality %",
  hatch_percent: "Hatch %",
  hof_percent: "HOF %",
  hoi_percent: "HOI %",
  if_dev_percent: "I/F %",
  cull_percent: "Cull %",
  live_pip_percent: "Live Pips %",
  dead_pip_percent: "Dead Pips %",
  total_pip_percent: "Total Pips %",
  embryonic_mortality_percent: "Embryonic Mortality %",
  fertile_eggs: "Fertile Eggs",
  infertile_eggs: "Infertile Eggs",
  early_dead: "Early Dead",
  mid_dead: "Mid Dead",
  late_dead: "Late Dead",
  hatch_count: "Hatched",
  sample_size: "Sample Size",
  cull_chicks: "Cull Chicks",
  live_pips: "Live Pips",
  dead_pips: "Dead Pips",
  total_pips: "Total Pips",
  embryonic_mortality_count: "Embryonic Mortality",
};

const BASIC_METRICS = [
  "total_eggs_set",
  "eggs_cleared", 
  "eggs_injected",
  "clear_pct",
  "injected_pct",
  "age_weeks",
] as const;

const FERTILITY_METRICS = [
  "fertility_percent",
  "early_dead_percent",
  "mid_dead_percent",
  "late_dead_percent", 
  "total_mortality_percent",
  "hatch_percent",
  "hof_percent",
  "hoi_percent",
  "if_dev_percent",
  "cull_percent",
  "live_pip_percent",
  "dead_pip_percent",
  "total_pip_percent",
  "embryonic_mortality_percent",
] as const;

const ALL_METRICS = [...BASIC_METRICS, ...FERTILITY_METRICS] as const;

const isPercentMetric = (m: MetricKey) => 
  m === "clear_pct" || m === "injected_pct" || 
  m === "fertility_percent" || m === "early_dead_percent" || 
  m === "mid_dead_percent" || m === "late_dead_percent" || 
  m === "total_mortality_percent" || m === "hatch_percent" || 
  m === "hof_percent" || m === "hoi_percent" ||
  m === "if_dev_percent" ||
  m === "cull_percent" || m === "live_pip_percent" ||
  m === "dead_pip_percent" || m === "total_pip_percent" ||
  m === "embryonic_mortality_percent";

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

const formatNumber = (value: number, isPercent: boolean = false): string => {
  if (isPercent) return value.toFixed(2);
  return Math.round(value).toLocaleString();
};

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#059669", "#fb7185", "#22c55e", "#a78bfa"];
const HATCHERY_COLORS: Record<string, string> = {
  "DHN": "#3b82f6",
  "SAM": "#10b981", 
  "TROY": "#f59e0b",
  "ENT": "#ef4444",
};

// Only 4 visualization types now
type VizKind = "timeline_bar" | "timeline_line" | "donut" | "heatmap";

const VIZ_LABEL: Record<VizKind, string> = {
  timeline_bar: "Bar Chart",
  timeline_line: "Line Graph",
  donut: "Donut Chart",
  heatmap: "Heatmap",
};

const DEFAULTS = {
  scale: "month" as Granularity,
  metrics: ["total_eggs_set", "clear_pct"] as MetricKey[],
  facetBy: "flock" as FacetMode,
  from: "",
  to: "",
  pctAgg: "weighted" as PercentAgg,
  viz: "timeline_bar" as VizKind,
};

// Custom Glassmorphic Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="rounded-lg border border-white/20 p-2.5 shadow-xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <p className="text-xs font-semibold text-slate-800 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === '_raw' || entry.dataKey === 'rolling' && entry.value === undefined) return null;
          
          const countMetrics = ['fertile_eggs', 'infertile_eggs', 'early_dead', 'mid_dead', 'late_dead', 'hatch_count', 'sample_size', 'cull_chicks', 'live_pips', 'dead_pips', 'total_pips', 'embryonic_mortality_count'];
          const isCount = countMetrics.includes(entry.dataKey);
          
          const isPercent = entry.dataKey === 'clear_pct' || entry.dataKey === 'injected_pct' || 
                           entry.dataKey.includes('percent') || entry.dataKey.includes('pct') ||
                           (entry.dataKey === 'rolling' && (payload[0].dataKey === 'clear_pct' || payload[0].dataKey === 'injected_pct'));
          
          const formattedValue = isPercent 
            ? `${formatNumber(entry.value, true)}%`
            : entry.value.toLocaleString();
          
          return (
            <div key={`item-${index}`} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color || '#64748b' }}
              />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-medium text-slate-800">{formattedValue}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function EmbrexDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Data */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeStep, setWelcomeStep] = useState(0);

  /* Controls state (synced to URL) */
  const [granularity, setGranularity] = useState<Granularity>(() =>
    validScale(searchParams.get("scale")) ? (searchParams.get("scale") as Granularity) : DEFAULTS.scale
  );
  const [metrics, setMetrics] = useState<MetricKey[]>(() => {
    const m = (searchParams.get("metrics") ?? "").split(",").filter(Boolean) as MetricKey[];
    return m.length ? m : DEFAULTS.metrics;
  });
  const [showFertilityMetrics, setShowFertilityMetrics] = useState<boolean>(() => 
    searchParams.get("fertility") === "1"
  );
  const [facetBy, setFacetBy] = useState<FacetMode>(() =>
    (["flock","unit","flock_unit"].includes(searchParams.get("facetBy") || "") ? (searchParams.get("facetBy") as FacetMode) : DEFAULTS.facetBy)
  );
  const [selectedFlocks, setSelectedFlocks] = useState<number[]>(() =>
    (searchParams.get("flocks") || "").split(",").filter(Boolean).map(Number)
  );
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() =>
    (searchParams.get("units") || "").split(",").filter(Boolean)
  );
  const [dateFrom, setDateFrom] = useState<string>(() => searchParams.get("from") || DEFAULTS.from);
  const [dateTo,   setDateTo]   = useState<string>(() => searchParams.get("to")   || DEFAULTS.to);
  const [percentAgg, setPercentAgg] = useState<PercentAgg>(() =>
    (searchParams.get("pctAgg") === "unweighted" ? "unweighted" : DEFAULTS.pctAgg)
  );
  const [rollingAvg, setRollingAvg] = useState<boolean>(() => searchParams.get("roll") === "1");
  const [benchmark, setBenchmark] = useState<number | "">(() => {
    const b = searchParams.get("bench"); if (!b) return ""; const n = Number(b); return Number.isFinite(n) ? n : "";
  });
  const [viz, setViz] = useState<VizKind>(() =>
    (Object.keys(VIZ_LABEL) as VizKind[]).includes((searchParams.get("viz") as VizKind))
      ? (searchParams.get("viz") as VizKind)
      : DEFAULTS.viz
  );
  const [showFertilityCounts, setShowFertilityCounts] = useState<boolean>(() => 
    searchParams.get("fertCount") === "1"
  );

  /* Compare Mode & Sidebar state (URL-synced) */
  const [compareMode, setCompareMode] = useState<boolean>(() => searchParams.get("cmp") === "1");
  const [compareCols, setCompareCols] = useState<number>(() => {
    const c = Number(searchParams.get("cols") || 2);
    return [1,2,3].includes(c) ? c : 2;
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => searchParams.get("nav") !== "0");

  /* Saved views */
  const [savedName, setSavedName] = useState("");
  const savedViews = useMemo(() => {
    const v: string[] = [];
    for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||""; if (k.startsWith("embrexView:")) v.push(k.replace("embrexView:","")); }
    return v.sort();
  }, [searchParams]);

  /* Welcome screen animation sequence */
  useEffect(() => {
    if (!showWelcome) return;
    
    const timer1 = setTimeout(() => setWelcomeStep(1), 1000);
    const timer2 = setTimeout(() => setWelcomeStep(2), 3000);
    const timer3 = setTimeout(() => setWelcomeStep(3), 5000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [showWelcome]);

  /* Load data */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("batches")
          .select(`
            id, batch_number, total_eggs_set, eggs_cleared, eggs_injected, chicks_hatched, set_date, status,
            units ( name ),
            flocks!inner(flock_number, flock_name, age_weeks),
            fertility_analysis (
              fertility_percent,
              fertile_eggs,
              infertile_eggs,
              sample_size
            ),
            residue_analysis (
              residue_percent,
              hatch_percent,
              hof_percent,
              hoi_percent,
              if_dev_percent,
              early_dead,
              mid_dead,
              late_dead,
              cull_chicks,
              live_pip_number,
              dead_pip_number
            )
          `)
          .order("set_date", { ascending: true });
        if (error) throw error;

        const formatted: RawRow[] = (data ?? []).map((b: any) => {
          const fertility = b.fertility_analysis;
          const residue = b.residue_analysis;
          const totalEggs = Number(b.total_eggs_set ?? 0);
          
          const sampleSize = Number(fertility?.sample_size ?? residue?.sample_size ?? 648);
          
          const infertileEggs = Number(fertility?.infertile_eggs ?? 0);
          const earlyDead = Number(residue?.early_dead ?? 0);
          const midDead = Number(residue?.mid_dead ?? 0);
          const lateDead = Number(residue?.late_dead ?? 0);
          const cullChicks = Number(residue?.cull_chicks ?? 0);
          const livePips = Number(residue?.live_pip_number ?? 0);
          const deadPips = Number(residue?.dead_pip_number ?? 0);
          
          const fertileEggs = calculateFertileEggs(sampleSize, infertileEggs);
          const chicksHatched = calculateChicksHatched(
            sampleSize, infertileEggs, earlyDead, midDead, lateDead, cullChicks, livePips, deadPips
          );
          
          const eggsCleared = Number(b.eggs_cleared ?? infertileEggs);
          const eggsInjected = Number(b.eggs_injected ?? fertileEggs);
          
          let early_dead_percent = 0;
          let mid_dead_percent = 0;
          let late_dead_percent = 0;
          let total_mortality_percent = 0;
          
          if (residue && sampleSize > 0) {
            early_dead_percent = ((residue.early_dead ?? 0) / sampleSize) * 100;
            mid_dead_percent = ((residue.mid_dead ?? 0) / sampleSize) * 100;
            late_dead_percent = ((residue.late_dead ?? 0) / sampleSize) * 100;
          }
          
          total_mortality_percent = early_dead_percent + mid_dead_percent + late_dead_percent;
          const totalPips = livePips + deadPips;
          const embryonicMortalityCount = (residue?.early_dead ?? 0) + (residue?.mid_dead ?? 0) + (residue?.late_dead ?? 0);

          let cull_percent = 0;
          let live_pip_percent = 0;
          let dead_pip_percent = 0;
          let total_pip_percent = 0;
          let embryonic_mortality_percent = 0;

          if (sampleSize > 0) {
            cull_percent = (cullChicks / sampleSize) * 100;
            live_pip_percent = (livePips / sampleSize) * 100;
            dead_pip_percent = (deadPips / sampleSize) * 100;
            total_pip_percent = (totalPips / sampleSize) * 100;
            embryonic_mortality_percent = (embryonicMortalityCount / sampleSize) * 100;
          }

          return {
            batch_id: b.id,
            batch_number: b.batch_number,
            flock_number: b.flocks.flock_number,
            unit_name: b.units?.name ?? "",
            flock_name: b.flocks.flock_name,
            age_weeks: Number(b.flocks.age_weeks ?? 0),
            total_eggs_set: totalEggs,
            eggs_cleared: eggsCleared,
            eggs_injected: eggsInjected,
            set_date: b.set_date,
            status: b.status ?? "",
            fertility_percent: fertility?.fertility_percent ?? 0,
            early_dead_percent,
            mid_dead_percent,
            late_dead_percent,
            total_mortality_percent,
            hatch_percent: residue?.hatch_percent ?? 0,
            hof_percent: residue?.hof_percent ?? 0,
            hoi_percent: residue?.hoi_percent ?? 0,
            if_dev_percent: residue?.if_dev_percent ?? 0,
            cull_percent,
            live_pip_percent,
            dead_pip_percent,
            total_pip_percent,
            embryonic_mortality_percent,
            fertile_eggs: fertileEggs,
            infertile_eggs: fertility?.infertile_eggs,
            early_dead: residue?.early_dead,
            mid_dead: residue?.mid_dead,
            late_dead: residue?.late_dead,
            hatch_count: chicksHatched,
            sample_size: fertility?.sample_size,
            cull_chicks: cullChicks,
            live_pips: livePips,
            dead_pips: deadPips,
            total_pips: totalPips,
            embryonic_mortality_count: embryonicMortalityCount,
          };
        });
        setRows(formatted);
      } catch (e) {
        console.error(e);
        toast({ title: "Failed to load", description: "Could not load timeline data.", variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, [toast]);

  /* URL sync */
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
    if (compareMode) sp.set("cmp","1"); else sp.delete("cmp");
    if (compareCols !== 2) sp.set("cols", String(compareCols)); else sp.delete("cols");
    sp.set("nav", sidebarOpen ? "1" : "0");
    if (showFertilityMetrics) sp.set("fertility", "1"); else sp.delete("fertility");
    if (showFertilityCounts) sp.set("fertCount", "1"); else sp.delete("fertCount");
    setSearchParams(sp, { replace: true });
  }, [
    granularity, metrics, facetBy, selectedFlocks, selectedUnits, dateFrom, dateTo,
    percentAgg, rollingAvg, benchmark, viz, compareMode, compareCols, sidebarOpen, 
    showFertilityMetrics, showFertilityCounts, setSearchParams
  ]);

  /* Helper to extract base flock name (strips hatchery suffix) */
  const extractBaseFlockName = (flockName: string): string => {
    return flockName
      .replace(/ DHN$/i, '')
      .replace(/ TROY$/i, '')
      .replace(/ SAM$/i, '')
      .replace(/ ENT$/i, '')
      .trim();
  };

  /* Derived lists */
  const units = useMemo(
    () => Array.from(new Set(rows.map(r => (r.unit_name || "").trim()).filter(Boolean))).sort(),
    [rows]
  );
  
  // Filter flocksList by selected hatcheries
  const flocksList = useMemo(() => {
    const uniq = new Map<number, string>();
    const filteredRows = selectedUnits.length 
      ? rows.filter(r => selectedUnits.map(u => u.toLowerCase()).includes((r.unit_name || '').toLowerCase()))
      : rows;
    filteredRows.forEach(r => { if (!uniq.has(r.flock_number)) uniq.set(r.flock_number, r.flock_name); });
    return [...uniq.entries()].sort((a,b)=>a[0]-b[0]).map(([num,name])=>({num, name}));
  }, [rows, selectedUnits]);
  
  const flocksMap = useMemo(() => new Map(flocksList.map(({num,name}) => [num, name])), [flocksList]);

  /* Filtering */
  const baseFilteredRows = useMemo(() => {
    let out = rows;
    if (selectedUnits.length) {
      const allow = new Set(selectedUnits.map(u => u.toLowerCase()));
      out = out.filter(r => (r.unit_name||"").toLowerCase() && allow.has(r.unit_name.toLowerCase()));
    }
    if (selectedFlocks.length) {
      const allow = new Set(selectedFlocks);
      out = out.filter(r => allow.has(r.flock_number));
    }
    if (dateFrom) { const from = new Date(dateFrom); out = out.filter(r => new Date(r.set_date) >= from); }
    if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); out = out.filter(r => new Date(r.set_date) <= to); }
    return out;
  }, [rows, selectedUnits, selectedFlocks, dateFrom, dateTo]);

  /* Facets - with common flocks logic for flock_unit */
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
      const list = selectedUnits.length ? selectedUnits : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[]));
      return list.map(u => ({ key: `U-${u}`, title: `Hatchery: ${u}`, rows: data.filter(r => (r.unit_name||"").toLowerCase() === u.toLowerCase()) }));
    }
    
    // flock_unit mode: show only COMMON flocks across selected hatcheries (by base name)
    const unitList = selectedUnits.length ? selectedUnits : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[]));
    
    // Build map of base flock names per unit
    const baseNamesByUnit = new Map<string, Set<string>>();
    unitList.forEach(u => baseNamesByUnit.set(u.toLowerCase(), new Set()));
    
    // Also build a map from base name to flock numbers (for each unit)
    const flocksByBaseNameAndUnit = new Map<string, Map<string, number[]>>(); // baseName -> (unitLower -> flock_numbers[])
    
    data.forEach(r => {
      const unitKey = (r.unit_name || "").toLowerCase();
      const baseName = extractBaseFlockName(r.flock_name);
      
      if (baseNamesByUnit.has(unitKey)) {
        baseNamesByUnit.get(unitKey)!.add(baseName);
      }
      
      // Track which flock_numbers belong to each baseName+unit combination
      if (!flocksByBaseNameAndUnit.has(baseName)) {
        flocksByBaseNameAndUnit.set(baseName, new Map());
      }
      const unitMap = flocksByBaseNameAndUnit.get(baseName)!;
      if (!unitMap.has(unitKey)) {
        unitMap.set(unitKey, []);
      }
      if (!unitMap.get(unitKey)!.includes(r.flock_number)) {
        unitMap.get(unitKey)!.push(r.flock_number);
      }
    });
    
    // Find intersection of BASE NAMES across all selected hatcheries
    const unitBaseNameSets = [...baseNamesByUnit.values()];
    let commonBaseNames: Set<string>;
    if (unitBaseNameSets.length === 0) {
      commonBaseNames = new Set();
    } else if (unitBaseNameSets.length === 1) {
      commonBaseNames = unitBaseNameSets[0];
    } else {
      commonBaseNames = unitBaseNameSets.reduce((acc, set) => 
        new Set([...acc].filter(x => set.has(x)))
      );
    }
    
    // If user selected specific flocks, filter to those whose base names are common
    let relevantBaseNames = [...commonBaseNames];
    if (selectedFlocks.length) {
      const selectedBaseNames = new Set(
        selectedFlocks.map(fnum => {
          const name = flocksMap.get(fnum) || '';
          return extractBaseFlockName(name);
        })
      );
      relevantBaseNames = relevantBaseNames.filter(bn => selectedBaseNames.has(bn));
    }
    
    const out: Facet[] = [];
    for (const baseName of relevantBaseNames.sort()) {
      const unitMap = flocksByBaseNameAndUnit.get(baseName);
      if (!unitMap) continue;
      
      for (const u of unitList) {
        const unitKey = u.toLowerCase();
        const flockNumbers = unitMap.get(unitKey) || [];
        
        for (const fnum of flockNumbers) {
          const facetRows = data.filter(r => r.flock_number === fnum && (r.unit_name||"").toLowerCase() === unitKey);
          if (facetRows.length > 0) {
            out.push({
              key: `FU-${fnum}-${u}`,
              title: `${baseName} • ${u}`,
              rows: facetRows,
            });
          }
        }
      }
    }
    return out.length ? out : [{ key: "ALL", title: "All flocks", rows: data }];
  }, [facetBy, baseFilteredRows, selectedFlocks, selectedUnits, flocksMap]);

  /* Bucketing + chart data */
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
      b.count.fertile_eggs   = (b.count.fertile_eggs   ?? 0) + (r.fertile_eggs   ?? 0);
      b.count.infertile_eggs = (b.count.infertile_eggs ?? 0) + (r.infertile_eggs ?? 0);
      b.count.early_dead     = (b.count.early_dead     ?? 0) + (r.early_dead     ?? 0);
      b.count.mid_dead       = (b.count.mid_dead       ?? 0) + (r.mid_dead       ?? 0);
      b.count.late_dead      = (b.count.late_dead      ?? 0) + (r.late_dead      ?? 0);
      b.count.hatch_count    = (b.count.hatch_count    ?? 0) + (r.hatch_count    ?? 0);
      b.count.sample_size    = (b.count.sample_size    ?? 0) + (r.sample_size    ?? 0);
      b.count.cull_chicks    = (b.count.cull_chicks    ?? 0) + (r.cull_chicks    ?? 0);
      b.count.live_pips      = (b.count.live_pips      ?? 0) + (r.live_pips      ?? 0);
      b.count.dead_pips      = (b.count.dead_pips      ?? 0) + (r.dead_pips      ?? 0);
      b.count.total_pips     = (b.count.total_pips     ?? 0) + (r.total_pips     ?? 0);
      b.count.embryonic_mortality_count = (b.count.embryonic_mortality_count ?? 0) + (r.embryonic_mortality_count ?? 0);
      b.raw.push(r);
    }
    const out: BucketRow[] = [];
    map.forEach((b) => {
      const sumSet = b.count.total_eggs_set ?? 0;
      const sumClr = b.count.eggs_cleared ?? 0;
      const sumInj = b.count.eggs_injected ?? 0;
      
      const fertilityVals = b.raw.filter(r => r.fertility_percent != null);
      const earlyVals = b.raw.filter(r => r.early_dead_percent != null);
      const midVals = b.raw.filter(r => r.mid_dead_percent != null);
      const lateVals = b.raw.filter(r => r.late_dead_percent != null);
      const totalMortVals = b.raw.filter(r => r.total_mortality_percent != null);
      const hatchVals = b.raw.filter(r => r.hatch_percent != null);
      const hofVals = b.raw.filter(r => r.hof_percent != null);
      const hoiVals = b.raw.filter(r => r.hoi_percent != null);
      const ifVals = b.raw.filter(r => r.if_dev_percent != null);
      const cullVals = b.raw.filter(r => r.cull_percent != null);
      const livePipVals = b.raw.filter(r => r.live_pip_percent != null);
      const deadPipVals = b.raw.filter(r => r.dead_pip_percent != null);
      const totalPipVals = b.raw.filter(r => r.total_pip_percent != null);
      const embryonicMortVals = b.raw.filter(r => r.embryonic_mortality_percent != null);
      
      if (percentAgg === "weighted") {
        b.pct.clear_pct = sumSet > 0 ? (sumClr / sumSet) * 100 : 0;
        b.pct.injected_pct = sumSet > 0 ? (sumInj / sumSet) * 100 : 0;
        
        b.pct.fertility_percent = fertilityVals.length > 0 ? 
          fertilityVals.reduce((sum, r) => sum + (r.fertility_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.early_dead_percent = earlyVals.length > 0 ? 
          earlyVals.reduce((sum, r) => sum + (r.early_dead_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.mid_dead_percent = midVals.length > 0 ? 
          midVals.reduce((sum, r) => sum + (r.mid_dead_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.late_dead_percent = lateVals.length > 0 ? 
          lateVals.reduce((sum, r) => sum + (r.late_dead_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.total_mortality_percent = totalMortVals.length > 0 ? 
          totalMortVals.reduce((sum, r) => sum + (r.total_mortality_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.hatch_percent = hatchVals.length > 0 ? 
          hatchVals.reduce((sum, r) => sum + (r.hatch_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.hof_percent = hofVals.length > 0 ? 
          hofVals.reduce((sum, r) => sum + (r.hof_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.hoi_percent = hoiVals.length > 0 ? 
          hoiVals.reduce((sum, r) => sum + (r.hoi_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.if_dev_percent = ifVals.length > 0 ? 
          ifVals.reduce((sum, r) => sum + (r.if_dev_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.cull_percent = cullVals.length > 0 ?
          cullVals.reduce((sum, r) => sum + (r.cull_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.live_pip_percent = livePipVals.length > 0 ? 
          livePipVals.reduce((sum, r) => sum + (r.live_pip_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.dead_pip_percent = deadPipVals.length > 0 ? 
          deadPipVals.reduce((sum, r) => sum + (r.dead_pip_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.total_pip_percent = totalPipVals.length > 0 ? 
          totalPipVals.reduce((sum, r) => sum + (r.total_pip_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
        b.pct.embryonic_mortality_percent = embryonicMortVals.length > 0 ? 
          embryonicMortVals.reduce((sum, r) => sum + (r.embryonic_mortality_percent! * (r.total_eggs_set || 0)), 0) / sumSet : 0;
      } else {
        const valsClr = b.raw.map(r => (r.total_eggs_set ? (r.eggs_cleared ?? 0) / r.total_eggs_set * 100 : 0));
        const valsInj = b.raw.map(r => (r.total_eggs_set ? (r.eggs_injected ?? 0) / r.total_eggs_set * 100 : 0));
        
        b.pct.fertility_percent = fertilityVals.length > 0 ? 
          fertilityVals.reduce((sum, r) => sum + r.fertility_percent!, 0) / fertilityVals.length : 0;
        b.pct.early_dead_percent = earlyVals.length > 0 ? 
          earlyVals.reduce((sum, r) => sum + r.early_dead_percent!, 0) / earlyVals.length : 0;
        b.pct.mid_dead_percent = midVals.length > 0 ? 
          midVals.reduce((sum, r) => sum + r.mid_dead_percent!, 0) / midVals.length : 0;
        b.pct.late_dead_percent = lateVals.length > 0 ? 
          lateVals.reduce((sum, r) => sum + r.late_dead_percent!, 0) / lateVals.length : 0;
        b.pct.total_mortality_percent = totalMortVals.length > 0 ? 
          totalMortVals.reduce((sum, r) => sum + r.total_mortality_percent!, 0) / totalMortVals.length : 0;
        b.pct.hatch_percent = hatchVals.length > 0 ? 
          hatchVals.reduce((sum, r) => sum + r.hatch_percent!, 0) / hatchVals.length : 0;
        b.pct.hof_percent = hofVals.length > 0 ? 
          hofVals.reduce((sum, r) => sum + r.hof_percent!, 0) / hofVals.length : 0;
        b.pct.hoi_percent = hoiVals.length > 0 ? 
          hoiVals.reduce((sum, r) => sum + r.hoi_percent!, 0) / hoiVals.length : 0;
        b.pct.if_dev_percent = ifVals.length > 0 ? 
          ifVals.reduce((sum, r) => sum + r.if_dev_percent!, 0) / ifVals.length : 0;
        b.pct.cull_percent = cullVals.length > 0 ?
          cullVals.reduce((sum, r) => sum + r.cull_percent!, 0) / cullVals.length : 0;
        b.pct.live_pip_percent = livePipVals.length > 0 ? 
          livePipVals.reduce((sum, r) => sum + r.live_pip_percent!, 0) / livePipVals.length : 0;
        b.pct.dead_pip_percent = deadPipVals.length > 0 ? 
          deadPipVals.reduce((sum, r) => sum + r.dead_pip_percent!, 0) / deadPipVals.length : 0;
        b.pct.total_pip_percent = totalPipVals.length > 0 ? 
          totalPipVals.reduce((sum, r) => sum + r.total_pip_percent!, 0) / totalPipVals.length : 0;
        b.pct.embryonic_mortality_percent = embryonicMortVals.length > 0 ? 
          embryonicMortVals.reduce((sum, r) => sum + r.embryonic_mortality_percent!, 0) / embryonicMortVals.length : 0;
        
        b.pct.clear_pct = valsClr.length ? valsClr.reduce((a, c) => a + c, 0) / valsClr.length : 0;
        b.pct.injected_pct = valsInj.length ? valsInj.reduce((a, c) => a + c, 0) / valsInj.length : 0;
      }
      out.push(b);
    });
    out.sort((a,b)=>+a.date - +b.date);
    return out;
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
      bucket: b.bucketKey, date: b.date,
      total_eggs_set: b.count.total_eggs_set ?? 0,
      eggs_cleared: b.count.eggs_cleared ?? 0,
      eggs_injected: b.count.eggs_injected ?? 0,
      age_weeks: b.count.age_weeks ?? 0,
      fertile_eggs: b.count.fertile_eggs ?? 0,
      infertile_eggs: b.count.infertile_eggs ?? 0,
      early_dead: b.count.early_dead ?? 0,
      mid_dead: b.count.mid_dead ?? 0,
      late_dead: b.count.late_dead ?? 0,
      hatch_count: b.count.hatch_count ?? 0,
      sample_size: b.count.sample_size ?? 0,
      cull_chicks: b.count.cull_chicks ?? 0,
      live_pips: b.count.live_pips ?? 0,
      dead_pips: b.count.dead_pips ?? 0,
      total_pips: b.count.total_pips ?? 0,
      embryonic_mortality_count: b.count.embryonic_mortality_count ?? 0,
      clear_pct: b.pct.clear_pct ?? 0,
      injected_pct: b.pct.injected_pct ?? 0,
      fertility_percent: b.pct.fertility_percent ?? 0,
      early_dead_percent: b.pct.early_dead_percent ?? 0,
      mid_dead_percent: b.pct.mid_dead_percent ?? 0,
      late_dead_percent: b.pct.late_dead_percent ?? 0,
      total_mortality_percent: b.pct.total_mortality_percent ?? 0,
      hatch_percent: b.pct.hatch_percent ?? 0,
      hof_percent: b.pct.hof_percent ?? 0,
      hoi_percent: b.pct.hoi_percent ?? 0,
      if_dev_percent: b.pct.if_dev_percent ?? 0,
      cull_percent: b.pct.cull_percent ?? 0,
      live_pip_percent: b.pct.live_pip_percent ?? 0,
      dead_pip_percent: b.pct.dead_pip_percent ?? 0,
      total_pip_percent: b.pct.total_pip_percent ?? 0,
      embryonic_mortality_percent: b.pct.embryonic_mortality_percent ?? 0,
      rolling: rolling[i],
      _raw: b.raw,
    }));
  };

  /* Drill-down modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState<RawRow[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [activeFacet, setActiveFacet] = useState<string>("");

  useEffect(() => { if (facets.length && !facets.find(f=>f.key===activeFacet)) setActiveFacet(facets[0].key); }, [facets, activeFacet]);

  const openDrilldown = (bucket: any, _title: string) => {
    const raws = bucket._raw as RawRow[] | undefined;
    if (!raws || !raws.length) return;
    setModalRows(raws);
    setModalTitle(`Bucket: ${bucket.bucket}`);
    setModalOpen(true);
  };

  /* Export helpers */
  const exportBucketsCsv = () => {
    const all = facets.flatMap(f => chartDataForFacet(f.rows).map(b => ({ facet: f.title, ...b, _raw: undefined })));
    saveFile("embrex-buckets.csv", toCsv(all));
  };
  const { exportChartToPDF, exportMultipleChartsWithDescriptions } = useChartExport();
  
  const chartDescriptions = {
    hatchLine: "Hatch Percentage by Hatchery: This line chart displays hatch rate trends over time for each production facility. Higher percentages indicate better hatching performance. The hatch rate is calculated as (Chicks Hatched / Sample Size) × 100.",
    fertilityLine: "Fertility Percentage by Hatchery: This visualization shows fertility rates across all hatcheries over the selected time period. Fertility represents the proportion of viable eggs and is calculated as (Fertile Eggs / Total Eggs Set) × 100.",
    clearsBar: "Clears & Injected Analysis: This bar chart compares the volume of cleared eggs versus injected eggs by hatchery. Clears represent infertile eggs identified and removed during candling, while Injected shows eggs that proceeded through the incubation process.",
    mortality: "Embryonic Mortality Breakdown: This table provides a detailed analysis of mortality by developmental stage (Early Dead, Mid Dead, Late Dead) for each hatchery. Understanding mortality patterns helps identify potential issues in the incubation process.",
    donut: "Egg Distribution Overview: This donut chart illustrates the proportional distribution of total eggs set across all hatcheries, providing insight into production volume allocation.",
    compareChart: "Comparative Analysis: This visualization compares selected metrics across different facets (flocks, hatcheries, or combinations) to identify performance patterns and variations."
  };

  const exportFullReport = async () => {
    if (compareMode) {
      // Export compare mode charts
      const charts = facets.map((f, i) => ({
        id: `embrex-facet-chart-${i}`,
        title: `${f.title} - ${metricLabel[metrics[0]] || 'Analysis'}`,
        description: `${chartDescriptions.compareChart} This chart shows ${metrics.map(m => metricLabel[m]).join(', ')} for ${f.title}.`
      }));
      await exportMultipleChartsWithDescriptions(charts, 'Embrex-Timeline-Report.pdf');
    } else {
      // Export default dashboard panels
      const charts = [
        { id: 'hatch-line-chart', title: 'Hatch % by Hatchery', description: chartDescriptions.hatchLine },
        { id: 'fertility-line-chart', title: 'Fertility % by Hatchery', description: chartDescriptions.fertilityLine },
        { id: 'clears-bar-chart', title: 'Clears & Injected Analysis', description: chartDescriptions.clearsBar },
        { id: 'mortality-table', title: 'Mortality Breakdown', description: chartDescriptions.mortality },
        { id: 'donut-chart', title: 'Egg Distribution', description: chartDescriptions.donut }
      ];
      await exportMultipleChartsWithDescriptions(charts, 'Embrex-Timeline-Report.pdf');
    }
  };

  /* Saved views */
  const saveCurrentView = () => {
    if (!savedName.trim()) return;
    localStorage.setItem(`embrexView:${savedName}`, searchParams.toString());
    toast({ title: "Saved", description: `View "${savedName}" saved.` });
    setSavedName("");
  };
  const applySavedView = (name: string) => {
    const q = localStorage.getItem(`embrexView:${name}`);
    if (q) setSearchParams(new URLSearchParams(q));
  };

  /* Calculate dynamic Y-axis domain for percentage metrics */
  const calculateDynamicDomain = (data: any[], metricKeys: MetricKey[]): [number, number] => {
    const percentMetrics = metricKeys.filter(isPercentMetric);
    if (percentMetrics.length === 0) return [0, 100];
    
    let minVal = Infinity;
    let maxVal = -Infinity;
    
    data.forEach(d => {
      percentMetrics.forEach(m => {
        const val = d[m];
        if (typeof val === 'number' && !isNaN(val)) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      });
    });
    
    if (minVal === Infinity || maxVal === -Infinity) return [0, 100];
    
    const range = maxVal - minVal;
    const padding = range * 0.1;
    const domainMin = Math.max(0, Math.floor((minVal - padding) / 5) * 5);
    const domainMax = Math.min(100, Math.ceil((maxVal + padding * 2) / 5) * 5);
    
    return [domainMin, domainMax];
  };

  /* Chart renderer */
  const renderChart = (data: any[], _facetTitle: string) => {
    const commonMargin = { top: 10, right: 20, left: 10, bottom: 10 };
    const dynamicDomain = calculateDynamicDomain(data, metrics);
    const benchNum = typeof benchmark === "number" ? benchmark : undefined;
    const showBenchmark = benchNum !== undefined && benchNum >= dynamicDomain[0] && benchNum <= dynamicDomain[1];

    if (viz === "timeline_bar" || viz === "timeline_line") {
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={commonMargin} onClick={(e: any) => e?.activePayload?.[0]?.payload && openDrilldown(e.activePayload[0].payload, _facetTitle)}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
              {metrics.some(isPercentMetric) && (
                <YAxis yAxisId="right" orientation="right" domain={dynamicDomain} tick={{ fontSize: 11 }} />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {showBenchmark && <ReferenceLine y={benchNum} yAxisId="right" stroke="#64748b" strokeDasharray="5 5" />}
              {metrics.map((m, idx) => {
                const color = PALETTE[idx % PALETTE.length];
                const yAxis = isPercentMetric(m) ? "right" : "left";
                return viz === "timeline_bar"
                  ? <Bar key={m} dataKey={m} yAxisId={yAxis} fill={color} radius={[4,4,0,0]} name={metricLabel[m]} />
                  : <Line key={m} type="monotone" dataKey={m} yAxisId={yAxis} stroke={color} strokeWidth={2} dot={{ r: 2 }} name={metricLabel[m]} />;
              })}
              {rollingAvg && (
                <Line
                  type="monotone"
                  dataKey="rolling"
                  yAxisId={isPercentMetric(metrics[0] ?? "total_eggs_set") ? "right" : "left"}
                  stroke="#64748b"
                  dot={false}
                  strokeDasharray="5 5"
                  name="Rolling Avg"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "donut") {
      // Aggregate data for donut chart
      const aggregated: Record<string, number> = {};
      metrics.forEach(m => {
        aggregated[m] = data.reduce((sum, d) => sum + (d[m] ?? 0), 0);
      });
      const pieData = Object.entries(aggregated).map(([key, value], idx) => ({
        name: metricLabel[key as MetricKey] || key,
        value: isPercentMetric(key as MetricKey) ? value / Math.max(data.length, 1) : value,
        color: PALETTE[idx % PALETTE.length],
      }));

      return (
        <div className="h-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="75%"
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "heatmap") {
      const months = Array.from(new Set(data.map((d:any)=>d.bucket)));
      const allRaw: RawRow[] = data.flatMap((d:any)=> d._raw ?? []);
      const byUnit: Record<string, Record<string, number>> = {};
      const g = granularity; const fmt = (dt:string)=> fmtBucketLabel(startOfBucket(new Date(dt), g), g);
      allRaw.forEach(r=>{
        const b = fmt(r.set_date);
        byUnit[r.unit_name] = byUnit[r.unit_name] || {};
        byUnit[r.unit_name][b] = (byUnit[r.unit_name][b] || 0) + (r.total_eggs_set || 0);
      });
      const maxVal = Math.max(0, ...Object.values(byUnit).flatMap(x=>Object.values(x)));
      
      const getHeatColor = (value: number, max: number) => {
        if (!value || !max) return '#f8fafc';
        const intensity = value / max;
        if (intensity < 0.25) return '#fef3c7';
        if (intensity < 0.5) return '#fed7aa';
        if (intensity < 0.65) return '#fdba74';
        if (intensity < 0.8) return '#fb923c';
        if (intensity < 0.9) return '#f97316';
        return '#ea580c';
      };

      return (
        <div className="space-y-3 h-full overflow-auto">
          <div className="inline-block min-w-full">
            <div className="grid gap-2" style={{ gridTemplateColumns: `160px repeat(${months.length}, minmax(60px, 1fr))` }}>
              <div className="text-sm font-semibold text-foreground sticky left-0 bg-background py-2">Hatchery</div>
              {months.map((mo) => (
                <div key={mo} className="text-xs font-medium text-muted-foreground text-center py-2" title={mo}>
                  {mo}
                </div>
              ))}
              
              {Object.entries(byUnit).map(([u, m])=>(
                <>
                  <div key={`${u}-label`} className="text-sm py-3 font-medium sticky left-0 bg-background" title={u}>
                    {u || "—"}
                  </div>
                  {months.map((mo)=> {
                    const v = m[mo] || 0;
                    const bgColor = getHeatColor(v, maxVal);
                    return (
                      <div 
                        key={`${u}-${mo}`} 
                        className="h-16 rounded-md border border-border flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
                        style={{ backgroundColor: bgColor }}
                        title={`${u} • ${mo}: ${v.toLocaleString()} eggs`}
                      >
                        <span className="text-xs font-semibold text-foreground">
                          {v > 0 ? (v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toLocaleString()) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4 pt-3 border-t bg-background">
            <span className="text-sm font-medium text-foreground">Intensity:</span>
            <div className="flex items-center gap-2">
              {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                <div key={intensity} className="flex items-center gap-1.5">
                  <div 
                    className="w-10 h-6 rounded border border-border"
                    style={{ backgroundColor: getHeatColor(intensity * maxVal, maxVal) }}
                  />
                  <span className="text-xs text-muted-foreground min-w-[40px]">
                    {intensity === 0 ? 'Low' : intensity === 1 ? 'High' : `${(intensity*100).toFixed(0)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     DEFAULT DASHBOARD (when Compare is OFF) - Fixed 4-panel layout
     ═══════════════════════════════════════════════════════════════════════════ */
  
  // Get data aggregated by hatchery for the default dashboard
  const hatcheryData = useMemo(() => {
    const byHatchery: Record<string, { 
      hatch_percent: number[], 
      fertility_percent: number[],
      eggs_cleared: number,
      eggs_injected: number,
      early_dead: number,
      mid_dead: number,
      late_dead: number,
      count: number 
    }> = {};
    
    baseFilteredRows.forEach(r => {
      const unit = r.unit_name || "Unknown";
      if (!byHatchery[unit]) {
        byHatchery[unit] = { 
          hatch_percent: [], 
          fertility_percent: [],
          eggs_cleared: 0,
          eggs_injected: 0,
          early_dead: 0,
          mid_dead: 0,
          late_dead: 0,
          count: 0 
        };
      }
      if (r.hatch_percent) byHatchery[unit].hatch_percent.push(r.hatch_percent);
      if (r.fertility_percent) byHatchery[unit].fertility_percent.push(r.fertility_percent);
      byHatchery[unit].eggs_cleared += r.eggs_cleared ?? 0;
      byHatchery[unit].eggs_injected += r.eggs_injected ?? 0;
      byHatchery[unit].early_dead += r.early_dead ?? 0;
      byHatchery[unit].mid_dead += r.mid_dead ?? 0;
      byHatchery[unit].late_dead += r.late_dead ?? 0;
      byHatchery[unit].count++;
    });
    
    return byHatchery;
  }, [baseFilteredRows]);

  // Line chart data for Hatch % by hatchery (separate chart)
  const hatchLineData = useMemo(() => {
    const buckets = buildBuckets(baseFilteredRows);
    return buckets.map(b => {
      const result: any = { bucket: b.bucketKey };
      const byUnit: Record<string, number[]> = {};
      
      b.raw.forEach(r => {
        const unit = r.unit_name || "Unknown";
        if (!byUnit[unit]) byUnit[unit] = [];
        if (r.hatch_percent) byUnit[unit].push(r.hatch_percent);
      });
      
      Object.entries(byUnit).forEach(([unit, data]) => {
        result[unit] = data.length ? data.reduce((a,b)=>a+b,0)/data.length : 0;
      });
      
      return result;
    });
  }, [baseFilteredRows, granularity, percentAgg]);

  // Line chart data for Fertility % by hatchery (separate chart)
  const fertilityLineData = useMemo(() => {
    const buckets = buildBuckets(baseFilteredRows);
    return buckets.map(b => {
      const result: any = { bucket: b.bucketKey };
      const byUnit: Record<string, number[]> = {};
      
      b.raw.forEach(r => {
        const unit = r.unit_name || "Unknown";
        if (!byUnit[unit]) byUnit[unit] = [];
        if (r.fertility_percent) byUnit[unit].push(r.fertility_percent);
      });
      
      Object.entries(byUnit).forEach(([unit, data]) => {
        result[unit] = data.length ? data.reduce((a,b)=>a+b,0)/data.length : 0;
      });
      
      return result;
    });
  }, [baseFilteredRows, granularity, percentAgg]);

  // Bar chart data for Clears & Injected
  const clearsInjectedData = useMemo(() => {
    return Object.entries(hatcheryData).map(([unit, data]) => ({
      hatchery: unit,
      Clears: data.eggs_cleared,
      Injected: data.eggs_injected,
    }));
  }, [hatcheryData]);

  // Table data for Early, Mid, Late Dead
  const mortalityTableData = useMemo(() => {
    return Object.entries(hatcheryData).map(([unit, data]) => ({
      hatchery: unit,
      earlyDead: data.early_dead,
      midDead: data.mid_dead,
      lateDead: data.late_dead,
      total: data.early_dead + data.mid_dead + data.late_dead,
    }));
  }, [hatcheryData]);

  // Donut data - distribution of eggs across hatcheries
  const donutData = useMemo(() => {
    return Object.entries(hatcheryData).map(([unit, data], idx) => ({
      name: unit,
      value: data.eggs_cleared + data.eggs_injected,
      color: HATCHERY_COLORS[unit] || PALETTE[idx % PALETTE.length],
    }));
  }, [hatcheryData]);

  const renderDefaultDashboard = () => {
    const hatcheries = Object.keys(hatcheryData);
    
    return (
      <div className="grid grid-cols-3 grid-rows-2 gap-3 h-full p-2">
        {/* Line Chart - Hatch % by Hatchery */}
        <Card id="hatch-line-chart" className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Hatch % by Hatchery
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hatchLineData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {hatcheries.map((unit, idx) => (
                  <Line
                    key={unit}
                    type="monotone"
                    dataKey={unit}
                    stroke={HATCHERY_COLORS[unit] || PALETTE[idx % PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={`${unit} Hatch %`}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Fertility % by Hatchery */}
        <Card id="fertility-line-chart" className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Fertility % by Hatchery
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fertilityLineData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {hatcheries.map((unit, idx) => (
                  <Line
                    key={unit}
                    type="monotone"
                    dataKey={unit}
                    stroke={HATCHERY_COLORS[unit] || PALETTE[idx % PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={`${unit} Fertility %`}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Clears & Injected */}
        <Card id="clears-bar-chart" className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-600" />
              Clears & Injected by Hatchery
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={clearsInjectedData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="hatchery" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Clears" fill="#f59e0b" radius={[4,4,0,0]} name="Clears" />
                <Bar dataKey="Injected" fill="#10b981" radius={[4,4,0,0]} name="Injected" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Table - Early, Mid, Late Dead */}
        <Card id="mortality-table" className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-600" />
              Mortality Breakdown by Hatchery
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Hatchery</TableHead>
                  <TableHead className="text-xs text-right">Early Dead</TableHead>
                  <TableHead className="text-xs text-right">Mid Dead</TableHead>
                  <TableHead className="text-xs text-right">Late Dead</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mortalityTableData.map((row) => (
                  <TableRow key={row.hatchery}>
                    <TableCell className="text-xs font-medium">{row.hatchery}</TableCell>
                    <TableCell className="text-xs text-right">{row.earlyDead.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right">{row.midDead.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right">{row.lateDead.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{row.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Donut Chart - Distribution (spans 2 columns) */}
        <Card id="donut-chart" className="flex flex-col col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-purple-600" />
              Egg Distribution by Hatchery
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="65%"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  /* Active facet & basic stats */
  const activeFacetObj = facets.find(f => f.key === activeFacet) || facets[0];
  const activeData = activeFacetObj ? chartDataForFacet(activeFacetObj.rows) : [];

  const filterCount = (() => {
    let n = 0;
    if (facetBy !== DEFAULTS.facetBy) n++;
    if (selectedFlocks.length) n++;
    if (selectedUnits.length) n++;
    if (granularity !== DEFAULTS.scale) n++;
    if (metrics.join(",") !== DEFAULTS.metrics.join(",")) n++;
    if (dateFrom || dateTo) n++;
    if (percentAgg !== DEFAULTS.pctAgg || rollingAvg || benchmark !== "") n++;
    if (viz !== DEFAULTS.viz) n++;
    if (compareMode) n++;
    return n;
  })();

  /* Dynamic grid layout for compare mode */
  const getGridLayout = (count: number) => {
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 3;
  };

  /* Welcome Screen Component */
  const WelcomeScreen = () => (
    <div className="h-screen w-full flex items-center justify-center bg-background overflow-hidden">
      <div className="max-w-5xl mx-auto px-8">
        <div 
          className={`transition-all duration-1000 ease-out ${
            welcomeStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <div className="p-4 rounded-lg border border-border bg-card">
                <TrendingUp className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            
            <h1 className="text-5xl font-semibold text-foreground mb-4 tracking-tight">
              Timeline Analysis
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Advanced visualization and analytics platform for comprehensive hatchery data insights
            </p>
          </div>

          <div 
            className={`transition-all duration-1000 ease-out delay-300 ${
              welcomeStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Card className="max-w-2xl mx-auto shadow-sm border">
              <CardContent className="p-8">
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Select your preferred visualization method and configure metrics to begin data exploration
                </p>
                
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {[
                    { label: "Live Tracking", icon: Radio, path: "/live-tracking" },
                    { label: "Machine Utilization", icon: Settings, path: "/machine-utilization" },
                    { label: "House Flow", icon: GitBranch, path: "/house-flow" },
                    { label: "Age Based Performance", icon: TrendingUp, path: "/process-flow?tab=age-analysis" }
                  ].map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div 
                        key={feature.label}
                        onClick={() => navigate(feature.path)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                        <span className="text-xs text-center text-muted-foreground font-medium">
                          {feature.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <Button 
                  onClick={() => setShowWelcome(false)}
                  className="w-full h-11"
                  variant="default"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Access Analytics Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  /* Sidebar dropdown state */
  const metricsCardRef = useRef<HTMLDivElement>(null);
  const [metricsOpen, setMetricsOpen] = useState(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!metricsOpen) return;
      const t = e.target as Node;
      const insideMet = metricsCardRef.current?.contains(t);
      if (!insideMet) {
        setMetricsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [metricsOpen]);

  if (showWelcome) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="h-full w-full grid" style={{ gridTemplateColumns: sidebarOpen ? "320px 1fr" : "0px 1fr" }}>
        {/* Sidebar */}
        <aside className={`h-full border-r bg-white/80 backdrop-blur overflow-y-auto ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="p-3 space-y-3">
            {/* Metrics (collapsible) - Only shown in compare mode */}
            {compareMode && (
              <Card ref={metricsCardRef} className="shadow-sm border-0">
                <button type="button" onClick={() => setMetricsOpen(o=>!o)} aria-expanded={metricsOpen} className="w-full text-left">
                  <CardHeader className="pb-2 flex-row items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    <CardTitle className="text-sm font-semibold flex-1">Metrics</CardTitle>
                    {metricsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CardHeader>
                </button>
                {metricsOpen && (
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <Checkbox 
                        id="fertilityToggle"
                        checked={showFertilityMetrics}
                        onCheckedChange={(c) => setShowFertilityMetrics(Boolean(c))}
                      />
                      <label htmlFor="fertilityToggle" className="text-xs font-medium cursor-pointer">
                        Show Fertility & Mortality Metrics
                      </label>
                    </div>
                    
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {(showFertilityMetrics ? FERTILITY_METRICS : BASIC_METRICS).map((m) => {
                        const checked = metrics.includes(m);
                        return (
                          <div
                            key={m}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                              checked ? "bg-primary/10" : "hover:bg-muted"
                            }`}
                            onClick={() => {
                              setMetrics(prev =>
                                checked ? prev.filter(x => x !== m) : [...prev, m]
                              );
                            }}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              checked ? "bg-primary border-primary" : "border-muted-foreground"
                            }`}>
                              {checked && <span className="text-primary-foreground text-xs">✓</span>}
                            </div>
                            <span className="text-xs">{metricLabel[m]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Facet By */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Grid2X2 className="h-4 w-4 text-orange-600" />
                  Facet By
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={facetBy} onValueChange={(v: FacetMode) => setFacetBy(v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flock">Flock</SelectItem>
                    <SelectItem value="unit">Hatchery</SelectItem>
                    <SelectItem value="flock_unit">Flock × Hatchery (Common)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Flocks */}
                <div className="rounded-md border">
                  <div className="px-3 py-2 border-b text-sm font-medium">Flocks</div>
                  <Command className="p-0">
                    <CommandInput placeholder="Search flocks…" />
                    <CommandList className="max-h-44 overflow-auto">
                      <CommandEmpty>No flocks.</CommandEmpty>
                      <CommandGroup>
                        {flocksList.map(f=>{
                          const checked = selectedFlocks.includes(f.num);
                          return (
                            <CommandItem
                              key={f.num}
                              value={String(f.num)}
                              onSelect={()=>setSelectedFlocks(prev => checked ? prev.filter(x=>x!==f.num) : [...prev, f.num])}
                            >
                              <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                {checked && <span className="block w-2 h-2 bg-primary-foreground rounded-sm" />}
                              </div>
                              <span>#{f.num} — {f.name}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>

                {/* Hatcheries */}
                <div className="rounded-md border">
                  <div className="px-3 py-2 border-b text-sm font-medium">Hatcheries</div>
                  <Command className="p-0">
                    <CommandInput placeholder="Search hatcheries…" />
                    <CommandList className="max-h-44 overflow-auto">
                      <CommandEmpty>No hatcheries.</CommandEmpty>
                      <CommandGroup>
                        {units.map(u=>{
                          const checked = selectedUnits.includes(u);
                          return (
                            <CommandItem
                              key={u}
                              value={u}
                              onSelect={()=>setSelectedUnits(prev => checked ? prev.filter(x=>x!==u) : [...prev, u])}
                            >
                              <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                {checked && <span className="block w-2 h-2 bg-primary-foreground rounded-sm" />}
                              </div>
                              <span>{u}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              </CardContent>
            </Card>

            {/* Settings + Date Range */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-purple-600" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Time Scale</label>
                  <Select value={granularity} onValueChange={(v:Granularity)=>setGranularity(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Percent aggregation</label>
                  <Select value={percentAgg} onValueChange={(v:PercentAgg)=>setPercentAgg(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted">Weighted</SelectItem>
                      <SelectItem value="unweighted">Unweighted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {compareMode && (
                  <>
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">Benchmark %</label>
                      <Input
                        type="number"
                        placeholder="e.g. 95"
                        value={benchmark}
                        onChange={(e) => setBenchmark(e.target.value === "" ? "" : Number(e.target.value))}
                        className="h-8"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="rolling" checked={rollingAvg} onCheckedChange={(v)=>setRollingAvg(Boolean(v))}/>
                      <label htmlFor="rolling" className="text-xs text-slate-600">Show rolling average (3 buckets)</label>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t">
                  <div className="text-xs text-slate-600 mb-1">Date Range</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["30d", 30], ["90d", 90], ["180d", 180], ["365d", 365]
                    ].map(([label, days]) => (
                      <Button
                        key={label as string}
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={()=>{
                          const to = new Date(); const from = new Date(); from.setDate(to.getDate() - (days as number));
                          setDateFrom(from.toISOString().slice(0,10)); setDateTo(to.toISOString().slice(0,10));
                        }}
                      >
                        {label as string}
                      </Button>
                    ))}
                    <Button
                      variant="outline" size="sm" className="h-7"
                      onClick={()=>{
                        const to = new Date(); const from = new Date(to.getFullYear(), 0, 1);
                        setDateFrom(from.toISOString().slice(0,10)); setDateTo(to.toISOString().slice(0,10));
                      }}
                    >
                      YTD
                    </Button>
                    <Button variant="outline" size="sm" className="h-7" onClick={()=>{setDateFrom(""); setDateTo("");}}>
                      All time
                    </Button>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Input type="date" className="h-8" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
                    <Input type="date" className="h-8" value={dateTo}   onChange={(e)=>setDateTo(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main content */}
        <main className="h-full overflow-hidden">
          <div className="h-full p-3">
            <Card className="h-full shadow-xl border-0 bg-white/90 backdrop-blur flex flex-col">
              <CardHeader className="flex-none pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2" onClick={()=>setSidebarOpen(v=>!v)}>
                      {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                      {sidebarOpen ? "Hide Filters" : "Show Filters"}
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <div>
                      <CardTitle className="text-xl">
                        {compareMode ? "Compare Mode" : "Hatchery Overview"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {compareMode ? "Side-by-side comparison" : "Summary view across all hatcheries"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Visualization Dropdown */}
                    <Select value={viz} onValueChange={(v: VizKind) => setViz(v)}>
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue placeholder="Chart type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="timeline_line">Line Graph</SelectItem>
                        <SelectItem value="timeline_bar">Bar Chart</SelectItem>
                        <SelectItem value="donut">Donut Chart</SelectItem>
                        <SelectItem value="heatmap">Heatmap</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-border" />

                    <Button variant={compareMode ? "default" : "outline"} size="sm" className="gap-1"
                      onClick={()=>setCompareMode(v=>!v)}>
                      <LayoutGrid className="h-4 w-4" />
                      {compareMode ? "Compare: On" : "Compare: Off"}
                    </Button>
                    {compareMode && (
                      <Select value={String(compareCols)} onValueChange={(v)=>setCompareCols(Number(v))}>
                        <SelectTrigger className="h-8 w-[100px]"><SelectValue placeholder="Cols" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 col</SelectItem>
                          <SelectItem value="2">2 cols</SelectItem>
                          <SelectItem value="3">3 cols</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <div className="h-6 w-px bg-border" />

                    {filterCount > 0 && <Badge variant="secondary">{filterCount} filters</Badge>}
                    <Button variant="outline" size="sm" className="gap-2" onClick={exportBucketsCsv}>
                      <Download className="h-4 w-4" /> CSV
                    </Button>
                    <Button variant="default" size="sm" className="gap-2" onClick={exportFullReport}>
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.assign(window.location.pathname)}>
                      <RefreshCw className="h-4 w-4" /> Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 pt-0 overflow-auto">
                <div className="w-full min-h-full bg-white rounded-lg border border-slate-200">
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <>
                      {compareMode ? (
                        <div
                          className="grid gap-3 p-2 auto-rows-[300px]"
                          style={{ gridTemplateColumns: `repeat(${getGridLayout(facets.length)}, minmax(0,1fr))` }}
                        >
                          {facets.map((f, idx) => {
                            const data = chartDataForFacet(f.rows);
                            return (
                              <div key={f.key} className="flex flex-col min-h-0 border rounded-lg" id={`embrex-facet-chart-${idx}`}>
                                <div className="px-3 py-2 text-xs font-medium border-b bg-slate-50 truncate">{f.title}</div>
                                <div className="flex-1 min-h-0">{renderChart(data, f.title)}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full" id="embrex-timeline-main-chart">
                          {renderDefaultDashboard()}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

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
                  <th className="py-2 pr-2">House</th>
                  <th className="py-2 pr-2">Flock</th>
                  <th className="py-2 pr-2">Hatchery</th>
                  <th className="py-2 pr-2">Set date</th>
                  <th className="py-2 pr-2 text-right">Eggs set</th>
                  <th className="py-2 pr-2 text-right">Clears</th>
                  <th className="py-2 pr-2 text-right">Injected</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {modalRows.map(r=>(
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
