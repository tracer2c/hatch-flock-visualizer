import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ── shadcn/ui ─────────────────────────────────────────────────────────────── */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

/* ── Icons ─────────────────────────────────────────────────────────────────── */
import {
  Activity, BarChart3, TrendingUp, Calendar as CalendarIcon, Settings,
  Download, RefreshCw, Grid2X2, Save, X, PanelLeftClose, PanelLeftOpen, LayoutGrid,
  Monitor, ChevronDown, ChevronRight
} from "lucide-react";

/* ── Recharts ──────────────────────────────────────────────────────────────── */
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid, Area, AreaChart
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
  | "injected_pct";
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
}
interface BucketRow {
  bucketKey: string;
  date: Date;
  count: { age_weeks?: number; total_eggs_set?: number; eggs_cleared?: number; eggs_injected?: number };
  pct: { clear_pct?: number; injected_pct?: number };
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

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#059669", "#fb7185", "#22c55e", "#a78bfa"];

type VizKind =
  | "timeline_bar"
  | "timeline_line"
  | "stacked_counts"
  | "percent_trends"
  | "sparklines"
  | "age_distribution"
  | "heatmap";

const VIZ_LABEL: Record<VizKind, string> = {
  timeline_bar: "Timeline – Bar",
  timeline_line: "Timeline – Line",
  stacked_counts: "Stacked Counts",
  percent_trends: "Percent Trends",
  sparklines: "Sparklines",
  age_distribution: "Age Distribution",
  heatmap: "Heatmap (month×unit)",
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

export default function EmbrexDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Data */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);

  /* Controls state (synced to URL) */
  const [granularity, setGranularity] = useState<Granularity>(() =>
    validScale(searchParams.get("scale")) ? (searchParams.get("scale") as Granularity) : DEFAULTS.scale
  );
  const [metrics, setMetrics] = useState<MetricKey[]>(() => {
    const m = (searchParams.get("metrics") ?? "").split(",").filter(Boolean) as MetricKey[];
    return m.length ? m : DEFAULTS.metrics;
  });
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

