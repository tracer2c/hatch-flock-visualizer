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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
  <CardContent className="pt-4">

/* ── Icons ─────────────────────────────────────────────────────────────────── */
import {
  RefreshCw, Download, BarChart2, Calendar as CalendarIcon, ChevronsUpDown, Check, X,
  Activity, Layers, Rows, Save, Trash2, Grid2X2
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

/* one shared palette */
const PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#0ea5e9", "#7c3aed", "#059669", "#fb7185", "#22c55e", "#a78bfa"];

/* Visualization options — exactly one active at a time */
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

/* Defaults */
const DEFAULTS = {
  scale: "month" as Granularity,
  metrics: ["total_eggs_set", "clear_pct"] as MetricKey[],
  facetBy: "flock" as FacetMode,
  from: "",
  to: "",
  pctAgg: "weighted" as PercentAgg,
  viz: "timeline_bar" as VizKind,
};

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Filter helpers (badge count + popover UI)                                │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
function useFilterCount({
  facetBy, selectedFlocks, selectedUnits, granularity, metrics, dateFrom, dateTo, percentAgg, rollingAvg, benchmark, viz,
}: {
  facetBy: FacetMode; selectedFlocks: any[]; selectedUnits: any[]; granularity: Granularity; metrics: MetricKey[];
  dateFrom: string; dateTo: string; percentAgg: PercentAgg; rollingAvg: boolean; benchmark: number | "";
  viz: VizKind;
}) {
  let n = 0;
  if (facetBy !== DEFAULTS.facetBy) n++;
  if (selectedFlocks.length) n++;
  if (selectedUnits.length) n++;
  if (granularity !== DEFAULTS.scale) n++;
  if (metrics.join(",") !== DEFAULTS.metrics.join(",")) n++;
  if (dateFrom || dateTo) n++;
  if (percentAgg !== DEFAULTS.pctAgg || rollingAvg || benchmark !== "") n++;
  if (viz !== DEFAULTS.viz) n++;
  return n;
}

/** Compact popover that mirrors the reference UI (searchable groups, checkmarks, clear, save/load). */
function FiltersViewPopover(props: {
  facetBy: FacetMode; setFacetBy: (v: FacetMode)=>void;
  selectedFlocks: number[]; setSelectedFlocks: (fn: (p:number[])=>number[])=>void; flocksList: {num:number;name:string}[];
  selectedUnits: string[]; setSelectedUnits: (fn:(p:string[])=>string[])=>void; units: string[];
  granularity: Granularity; setGranularity: (g:Granularity)=>void;
  metrics: MetricKey[]; setMetrics: (fn:(p:MetricKey[])=>MetricKey[])=>void;
  dateFrom: string; setDateFrom: (v:string)=>void; dateTo: string; setDateTo: (v:string)=>void;
  percentAgg: PercentAgg; setPercentAgg: (v:PercentAgg)=>void; rollingAvg: boolean; setRollingAvg: (v:boolean)=>void;
  benchmark: number | ""; setBenchmark: (v:number | "")=>void;
  viz: VizKind; setViz: (v:VizKind)=>void;
  savedName: string; setSavedName: (s:string)=>void; savedViews: string[];
  saveCurrentView: ()=>void; applySavedView: (name:string)=>void;
}) {
  const {
    facetBy, setFacetBy, selectedFlocks, setSelectedFlocks, flocksList,
    selectedUnits, setSelectedUnits, units,
    granularity, setGranularity, metrics, setMetrics,
    dateFrom, setDateFrom, dateTo, setDateTo,
    percentAgg, setPercentAgg, rollingAvg, setRollingAvg,
    benchmark, setBenchmark, viz, setViz,
    savedName, setSavedName, savedViews, saveCurrentView, applySavedView,
  } = props;

  const [flockQuery, setFlockQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [metricQuery, setMetricQuery] = useState("");

  const filteredFlocks = useMemo(
    () => flocksList.filter(f => (`#${f.num} ${f.name}`.toLowerCase().includes(flockQuery.toLowerCase()))),
    [flockQuery, flocksList]
  );
  const filteredUnits = useMemo(
    () => units.filter(u => u.toLowerCase().includes(unitQuery.toLowerCase())),
    [unitQuery, units]
  );
  const filteredMetrics = useMemo(
    () => (ALL_METRICS as MetricKey[]).filter(m => metricLabel[m].toLowerCase().includes(metricQuery.toLowerCase())),
    [metricQuery]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Grid2X2 className="h-4 w-4" />
          Filters
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[720px] p-0" align="start">
        {/* Header: save/load/clear */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Input placeholder="Save view as…" value={savedName} onChange={(e)=>setSavedName(e.target.value)} className="w-44" />
            <Button variant="outline" size="sm" onClick={saveCurrentView}><Save className="h-4 w-4 mr-1" />Save</Button>
            {savedViews.length>0 && (
              <Select onValueChange={(v)=>applySavedView(v)}>
                <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Load saved view" /></SelectTrigger>
                <SelectContent>
                  {savedViews.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={()=>{
              setFacetBy(DEFAULTS.facetBy);
              setSelectedFlocks(()=>[]);
              setSelectedUnits(()=>[]);
              setGranularity(DEFAULTS.scale);
              setMetrics(()=>[...DEFAULTS.metrics]);
              setDateFrom(""); setDateTo("");
              setPercentAgg(DEFAULTS.pctAgg);
              setRollingAvg(false);
              setBenchmark("");
              setViz(DEFAULTS.viz);
            }}
          >
            Clear
          </Button>
        </div>

        {/* Body: tidy groups with search */}
        <div className="max-h-[60vh] overflow-auto">
          <Accordion type="multiple" defaultValue={["facet","compare","metrics","date","advanced","viz"]}>
            {/* View */}
            <AccordionItem value="facet">
              <AccordionTrigger className="px-4">View</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <div className="text-xs mb-1 text-muted-foreground">Facet by</div>
                    <Select value={facetBy} onValueChange={(v:FacetMode)=>setFacetBy(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flock">Flocks</SelectItem>
                        <SelectItem value="unit">Units</SelectItem>
                        <SelectItem value="flock_unit">Flock × Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-xs mb-1 text-muted-foreground">Scale</div>
                    <Select value={granularity} onValueChange={(v:Granularity)=>setGranularity(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Years</SelectItem>
                        <SelectItem value="month">Months</SelectItem>
                        <SelectItem value="week">Weeks</SelectItem>
                        <SelectItem value="day">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Compare */}
            <AccordionItem value="compare">
              <AccordionTrigger className="px-4">Compare</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Flocks */}
                  <div className="border rounded-md">
                    <div className="px-3 py-2 border-b text-sm font-medium">Flocks</div>
                    <Command className="p-0">
                      <CommandInput value={flockQuery} onValueChange={setFlockQuery} placeholder="Search flocks…" />
                      <CommandList className="max-h-56 overflow-auto">
                        <CommandEmpty>No flocks.</CommandEmpty>
                        <CommandGroup>
                          {filteredFlocks.map(f=>{
                            const checked = selectedFlocks.includes(f.num);
                            return (
                              <CommandItem
                                key={f.num}
                                value={`#${f.num} ${f.name}`}
                                onSelect={()=>setSelectedFlocks(prev => checked ? prev.filter(x=>x!==f.num) : [...prev, f.num])}
                              >
                                <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                  {checked && <Check className="h-3 w-3" />}
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
                  <div className="border rounded-md">
                    <div className="px-3 py-2 border-b text-sm font-medium">Units</div>
                    <Command className="p-0">
                      <CommandInput value={unitQuery} onValueChange={setUnitQuery} placeholder="Search units…" />
                      <CommandList className="max-h-56 overflow-auto">
                        <CommandEmpty>No units.</CommandEmpty>
                        <CommandGroup>
                          {filteredUnits.map(u=>{
                            const checked = selectedUnits.includes(u);
                            return (
                              <CommandItem
                                key={u}
                                value={u}
                                onSelect={()=>setSelectedUnits(prev => checked ? prev.filter(x=>x!==u) : [...prev, u])}
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
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Metrics */}
            <AccordionItem value="metrics">
              <AccordionTrigger className="px-4">Metrics</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="border rounded-md">
                  <Command className="p-0">
                    <CommandInput value={metricQuery} onValueChange={setMetricQuery} placeholder="Search metrics…" />
                    <CommandList className="max-h-60 overflow-auto">
                      <CommandEmpty>No metrics.</CommandEmpty>
                      <CommandGroup>
                        {(filteredMetrics as MetricKey[]).map(m=>{
                          const checked = metrics.includes(m);
                          return (
                            <CommandItem
                              key={m}
                              value={metricLabel[m]}
                              onSelect={()=>setMetrics(prev => checked ? prev.filter(x=>x!==m) : [...prev, m])}
                            >
                              <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                {checked && <Check className="h-3 w-3" />}
                              </div>
                              <span>{metricLabel[m]}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Date */}
            <AccordionItem value="date">
              <AccordionTrigger className="px-4">Date</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-2">
                  <Input type="date" value={props.dateFrom} onChange={(e)=>props.setDateFrom(e.target.value)} className="w-44" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="date" value={props.dateTo} onChange={(e)=>props.setDateTo(e.target.value)} className="w-44" />
                  {(props.dateFrom || props.dateTo) && (
                    <Button variant="ghost" size="icon" onClick={()=>{props.setDateFrom(""); props.setDateTo("");}}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    ["Last 30d", 30], ["90d", 90], ["180d", 180], ["365d", 365],
                  ].map(([label, days])=>(
                    <Button key={label as string} variant="ghost" size="sm" className="h-7 px-2" onClick={()=>{
                      const to = new Date(); const from = new Date(); from.setDate(to.getDate() - (days as number));
                      props.setDateFrom(from.toISOString().slice(0,10)); props.setDateTo(to.toISOString().slice(0,10));
                    }}>{label as string}</Button>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={()=>{
                    const to = new Date(); const from = new Date(to.getFullYear(), 0, 1);
                    props.setDateFrom(from.toISOString().slice(0,10)); props.setDateTo(to.toISOString().slice(0,10));
                  }}>YTD</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={()=>{props.setDateFrom(""); props.setDateTo("");}}>All time</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Advanced */}
            <AccordionItem value="advanced">
              <AccordionTrigger className="px-4">Advanced</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Pct agg</span>
                    <Select value={props.percentAgg} onValueChange={(v:PercentAgg)=>props.setPercentAgg(v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weighted">Weighted</SelectItem>
                        <SelectItem value="unweighted">Unweighted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="rolling2" checked={props.rollingAvg} onCheckedChange={(v)=>props.setRollingAvg(Boolean(v))} />
                    <label htmlFor="rolling2" className="text-sm">Rolling avg (3 buckets)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Benchmark %</span>
                    <Input type="number" inputMode="decimal" className="w-24" placeholder="e.g. 95"
                           value={props.benchmark} onChange={(e)=> props.setBenchmark(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Visualization */}
            <AccordionItem value="viz">
              <AccordionTrigger className="px-4">Visualization</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <Select value={props.viz} onValueChange={(v:VizKind)=>props.setViz(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VIZ_LABEL) as VizKind[]).map(v => <SelectItem key={v} value={v}>{VIZ_LABEL[v]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Footer: selected chips preview */}
        <div className="px-4 py-3 border-t">
          <div className="flex flex-wrap gap-1">
            {!!selectedFlocks.length && selectedFlocks.slice(0,6).map(f => (
              <Badge key={`f-${f}`} variant="secondary" className="gap-1">Flock #{f}<X className="h-3 w-3 cursor-pointer" onClick={()=>setSelectedFlocks(prev=>prev.filter(x=>x!==f))} /></Badge>
            ))}
            {!!selectedUnits.length && selectedUnits.slice(0,6).map(u => (
              <Badge key={`u-${u}`} variant="secondary" className="gap-1">{u}<X className="h-3 w-3 cursor-pointer" onClick={()=>setSelectedUnits(prev=>prev.filter(x=>x!==u))} /></Badge>
            ))}
            {!!metrics.length && metrics.slice(0,6).map(m => (
              <Badge key={`m-${m}`} variant="secondary" className="gap-1">{metricLabel[m]}<X className="h-3 w-3 cursor-pointer" onClick={()=>setMetrics(prev=>prev.filter(x=>x!==m))} /></Badge>
            ))}
            {(dateFrom || dateTo) && <Badge variant="secondary">{dateFrom || "…"} → {dateTo || "…"}</Badge>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ╭──────────────────────────────────────────────────────────────────────────╮
   │ Page                                                                      │
   ╰──────────────────────────────────────────────────────────────────────────╯ */
export default function EmbrexTimelinePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── Data ── */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RawRow[]>([]);

  /* ── Controls state ── */
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
  const [viz, setViz] = useState<VizKind>(() => (Object.keys(VIZ_LABEL) as VizKind[]).includes((searchParams.get("viz") as VizKind)) ? (searchParams.get("viz") as VizKind) : DEFAULTS.viz);
  const [savedName, setSavedName] = useState("");

  useEffect(() => { document.title = "Embrex Timeline | Hatchery Dashboard"; }, []);
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
    setSearchParams(sp, { replace: true });
  }, [granularity, metrics, facetBy, selectedFlocks, selectedUnits, dateFrom, dateTo, percentAgg, rollingAvg, benchmark, viz, setSearchParams]);

  /* Derived lists */
  const units = useMemo(() => Array.from(new Set(rows.map(r => (r.unit_name || "").trim()).filter(Boolean))).sort(), [rows]);
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
    facets.forEach(f => {
      chartDataForFacet(f.rows).forEach(r => out.push({
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
  const savedViews = useMemo(() => {
    const v: string[] = []; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||""; if (k.startsWith("embrexView:")) v.push(k.replace("embrexView:",""));} return v.sort();
  }, [modalOpen, searchParams]);

  /* Toolbar filter count */
  const filterCount = useFilterCount({
    facetBy, selectedFlocks, selectedUnits, granularity, metrics, dateFrom, dateTo, percentAgg, rollingAvg, benchmark, viz,
  });

  /* UI */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Embrex Timeline</h1>
          <p className="text-muted-foreground">Enterprise time-series analytics — one view at a time.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="gap-2" onClick={() => window.location.assign(window.location.pathname)}>
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
          <Button variant="secondary" className="gap-2" onClick={exportBucketsCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="secondary" className="gap-2" onClick={() => navigate("/embrex-data-sheet", { state: { backToTimelineQS: searchParams.toString() } })}>
            <BarChart2 className="h-4 w-4" /> Embrex Summary
          </Button>
        </div>
      </div>

      {/* Compact toolbar: Filters + quick chips (no KPI cards for extra room) */}
<Card>
  <CardContent className="pt-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      {/* left cluster: Filters + quick viz */}
      <div className="flex items-center gap-2">
        {/* Filters with count bubble */}
        <div className="relative">
          <FiltersViewPopover
            facetBy={facetBy} setFacetBy={setFacetBy}
            selectedFlocks={selectedFlocks} setSelectedFlocks={setSelectedFlocks} flocksList={flocksList}
            selectedUnits={selectedUnits} setSelectedUnits={setSelectedUnits} units={units}
            granularity={granularity} setGranularity={setGranularity}
            metrics={metrics} setMetrics={setMetrics}
            dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
            percentAgg={percentAgg} setPercentAgg={setPercentAgg}
            rollingAvg={rollingAvg} setRollingAvg={setRollingAvg}
            benchmark={benchmark} setBenchmark={setBenchmark}
            viz={viz} setViz={setViz}
            savedName={savedName} setSavedName={setSavedName}
            savedViews={savedViews} saveCurrentView={saveCurrentView} applySavedView={applySavedView}
          />
          {filterCount > 0 && (
            <span className="absolute -top-2 -right-2 text-[10px] leading-none px-1.5 py-1 rounded-full bg-primary text-primary-foreground">
              {filterCount}
            </span>
          )}
        </div>

        {/* NEW: Visualization quick-select */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">Visualization</span>
          <Select value={viz} onValueChange={(v: VizKind) => setViz(v)}>
            <SelectTrigger className="w-[210px] h-9">
              <Monitor className="h-4 w-4 mr-2 opacity-70" />
              <SelectValue placeholder="Choose view" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(VIZ_LABEL) as VizKind[]).map(v => (
                <SelectItem key={v} value={v}>{VIZ_LABEL[v]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* right cluster: quick actions + summary chips */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => window.location.assign(window.location.pathname)}>
          <RefreshCw className="h-4 w-4" /> Reset
        </Button>
        <Button variant="secondary" size="sm" className="gap-2" onClick={exportBucketsCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="secondary" size="sm" className="gap-2" onClick={() => navigate("/embrex-data-sheet", { state: { backToTimelineQS: searchParams.toString() } })}>
          <BarChart2 className="h-4 w-4" /> Embrex Summary
        </Button>
      </div>
    </div>

    {/* read-only chips row stays as-is */}
    <div className="mt-3 flex flex-wrap gap-1">
      <Badge variant="outline" className="gap-1"><Layers className="h-3 w-3" /> {facetBy}</Badge>
      <Badge variant="outline" className="gap-1"><Rows className="h-3 w-3" /> {granularity}</Badge>
      {metrics.slice(0,3).map((m)=> <Badge key={m} variant="outline">{metricLabel[m]}</Badge>)}
      {metrics.length>3 && <Badge variant="outline">+{metrics.length-3}</Badge>}
      {(dateFrom || dateTo) && <Badge variant="outline"><CalendarIcon className="h-3 w-3 mr-1" /> {dateFrom || "…"} → {dateTo || "…"}</Badge>}
    </div>
  </CardContent>
</Card>


      {/* Visualization area — exactly ONE view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {VIZ_LABEL[viz]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : (
            <Tabs defaultValue={facets[0]?.key || "ALL"} className="w-full">
              <TabsList className="flex flex-wrap justify-start max-w-full overflow-x-auto">
                {facets.map(f => <TabsTrigger key={f.key} value={f.key} className="truncate max-w-[260px]">{f.title}</TabsTrigger>)}
              </TabsList>

              {facets.map((facet) => {
                const data = chartDataForFacet(facet.rows);
                const showTimeline = viz === "timeline_bar" || viz === "timeline_line";
                return (
                  <TabsContent key={facet.key} value={facet.key} className="mt-4">
                    {/* Timeline – Bar/Line */}
                    {showTimeline && (
                      <div style={{ height: 420 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={data} onClick={(e:any)=>{ if (!e?.activePayload?.length) return; const p=e.activePayload[0]?.payload; if (!p) return; openDrill(facet.title, p.bucket as string, p._raw as RawRow[]); }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" />
                            <YAxis yAxisId="left" allowDecimals={false} />
                            <YAxis yAxisId="right" orientation="right" domain={[0,100]} />
                            <Tooltip />
                            <Legend />
                            {benchmark !== "" && Number.isFinite(Number(benchmark)) && (
                              <ReferenceLine yAxisId="right" y={Number(benchmark)} stroke="#ef4444" strokeDasharray="4 4" label={`Benchmark ${benchmark}%`} />
                            )}
                            {metrics.map((m, i) => {
                              const color = PALETTE[i % PALETTE.length];
                              const yAxis = isPercentMetric(m) ? "right" : "left";
                              if (viz === "timeline_bar") return <Bar key={m} dataKey={m} yAxisId={yAxis} fill={color} radius={[6,6,0,0]} />;
                              return <Line key={m} type="monotone" dataKey={m} yAxisId={yAxis} stroke={color} dot strokeWidth={2} />;
                            })}
                            {rollingAvg && (
                              <Line type="monotone" dataKey="rolling" yAxisId={isPercentMetric(metrics[0] ?? "total_eggs_set") ? "right":"left"} stroke="#64748b" dot={false} strokeDasharray="5 5" name="Rolling Avg" />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Stacked Counts */}
                    {viz === "stacked_counts" && (
                      <div style={{ height: 380 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                            <Bar dataKey="total_eggs_set" stackId="a" fill={PALETTE[0]} name="Total Eggs" />
                            <Bar dataKey="eggs_cleared"  stackId="a" fill={PALETTE[2]} name="Clears" />
                            <Bar dataKey="eggs_injected" stackId="a" fill={PALETTE[1]} name="Injected" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Percent Trends */}
                    {viz === "percent_trends" && (
                      <div style={{ height: 340 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" /><YAxis domain={[0,100]} /><Tooltip /><Legend />
                            <Line type="monotone" dataKey="clear_pct" stroke={PALETTE[2]} dot={false} name="Clear %" />
                            <Line type="monotone" dataKey="injected_pct" stroke={PALETTE[1]} dot={false} name="Injected %" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Sparklines */}
                    {viz === "sparklines" && (
                      <div className="grid gap-3 md:grid-cols-3">
                        {["total_eggs_set","clear_pct","injected_pct"].map((k, i)=>(
                          <div key={k} className="p-2 border rounded-md">
                            <div className="text-xs text-muted-foreground mb-1">{metricLabel[k as MetricKey]}</div>
                            <div style={{ height: 120 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                  <XAxis dataKey="bucket" hide />
                                  <YAxis hide domain={isPercentMetric(k as MetricKey) ? [0,100] : ["auto","auto"]} />
                                  <Area type="monotone" dataKey={k} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.15} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Age Distribution */}
                    {viz === "age_distribution" && (
                      <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip />
                            <Bar dataKey="age_weeks" fill="#94a3b8" radius={[6,6,0,0]} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Heatmap (month×unit) — bar-grid proxy */}
                    {viz === "heatmap" && (
                      <div className="grid gap-2" style={{ gridTemplateColumns: "140px 1fr" }}>
                        <div className="text-xs text-muted-foreground">Unit</div>
                        <div className="text-xs text-muted-foreground">Month buckets</div>
                        {(() => {
                          const months = Array.from(new Set(data.map(d=>d.bucket)));
                          const byUnit: Record<string, Record<string, number>> = {};
                          facet.rows.forEach(r=>{
                            const b = fmtBucketLabel(startOfBucket(new Date(r.set_date), granularity), granularity);
                            byUnit[r.unit_name] = byUnit[r.unit_name] || {};
                            byUnit[r.unit_name][b] = (byUnit[r.unit_name][b] || 0) + (r.total_eggs_set || 0);
                          });
                          const scale = (v: number, max: number) => max ? Math.round((v/max)*90)+10 : 0;
                          const maxVal = Math.max(0, ...Object.values(byUnit).flatMap(x=>Object.values(x)));
                          return Object.entries(byUnit).map(([u, m], idx)=>(
                            <div key={u} className="contents">
                              <div className="text-xs py-1">{u || "—"}</div>
                              <div className="flex gap-1">
                                {months.map((mo)=> {
                                  const v = m[mo] || 0; const h = scale(v, maxVal);
                                  return <div key={mo} className="w-6 rounded" style={{ height: h, background: PALETTE[idx % PALETTE.length], opacity: v ? 0.7 : 0.1 }} title={`${u} • ${mo}: ${v.toLocaleString()}`} />;
                                })}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Drill-down modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Bucket details</DialogTitle><DialogDescription>{modalTitle}</DialogDescription></DialogHeader>
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
