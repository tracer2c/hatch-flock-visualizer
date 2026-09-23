import { useMemo, useState } from "react";
import { endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { BarChart3, Calendar, Download, FileSpreadsheet, Home, Info, Layers3, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useHatcheries } from "@/hooks/useQAHubData";
import { useManagementReportData, type ReportRow } from "@/hooks/useManagementReportData";
import { usePrintMeta } from "@/hooks/usePrintMeta";
import { ReportService, type ManagementReportPdfOptions, type ManagementReportType } from "@/services/reportService";

type ReportType = ManagementReportType;

type FlockOption = {
  id: string;
  label: string;
  ageWeeks: number | null;
};

const REPORT_OPTIONS: Array<{
  id: ReportType;
  title: string;
  description: string;
  icon: typeof Home;
  action: string;
}> = [
  {
    id: "house",
    title: "House Performance Report",
    description: "Detailed by-house production, fertility, residue, and hatch performance for the selected period.",
    icon: Home,
    action: "Download House Report",
  },
  {
    id: "fertility",
    title: "Combined Fertility Report",
    description: "One fertility sheet across all hatcheries, with hatchery breakout and prior-period trend markers.",
    icon: BarChart3,
    action: "Download Fertility Report",
  },
  {
    id: "comparison",
    title: "Flock Comparison Report",
    description: "Side-by-side comparison for 2–5 flocks using the same weighted breeder performance metrics.",
    icon: UsersRound,
    action: "Download Comparison Report",
  },
];

const fmtInt = (value: number) => Math.round(value || 0).toLocaleString();
const fmtPct = (value: number | null) => (value == null ? "—" : `${value.toFixed(1)}%`);

function totalize(rows: ReportRow[]) {
  const eggsSet = rows.reduce((sum, row) => sum + row.eggsSet, 0);
  const chicksHatched = rows.reduce((sum, row) => sum + row.chicksHatched, 0);
  const fertilitySample = rows.reduce((sum, row) => sum + row.fertilitySample, 0);
  const fertileEggs = rows.reduce((sum, row) => sum + row.fertileEggs, 0);
  const residueSample = rows.reduce((sum, row) => sum + row.residueSample, 0);
  const contaminatedEggs = rows.reduce((sum, row) => sum + row.contaminatedEggs, 0);
  const lateDead = rows.reduce((sum, row) => sum + row.lateDead, 0);
  const upsideDown = rows.reduce((sum, row) => sum + row.upsideDown, 0);
  const earlyDead = rows.reduce((sum, row) => sum + row.earlyDead, 0);

  return {
    eggsSet,
    chicksHatched,
    fertilitySample,
    fertileEggs,
    residueSample,
    contaminatedEggs,
    lateDead,
    upsideDown,
    earlyDead,
    fertilityPercent: fertilitySample > 0 ? (fertileEggs / fertilitySample) * 100 : null,
    contaminationPercent: residueSample > 0 ? (contaminatedEggs / residueSample) * 100 : null,
    lateDeadPercent: residueSample > 0 ? (lateDead / residueSample) * 100 : null,
    hatchPercent: eggsSet > 0 ? (chicksHatched / eggsSet) * 100 : null,
  };
}

function compactRowsForSummary(rows: ReportRow[]) {
  return rows.slice(0, 40).map((row) => ({
    flock: row.flockNumber,
    house: row.houseNumber,
    hatchery: row.unitName,
    eggsSet: row.eggsSet,
    fertilityPercent: row.fertilityPercent,
    contaminationPercent: row.contaminationPercent,
    lateDeadPercent: row.lateDeadPercent,
    upsideDown: row.upsideDown,
    earlyDead: row.earlyDead,
    hatchPercent: row.hatchPercent,
    completeness: row.completeness,
  }));
}

function buildFallbackSummary(reportType: ReportType, rows: ReportRow[]) {
  const totals = totalize(rows);
  if (!rows.length) {
    return ["No saved report rows were found for the selected filters and date range."];
  }

  const scope = `${rows.length} house ${rows.length === 1 ? "row" : "rows"} across ${new Set(rows.map((row) => row.unitName)).size} hatchery ${new Set(rows.map((row) => row.unitName)).size === 1 ? "location" : "locations"}`;
  const base = [
    `${scope} are included in this report.`,
    `The selected range includes ${fmtInt(totals.eggsSet)} eggs set and ${fmtPct(totals.hatchPercent)} weekly hatch.`,
  ];

  if (reportType === "fertility") {
    return [...base, `Weighted fertility is ${fmtPct(totals.fertilityPercent)} from ${fmtInt(totals.fertilitySample)} sampled eggs.`];
  }
  if (reportType === "comparison") {
    return [...base, "The comparison highlights group differences using the same weighted calculations for every selected flock."];
  }
  return [...base, `Residue indicators show ${fmtPct(totals.contaminationPercent)} contamination and ${fmtPct(totals.lateDeadPercent)} late dead.`];
}

async function requestReportSummary(reportType: ReportType, rows: ReportRow[], previousRows: ReportRow[], fallback: string[]) {
  if (!rows.length) return fallback;

  const totals = totalize(rows);
  const priorTotals = totalize(previousRows);
  const { data, error } = await supabase.functions.invoke("report-summary", {
    body: {
      reportType,
      totals,
      priorTotals,
      rows: compactRowsForSummary(rows),
    },
  });

  if (error) {
    throw error;
  }

  const summary = Array.isArray(data?.summary)
    ? data.summary.filter((line: unknown): line is string => typeof line === "string" && line.trim().length > 0)
    : [];

  return summary.length ? summary.slice(0, 4) : fallback;
}

function ScopeFields({
  reportType,
  from,
  to,
  unitId,
  flockId,
  house,
  selectedFlocks,
  hatcheries,
  flockOptions,
  houses,
  onFrom,
  onTo,
  onUnit,
  onFlock,
  onHouse,
  onSelectedFlocks,
}: {
  reportType: ReportType;
  from: Date;
  to: Date;
  unitId: string;
  flockId: string;
  house: string;
  selectedFlocks: string[];
  hatcheries: Array<{ id: string; name: string }>;
  flockOptions: FlockOption[];
  houses: string[];
  onFrom: (date: Date) => void;
  onTo: (date: Date) => void;
  onUnit: (value: string) => void;
  onFlock: (value: string) => void;
  onHouse: (value: string) => void;
  onSelectedFlocks: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">From</Label>
        <DatePicker date={from} onSelect={(date) => date && onFrom(date)} maxDate={to} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">To</Label>
        <DatePicker date={to} onSelect={(date) => date && onTo(date)} minDate={from} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Hatchery</Label>
        <Select value={unitId} onValueChange={onUnit}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hatcheries</SelectItem>
            {hatcheries.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {reportType === "comparison" ? (
        <div className="space-y-1.5 xl:col-span-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Flocks</Label>
          <FlockMultiSelect options={flockOptions} values={selectedFlocks} onChange={onSelectedFlocks} />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Flock</Label>
            <Select value={flockId} onValueChange={onFlock}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All flocks</SelectItem>
                {flockOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">House</Label>
            <Select value={house} onValueChange={onHouse}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All houses</SelectItem>
                {houses.map((value) => <SelectItem key={value} value={value}>House {value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

function FlockMultiSelect({ options, values, onChange }: { options: FlockOption[]; values: string[]; onChange: (values: string[]) => void }) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 w-full justify-between font-normal">
          <span className="truncate">{values.length ? `${values.length} flocks selected` : "Select 2–5 flocks"}</span>
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search flock" className="border-0 shadow-none focus-visible:ring-0" />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.map((option) => {
            const selected = values.includes(option.id);
            return (
              <Button
                key={option.id}
                type="button"
                variant="ghost"
                disabled={!selected && values.length >= 5}
                onClick={() => onChange(selected ? values.filter((id) => id !== option.id) : [...values, option.id])}
                className="h-auto w-full justify-start gap-2 px-2 py-2 font-normal"
              >
                <span className={cn("h-4 w-4 rounded-sm border", selected && "border-primary bg-primary")} />
                <span className="min-w-0 flex-1 truncate text-left">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.ageWeeks == null ? "Age —" : `${option.ageWeeks} wk`}</span>
              </Button>
            );
          })}
          {!filtered.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No flocks match that search.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ReportDownloadCard({
  option,
  active,
  rowCount,
  disabled,
  loading,
  onSelect,
  onDownload,
}: {
  option: (typeof REPORT_OPTIONS)[number];
  active: boolean;
  rowCount: number;
  disabled: boolean;
  loading: boolean;
  onSelect: () => void;
  onDownload: () => void;
}) {
  const Icon = option.icon;
  return (
    <Card className={cn("shadow-sm hover:translate-y-0 hover:shadow-md", active && "border-primary/50 ring-1 ring-primary/20")}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <CardTitle className="text-lg">{option.title}</CardTitle>
            <CardDescription className="mt-1">{option.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Current selection</span>
          <Badge variant={rowCount ? "secondary" : "outline"}>{rowCount} rows</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant={active ? "secondary" : "outline"} className="flex-1" onClick={onSelect}>Select</Button>
          <Button className="flex-1" onClick={onDownload} disabled={disabled || loading}>
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Preparing…" : option.action}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsManager() {
  const now = new Date();
  const [reportType, setReportType] = useState<ReportType>("house");
  const [from, setFrom] = useState(startOfWeek(now, { weekStartsOn: 1 }));
  const [to, setTo] = useState(endOfWeek(now, { weekStartsOn: 1 }));
  const [unitId, setUnitId] = useState("all");
  const [flockId, setFlockId] = useState("all");
  const [house, setHouse] = useState("all");
  const [selectedFlocks, setSelectedFlocks] = useState<string[]>([]);
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  const { data, isLoading, error } = useManagementReportData({ from, to });
  const { data: hatcheries = [] } = useHatcheries();
  const printMeta = usePrintMeta();

  const rows = useMemo(() => data?.rows || [], [data?.rows]);
  const previousRows = useMemo(() => data?.previousRows || [], [data?.previousRows]);

  const baseFiltered = useMemo(() => rows.filter((row) => (
    (unitId === "all" || row.unitId === unitId) &&
    (flockId === "all" || row.flockId === flockId) &&
    (house === "all" || row.houseNumber === house)
  )), [rows, unitId, flockId, house]);

  const priorFiltered = useMemo(() => previousRows.filter((row) => unitId === "all" || row.unitId === unitId), [previousRows, unitId]);

  const comparisonRows = useMemo(() => rows.filter((row) => (
    (unitId === "all" || row.unitId === unitId) && selectedFlocks.includes(row.flockId)
  )), [rows, selectedFlocks, unitId]);

  const flockOptions = useMemo(() => Array.from(new Map(rows
    .filter((row) => unitId === "all" || row.unitId === unitId)
    .map((row) => [row.flockId, { id: row.flockId, label: `${row.flockNumber} · ${row.flockName}`, ageWeeks: row.ageWeeks }]))
    .values()).filter((option) => option.id), [rows, unitId]);

  const houses = useMemo(() => Array.from(new Set(rows
    .filter((row) => (unitId === "all" || row.unitId === unitId) && (flockId === "all" || row.flockId === flockId))
    .map((row) => row.houseNumber))).sort(), [rows, unitId, flockId]);

  const activeRows = reportType === "comparison" ? comparisonRows : baseFiltered;
  const activeTotals = totalize(activeRows);
  const selectedHatchery = unitId === "all" ? "All hatcheries" : hatcheries.find((unit) => unit.id === unitId)?.name || "Selected hatchery";

  const reportDisabled = (type: ReportType) => {
    if (isLoading) return true;
    if (type === "comparison") return selectedFlocks.length < 2 || selectedFlocks.length > 5 || comparisonRows.length === 0;
    return baseFiltered.length === 0;
  };

  const downloadReport = async (type: ReportType) => {
    const targetRows = type === "comparison" ? comparisonRows : baseFiltered;
    if (type === "comparison" && (selectedFlocks.length < 2 || selectedFlocks.length > 5)) {
      toast.error("Select 2–5 flocks for the comparison report");
      return;
    }
    if (!targetRows.length) {
      toast.error("No report data is available for this selection");
      return;
    }

    setDownloading(type);
    const fallback = buildFallbackSummary(type, targetRows);
    let summary = fallback;
    try {
      summary = await requestReportSummary(type, targetRows, priorFiltered, fallback);
    } catch (reason) {
      console.warn("Report summary fallback used", reason);
    }

    try {
      const option = REPORT_OPTIONS.find((item) => item.id === type) || REPORT_OPTIONS[0];
      const pdfOptions: ManagementReportPdfOptions = {
        type,
        title: option.title,
        dateRange: `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`,
        hatcheryScope: selectedHatchery,
        companyName: printMeta.companyName,
        userName: printMeta.userName,
        generatedAt: format(new Date(), "MMM d, yyyy · h:mm a"),
        rows: targetRows,
        previousRows: priorFiltered,
        summary,
      };
      const blob = ReportService.generateManagementReportPdf(pdfOptions);
      ReportService.downloadBlob(blob, `${type}-report-${format(from, "yyyy-MM-dd")}.pdf`);
      toast.success("Report PDF downloaded");
    } catch (reason) {
      console.error(reason);
      toast.error("The PDF could not be generated");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <SettingsPageWrapper title="Reports" description="Download breeder and hatchery performance reports.">
      <div className="space-y-6 p-6">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Report filters</h2>
              <p className="text-sm text-muted-foreground">Choose the scope, then download the report your client needs.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setFrom(startOfWeek(now, { weekStartsOn: 1 })); setTo(endOfWeek(now, { weekStartsOn: 1 })); }}>
                <Calendar className="mr-2 h-4 w-4" />This week
              </Button>
              <Button variant="outline" size="sm" onClick={() => { const lastWeek = subWeeks(now, 1); setFrom(startOfWeek(lastWeek, { weekStartsOn: 1 })); setTo(endOfWeek(lastWeek, { weekStartsOn: 1 })); }}>
                Last week
              </Button>
            </div>
          </div>

          <ScopeFields
            reportType={reportType}
            from={from}
            to={to}
            unitId={unitId}
            flockId={flockId}
            house={house}
            selectedFlocks={selectedFlocks}
            hatcheries={hatcheries}
            flockOptions={flockOptions}
            houses={houses}
            onFrom={setFrom}
            onTo={setTo}
            onUnit={(value) => { setUnitId(value); setHouse("all"); }}
            onFlock={(value) => { setFlockId(value); setHouse("all"); }}
            onHouse={setHouse}
            onSelectedFlocks={setSelectedFlocks}
          />
        </section>

        <Separator />

        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Report data could not be loaded</AlertTitle>
            <AlertDescription>Try a different date range or refresh the page.</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)
          ) : (
            <>
              <StatPreview label="Rows in selection" value={fmtInt(activeRows.length)} />
              <StatPreview label="Eggs set" value={fmtInt(activeTotals.eggsSet)} />
              <StatPreview label="Weighted fertility" value={fmtPct(activeTotals.fertilityPercent)} />
              <StatPreview label="Weekly hatch" value={fmtPct(activeTotals.hatchPercent)} />
            </>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {REPORT_OPTIONS.map((option) => (
            <ReportDownloadCard
              key={option.id}
              option={option}
              active={reportType === option.id}
              rowCount={option.id === "comparison" ? comparisonRows.length : baseFiltered.length}
              disabled={reportDisabled(option.id)}
              loading={downloading === option.id}
              onSelect={() => setReportType(option.id)}
              onDownload={() => downloadReport(option.id)}
            />
          ))}
        </section>

        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertTitle>PDF-focused report design</AlertTitle>
          <AlertDescription>
            The screen stays simple for selection and download. The PDF includes the detailed summary, full tables, metadata, and red or green trend markers.
          </AlertDescription>
        </Alert>

        {reportType === "comparison" && selectedFlocks.length > 0 && selectedFlocks.length < 2 && (
          <p className="text-sm text-muted-foreground">Select at least one more flock to download the comparison report.</p>
        )}
      </div>
    </SettingsPageWrapper>
  );
}