  /* Load data */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("batches")
          .select(`
            id, batch_number, total_eggs_set, eggs_cleared, eggs_injected, set_date, status,
            units ( name ),
            flocks!inner(flock_number, flock_name, age_weeks)
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
    setSearchParams(sp, { replace: true });
  }, [
    granularity, metrics, facetBy, selectedFlocks, selectedUnits, dateFrom, dateTo,
    percentAgg, rollingAvg, benchmark, viz, compareMode, compareCols, sidebarOpen, setSearchParams
  ]);

  /* Derived lists */
  const units = useMemo(
    () => Array.from(new Set(rows.map(r => (r.unit_name || "").trim()).filter(Boolean))).sort(),
    [rows]
  );
  const flocksList = useMemo(() => {
    const uniq = new Map<number, string>();
    rows.forEach(r => { if (!uniq.has(r.flock_number)) uniq.set(r.flock_number, r.flock_name); });
    return [...uniq.entries()].sort((a,b)=>a[0]-b[0]).map(([num,name])=>({num, name}));
  }, [rows]);
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

  /* Facets */
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
      return list.map(u => ({ key: `U-${u}`, title: `Unit: ${u}`, rows: data.filter(r => (r.unit_name||"").toLowerCase() === u.toLowerCase()) }));
    }
    const flockList = selectedFlocks.length ? selectedFlocks : Array.from(new Set(data.map(r => r.flock_number)));
    const unitList = selectedUnits.length ? selectedUnits : Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[]));
    const out: Facet[] = [];
    for (const f of flockList) for (const u of unitList) {
      out.push({
        key: `FU-${f}-${u}`,
        title: `Flock #${f} — ${flocksMap.get(f) ?? ""} • Unit: ${u}`,
        rows: data.filter(r => r.flock_number === f && (r.unit_name||"").toLowerCase() === u.toLowerCase()),
      });
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
      clear_pct: b.pct.clear_pct ?? 0,
      injected_pct: b.pct.injected_pct ?? 0,
      rolling: rollingAvg ? rolling[i] : undefined,
      _raw: b.raw,
    }));
  };

  /* Drill-down modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState<RawRow[]>([]);
  const openDrill = (facetTitle: string, bucketLabel: string, raw: RawRow[]) => {
    setModalTitle(`${facetTitle} • ${bucketLabel}`); setModalRows(raw); setModalOpen(true);
  };

  /* Export / Saved Views */
  const exportBucketsCsv = () => {
    const out: Record<string, any>[] = [];
    (compareMode ? facets : [facets.find(f=>true)!]).forEach(f => {
      const dat = chartDataForFacet(f.rows);
      dat.forEach(r => out.push({
        facet: f.title, bucket: r.bucket,
        total_eggs_set: r.total_eggs_set, eggs_cleared: r.eggs_cleared, eggs_injected: r.eggs_injected,
        clear_pct: r.clear_pct, injected_pct: r.injected_pct, rolling: r.rolling ?? ""
      }));
    });
    saveFile("embrex_timeline.csv", toCsv(out));
  };
  const saveCurrentView = () => {
    if (!savedName.trim()) { toast({ title: "Name required", description: "Provide a name to save this view." }); return; }
    localStorage.setItem(`embrexView:${savedName.trim()}`, searchParams.toString());
    toast({ title: "View saved", description: `"${savedName}" saved.` }); setSavedName("");
  };
  const applySavedView = (name: string) => {
    const qs = localStorage.getItem(`embrexView:${name}`);
    if (!qs) return toast({ title: "Not found", description: "Saved view does not exist.", variant: "destructive" });
    const url = new URL(window.location.href); url.search = qs; window.location.assign(url.toString());
  };

  /* Metric palette */
  const metricOptions = [
    { value: "total_eggs_set", label: "Total Eggs", color: PALETTE[0] },
    { value: "eggs_cleared",   label: "Clears",     color: PALETTE[1] },
    { value: "eggs_injected",  label: "Injected",   color: PALETTE[2] },
    { value: "clear_pct",      label: "Clear %",    color: PALETTE[3] },
    { value: "injected_pct",   label: "Injected %", color: PALETTE[4] },
    { value: "age_weeks",      label: "Age (w)",    color: PALETTE[5] },
  ] as const;

  /* Facet tabs state */
  const [activeFacet, setActiveFacet] = useState<string>("ALL");
  useEffect(() => {
    if (!facets.find(f => f.key === activeFacet)) {
      setActiveFacet(facets[0]?.key ?? "ALL");
    }
  }, [facets, activeFacet]);

  /* ─────────────── Chart renderer (fills container; no hardcoded height) ─────────────── */
  const renderChart = (data: any[], facetTitle: string) => {
    const commonMargin = { top: 8, right: 16, left: 8, bottom: 8 };

    if (viz === "timeline_bar" || viz === "timeline_line") {
      const isBar = viz === "timeline_bar";
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={commonMargin}
              onClick={(e:any)=>{ if (!e?.activePayload?.length) return; const p=e.activePayload[0]?.payload; if (!p) return; openDrill(facetTitle, p.bucket as string, p._raw as RawRow[]); }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {benchmark !== "" && Number.isFinite(Number(benchmark)) && (
                <ReferenceLine
                  yAxisId="right"
                  y={Number(benchmark)}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={`Target ${benchmark}%`}
                />
              )}
              {metrics.map((m, i) => {
                const color = metricOptions.find(mm => mm.value === m)?.color || PALETTE[i % PALETTE.length];
                const yAxis = isPercentMetric(m) ? "right" : "left";
                return isBar
                  ? <Bar key={m} dataKey={m} yAxisId={yAxis} fill={color} radius={[6,6,0,0]} name={metricLabel[m]} />
                  : <Line key={m} type="monotone" dataKey={m} yAxisId={yAxis} stroke={color} strokeWidth={3} dot={{ r: 3 }} name={metricLabel[m]} />;
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

    if (viz === "stacked_counts") {
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
              <Bar dataKey="total_eggs_set" stackId="a" fill={PALETTE[0]} name="Total Eggs" />
              <Bar dataKey="eggs_cleared"  stackId="a" fill={PALETTE[2]} name="Clears" />
              <Bar dataKey="eggs_injected" stackId="a" fill={PALETTE[1]} name="Injected" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "percent_trends") {
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" /><YAxis domain={[0,100]} /><Tooltip /><Legend />
              <Area type="monotone" dataKey="clear_pct" stroke={PALETTE[3]} fill={PALETTE[3]} fillOpacity={0.25} strokeWidth={2} name="Clear %" />
              <Area type="monotone" dataKey="injected_pct" stroke={PALETTE[4]} fill={PALETTE[4]} fillOpacity={0.25} strokeWidth={2} name="Injected %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "sparklines") {
      const keys: MetricKey[] = ["total_eggs_set","clear_pct","injected_pct"];
      return (
        <div className="grid gap-3 md:grid-cols-3 h-full">
          {keys.map((k, i)=>(
            <div key={k} className="p-2 border rounded-md flex flex-col min-h-0">
              <div className="text-xs text-muted-foreground mb-1">{metricLabel[k]}</div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={commonMargin}>
                    <XAxis dataKey="bucket" hide />
                    <YAxis hide domain={isPercentMetric(k) ? [0,100] : ["auto","auto"]} />
                    <Area type="monotone" dataKey={k} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (viz === "age_distribution") {
      return (
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={commonMargin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="age_weeks" fill="#94a3b8" radius={[6,6,0,0]} />
            </ComposedChart>
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
      const scale = (v: number, max: number) => max ? Math.round((v/max)*90)+10 : 0;
      const maxVal = Math.max(0, ...Object.values(byUnit).flatMap(x=>Object.values(x)));

      return (
        <div className="grid gap-2 h-full" style={{ gridTemplateColumns: "160px 1fr" }}>
          <div className="text-xs text-muted-foreground">Unit</div>
          <div className="text-xs text-muted-foreground">Time buckets</div>
          {Object.entries(byUnit).map(([u, m], idx)=>(
            <div key={u} className="contents">
              <div className="text-xs py-1">{u || "—"}</div>
              <div className="flex gap-1 items-end">
                {months.map((mo)=> {
                  const v = m[mo] || 0; const h = scale(v, maxVal);
                  return <div key={mo} className="w-6 rounded" style={{ height: h, background: PALETTE[idx % PALETTE.length], opacity: v ? 0.7 : 0.1 }} title={`${u} • ${mo}: ${v.toLocaleString()}`} />;
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  /* Active facet & basic stats */
  const activeFacetObj = facets.find(f => f.key === activeFacet) || facets[0];
  const activeData = activeFacetObj ? chartDataForFacet(activeFacetObj.rows) : [];
  const totalEggs = activeData.reduce((a,c)=>a+(c.total_eggs_set||0),0);
  const avgClear = activeData.length ? (activeData.reduce((a,c)=>a+(c.clear_pct||0),0)/activeData.length) : 0;
  const avgInj = activeData.length ? (activeData.reduce((a,c)=>a+(c.injected_pct||0),0)/activeData.length) : 0;
  const avgAge = activeData.length ? (activeData.reduce((a,c)=>a+(c.age_weeks||0),0)/activeData.length) : 0;

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

  /* ── Sidebar dropdown (collapsible) state + outside click close ─────────── */
  const vizCardRef = useRef<HTMLDivElement>(null);
  const metricsCardRef = useRef<HTMLDivElement>(null);
  const [vizOpen, setVizOpen] = useState(false);       // collapsed by default
  thead
  const [metricsOpen, setMetricsOpen] = useState(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!(vizOpen || metricsOpen)) return;
      const t = e.target as Node;
      const insideViz = vizCardRef.current?.contains(t);
      const insideMet = metricsCardRef.current?.contains(t);
      if (!insideViz && !insideMet) {
        setVizOpen(false);
        setMetricsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [vizOpen, metricsOpen]);

  /* ─────────────────────────────── SHELL (no top header) ──────────────────── */
  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="h-full w-full grid" style={{ gridTemplateColumns: sidebarOpen ? "320px 1fr" : "0px 1fr" }}>
        {/* Sidebar (full height, scrollable) */}
        <aside className={`h-full border-r bg-white/80 backdrop-blur overflow-y-auto ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="p-3 space-y-3">
            {/* Visualization (collapsible) */}
            <Card ref={vizCardRef} className="shadow-sm border-0">
              <button type="button" onClick={() => { setVizOpen(o=>!o); setMetricsOpen(false); }} aria-expanded={vizOpen} className="w-full text-left">
                <CardHeader className="pb-2 flex-row items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold flex-1">Visualization</CardTitle>
                  {vizOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CardHeader>
              </button>
              {vizOpen && (
                <CardContent className="space-y-2 pt-0">
                  {([
                    { value: "timeline_bar", label: "Timeline Bar", icon: BarChart3 },
                    { value: "timeline_line", label: "Timeline Line", icon: TrendingUp },
                    { value: "stacked_counts", label: "Stacked Counts", icon: BarChart3 },
                    { value: "percent_trends", label: "Percent Trends", icon: Activity },
                    { value: "sparklines", label: "Sparklines", icon: Activity },
                    { value: "age_distribution", label: "Age Distribution", icon: Activity },
                    { value: "heatmap", label: "Heatmap", icon: Activity },
                  ] as Array<{value: VizKind; label: string; icon: any}>).map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <Button
                        key={opt.value}
                        variant={viz === opt.value ? "default" : "ghost"}
                        className="w-full justify-start gap-2"
                        onClick={() => setViz(opt.value)}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </Button>
                    );
                  })}
                </CardContent>
              )}
            </Card>

            {/* Metrics (collapsible) */}
            <Card ref={metricsCardRef} className="shadow-sm border-0">
              <button type="button" onClick={() => { setMetricsOpen(o=>!o); setVizOpen(false); }} aria-expanded={metricsOpen} className="w-full text-left">
                <CardHeader className="pb-2 flex-row items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-sm font-semibold flex-1">Metrics</CardTitle>
                  {metricsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CardHeader>
              </button>
              {metricsOpen && (
                <CardContent className="space-y-2 pt-0">
                  {metricOptions.map((metric) => (
                    <div key={metric.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.value}
                        checked={metrics.includes(metric.value as MetricKey)}
                        onCheckedChange={(checked) => {
                          setMetrics(prev => checked ? [...prev, metric.value as MetricKey] : prev.filter(m => m !== (metric.value as MetricKey)));
                        }}
                      />
                      <label htmlFor={metric.value} className="text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: metric.color }} />
                        {metric.label}
                      </label>
                    </div>
                  ))}
                  {metrics.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {metrics.slice(0,6).map(m => (
                        <Badge key={m} variant="secondary" className="gap-1">
                          {metricLabel[m]}
                          <X className="h-3 w-3 cursor-pointer" onClick={()=>setMetrics(prev=>prev.filter(x=>x!==m))} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Compare selectors */}
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Grid2X2 className="h-4 w-4 text-indigo-600" />
                  Compare
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Facet by</div>
                  <Select value={facetBy} onValueChange={(v:FacetMode)=>setFacetBy(v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flock">Flocks</SelectItem>
                      <SelectItem value="unit">Units</SelectItem>
                      <SelectItem value="flock_unit">Flock × Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                              value={`#${f.num} ${f.name}`}
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

                {/* Units */}
                <div className="rounded-md border">
                  <div className="px-3 py-2 border-b text-sm font-medium">Units</div>
                  <Command className="p-0">
                    <CommandInput placeholder="Search units…" />
                    <CommandList className="max-h-44 overflow-auto">
                      <CommandEmpty>No units.</CommandEmpty>
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

        {/* Visuals (fixed page, no scroll) */}
        <main className="h-full overflow-hidden">
          <div className="h-full p-3">
            <Card className="h-full shadow-xl border-0 bg-white/90 backdrop-blur flex flex-col">
              <CardHeader className="flex-none pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={()=>setSidebarOpen(v=>!v)}>
                      {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                    </Button>
                    <div>
                      <CardTitle className="text-xl">{VIZ_LABEL[viz]}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {compareMode ? "Side-by-side comparison" : (activeFacetObj?.title || "All flocks")}
                      </p>
                    </div>
                  </div>

                  {/* Controls moved here (right side) */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Button variant={compareMode ? "default" : "outline"} size="sm" className="gap-1"
                        onClick={()=>setCompareMode(v=>!v)}>
                        <LayoutGrid className="h-4 w-4" />
                        {compareMode ? "Compare: On" : "Compare: Off"}
                      </Button>
                      {compareMode && (
                        <Select value={String(compareCols)} onValueChange={(v)=>setCompareCols(Number(v))}>
                          <SelectTrigger className="h-8 w-[110px]"><SelectValue placeholder="Cols" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 col</SelectItem>
                            <SelectItem value="2">2 cols</SelectItem>
                            <SelectItem value="3">3 cols</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <Input placeholder="Save view as…" value={savedName} onChange={(e)=>setSavedName(e.target.value)} className="h-8 w-44" />
                    <Button variant="outline" size="sm" className="gap-1 h-8" onClick={saveCurrentView}><Save className="h-4 w-4" />Save</Button>
                    {savedViews.length>0 && (
                      <Select onValueChange={(v)=>applySavedView(v)}>
                        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Load view" /></SelectTrigger>
                        <SelectContent>
                          {savedViews.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {filterCount > 0 && <Badge className="ml-1">{filterCount} filters</Badge>}
                    <Button variant="outline" size="sm" className="gap-2" onClick={exportBucketsCsv}>
                      <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.assign(window.location.pathname)}>
                      <RefreshCw className="h-4 w-4" /> Reset
                    </Button>
                  </div>
                </div>

                {!compareMode && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {[
                      { label: "Total Eggs", value: totalEggs.toLocaleString() },
                      { label: "Clear Rate", value: `${avgClear.toFixed(1)}%` },
                      { label: "Injection Rate", value: `${avgInj.toFixed(1)}%` },
                      { label: "Average Age", value: `${avgAge.toFixed(1)}w` },
                    ].map((metric, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-white">
                        <div className="text-xs text-slate-600">{metric.label}</div>
                        <div className="text-lg font-bold">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 min-h-0 pt-0">
                <div className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
                  {loading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <>
                      {compareMode ? (
                        <div
                          className="grid gap-3 h-full"
                          style={{ gridTemplateColumns: `repeat(${compareCols}, minmax(0,1fr))` }}
                        >
                          {facets.slice(0, compareCols * 2).map((f) => {
                            const data = chartDataForFacet(f.rows);
                            return (
                              <div key={f.key} className="flex flex-col min-h-0 border rounded-lg">
                                <div className="px-3 py-2 text-xs font-medium border-b bg-slate-50 truncate">{f.title}</div>
                                <div className="flex-1 min-h-0">{renderChart(data, f.title)}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full">{renderChart(activeData, activeFacetObj?.title || "All flocks")}</div>
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
