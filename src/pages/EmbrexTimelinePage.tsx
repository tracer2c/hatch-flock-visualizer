import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ── shadcn/ui ─────────────────────────────────────────────────────────────── */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

/* ── Icons ─────────────────────────────────────────────────────────────────── */
import {
  RefreshCw, Download, BarChart2, Calendar as CalendarIcon,
  Activity, Layers, Rows, Save, Trash2, Settings, X,
  Monitor, BarChart3, TrendingUp
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

type VizKind = "timeline_bar" | "timeline_line" | "stacked_counts" | "percent_trends" | "sparklines" | "age_distribution";

const VIZ_LABEL: Record<VizKind, string> = {
  timeline_bar: "Timeline – Bar",
  timeline_line: "Timeline – Line",
  stacked_counts: "Stacked Counts",
  percent_trends: "Percent Trends",
  sparklines: "Sparklines",
  age_distribution: "Age Distribution",
};

const isPercentMetric = (m: MetricKey) => m === "clear_pct" || m === "injected_pct";
const validScale = (s: any): s is Granularity => ["year", "month", "week", "day"].includes(s);

const fmtBucketLabel = (d: Date, g: Granularity) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
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
    const t = new Date(d), day = t.getDay(), diff = (day + 6) % 7; 
    t.setDate(t.getDate() - diff); 
    t.setHours(0,0,0,0); 
    return t; 
  }
  const t = new Date(d); 
  t.setHours(0,0,0,0); 
  return t;
};

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const DEFAULTS = {
  scale: "month" as Granularity,
  metrics: ["total_eggs_set", "clear_pct"] as MetricKey[],
  facetBy: "flock" as FacetMode,
  from: "",
  to: "",
  pctAgg: "weighted" as PercentAgg,
  viz: "timeline_bar" as VizKind,
};

