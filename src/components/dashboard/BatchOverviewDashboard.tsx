import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useActiveBatches, useBatchPerformanceMetrics, useQAAlerts, useMachineUtilization } from "@/hooks/useHouseData";
import { Calendar as CalendarIcon, AlertTriangle, TrendingUp, TrendingDown, Activity, Thermometer, Package, RefreshCw, Download, Settings, Search, Eye, ChevronDown, Expand, Compress } from "lucide-react";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { OverviewHeader } from "./OverviewHeader";
import { useChartDownload } from "@/hooks/useChartDownload";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useHelpContext } from "@/contexts/HelpContext";

const BatchOverviewDashboard: React.FC = () => {
  const { data: activeBatches, isLoading: activeBatchesLoading } = useActiveBatches();
  const { data: performanceMetrics, isLoading: performanceLoading } = useBatchPerformanceMetrics();
  const { data: qaAlerts, isLoading: alertsLoading } = useQAAlerts();
  const { data: machineUtil, isLoading: machineLoading } = useMachineUtilization();

  const isLoading = activeBatchesLoading || performanceLoading || alertsLoading || machineLoading;

  const { downloadChart } = useChartDownload();
  const navigate = useNavigate();
  const { updateContext } = useHelpContext();

  const handleHouseClick = (houseId: string) => {
    navigate(`/data-entry/house/${houseId}`);
  };

  const { toast } = useToast();

  const handleDemoCleanup = async () => {
    try {
      toast({ title: "Running demo cleanup...", description: "Completing overdue houses and freeing machines." });
      const batchNumbers = [
        "6374-2025-5115",
        "6371-2025-9896",
        "6375-2025-4556",
        "6367-2025-7089",
      ];

      const { data: batches, error } = await supabase
        .from("batches")
        .select("id, batch_number, machine_id, total_eggs_set, expected_hatch_date")
        .in("batch_number", batchNumbers);

      if (error) throw error;
      if (!batches || batches.length === 0) {
        toast({ title: "No matching batches found", description: "Nothing to clean up.", variant: "destructive" });
        return;
      }

      // Prepare updates with realistic results
      const rateByBatch: Record<string, number> = {
        "6374-2025-5115": 0.89,
        "6371-2025-9896": 0.9,
        "6375-2025-4556": 0.88,
        "6367-2025-7089": 0.87,
      };

      const batchUpdatePromises = batches.map((b) => {
        const expected = new Date(String(b.expected_hatch_date));
        expected.setDate(expected.getDate() + 1);
        const actualDate = expected.toISOString().slice(0, 10);
        const rate = rateByBatch[b.batch_number] ?? 0.88;
        const eggs = Number(b.total_eggs_set) || 0;
        const chicks = Math.max(0, Math.round(eggs * rate));
        return supabase
          .from("batches")
          .update({ status: "completed", actual_hatch_date: actualDate, chicks_hatched: chicks })
          .eq("id", b.id);
      });

      await Promise.all(batchUpdatePromises);

      const machineIds = Array.from(
        new Set((batches.map((b) => b.machine_id).filter(Boolean) as string[]))
      );
      if (machineIds.length) {
        const { error: mErr } = await supabase
          .from("machines")
          .update({ status: "available" })
          .in("id", machineIds);
        if (mErr) throw mErr;
      }

      toast({
        title: "Demo cleanup completed",
        description: `${batches.length} batches completed and ${machineIds.length} machines freed.`,
      });

      // Refresh view
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Cleanup failed", description: e.message ?? String(e), variant: "destructive" });
    }
  };

  // Filters state
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [machineFilter, setMachineFilter] = React.useState<string>("all");
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [showMachineUtil, setShowMachineUtil] = React.useState<boolean>(false);

  // Pipeline controls state
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [selectedHouses, setSelectedHouses] = React.useState<string[]>([]);
  const [viewMode, setViewMode] = React.useState<"auto" | "manual">("auto");
  const [showAllHouses, setShowAllHouses] = React.useState<boolean>(false);
  const maxDisplayHouses = 3;

  // Derived machines list for header
  const machinesList = React.useMemo(
    () => machineUtil?.map((m) => ({ id: String(m.id), name: m.machine_number })) ?? [],
    [machineUtil]
  );

  // Helper to check date within range
  const isWithinRange = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const fromOk = dateRange.from ? d >= new Date(dateRange.from.setHours(0, 0, 0, 0)) : true;
    const toOk = dateRange.to ? d <= new Date(dateRange.to.setHours(23, 59, 59, 999)) : true;
    return fromOk && toOk;
  };

  // Helper functions - must be defined before useMemo hooks
  const getDaysFromSet = (setDate: string) => {
    const set = new Date(setDate);
    const now = new Date();
    return Math.floor((now.getTime() - set.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "setting":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "incubating":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hatching":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProgressDisplay = (setDate: string) => {
    const daysFromSet = getDaysFromSet(setDate);
    const isOverdue = daysFromSet > 21;
    const displayDays = Math.min(daysFromSet, 21);
    const overdueDays = isOverdue ? daysFromSet - 21 : 0;
    
    return {
      text: isOverdue ? `Day 21+ (${overdueDays} days overdue)` : `Day ${daysFromSet} of 21`,
      progress: Math.min((daysFromSet / 21) * 100, 100),
      isOverdue,
      daysFromSet
    };
  };

  // Apply filters to active batches
  const filteredActiveBatches = React.useMemo(() => {
    let list = activeBatches ?? [];
    
    // Apply status, machine, and date filters
    list = list.filter((b: any) => {
      const statusOk = statusFilter === "all" ? true : b.status === statusFilter;
      const machineId = String(b.machine_id ?? b.machines?.id ?? "");
      const machineOk = machineFilter === "all" ? true : machineId === machineFilter;
      const dateOk = isWithinRange(b.set_date);
      return statusOk && machineOk && dateOk;
    });

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      list = list.filter((b: any) => 
        b.batch_number?.toLowerCase().includes(search) ||
        b.flocks?.flock_name?.toLowerCase().includes(search) ||
        b.machines?.machine_number?.toLowerCase().includes(search) ||
        b.status?.toLowerCase().includes(search)
      );
    }

    return list;
  }, [activeBatches, statusFilter, machineFilter, dateRange, searchTerm]);

  // Get priority-sorted houses for display
  const displayedHouses = React.useMemo(() => {
    if (viewMode === "manual" && selectedHouses.length > 0) {
      // Manual selection mode - show selected houses
      return filteredActiveBatches.filter((b: any) => selectedHouses.includes(b.id));
    }

    if (showAllHouses) {
      // Show all filtered houses
      return filteredActiveBatches;
    }

    // Auto mode with priority sorting and limit
    const sorted = [...filteredActiveBatches].sort((a: any, b: any) => {
      // Priority 1: Status urgency (overdue → hatching → incubating → setting)
      const statusPriority = { overdue: 0, hatching: 1, incubating: 2, setting: 3 };
      const aDays = getDaysFromSet(a.set_date);
      const bDays = getDaysFromSet(b.set_date);
      const aOverdue = aDays > 21;
      const bOverdue = bDays > 21;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aOverdue && bOverdue) return bDays - aDays; // Most overdue first
      
      // Priority 2: Status
      const aStatusPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 4;
      const bStatusPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 4;
      if (aStatusPriority !== bStatusPriority) return aStatusPriority - bStatusPriority;
      
      // Priority 3: Days since set (more recent first for same status)
      return bDays - aDays;
    });

    return sorted.slice(0, maxDisplayHouses);
  }, [filteredActiveBatches, viewMode, selectedHouses, showAllHouses, maxDisplayHouses]);

  // House options for dropdown
  const houseOptions = React.useMemo(() => {
    return filteredActiveBatches.map((b: any) => ({
      id: b.id,
      label: `${b.batch_number} - ${b.flocks?.flock_name || 'Unknown'} (${b.status})`,
      batch: b
    }));
  }, [filteredActiveBatches]);

  // Optionally filter machines view when a specific machine is selected
  const filteredMachineUtil = React.useMemo(() => {
    if (!machineUtil) return [] as any[];
    return machineFilter === "all"
      ? machineUtil
      : machineUtil.filter((m: any) => String(m.id) === machineFilter);
  }, [machineUtil, machineFilter]);

  // Calculate key metrics first - handle null values
  const fertilityData = (performanceMetrics?.filter((b: any) => b?.fertility !== null && b?.fertility !== undefined) || []) as any[];
  const avgFert = fertilityData.length > 0
    ? fertilityData.reduce((sum: number, b: any) => sum + b.fertility, 0) / fertilityData.length
    : 0;

  const hatchData = (performanceMetrics?.filter((b: any) => b?.hatch !== null && b?.hatch !== undefined) || []) as any[];
  const avgHatch = hatchData.length > 0
    ? hatchData.reduce((sum: number, b: any) => sum + b.hatch, 0) / hatchData.length
    : 0;

  // Update help context with dashboard metrics
  React.useEffect(() => {
    if (!isLoading && activeBatches && performanceMetrics) {
      const totalActiveHouses = filteredActiveBatches.length;
      const avgFertility = avgFert || 0;
      const avgHatchRate = avgHatch || 0;
      const totalAlerts = qaAlerts?.length || 0;
      const avgMachineUtil = machineUtil?.reduce((acc, m) => acc + (m.utilization || 0), 0) / (machineUtil?.length || 1);

      updateContext({
        activePage: "Dashboard Overview",
        visibleElements: [
          "Active Houses Pipeline",
          "Performance Percentages", 
          "QA Alerts",
          showMachineUtil ? "Machine Utilization" : "System Status"
        ],
        currentMetrics: {
          totalActiveHouses: Math.round(totalActiveHouses),
          avgFertility: Math.round(avgFertility),
          avgHatch: Math.round(avgHatchRate),
          totalAlerts,
          avgMachineUtil: Math.round(avgMachineUtil || 0)
        },
        selectedFilters: {
          status: statusFilter,
          machine: machineFilter,
          dateRange: dateRange
        }
      });
    }
  }, [isLoading, activeBatches, performanceMetrics, qaAlerts, machineUtil, statusFilter, machineFilter, dateRange, showMachineUtil, updateContext, filteredActiveBatches, avgFert, avgHatch]);

  // Calculate key metrics - handle null values
  const totalActiveHouses = filteredActiveBatches.length;

  const totalAlerts = qaAlerts?.length || 0;
  const avgMachineUtil = filteredMachineUtil?.length
    ? filteredMachineUtil.reduce((sum: number, m: any) => sum + m.utilization, 0) / filteredMachineUtil.length
    : 0;

  // Function to handle chart download
  const handleChartDownload = async () => {
    try {
      await downloadChart("active-houses-pipeline", "active-houses-pipeline.png");
      toast({ title: "Download completed", description: "Chart has been downloaded successfully." });
    } catch (error) {
      toast({ title: "Download failed", description: "Failed to download chart.", variant: "destructive" });
    }
  };

  // Skeleton state for enterprise-level polish
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="sticky top-0 z-10 -mx-4 px-4 lg:mx-0 lg:px-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between h-14">
            <div className="h-6 w-40"><Skeleton className="h-6 w-40" /></div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-9 w-36" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <Skeleton className="h-10 w-56" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-2 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky overview header */}
      <OverviewHeader
        machines={machinesList}
        onStatusChange={setStatusFilter}
        onMachineChange={(m) => setMachineFilter(m)}
        onDateRangeChange={(range) => setDateRange(range)}
        onExport={() => {
          const toDownload = [
            { id: "overview-kpis", filename: "overview-kpis.png" },
            { id: "active-houses-pipeline", filename: "active-houses-pipeline.png" },
            { id: "machine-utilization-status", filename: "machine-utilization-status.png" },
          ];
          (async () => {
            for (const item of toDownload) {
              await downloadChart(item.id, item.filename);
            }
          })();
        }}
        
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Main content */}
        <section className="col-span-12 lg:col-span-8 space-y-6">
        {/* Key Performance Indicators */}
        <div id="overview-kpis" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="Active Houses"
                    value={totalActiveHouses}
                    icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                    trendLabel="Currently in process"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <EnhancedTooltip
                  chartType="batch-overview"
                  data={{ totalActiveHouses, activeBatches: filteredActiveBatches }}
                  title="Active Houses"
                  metrics={[
                    { label: "Total Active", value: totalActiveHouses },
                    { label: "Status", value: "Currently processing" },
                  ]}
                />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="Avg Fertility"
                    value={`${avgFert.toFixed(1)}%`}
                    icon={<Package className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <EnhancedTooltip
                  chartType="batch-overview"
                  data={{ avgFert, target: 85 }}
                  title="Average Fertility"
                  metrics={[
                    { label: "Current Average", value: `${avgFert.toFixed(1)}%` },
                    { label: "Target", value: "85%" },
                  ]}
                />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <StatCard
            title="Avg Hatch Rate"
            value={`${avgHatch.toFixed(1)}%`}
            icon={<Package className="h-4 w-4 text-muted-foreground" />}
          />

          <StatCard
            title="Machine Utilization"
            value={`${avgMachineUtil.toFixed(0)}%`}
            icon={<Thermometer className="h-4 w-4 text-muted-foreground" />}
            trendLabel="Average usage"
          />
        </div>

          {/* Active Houses Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Active Houses Pipeline
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 relative">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      placeholder="Search houses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9 w-full"
                    />
                  </div>

                  {/* View Mode Selector */}
                  <div className="relative">
                    <Select value={viewMode} onValueChange={(value: "auto" | "manual") => setViewMode(value)}>
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-[100] min-w-[8rem]" position="popper" sideOffset={4}>
                        <SelectItem value="auto">Auto View</SelectItem>
                        <SelectItem value="manual">Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* House Selection Dropdown - Only shown in manual mode */}
                  {viewMode === "manual" && (
                    <div className="relative">
                      <Select 
                        value={selectedHouses.length === 1 ? selectedHouses[0] : ""} 
                        onValueChange={(value) => {
                          if (value) {
                            setSelectedHouses(prev => {
                              if (prev.includes(value)) return prev;
                              return [...prev, value].slice(0, maxDisplayHouses);
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-48 h-9">
                          <SelectValue placeholder="Select houses..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-[100] max-h-60 overflow-y-auto min-w-[12rem]" position="popper" sideOffset={4}>
                          {houseOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Dropdown Menu with Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3">
                        <Settings className="h-4 w-4 mr-2" />
                        Actions
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* View Controls */}
                      {filteredActiveBatches.length > maxDisplayHouses && viewMode === "auto" && (
                        <>
                          <DropdownMenuItem onClick={() => setShowAllHouses(!showAllHouses)}>
                            {showAllHouses ? (
                              <>
                                <Compress className="h-4 w-4 mr-2" />
                                Collapse View
                              </>
                            ) : (
                              <>
                                <Expand className="h-4 w-4 mr-2" />
                                Expand View ({filteredActiveBatches.length} total)
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      {/* Download Chart */}
                      <DropdownMenuItem onClick={handleChartDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Chart
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardTitle>
              
              {/* Manual mode selected houses display */}
              {viewMode === "manual" && selectedHouses.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedHouses.map((houseId) => {
                    const house = filteredActiveBatches.find((b: any) => b.id === houseId);
                    return house ? (
                      <Badge key={houseId} variant="secondary" className="text-xs">
                        {house.batch_number}
                        <button 
                          onClick={() => setSelectedHouses(prev => prev.filter(id => id !== houseId))}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  {selectedHouses.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedHouses([])}
                      className="h-6 px-2 text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent id="active-houses-pipeline">
              {displayedHouses && displayedHouses.length > 0 ? (
                 <div className="space-y-4">
                   {displayedHouses.map((house) => (
                     <div 
                       key={house.id} 
                       onClick={() => handleHouseClick(house.id)}
                       className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                     >
                       <div className="flex items-center gap-4">
                         <div>
                           <div className="font-medium text-card-foreground group-hover:text-accent-foreground">{house.batch_number}</div>
                           <div className="text-sm text-muted-foreground">
                             {house.flocks?.flock_name} (Flock {house.flocks?.flock_number})
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge className={getStatusColor(house.status)}>{house.status}</Badge>
                           {getProgressDisplay(house.set_date).isOverdue && (
                             <Badge variant="destructive" className="text-xs">OVERDUE</Badge>
                           )}
                         </div>
                       </div>

                       <div className="text-right">
                         <div className={`text-sm font-medium ${getProgressDisplay(house.set_date).isOverdue ? 'text-destructive' : 'text-card-foreground'}`}>
                           {getProgressDisplay(house.set_date).text}
                         </div>
                         <div className="text-sm text-muted-foreground">{house.machines?.machine_number} ({house.machines?.machine_type})</div>
                       </div>

                       <div className="w-32">
                         <Progress 
                           value={getProgressDisplay(house.set_date).progress} 
                           className={`h-2 ${getProgressDisplay(house.set_date).isOverdue ? '[&>div]:bg-destructive' : ''}`} 
                         />
                       </div>
                     </div>
                     ))}
                  </div>
               ) : (
                 <div className="text-center py-8 text-muted-foreground">
                   {searchTerm ? `No houses found matching "${searchTerm}"` : "No active houses found. Start a new house from the Data Entry page."}
                 </div>
               )}
            </CardContent>
          </Card>
        </section>

        {/* Insights rail */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          {/* QA Alerts / Machine Utilization Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {showMachineUtil ? (
                    <>
                      <Activity className="h-5 w-5" />
                      Machine Utilization Status
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      QA Alerts Requiring Attention
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`p-2 transition-colors ${showMachineUtil ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => setShowMachineUtil(!showMachineUtil)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{showMachineUtil ? 'Switch to QA Alerts' : 'Switch to Machine Utilization'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {showMachineUtil && (
                    <ChartDownloadButton chartId="machine-utilization-status" filename="machine-utilization-status.png" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[200px]">
                {/* Machine Utilization Content */}
                <div className={`transition-all duration-300 ${showMachineUtil ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'}`}>
                  {showMachineUtil && (
                    <div className="grid grid-cols-1 gap-4" id="machine-utilization-status">
                      {filteredMachineUtil?.map((machine) => (
                        <div key={machine.id} className="p-4 border border-border rounded-lg bg-card">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium text-card-foreground">{machine.machine_number}</div>
                            <Badge variant={machine.currentStatus === "available" ? "secondary" : "default"}>{machine.currentStatus}</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Utilization</span>
                              <span className="text-card-foreground">{machine.utilization.toFixed(0)}%</span>
                            </div>
                            <Progress value={machine.utilization} className="h-2" />
                            <div className="text-xs text-muted-foreground">{machine.currentLoad.toLocaleString()} / {machine.capacity.toLocaleString()} capacity</div>
                          </div>
                        </div>
                      ))}
                      {(!filteredMachineUtil || filteredMachineUtil.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">No machine utilization data available.</div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* QA Alerts Content */}
                <div className={`transition-all duration-300 ${!showMachineUtil ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'}`}>
                  {!showMachineUtil && (
                    <div className="space-y-3">
                      {qaAlerts && qaAlerts.length > 0 ? (
                        qaAlerts.slice(0, 5).map((alert) => (
                          <div key={alert.id} className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <div>
                                <div className="font-medium text-card-foreground">{alert.batches?.batch_number} - Temperature/Humidity Alert</div>
                                <div className="text-sm text-muted-foreground">Temp: {alert.temperature}°F, Humidity: {alert.humidity}%</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">{alert.check_date}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">No QA alerts at this time.</div>
                      )}
                      {qaAlerts && qaAlerts.length > 5 && (
                        <div className="mt-4 text-center">
                          <Button variant="outline" size="sm">
                            View All {qaAlerts.length} Alerts
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default BatchOverviewDashboard;