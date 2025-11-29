import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Clock, AlertCircle, Activity, TrendingUp, Building2, CheckCircle, Gauge, Search, Grid3X3, List, Download, Filter, RefreshCw, AlertTriangle, Egg, Bird, Syringe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBatchData, useBatchPerformanceMetrics, useMachineUtilization, useQAAlerts } from "@/hooks/useHouseData";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { formatDistanceToNow, format } from "date-fns";
import { useHelpContext } from "@/contexts/HelpContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAverageFlockAge } from "@/hooks/useAverageFlockAge";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { ExportService } from "@/services/exportService";
import { useChartExport } from "@/hooks/useChartExport";
import CriticalEventsPanel from "./CriticalEventsPanel";

const BatchOverviewDashboard = () => {
  const { data: activeBatches, isLoading: batchesLoading, refetch: refetchBatches } = useBatchData();
  const { data: performanceMetrics, isLoading: metricsLoading } = useBatchPerformanceMetrics();
  const { data: machineUtilization, isLoading: machinesLoading } = useMachineUtilization();
  const { data: qaAlerts, isLoading: alertsLoading } = useQAAlerts();
  const { data: flockAgeData } = useAverageFlockAge();
  const { exportChartToPDF } = useChartExport();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updateContext } = useHelpContext();
  const [totalBatchesCount, setTotalBatchesCount] = useState(0);
  const [lastWeekBatchesCount, setLastWeekBatchesCount] = useState(0);
  const [targets, setTargets] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  
  // UI display mode (simple vs detailed view)
  const [displayMode, setDisplayMode] = useState<'simple' | 'detailed'>('simple');

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hatcheryFilter, setHatcheryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedMachine, setSelectedMachine] = useState<string | "all">("all");
  const [showQAAlerts, setShowQAAlerts] = useState(true);
  const [pipelineView, setPipelineView] = useState<"active" | "all" | "completed" | "incubating">("active");

  const isLoading = batchesLoading || metricsLoading || machinesLoading || alertsLoading;

  const handleRefresh = () => {
    refetchBatches();
    toast({ title: "Data refreshed", description: "Dashboard data has been updated." });
  };

  const handleExport = () => {
    try {
      const exportData = ExportService.formatDataForExport(listForDisplay, {
        'Batch #': 'batch_number',
        'Flock': 'flock_name',
        'Status': 'status',
        'Set Date': 'set_date',
        'Eggs Set': 'total_eggs_set',
        'Hatchery': 'unit_name'
      });
      ExportService.exportToCSV(exportData, 'active-batches', Object.keys(exportData[0] || {}));
      toast({ title: "Export successful", description: "Data exported to CSV." });
    } catch (error) {
      toast({ title: "Export failed", description: "Failed to export data.", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    await exportChartToPDF('batch-overview-dashboard', 'batch-overview-dashboard');
  };

  const handleDemoCleanup = async () => {
    try {
      const confirmed = window.confirm("This will delete ALL test data and reset the system. Are you sure?");
      if (!confirmed) return;

      toast({
        title: "Demo Data Cleaned",
        description: "All test data has been removed and system has been reset.",
      });
      
      refetchBatches();
    } catch (error) {
      console.error('Error cleaning demo data:', error);
      toast({
        title: "Error",
        description: "Failed to clean demo data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const machinesList = useMemo(() => {
    return machineUtilization?.map((machine: any) => ({
      id: machine.id,
      name: machine.name || `Machine ${machine.id}`
    })) || [];
  }, [machineUtilization]);

  const isWithinRange = (dateStr: string) => {
    if (!selectedDateRange.from || !selectedDateRange.to) return true;
    const date = new Date(dateStr);
    return date >= selectedDateRange.from && date <= selectedDateRange.to;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "setting": return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "incubating": return "bg-amber-500/10 text-amber-700 border-amber-200";
      case "hatching": return "bg-green-500/10 text-green-700 border-green-200";
      case "completed": return "bg-slate-500/10 text-slate-600 border-slate-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "setting": return "border-l-blue-500";
      case "incubating": return "border-l-amber-500";
      case "hatching": return "border-l-green-500";
      case "completed": return "border-l-slate-400";
      default: return "border-l-muted";
    }
  };

  const getProgressDisplay = (batch: any) => {
    if (!batch.set_date) return "No set date";
    const setDate = new Date(batch.set_date);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedDays = 21; // Standard incubation period
    
    if (daysDiff > expectedDays) {
      return `Day ${daysDiff} (Overdue)`;
    }
    
    return `Day ${daysDiff} of ${expectedDays}`;
  };

  const filteredActiveBatches = useMemo(() => {
    if (!activeBatches) return [];
    
    return activeBatches.filter((batch: any) => {
      // Apply pipeline view filter
      if (pipelineView === "active" && batch.status === "completed") return false;
      if (pipelineView === "completed" && batch.status !== "completed") return false;
      if (pipelineView === "incubating" && batch.status !== "incubating") return false;
      
      // When "all" is selected, show everything without other filters
      if (pipelineView === "all") {
        // Apply hatchery filter
        const hatcheryMatch = hatcheryFilter === "all" || batch.unit_id === hatcheryFilter;
        const searchMatch = !searchTerm || 
          batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.flocks?.flock_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return hatcheryMatch && searchMatch;
      }
      
      // For other pipeline views, apply all filters
      const hatcheryMatch = hatcheryFilter === "all" || batch.unit_id === hatcheryFilter;
      const machineMatch = selectedMachine === "all" || batch.machine_id === selectedMachine;
      const dateMatch = isWithinRange(batch.set_date || batch.created_at);
      const searchMatch = !searchTerm || 
        batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.flocks?.flock_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return hatcheryMatch && machineMatch && dateMatch && searchMatch;
    });
  }, [activeBatches, pipelineView, hatcheryFilter, selectedMachine, selectedDateRange, searchTerm]);

  const listForDisplay = useMemo(() => {
    return filteredActiveBatches;
  }, [filteredActiveBatches]);

  const avgFert = useMemo(() => {
    const validBatches = performanceMetrics?.filter((batch: any) => {
      const hatcheryMatch = hatcheryFilter === "all" || 
        activeBatches?.find((b: any) => b.batch_number === batch.batchNumber)?.unit_id === hatcheryFilter;
      return batch.fertility != null && !isNaN(batch.fertility) && hatcheryMatch;
    }) || [];
    
    if (validBatches.length === 0) return 0;
    
    const sum = validBatches.reduce((acc: number, batch: any) => acc + batch.fertility, 0);
    return Math.round(sum / validBatches.length);
  }, [performanceMetrics, hatcheryFilter, activeBatches]);

  const avgHOF = useMemo(() => {
    const validBatches = performanceMetrics?.filter((batch: any) => {
      const hatcheryMatch = hatcheryFilter === "all" || batch.unitId === hatcheryFilter;
      return batch.hof != null && !isNaN(batch.hof) && hatcheryMatch;
    }) || [];
    
    if (validBatches.length === 0) return 0;
    
    const sum = validBatches.reduce((acc: number, batch: any) => acc + batch.hof, 0);
    return Math.round(sum / validBatches.length);
  }, [performanceMetrics, hatcheryFilter]);

  const avgHOI = useMemo(() => {
    const validBatches = performanceMetrics?.filter((batch: any) => {
      const hatcheryMatch = hatcheryFilter === "all" || batch.unitId === hatcheryFilter;
      return batch.hoi != null && !isNaN(batch.hoi) && hatcheryMatch;
    }) || [];
    
    if (validBatches.length === 0) return 0;
    
    const sum = validBatches.reduce((acc: number, batch: any) => acc + batch.hoi, 0);
    return Math.round(sum / validBatches.length);
  }, [performanceMetrics, hatcheryFilter]);

  const systemUtilization = useMemo(() => {
    if (!machineUtilization || machineUtilization.length === 0) return 0;
    
    // Filter machines by hatchery if selected
    const filteredMachines = hatcheryFilter === "all" 
      ? machineUtilization 
      : machineUtilization.filter((machine: any) => machine.unit_id === hatcheryFilter);
    
    if (filteredMachines.length === 0) return 0;
    
    // Calculate average machine utilization
    const sum = filteredMachines.reduce((acc: number, machine: any) => 
      acc + (machine.utilization || 0), 0
    );
    return Math.round(sum / filteredMachines.length);
  }, [machineUtilization, hatcheryFilter]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch all queries in parallel for better performance
        const [unitsResult, totalResult, lastWeekResult, targetsResult] = await Promise.all([
          // Units query
          supabase.from('units').select('id, name').order('name', { ascending: true }),
          
          // Total batches query
          (async () => {
            let query = supabase
              .from('batches')
              .select('*', { count: 'exact', head: true });
            
            if (hatcheryFilter !== 'all') {
              query = query.eq('unit_id', hatcheryFilter);
            }
            return query;
          })(),
          
          // Last week batches query
          (async () => {
            const lastWeekDate = new Date();
            lastWeekDate.setDate(lastWeekDate.getDate() - 7);
            let query = supabase
              .from('batches')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', lastWeekDate.toISOString());
            
            if (hatcheryFilter !== 'all') {
              query = query.eq('unit_id', hatcheryFilter);
            }
            return query;
          })(),
          
          // Targets query
          supabase
            .from('custom_targets')
            .select('*')
            .eq('is_active', true)
            .eq('target_type', 'global')
        ]);

        // Process results
        if (unitsResult.data) setUnits(unitsResult.data);
        if (totalResult.count !== null) setTotalBatchesCount(totalResult.count);
        if (lastWeekResult.count !== null) setLastWeekBatchesCount(lastWeekResult.count);
        
        if (targetsResult.data && targetsResult.data.length > 0) {
          const targetsMap: any = {};
          targetsResult.data.forEach((t: any) => {
            targetsMap[t.metric_name] = t.target_value;
          });
          setTargets(targetsMap);
        }
        
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };
    
    fetchMetrics();
  }, [hatcheryFilter]);

  // Refresh data when needed
  useEffect(() => {
    refetchBatches();
  }, [refetchBatches]);

  useEffect(() => {
    if (!isLoading) {
      updateContext({
        activePage: "Dashboard Overview",
        visibleElements: ["Active Batches", "Performance Metrics", "QA Alerts", "Machine Utilization"],
        currentMetrics: {
          totalBatches: listForDisplay.length,
          avgFertility: avgFert,
          avgHOF: avgHOF,
          avgHOI: avgHOI,
          alerts: qaAlerts?.length || 0
        },
        selectedFilters: { hatchery: hatcheryFilter, machine: selectedMachine, search: searchTerm }
      });
    }
  }, [isLoading, listForDisplay, avgFert, avgHOF, avgHOI, qaAlerts, hatcheryFilter, selectedMachine, searchTerm, updateContext]);

  return (
    <>
      {isLoading ? (
        <div className="h-screen grid grid-rows-[auto_auto_1fr] p-4 gap-6">
          <Skeleton className="h-14" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8">
              <Skeleton className="h-full" />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <Skeleton className="h-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-5">
          {/* Compact Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-card via-card to-muted/30 border shadow-sm">
            {/* Left Section: Analytics Navigation + Hatchery Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Analytics Navigation Dropdown */}
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value === 'live-tracking') navigate('/live-tracking');
                  if (value === 'house-flow') navigate('/house-flow');
                  if (value === 'process-flow') navigate('/process-flow');
                  if (value === 'machine-utilization') navigate('/machine-utilization');
                }}
              >
                <SelectTrigger className="w-[140px] h-9 bg-background border-border/50">
                  <TrendingUp className="mr-2 h-3.5 w-3.5 text-primary" />
                  <span className="text-sm">Analytics</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live-tracking">Live Tracking</SelectItem>
                  <SelectItem value="house-flow">House Flow</SelectItem>
                  <SelectItem value="process-flow">Process Flow</SelectItem>
                  <SelectItem value="machine-utilization">Machine Utilization</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Hatchery Filter */}
              <Select value={hatcheryFilter} onValueChange={setHatcheryFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-background border-border/50">
                  <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Hatcheries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hatcheries</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right Section: View Controls + Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-background">
                <span className="text-xs text-muted-foreground">{displayMode === 'simple' ? 'Simple' : 'Detailed'}</span>
                <Switch
                  checked={displayMode === 'detailed'}
                  onCheckedChange={(checked) => setDisplayMode(checked ? 'detailed' : 'simple')}
                />
              </div>

              {/* Action Buttons - Blue hover */}
              <Button variant="outline" size="icon" onClick={handleRefresh} className="h-9 w-9 hover:bg-primary/10 hover:text-primary hover:border-primary/50">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport} className="h-9 w-9 hover:bg-primary/10 hover:text-primary hover:border-primary/50">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* KPI Cards Section */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              title="All Houses"
              value={totalBatchesCount.toString()}
              icon={<Building2 className="h-5 w-5 text-primary" />}
              description="Total number of houses in the system across all hatcheries."
              trendLabel={
                lastWeekBatchesCount > 0 
                  ? `${totalBatchesCount - lastWeekBatchesCount > 0 ? '+' : ''}${totalBatchesCount - lastWeekBatchesCount} from last week`
                  : `Total houses`
              }
              trendDirection={totalBatchesCount > lastWeekBatchesCount ? "up" : totalBatchesCount < lastWeekBatchesCount ? "down" : null}
            />
            <StatCard
              title="Avg Fertility"
              value={`${avgFert}%`}
              icon={<Egg className="h-5 w-5 text-primary" />}
              description="Average fertility percentage across all analyzed houses."
              trendLabel={
                targets?.fertility_rate 
                  ? `${avgFert >= targets.fertility_rate ? '+' : ''}${(avgFert - targets.fertility_rate).toFixed(1)}% vs target`
                  : "Target: 85%"
              }
              trendDirection={targets?.fertility_rate ? (avgFert >= targets.fertility_rate ? "up" : "down") : null}
            />
            <StatCard
              title="Average HOF%"
              value={`${avgHOF}%`}
              icon={<Bird className="h-5 w-5 text-primary" />}
              description="Average Hatch of Fertile percentage. HOF% = (Chicks Hatched / Fertile Eggs) × 100"
              trendLabel={
                targets?.hof_rate 
                  ? `${avgHOF >= targets.hof_rate ? '+' : ''}${(avgHOF - targets.hof_rate).toFixed(1)}% vs target`
                  : "Target: 88%"
              }
              trendDirection={targets?.hof_rate ? (avgHOF >= targets.hof_rate ? "up" : "down") : null}
            />
            <StatCard
              title="Average HOI%"
              value={`${avgHOI}%`}
              icon={<Syringe className="h-5 w-5 text-primary" />}
              description="Average Hatch of Injection percentage. HOI% = (Chicks Hatched / Eggs Injected) × 100"
              trendLabel={
                targets?.hoi_rate 
                  ? `${avgHOI >= targets.hoi_rate ? '+' : ''}${(avgHOI - targets.hoi_rate).toFixed(1)}% vs target`
                  : "Target: 90%"
              }
              trendDirection={targets?.hoi_rate ? (avgHOI >= targets.hoi_rate ? "up" : "down") : null}
            />
            <StatCard
              title="Avg Flock Age"
              value={flockAgeData?.average ? `${flockAgeData.average}w` : "—"}
              icon={<Clock className="h-5 w-5 text-primary" />}
              description={
                flockAgeData 
                  ? `Range: ${flockAgeData.min}-${flockAgeData.max} weeks. Peak: 35-50 weeks.`
                  : "No active flocks"
              }
              trendLabel={
                flockAgeData?.average 
                  ? flockAgeData.average >= 35 && flockAgeData.average <= 50
                    ? "Peak Performance" 
                    : flockAgeData.average > 50
                    ? "Aging Range"
                    : "Young Range"
                  : "N/A"
              }
              trendDirection={
                flockAgeData?.average 
                  ? flockAgeData.average >= 35 && flockAgeData.average <= 50
                    ? "up"
                    : null
                  : null
              }
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Active Houses Pipeline */}
            <div className="lg:col-span-8">
              <Card className="flex flex-col h-[400px] md:h-[500px] lg:h-[calc(100vh-340px)] overflow-hidden bg-gradient-to-br from-card to-muted/20 hover:shadow-lg transition-shadow">
                <CardHeader className="py-3 px-4 flex-shrink-0 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary/70" strokeWidth={1.5} />
                      <CardTitle className="text-sm md:text-base font-semibold">
                        {pipelineView === "all" && "All Houses"}
                        {pipelineView === "active" && "Active Houses Pipeline"}
                        {pipelineView === "completed" && "Completed Houses"}
                        {pipelineView === "incubating" && "Incubating Houses"}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs rounded-full px-3">{listForDisplay.length} houses</Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Select value={pipelineView} onValueChange={(value: any) => setPipelineView(value)}>
                        <SelectTrigger className="w-full sm:w-[130px] h-9 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Houses</SelectItem>
                          <SelectItem value="active">Active Pipeline</SelectItem>
                          <SelectItem value="incubating">Incubating</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* Machine Filter - Inside Pipeline */}
                      <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                        <SelectTrigger className="w-full sm:w-[130px] h-9 bg-background">
                          <SelectValue placeholder="All Machines" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Machines</SelectItem>
                          {machinesList.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 w-full sm:w-[140px] h-9 bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 px-4 pb-4">
                  <div className="h-full overflow-y-auto space-y-3 pr-1">
                    {listForDisplay.length > 0 ? (
                      listForDisplay.map((batch) => (
                        <div
                          key={batch.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg",
                            "border-l-4 border bg-card hover:bg-muted/40",
                            "cursor-pointer transition-all duration-200 hover:shadow-md",
                            getStatusBorderColor(batch.status)
                          )}
                          onClick={() => navigate(`/process-flow?batch=${batch.batch_number}`)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                            <div className="flex flex-col min-w-0">
                              <div className="font-semibold truncate">{batch.batch_number}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {batch.flocks?.flock_name} | {batch.machines?.machine_number}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs capitalize border", getStatusColor(batch.status))}>
                                {batch.status}
                              </Badge>
                              {batch.expected_hatch_date && (
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  Due {formatDistanceToNow(new Date(batch.expected_hatch_date), { addSuffix: true })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end mt-3 sm:mt-0">
                            {displayMode === 'detailed' && (
                              <>
                                <div className="text-left sm:text-right">
                                  <div className="text-xs font-medium text-muted-foreground">Progress</div>
                                  <div className="text-sm font-semibold">
                                    {getProgressDisplay(batch)}
                                  </div>
                                </div>
                                <div className="text-left sm:text-right">
                                  <div className="text-xs font-medium text-muted-foreground">Fertility</div>
                                  <div className="text-sm font-semibold">
                                    {batch.fertility_analysis?.fertility_percent 
                                      ? `${batch.fertility_analysis.fertility_percent.toFixed(1)}%`
                                      : '-'}
                                  </div>
                                </div>
                                <div className="text-left sm:text-right">
                                  <div className="text-xs font-medium text-muted-foreground">Hatch Rate</div>
                                  <div className="text-sm font-semibold">
                                    {batch.residue_analysis?.hatch_percent 
                                      ? `${batch.residue_analysis.hatch_percent.toFixed(1)}%`
                                      : '-'}
                                  </div>
                                </div>
                              </>
                            )}
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                          <Building2 className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div className="text-lg font-semibold">No active houses found</div>
                        <div className="text-sm text-muted-foreground mt-1">Try adjusting your filters or start a new batch</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QA Alerts / Machine Utilization */}
            <div className="lg:col-span-4">
              <Card className="flex flex-col h-[400px] md:h-[500px] lg:h-[calc(100vh-340px)] overflow-hidden bg-gradient-to-br from-card to-muted/20 hover:shadow-lg transition-shadow">
                <CardHeader className="py-3 px-4 flex-shrink-0 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {showQAAlerts ? (
                        <Activity className="h-4 w-4 text-primary/70" strokeWidth={1.5} />
                      ) : (
                        <Gauge className="h-4 w-4 text-primary/70" strokeWidth={1.5} />
                      )}
                      <span className="text-sm font-semibold">
                        {showQAAlerts ? "QA Alerts" : "Machine Utilization"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQAAlerts(!showQAAlerts)}
                      className="text-xs hover:bg-primary/10 hover:text-primary"
                    >
                      Switch
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
                  <div className="h-full overflow-y-auto space-y-3 pr-1">
                    {showQAAlerts ? (
                      qaAlerts && qaAlerts.length > 0 ? (
                        qaAlerts.slice(0, 10).map((alert) => (
                          <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/40 border border-border/60 rounded-lg hover:bg-muted/60 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md bg-amber-500/10">
                                <Activity className="h-4 w-4 text-amber-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{alert.batches?.batch_number} - Alert</div>
                                <div className="text-xs text-muted-foreground">Temp: {alert.temperature}°F, Humidity: {alert.humidity}%</div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto mb-3">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                          <div className="text-sm font-semibold">All systems normal</div>
                          <div className="text-xs text-muted-foreground mt-1">No alerts requiring attention</div>
                        </div>
                      )
                    ) : (
                      (() => {
                        // Filter machines by selected hatchery
                        const filteredMachines = hatcheryFilter === "all" 
                          ? machineUtilization 
                          : machineUtilization?.filter((machine: any) => machine.unit_id === hatcheryFilter);
                        
                        return filteredMachines && filteredMachines.length > 0 ? (
                          filteredMachines.slice(0, 10).map((machine) => (
                            <div key={machine.id} className="flex items-center justify-between p-3 border border-border/60 rounded-lg hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background",
                                  machine.status === 'operational' ? 'bg-green-500 ring-green-500/30' : 
                                  machine.status === 'maintenance' ? 'bg-yellow-500 ring-yellow-500/30' : 
                                  'bg-red-500 ring-red-500/30'
                                )} />
                                <div>
                                  <div className="font-medium text-sm">{machine.machine_number}</div>
                                  <div className="text-xs text-muted-foreground">{machine.location}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{typeof machine.utilization === 'number' ? machine.utilization.toFixed(1) : machine.utilization}%</div>
                                <div className="text-xs text-muted-foreground capitalize">{machine.status}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                              <Gauge className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="text-sm font-medium">No machine data available</div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatchOverviewDashboard;