export default function EmbrexTimelinePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Data */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);

  /* Controls state */
  const [granularity, setGranularity] = useState<Granularity>(() => 
    validScale(searchParams.get("scale")) ? (searchParams.get("scale") as Granularity) : DEFAULTS.scale
  );
  const [metrics, setMetrics] = useState<MetricKey[]>(() => {
    const m = (searchParams.get("metrics") ?? "").split(",").filter(Boolean) as MetricKey[];
    return m.length ? m : DEFAULTS.metrics;
  });
  const [facetBy, setFacetBy] = useState<FacetMode>(() => 
    (["flock","unit","flock_unit"].includes(searchParams.get("facetBy") || "") ? 
      (searchParams.get("facetBy") as FacetMode) : DEFAULTS.facetBy)
  );
  const [selectedFlocks, setSelectedFlocks] = useState<number[]>(() => 
    (searchParams.get("flocks") || "").split(",").filter(Boolean).map(Number)
  );
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() => 
    (searchParams.get("units") || "").split(",").filter(Boolean)
  );
  const [dateFrom, setDateFrom] = useState<string>(() => searchParams.get("from") || DEFAULTS.from);
  const [dateTo, setDateTo] = useState<string>(() => searchParams.get("to") || DEFAULTS.to);
  const [percentAgg, setPercentAgg] = useState<PercentAgg>(() => 
    (searchParams.get("pctAgg") === "unweighted" ? "unweighted" : DEFAULTS.pctAgg)
  );
  const [rollingAvg, setRollingAvg] = useState<boolean>(() => searchParams.get("roll") === "1");
  const [benchmark, setBenchmark] = useState<number | "">(() => {
    const b = searchParams.get("bench"); 
    if (!b) return ""; 
    const n = Number(b); 
    return Number.isFinite(n) ? n : "";
  });
  const [viz, setViz] = useState<VizKind>(() => 
    (Object.keys(VIZ_LABEL) as VizKind[]).includes((searchParams.get("viz") as VizKind)) ? 
      (searchParams.get("viz") as VizKind) : DEFAULTS.viz
  );

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
        toast({ 
          title: "Failed to load", 
          description: "Could not load timeline data.", 
          variant: "destructive" 
        });
      } finally { 
        setLoading(false); 
      }
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
    if (benchmark !== "" && Number.isFinite(Number(benchmark))) {
      sp.set("bench", String(benchmark)); 
    } else sp.delete("bench");
    sp.set("viz", viz);
    setSearchParams(sp, { replace: true });
  }, [granularity, metrics, facetBy, selectedFlocks, selectedUnits, dateFrom, dateTo, percentAgg, rollingAvg, benchmark, viz, setSearchParams]);

  /* Derived lists */
  const units = useMemo(() => 
    Array.from(new Set(rows.map(r => (r.unit_name || "").trim()).filter(Boolean))).sort(), 
    [rows]
  );
  
  const flocksList = useMemo(() => {
    const uniq = new Map<number, string>();
    rows.forEach(r => { 
      if (!uniq.has(r.flock_number)) uniq.set(r.flock_number, r.flock_name); 
    });
    return [...uniq.entries()].sort((a,b)=>a[0]-b[0]).map(([num,name])=>({num, name}));
  }, [rows]);
  
  const flocksMap = useMemo(() => 
    new Map(flocksList.map(({num,name}) => [num, name])), 
    [flocksList]
  );

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
    if (dateFrom) { 
      const from = new Date(dateFrom); 
      out = out.filter(r => new Date(r.set_date) >= from); 
    }
    if (dateTo) { 
      const to = new Date(dateTo); 
      to.setHours(23,59,59,999); 
      out = out.filter(r => new Date(r.set_date) <= to); 
    }
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
      const list = selectedUnits.length ? selectedUnits : 
        Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[]));
      return list.map(u => ({ 
        key: `U-${u}`, 
        title: `Unit: ${u}`, 
        rows: data.filter(r => (r.unit_name||"").toLowerCase() === u.toLowerCase()) 
      }));
    }
    const flockList = selectedFlocks.length ? selectedFlocks : 
      Array.from(new Set(data.map(r => r.flock_number)));
    const unitList = selectedUnits.length ? selectedUnits : 
      Array.from(new Set(data.map(r => r.unit_name).filter(Boolean) as string[]));
    
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
      
      if (!map.has(key)) map.set(key, { 
        bucketKey: key, date: start, count: {}, pct: {}, raw: [] 
      });
      
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
    const values = buckets.map(b => 
      isPercentMetric(firstMetric) ? (b.pct as any)[firstMetric] ?? 0 : (b.count as any)[firstMetric] ?? 0
    );
    
    const rollWindow = 3;
    const rolling = rollingAvg ? values.map((_, i) => {
      const s = Math.max(0, i - rollWindow + 1); 
      const slice = values.slice(s, i + 1); 
      return slice.reduce((a,c)=>a+c,0) / slice.length;
    }) : [];
    
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
    }));
  };

  /* Drill-down modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState<RawRow[]>([]);
  
  const openDrill = (facetTitle: string, bucketLabel: string, raw: RawRow[]) => {
    setModalTitle(`${facetTitle} • ${bucketLabel}`); 
    setModalRows(raw); 
    setModalOpen(true);
  };

  const vizOptions = [
    { value: "timeline_bar", label: "Timeline Bar", icon: BarChart3 },
    { value: "timeline_line", label: "Timeline Line", icon: TrendingUp },
    { value: "percent_trends", label: "Percent Trends", icon: Activity },
    { value: "stacked_counts", label: "Stacked Counts", icon: Layers },
    { value: "sparklines", label: "Sparklines", icon: Activity },
    { value: "age_distribution", label: "Age Distribution", icon: BarChart2 }
  ];

  const metricOptions = [
    { value: "total_eggs_set", label: "Total Eggs", color: PALETTE[0] },
    { value: "eggs_cleared", label: "Cleared", color: PALETTE[1] },
    { value: "eggs_injected", label: "Injected", color: PALETTE[2] },
    { value: "clear_pct", label: "Clear %", color: PALETTE[3] },
    { value: "injected_pct", label: "Injected %", color: PALETTE[4] },
    { value: "age_weeks", label: "Age (weeks)", color: PALETTE[5] }
  ];

  const currentFacet = facets[0] || { rows: [] };
  const currentData = chartDataForFacet(currentFacet.rows);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!currentData.length) return [];
    
    const latest = currentData[currentData.length - 1];
    const previous = currentData[currentData.length - 2];
    
    const calcChange = (current: number, prev: number) => {
      if (!prev) return "+0%";
      const change = ((current - prev) / prev) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };

    return [
      { 
        label: "Total Eggs", 
        value: latest?.total_eggs_set?.toLocaleString() || "0", 
        change: previous ? calcChange(latest?.total_eggs_set || 0, previous?.total_eggs_set || 0) : "+0%",
        color: "blue" 
      },
      { 
        label: "Clear Rate", 
        value: `${(latest?.clear_pct || 0).toFixed(1)}%`, 
        change: previous ? calcChange(latest?.clear_pct || 0, previous?.clear_pct || 0) : "+0%",
        color: "green" 
      },
      { 
        label: "Injection Rate", 
        value: `${(latest?.injected_pct || 0).toFixed(1)}%`, 
        change: previous ? calcChange(latest?.injected_pct || 0, previous?.injected_pct || 0) : "+0%",
        color: "orange" 
      },
      { 
        label: "Average Age", 
        value: `${(latest?.age_weeks || 0).toFixed(1)}w`, 
        change: previous ? calcChange(latest?.age_weeks || 0, previous?.age_weeks || 0) : "+0%",
        color: "purple" 
      }
    ];
  }, [currentData]);

  const renderChart = () => {
    const height = 480;
    
    if (viz === "timeline_bar") {
      return (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={currentData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={(e:any)=>{ 
                if (!e?.activePayload?.length) return; 
                const p=e.activePayload[0]?.payload; 
                if (!p) return; 
                openDrill(currentFacet.title, p.bucket as string, p._raw as RawRow[]); 
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
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
              {metrics.map((metric, i) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  yAxisId={isPercentMetric(metric) ? "right" : "left"}
                  fill={metricOptions.find(m => m.value === metric)?.color || PALETTE[i]}
                  radius={[4, 4, 0, 0]}
                  name={metricOptions.find(m => m.value === metric)?.label}
                />
              ))}
              {rollingAvg && (
                <Line
                  type="monotone"
                  dataKey="rolling"
                  yAxisId="right"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="3-Period Rolling Avg"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "timeline_line") {
      return (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              {metrics.map((metric, i) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  yAxisId={isPercentMetric(metric) ? "right" : "left"}
                  stroke={metricOptions.find(m => m.value === metric)?.color || PALETTE[i]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name={metricOptions.find(m => m.value === metric)?.label}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "percent_trends") {
      return (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="clear_pct"
                stroke={PALETTE[3]}
                fill={PALETTE[3]}
                fillOpacity={0.3}
                strokeWidth={2}
                name="Clear %"
              />
              <Area
                type="monotone"
                dataKey="injected_pct"
                stroke={PALETTE[4]}
                fill={PALETTE[4]}
                fillOpacity={0.3}
                strokeWidth={2}
                name="Injected %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (viz === "stacked_counts") {
      return (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_eggs_set" stackId="a" fill={PALETTE[0]} name="Total Eggs" />
              <Bar dataKey="eggs_cleared"  stackId="a" fill={PALETTE[2]} name="Clears" />
              <Bar dataKey="eggs_injected" stackId="a" fill={PALETTE[1]} name="Injected" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Select a visualization type to display chart</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Embrex Analytics
            </h1>
            <p className="text-slate-600 mt-1">Production insights at your fingertips</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-140px)]">
          {/* Left Sidebar - Controls */}
          <div className="col-span-3 space-y-4">
            {/* Visualization Type */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  Visualization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {vizOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={viz === option.value ? "default" : "ghost"}
                      className="w-full justify-start gap-2"
                      onClick={() => setViz(option.value as VizKind)}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Metrics Selection */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metricOptions.map((metric) => (
                  <div key={metric.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.value}
                      checked={metrics.includes(metric.value as MetricKey)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setMetrics([...metrics, metric.value as MetricKey]);
                        } else {
                          setMetrics(metrics.filter(m => m !== metric.value));
                        }
                      }}
                    />
                    <label htmlFor={metric.value} className="text-sm flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: metric.color }}
                      />
                      {metric.label}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Controls */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-purple-600" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Time Scale</label>
                  <Select value={granularity} onValueChange={(v: Granularity) => setGranularity(v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Facet By</label>
                  <Select value={facetBy} onValueChange={(v: FacetMode) => setFacetBy(v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flock">Flocks</SelectItem>
                      <SelectItem value="unit">Units</SelectItem>
                      <SelectItem value="flock_unit">Flock × Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Benchmark %</label>
                  <Input
                    type="number"
                    placeholder="e.g. 85"
                    value={benchmark}
                    onChange={(e) => setBenchmark(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rolling"
                    checked={rollingAvg}
                    onCheckedChange={(v) => setRollingAvg(Boolean(v))}
                  />
                  <label htmlFor="rolling" className="text-xs text-slate-600">
                    Show rolling average
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Flocks Filter */}
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Flocks</label>
                  <Select 
                    value={selectedFlocks.length > 0 ? selectedFlocks[0].toString() : ""} 
                    onValueChange={(v) => setSelectedFlocks(v ? [Number(v)] : [])}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All flocks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All flocks</SelectItem>
                      {flocksList.map(flock => (
                        <SelectItem key={flock.num} value={flock.num.toString()}>
                          #{flock.num} - {flock.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Units Filter */}
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Units</label>
                  <Select 
                    value={selectedUnits.length > 0 ? selectedUnits[0] : ""} 
                    onValueChange={(v) => setSelectedUnits(v ? [v] : [])}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All units</SelectItem>
                      {units.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-orange-600" />
                  Date Range
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {["30d", "90d", "180d", "YTD"].map((period) => (
                    <Button 
                      key={period} 
                      variant="outline" 
                      size="sm" 
                      className="h-7"
                      onClick={() => {
                        const to = new Date();
                        const from = new Date();
                        if (period === "30d") from.setDate(to.getDate() - 30);
                        else if (period === "90d") from.setDate(to.getDate() - 90);
                        else if (period === "180d") from.setDate(to.getDate() - 180);
                        else if (period === "YTD") from.setMonth(0, 1);
                        setDateFrom(from.toISOString().slice(0, 10));
                        setDateTo(to.toISOString().slice(0, 10));
                      }}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <Input 
                    type="date" 
                    className="h-8" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <Input 
                    type="date" 
                    className="h-8" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart Area */}
          <div className="col-span-9">
            <Card className="h-full shadow-xl border-0 bg-white/90 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle className="text-xl">
                      {vizOptions.find(v => v.value === viz)?.label || "Timeline"}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      {currentFacet.title}
                    </p>
                  </div>
                </div>
                
                {/* Facet Tabs */}
                {facets.length > 1 && (
                  <Tabs value={facets[0]?.key} className="w-auto">
                    <TabsList className="bg-slate-100">
                      {facets.slice(0, 3).map((facet) => (
                        <TabsTrigger key={facet.key} value={facet.key} className="text-xs">
                          {facet.title.split(" — ")[0]}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {loading ? (
                  <Skeleton className="h-[520px] w-full" />
                ) : (
                  <>
                    {/* Key Metrics Bar */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      {summaryMetrics.map((metric, i) => (
                        <div key={i} className={`p-3 rounded-lg bg-gradient-to-r from-${metric.color}-50 to-${metric.color}-100 border border-${metric.color}-200`}>
                          <div className="text-xs text-slate-600">{metric.label}</div>
                          <div className="text-lg font-bold">{metric.value}</div>
                          <div className={`text-xs ${metric.change.startsWith('+') && !metric.change.startsWith('+0') ? 'text-green-600' : metric.change.startsWith('-') ? 'text-red-600' : 'text-slate-500'}`}>
                            {metric.change} vs last period
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chart */}
                    <div className="bg-white rounded-lg border border-slate-200">
                      {renderChart()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Drill-down modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Bucket Details</DialogTitle>
              <DialogDescription>{modalTitle}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="py-2 pr-2">Batch</th>
                    <th className="py-2 pr-2">Flock</th>
                    <th className="py-2 pr-2">Unit</th>
                    <th className="py-2 pr-2">Set Date</th>
                    <th className="py-2 pr-2 text-right">Eggs Set</th>
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
    </div>
  );
}