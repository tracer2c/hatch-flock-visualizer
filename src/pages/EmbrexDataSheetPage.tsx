import { useState, useEffect, useCallback, useRef } from "react";
import { todayLocalISO } from "@/utils/localDate";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, RotateCw, FileSpreadsheet, FileText, Search, X, LayoutGrid, Rows3 } from "lucide-react";
import { CompleteDataView } from "@/components/dashboard/CompleteDataView";
import { DataSheetCenteredFilterDialog } from "@/components/dashboard/DataSheetCenteredFilterDialog";
import type { DataSheetViewMode } from "@/components/dashboard/DataSheetViewModeToggle";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExportService } from "@/services/exportService";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { cn } from "@/lib/utils";


const EmbrexDataSheetPage = () => {
  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess('embrex_data_sheet');
  const [activeTab, setActiveTab] = useState("embrex");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportData, setExportData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<DataSheetViewMode>("rows");
  const { showPercentages, setShowPercentages } = usePercentageToggle();

  // Filter state
  const [filters, setFilters] = useState({
    sortBy: 'set_date' as string,
    sortOrder: 'desc' as 'asc' | 'desc',
    selectedHatcheries: [] as string[],
    selectedMachines: [] as string[],
    technicianSearch: '',
    dateFrom: '',
    dateTo: '',
  });

  const [hatcheries, setHatcheries] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Global ⌘K / Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  const loadFilterOptions = async () => {
    const [hatcheriesRes, machinesRes] = await Promise.all([
      supabase.from('units').select('id, name').order('name'),
      supabase.from('machines').select('id, machine_number').order('machine_number'),
    ]);

    if (hatcheriesRes.data) setHatcheries(hatcheriesRes.data.map(h => ({ id: h.id, name: h.name })));
    if (machinesRes.data) setMachines(machinesRes.data.map(m => ({ id: m.id, name: m.machine_number })));
  };

  const activeFilterCount =
    (filters.selectedHatcheries.length > 0 ? 1 : 0) +
    (filters.selectedMachines.length > 0 ? 1 : 0) +
    (filters.technicianSearch ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  const clearAllFilters = () => {
    setFilters({
      sortBy: 'set_date',
      sortOrder: 'desc',
      selectedHatcheries: [],
      selectedMachines: [],
      technicianSearch: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const toggleHatchery = (id: string) => {
    setFilters(prev => ({
      ...prev,
      selectedHatcheries: prev.selectedHatcheries.includes(id)
        ? prev.selectedHatcheries.filter(h => h !== id)
        : [...prev.selectedHatcheries, id]
    }));
  };

  const toggleMachine = (id: string) => {
    setFilters(prev => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(id)
        ? prev.selectedMachines.filter(m => m !== id)
        : [...prev.selectedMachines, id]
    }));
  };

  const getSortByOptions = () => {
    const commonOptions = [
      { value: 'set_date', label: 'Set Date' },
      { value: 'flock_number', label: 'Flock #' },
      { value: 'flock_name', label: 'Flock Name' },
      { value: 'house_number', label: 'House #' },
      { value: 'age_weeks', label: 'Age (weeks)' },
    ];

    switch (activeTab) {
      case 'embrex':
        return [...commonOptions,
          { value: 'eggs_cleared', label: 'Cleared' },
          { value: 'eggs_injected', label: 'Injected' }
        ];
      case 'residue':
        return [...commonOptions,
          { value: 'total_residue_count', label: 'Total Residue' },
          { value: 'residue_percent', label: 'Residue %' }
        ];
      case 'egg-pack':
        return [...commonOptions,
          { value: 'cracked', label: 'Cracked' },
          { value: 'dirty', label: 'Dirty' }
        ];
      case 'hatch':
        return [...commonOptions,
          { value: 'hatch_percent', label: 'Hatch %' },
          { value: 'hof_percent', label: 'HOF %' }
        ];
      case 'qa':
        return [...commonOptions,
          { value: 'check_date', label: 'Check Date' },
          { value: 'temperature', label: 'Temperature' }
        ];
      default:
        return commonOptions;
    }
  };

  useEffect(() => {
    document.title = "Data Sheet | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "View and analyze all hatchery data including flock information, fertility analysis, egg pack quality, and hatch performance metrics."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "View and analyze all hatchery data including flock information, fertility analysis, egg pack quality, and hatch performance metrics.";
      document.head.appendChild(m);
    }
  }, []);

  const getColumnMapForTab = (tab: string): Record<string, string> => {
    switch (tab) {
      case 'embrex':
        return {
          'Flock #': 'flock_number', 'Flock Name': 'flock_name', 'House #': 'house_number',
          'Age (weeks)': 'age_weeks', 'Set Date': 'set_date', 'Total Eggs': 'total_eggs_set',
          'Cleared': 'eggs_cleared', 'Injected': 'eggs_injected', 'Chicks Hatched': 'chicks_hatched',
          'Technician': 'hoi_technician_name', 'Notes': 'hoi_notes'
        };
      case 'residue':
        return {
          'Flock #': 'flock_number', 'Flock Name': 'flock_name', 'House #': 'house_number',
          'Age (weeks)': 'age_weeks', 'Set Date': 'set_date', 'Sample Size': 'sample_size',
          'Infertile': 'infertile_eggs', 'Early Dead': 'early_dead', 'Mid Dead': 'mid_dead',
          'Late Dead': 'late_dead', 'Cull Chicks': 'cull_chicks', 'HOF %': 'hof_percent',
          'HOI %': 'hoi_percent', 'Technician': 'lab_technician', 'Notes': 'notes'
        };
      case 'egg-pack':
        return {
          'Flock #': 'flock_number', 'Flock Name': 'flock_name', 'House #': 'house_number',
          'Age (weeks)': 'age_weeks', 'Inspection Date': 'inspection_date', 'Sample Size': 'sample_size',
          'Grade A': 'grade_a', 'Grade B': 'grade_b', 'Grade C': 'grade_c',
          'Cracked': 'cracked', 'Dirty': 'dirty', 'Inspector': 'inspector_name', 'Notes': 'notes'
        };
      case 'hatch':
        return {
          'Flock #': 'flock_number', 'Flock Name': 'flock_name', 'House #': 'house_number',
          'Age (weeks)': 'age_weeks', 'Set Date': 'set_date', 'Fertile Eggs': 'fertile_eggs',
          'Fertility %': 'fertility_percent', 'Hatch %': 'hatch_percent', 'HOF %': 'hof_percent',
          'HOI %': 'hoi_percent', 'Technician': 'technician_name', 'Notes': 'notes'
        };
      case 'qa':
        return {
          'Flock #': 'flock_number', 'Flock Name': 'flock_name', 'House #': 'house_number',
          'Check Date': 'check_date', 'Day': 'day_of_incubation', 'Temperature': 'temperature',
          'Humidity': 'humidity', 'CO2 Level': 'co2_level', 'Inspector': 'inspector_name', 'Notes': 'notes'
        };
      default:
        return {};
    }
  };

  const handleDataReady = useCallback((data: any[]) => {
    setExportData(data);
  }, []);

  const handleExportCSV = () => {
    if (exportData.length === 0) return toast.error("No data to export");
    const columnMap = getColumnMapForTab(activeTab);
    const headers = Object.keys(columnMap);
    const formattedData = exportData.map(row => {
      const formatted: Record<string, any> = {};
      Object.entries(columnMap).forEach(([displayName, fieldName]) => {
        formatted[displayName] = row[fieldName] ?? '';
      });
      return formatted;
    });
    ExportService.exportToCSV(formattedData, `${activeTab}-data-${todayLocalISO()}`, headers);
    toast.success("CSV exported successfully");
  };

  const handleExportExcel = () => {
    if (exportData.length === 0) return toast.error("No data to export");
    const columnMap = getColumnMapForTab(activeTab);
    const headers = Object.keys(columnMap);
    const formattedData = exportData.map(row => {
      const formatted: Record<string, any> = {};
      Object.entries(columnMap).forEach(([displayName, fieldName]) => {
        formatted[displayName] = row[fieldName] ?? '';
      });
      return formatted;
    });
    ExportService.exportToExcel(formattedData, `${activeTab}-data-${todayLocalISO()}`, activeTab.charAt(0).toUpperCase() + activeTab.slice(1), headers);
    toast.success("Excel exported successfully");
  };

  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("Data refreshed");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-full overflow-hidden bg-background flex flex-col">
        {/* Compact single-row toolbar */}
        <div className="border-b bg-card px-4 py-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold whitespace-nowrap mr-1">Data Sheet</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-9">
                <TabsTrigger value="embrex">Embrex/HOI</TabsTrigger>
                <TabsTrigger value="residue">Residue Analysis</TabsTrigger>
                <TabsTrigger value="egg-pack">Egg Quality</TabsTrigger>
                <TabsTrigger value="hatch">Hatch Results</TabsTrigger>
                <TabsTrigger value="qa">Quality Assurance</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="ml-auto flex items-center gap-2">
              {/* View toggle — always visible for a consistent per-tab layout */}
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                <Button
                  variant={viewMode === "rows" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  onClick={() => setViewMode("rows")}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                  By House
                </Button>
                <Button
                  variant={viewMode === "flock-summary" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  onClick={() => setViewMode("flock-summary")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  By Flock
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Persistent pill search with ⌘K hint */}
              <div className="relative hidden md:block w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search flock, house, technician…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchTerm("");
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="h-9 pl-8 pr-16 text-sm rounded-full bg-muted/40 border-muted focus-visible:bg-background"
                />
                {searchTerm ? (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                )}
              </div>

              {/* Icon-only search on small screens */}
              <div className="md:hidden">
                {searchOpen ? (
                  <div className="relative w-48">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Search…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onBlur={() => { if (!searchTerm) setSearchOpen(false); }}
                      className="h-9 pl-7 pr-2 text-sm"
                    />
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted" onClick={() => setSearchOpen(true)}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Search</TooltipContent>
                  </Tooltip>
                )}
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-1.5">
                <Switch id="percentage-toggle" checked={showPercentages} onCheckedChange={setShowPercentages} />
                <Label htmlFor="percentage-toggle" className="text-xs cursor-pointer whitespace-nowrap">
                  %
                </Label>
              </div>

              <DataSheetCenteredFilterDialog
                filters={filters}
                setFilters={setFilters}
                hatcheries={hatcheries}
                machines={machines}
                sortByOptions={getSortByOptions()}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearAllFilters}
                onToggleHatchery={toggleHatchery}
                onToggleMachine={toggleMachine}
              />

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted" onClick={handleManualRefresh}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Export</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="bg-background">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content — internal scroll only */}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <ReadOnlyBanner show={readOnly} />
          <CompleteDataView
            key={`${showPercentages ? 'percentage' : 'count'}-${refreshKey}`}
            activeTab={activeTab}
            searchTerm={searchTerm}
            filters={filters}
            onDataReady={handleDataReady}
            readOnly={readOnly}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EmbrexDataSheetPage;

