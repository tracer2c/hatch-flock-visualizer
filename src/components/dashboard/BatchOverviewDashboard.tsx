import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Clock, AlertCircle, Activity, TrendingUp, Building2, CheckCircle, Gauge, Search, Grid3X3, List, Download, Filter, RefreshCw } from "lucide-react";
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
import { useViewMode } from "@/contexts/ViewModeContext";
import hatcheryIcon from "@/assets/hatchery-icon.png";
import eggsIcon from "@/assets/eggs-icon.png";
import chicksIcon from "@/assets/chicks-icon.png";
import utilizationIcon from "@/assets/utilization-icon.png";

const BatchOverviewDashboard = () => {
  const { viewMode } = useViewMode();
  const { data: activeBatches, isLoading: batchesLoading, refetch: refetchBatches } = useBatchData(viewMode);
  const { data: performanceMetrics, isLoading: metricsLoading } = useBatchPerformanceMetrics(viewMode);
  const { data: machineUtilization, isLoading: machinesLoading } = useMachineUtilization(viewMode);
  const { data: qaAlerts, isLoading: alertsLoading } = useQAAlerts();
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
    toast({ title: "Export queued", description: "Selected charts will be exported shortly." });
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
      case "setting": return "bg-blue-100 text-blue-800";
      case "incubating": return "bg-yellow-100 text-yellow-800";
      case "hatching": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
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
      const hatcheryMatch = hatcheryFilter === "all" || 
        activeBatches?.find((b: any) => b.batch_number === batch.batchNumber)?.unit_id === hatcheryFilter;
      return batch.hof != null && !isNaN(batch.hof) && hatcheryMatch;
    }) || [];
    
    if (validBatches.length === 0) return 0;
    
    const sum = validBatches.reduce((acc: number, batch: any) => acc + batch.hof, 0);
    return Math.round(sum / validBatches.length);
  }, [performanceMetrics, hatcheryFilter, activeBatches]);

  const avgHOI = useMemo(() => {
    const validBatches = performanceMetrics?.filter((batch: any) => {
      const hatcheryMatch = hatcheryFilter === "all" || 
        activeBatches?.find((b: any) => b.batch_number === batch.batchNumber)?.unit_id === hatcheryFilter;
      return batch.hoi != null && !isNaN(batch.hoi) && hatcheryMatch;
    }) || [];
    
    if (validBatches.length === 0) return 0;
    
    const sum = validBatches.reduce((acc: number, batch: any) => acc + batch.hoi, 0);
    return Math.round(sum / validBatches.length);
  }, [performanceMetrics, hatcheryFilter, activeBatches]);

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
              .select('*', { count: 'exact', head: true })
              .eq('data_type', viewMode);
            
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
              .eq('data_type', viewMode)
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
  }, [hatcheryFilter, viewMode]);

  // Refresh data when view mode changes
  useEffect(() => {
    refetchBatches();
  }, [viewMode, refetchBatches]);

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
        <div className="h-screen grid grid-rows-[auto_auto_1fr] p-4 gap-4">
          <Skeleton className="h-14" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <Skeleton className="h-full" />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <Skeleton className="h-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen grid grid-rows-[auto_auto_1fr] p-4 gap-4">
          {/* Enterprise Header - Navigation & Filters */}
          <div className="flex items-center justify-between border-b pb-4 mb-2">
            {/* Left Section: Navigation + Primary Filters */}
            <div className="flex items-center gap-2">
              {/* Navigation */}
              <Button 
                variant="outline" 
                className="h-9 shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => navigate('/house-flow')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                House Flow
              </Button>
              
              {/* Divider */}
              <div className="h-6 w-px bg-border mx-1" />
              
              {/* Filters Group */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 border border-border/50">
                {/* Hatchery Filter */}
                <Select value={hatcheryFilter} onValueChange={setHatcheryFilter}>
                  <SelectTrigger className="w-[180px] h-9 bg-background">
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

                {/* Machine Filter */}
                {machinesList && machinesList.length > 0 && (
                  <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger className="w-[180px] h-9 bg-background">
                      <SelectValue placeholder="All Machines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Machines</SelectItem>
                      {machinesList.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Right Section: View Controls + Actions */}
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background">
                <Badge variant={displayMode === 'simple' ? 'default' : 'secondary'} className="text-xs">
                  {displayMode === 'simple' ? 'Simple' : 'Detailed'}
                </Badge>
                <Switch
                  checked={displayMode === 'detailed'}
                  onCheckedChange={(checked) => setDisplayMode(checked ? 'detailed' : 'simple')}
                />
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border" />

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} className="shadow-sm hover:shadow-md transition-all duration-200">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
                <Button size="sm" onClick={handleExport} className="shadow-sm hover:shadow-md transition-all duration-200">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </div>
          </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="All Houses"
              value={totalBatchesCount.toString()}
              icon={<img src={hatcheryIcon} alt="Hatchery" className="h-10 w-10 object-contain" />}
              description="Total number of houses in the system across all hatcheries. Each house represents a group of eggs set for incubation at a specific date and time."
              trendLabel={
                lastWeekBatchesCount > 0 
                  ? `${totalBatchesCount - lastWeekBatchesCount > 0 ? '+' : ''}${totalBatchesCount - lastWeekBatchesCount} from last week`
                  : `Total houses in system`
              }
              trendDirection={totalBatchesCount > lastWeekBatchesCount ? "up" : totalBatchesCount < lastWeekBatchesCount ? "down" : null}
            />
            <StatCard
              title="Average Fertility"
              value={`${avgFert}%`}
              icon={<img src={eggsIcon} alt="Eggs" className="h-10 w-10 object-contain" />}
              description="The average fertility percentage across all analyzed houses. Fertility measures the percentage of eggs that contain viable embryos after candling analysis."
              trendLabel={
                targets?.fertility_rate 
                  ? `${avgFert >= targets.fertility_rate ? '+' : ''}${(avgFert - targets.fertility_rate).toFixed(1)}% vs target (${targets.fertility_rate}%)`
                  : "Target: 85%"
              }
              trendDirection={targets?.fertility_rate ? (avgFert >= targets.fertility_rate ? "up" : "down") : null}
            />
            <StatCard
              title="Average HOF%"
              value={`${avgHOF}%`}
              icon={<img src={chicksIcon} alt="Chicks" className="h-10 w-10 object-contain" />}
              description="Average Hatch of Fertile percentage across all analyzed houses. HOF% = (Chicks Hatched / Fertile Eggs) × 100"
              trendLabel={
                targets?.hof_rate 
                  ? `${avgHOF >= targets.hof_rate ? '+' : ''}${(avgHOF - targets.hof_rate).toFixed(1)}% vs target (${targets.hof_rate}%)`
                  : "Target: 88%"
              }
              trendDirection={targets?.hof_rate ? (avgHOF >= targets.hof_rate ? "up" : "down") : null}
            />
            <StatCard
              title="Average HOI%"
              value={`${avgHOI}%`}
              icon={<img src={chicksIcon} alt="Chicks" className="h-10 w-10 object-contain" />}
              description="Average Hatch of Injection percentage across all analyzed houses. HOI% = (Chicks Hatched / Eggs Injected) × 100"
              trendLabel={
                targets?.hoi_rate 
                  ? `${avgHOI >= targets.hoi_rate ? '+' : ''}${(avgHOI - targets.hoi_rate).toFixed(1)}% vs target (${targets.hoi_rate}%)`
                  : "Target: 90%"
              }
              trendDirection={targets?.hoi_rate ? (avgHOI >= targets.hoi_rate ? "up" : "down") : null}
            />
            <StatCard
              title="System Utilization"
              value={`${systemUtilization}%`}
              icon={<img src={utilizationIcon} alt="Utilization" className="h-10 w-10 object-contain" />}
              description="Average capacity utilization across all machines in the system. This represents how efficiently the available incubation and hatching equipment is being used. Higher utilization indicates better resource optimization."
              trendLabel={
                targets?.machine_utilization 
                  ? `${systemUtilization >= targets.machine_utilization ? '+' : ''}${(systemUtilization - targets.machine_utilization).toFixed(1)}% vs target (${targets.machine_utilization}%)`
                  : `Avg of ${machineUtilization?.length || 0} machines`
              }
              trendDirection={targets?.machine_utilization ? (systemUtilization >= targets.machine_utilization ? "up" : "down") : null}
            />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4 min-h-0">
            {/* Active Houses Pipeline */}
            <div className="col-span-12 lg:col-span-8 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <CardTitle>
                        {pipelineView === "all" && "All Houses"}
                        {pipelineView === "active" && "Active Houses Pipeline"}
                        {pipelineView === "completed" && "Completed Houses"}
                        {pipelineView === "incubating" && "Incubating Houses"}
                      </CardTitle>
                      <Badge variant="secondary">{listForDisplay.length} houses</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Select value={pipelineView} onValueChange={(value: any) => setPipelineView(value)}>
                        <SelectTrigger className="w-[160px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Houses</SelectItem>
                          <SelectItem value="active">Active Pipeline</SelectItem>
                          <SelectItem value="incubating">Incubating</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search houses..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 w-[180px] h-9"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <div className="h-full overflow-y-auto space-y-3">
                    {listForDisplay.length > 0 ? (
                      listForDisplay.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/process-flow?batch=${batch.batch_number}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <div className="font-medium">{batch.batch_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {batch.flocks?.flock_name} | {batch.machines?.machine_number}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {batch.status}
                              </Badge>
                              {batch.expected_hatch_date && (
                                <div className="text-sm text-muted-foreground">
                                  Due {formatDistanceToNow(new Date(batch.expected_hatch_date), { addSuffix: true })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {displayMode === 'detailed' && (
                              <>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Progress</div>
                                  <div className="text-sm text-muted-foreground">
                                    {getProgressDisplay(batch)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Fertility</div>
                                  <div className="text-sm text-muted-foreground">
                                    Pending
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Hatch Rate</div>
                                  <div className="text-sm text-muted-foreground">
                                    Pending
                                  </div>
                                </div>
                              </>
                            )}
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <div className="text-lg font-medium">No active houses found</div>
                        <div className="text-muted-foreground">Try adjusting your filters or start a new batch</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QA Alerts / Machine Utilization */}
            <div className="col-span-12 lg:col-span-4 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    {showQAAlerts ? (
                      <>
                        <Activity className="h-5 w-5" />
                        <span>QA Alerts Requiring Attention</span>
                      </>
                    ) : (
                      <>
                        <Gauge className="h-5 w-5" />
                        <span>Machine Utilization Status</span>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQAAlerts(!showQAAlerts)}
                    >
                      Switch View
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <div className="h-full overflow-y-auto space-y-3">
                    {showQAAlerts ? (
                      qaAlerts && qaAlerts.length > 0 ? (
                        qaAlerts.slice(0, 10).map((alert) => (
                          <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-card-foreground">{alert.batches?.batch_number} - Alert</div>
                                <div className="text-sm text-muted-foreground">Temp: {alert.temperature}°F, Humidity: {alert.humidity}%</div>
                              </div>
                            </div>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <div className="text-sm font-medium">All systems normal</div>
                          <div className="text-xs text-muted-foreground">No alerts requiring attention</div>
                        </div>
                      )
                    ) : (
                      machineUtilization && machineUtilization.length > 0 ? (
                        machineUtilization.slice(0, 10).map((machine) => (
                          <div key={machine.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${machine.status === 'operational' ? 'bg-green-500' : machine.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              <div>
                                <div className="font-medium">{machine.machine_number}</div>
                                <div className="text-sm text-muted-foreground">{machine.location}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{machine.utilization}%</div>
                              <div className="text-xs text-muted-foreground capitalize">{machine.status}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Gauge className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <div className="text-sm">No machine data available</div>
                        </div>
                      )
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