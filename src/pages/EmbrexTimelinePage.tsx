/** ──────────────────────────────────────────────────────────────────────────
 * Compact Controls: Toolbar + Chips + Drawer
 * - Primary controls live in a single-line toolbar.
 * - Current selections render as small “chips” below (1 line, wraps as needed).
 * - Everything else moves into a right-side Drawer (“More filters”).
 * - Saves ~60–70% vertical space vs the big grid.
 * - Reuses existing state/hooks: metrics, facetBy, granularity, chartMode, etc.
 * ────────────────────────────────────────────────────────────────────────── */

import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, Filter, Settings2, Trash2, Save, Download, BarChart2, LineChart } from "lucide-react";

/* Helper: small pill chip */
function Chip({ children, onClear }: { children: React.ReactNode; onClear?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-background">
      {children}
      {onClear && (
        <button
          className="rounded-full border bg-muted/40 px-1 leading-none hover:bg-muted"
          onClick={onClear}
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </span>
  );
}

/* Helper: label + subtle value */
function Tiny({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/* Inline Select (keeps height minimal) */
function InlineSelect<T extends string>({
  label,
  value,
  onValueChange,
  items,
}: {
  label: string;
  value: T;
  onValueChange: (v: T) => void;
  items: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onValueChange as any}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(it => (
            <SelectItem key={it.value} value={it.value}>
              <div className="flex items-center gap-2">
                {it.icon}
                <span>{it.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ============================== CONTROLS BAR ============================== */
<Card className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70">
  <CardContent className="py-3">
    {/* Top toolbar: primary controls in one row */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Left: quick selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <InlineSelect
          label="Facet"
          value={facetBy}
          onValueChange={(v: any) => setFacetBy(v)}
          items={[
            { value: "flock", label: "Flocks" },
            { value: "unit", label: "Units" },
            { value: "flock_unit", label: "Flock × Unit" },
          ]}
        />
        <InlineSelect
          label="Scale"
          value={granularity}
          onValueChange={(v: any) => setGranularity(v)}
          items={[
            { value: "year", label: "Years" },
            { value: "month", label: "Months" },
            { value: "week", label: "Weeks" },
            { value: "day", label: "Days" },
          ]}
        />
        <InlineSelect
          label="View"
          value={chartMode}
          onValueChange={(v: any) => setChartMode(v)}
          items={[
            { value: "bar", label: "Bar", icon: <BarChart2 className="h-4 w-4" /> },
            { value: "line", label: "Line", icon: <LineChart className="h-4 w-4" /> },
          ]}
        />

        {/* Inline date (compact) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Dates</span>
          <div className="flex items-center gap-1">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[132px]" />
            <span className="text-muted-foreground text-xs">→</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[132px]" />
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-8">
                <Trash2 className="h-4 w-4" /> <span className="ml-1 hidden sm:inline">Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset all filters</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="sm" onClick={exportBucketsCsv} className="h-8">
          <Download className="h-4 w-4" /> <span className="ml-1 hidden sm:inline">Export CSV</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/embrex-data-sheet", { state: { backToTimelineQS: searchParams.toString() } })}
          className="h-8"
        >
          <BarChart2 className="h-4 w-4" /> <span className="ml-1 hidden sm:inline">Embrex Summary</span>
        </Button>

        {/* More filters drawer (everything else lives here) */}
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="sm" className="h-8">
              <Filter className="h-4 w-4" /> <span className="ml-1">More</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>More filters</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 space-y-6 overflow-y-auto">
              {/* Metrics multi-select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Tiny label="Metrics" value={metrics.length ? metrics.map(m => metricLabel[m]).join(", ") : "None"} />
                  <Button variant="outline" size="sm" onClick={() => setMetrics([])}>Clear</Button>
                </div>
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
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Add/remove metrics…" />
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

              <Separator />

              {/* Flocks (multi up to 4) */}
              <div className="space-y-2">
                <Tiny label="Flocks" value={`${selectedFlocks.length || "All"}`} />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between w-full">
                      {selectedFlocks.length ? `${selectedFlocks.length} selected` : "Select flocks"}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
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
                  </PopoverContent>
                </Popover>
              </div>

              {/* Units (multi up to 4) */}
              <div className="space-y-2">
                <Tiny label="Units" value={`${selectedUnits.length || "All"}`} />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between w-full">
                      {selectedUnits.length ? `${selectedUnits.length} selected` : "Select units"}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
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
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Advanced analytics */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="col-span-1">
                  <Tiny label="Percent aggregation" value={percentAgg === "weighted" ? "Weighted" : "Unweighted"} />
                  <Select value={percentAgg} onValueChange={(v: any) => setPercentAgg(v)}>
                    <SelectTrigger className="h-9 w-full mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted">Weighted</SelectItem>
                      <SelectItem value="unweighted">Unweighted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 flex items-end gap-2">
                  <Checkbox id="rolling" checked={rollingAvg} onCheckedChange={(v) => setRollingAvg(Boolean(v))} />
                  <label htmlFor="rolling" className="text-sm">Rolling avg (3 buckets)</label>
                </div>
                <div className="col-span-1">
                  <Tiny label="Benchmark %" value={benchmark === "" ? "—" : String(benchmark)} />
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="h-9 w-full mt-1"
                    placeholder="e.g., 95"
                    value={benchmark}
                    onChange={(e) => setBenchmark(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              {/* Save / load inside drawer too */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Save view as…"
                  value={savedName}
                  onChange={e => setSavedName(e.target.value)}
                  className="h-9 w-48"
                />
                <Button variant="outline" className="h-9 gap-2" onClick={saveCurrentView}>
                  <Save className="h-4 w-4" /> Save
                </Button>
                {savedViews.length > 0 && (
                  <Select onValueChange={applySavedView}>
                    <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Load saved view" /></SelectTrigger>
                    <SelectContent>
                      {savedViews.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button className="w-full">Done</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>

    {/* Selected filters as compact chips (1 line, wraps) */}
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {metrics.length > 0 && (
        <Chip onClear={() => setMetrics([])}>
          Metrics: {metrics.map(m => metricLabel[m]).join(", ")}
        </Chip>
      )}
      {selectedFlocks.length > 0 && (
        <Chip onClear={() => setSelectedFlocks([])}>
          Flocks: {selectedFlocks.join(", ")}
        </Chip>
      )}
      {selectedUnits.length > 0 && (
        <Chip onClear={() => setSelectedUnits([])}>
          Units: {selectedUnits.join(", ")}
        </Chip>
      )}
      {(dateFrom || dateTo) && (
        <Chip onClear={() => { setDateFrom(""); setDateTo(""); }}>
          Dates: {dateFrom || "…"} → {dateTo || "…"}
        </Chip>
      )}
      {percentAgg !== "weighted" && <Badge variant="secondary">Pct: Unweighted</Badge>}
      {rollingAvg && <Badge variant="secondary">Rolling avg</Badge>}
      {benchmark !== "" && <Badge variant="secondary">Benchmark: {benchmark}%</Badge>}
    </div>
  </CardContent>
</Card>
