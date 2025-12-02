import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar, Factory, Settings2, Layers, X, ChevronRight, ArrowRight, Egg, RefreshCw, CheckCircle2, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle, BarChart3, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useMachineMetrics, useUnitsForFilter, useDailyUtilizationMetrics, MachineWithMetrics } from '@/hooks/useMachineMetrics';
import { useProcessFlowMetrics } from '@/hooks/useProcessFlowMetrics';
import { useMachinePerformanceMetrics } from '@/hooks/useMachinePerformanceMetrics';
import MultiSetterSetsManager from './MultiSetterSetsManager';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, ZAxis, Legend, Cell } from 'recharts';
import { ChartDownloadButton } from '@/components/ui/chart-download-button';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ExportService } from '@/services/exportService';

const MachineUtilizationDashboard: React.FC = () => {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [unitId, setUnitId] = useState<string>('all');
  const [machineType, setMachineType] = useState<'setter' | 'hatcher' | 'combo' | 'all'>('all');
  const [setterMode, setSetterMode] = useState<'single_setter' | 'multi_setter' | 'all'>('all');
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<MachineWithMetrics | null>(null);

  const { data: units } = useUnitsForFilter();
  const { data, isLoading } = useMachineMetrics({
    dateFrom,
    dateTo,
    unitId: unitId !== 'all' ? unitId : undefined,
    machineType: machineType !== 'all' ? machineType : undefined,
    setterMode: setterMode !== 'all' ? setterMode : undefined,
    machineIds: selectedMachineIds.length > 0 ? selectedMachineIds : undefined,
  });

  const { data: processFlowData, isLoading: processFlowLoading } = useProcessFlowMetrics({
    dateFrom,
    dateTo,
    unitId: unitId !== 'all' ? unitId : undefined,
  });

  const { data: dailyUtilization, isLoading: dailyUtilizationLoading } = useDailyUtilizationMetrics({
    dateFrom,
    dateTo,
    unitId: unitId !== 'all' ? unitId : undefined,
  });

  const { data: performanceData, isLoading: performanceLoading } = useMachinePerformanceMetrics({
    dateFrom,
    dateTo,
    unitId: unitId !== 'all' ? unitId : undefined,
    machineType: machineType !== 'all' ? machineType : undefined,
  });

  const machines = data?.machines || [];
  const kpis = data?.kpis;

  // Get all machines for multi-select (before filtering by selectedMachineIds)
  const { data: allMachinesData } = useMachineMetrics({
    dateFrom,
    dateTo,
    unitId: unitId !== 'all' ? unitId : undefined,
    machineType: machineType !== 'all' ? machineType : undefined,
    setterMode: setterMode !== 'all' ? setterMode : undefined,
  });
  const allMachines = allMachinesData?.machines || [];

  const getUtilizationColor = (percent: number) => {
    if (percent < 50) return 'bg-muted';
    if (percent < 80) return 'bg-primary';
    if (percent <= 100) return 'bg-green-500';
    return 'bg-destructive';
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'in-use': return 'bg-primary/10 text-primary border-primary/20';
      case 'maintenance': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'offline': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMachineTypeBadge = (type: string) => {
    switch (type) {
      case 'setter': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'hatcher': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'combo': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const activeFiltersCount = [
    unitId !== 'all',
    machineType !== 'all',
    setterMode !== 'all',
    selectedMachineIds.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setUnitId('all');
    setMachineType('all');
    setSetterMode('all');
    setSelectedMachineIds([]);
    setDateFrom(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setDateTo(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleMachineSelect = (machineId: string) => {
    setSelectedMachineIds(prev => 
      prev.includes(machineId) 
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const chartConfig = {
    setterUtilization: {
      label: 'Setter Utilization',
      color: 'hsl(var(--primary))',
    },
    hatcherUtilization: {
      label: 'Hatcher Utilization',
      color: 'hsl(var(--accent))',
    },
  };

  // Prepare scatter chart data
  const scatterData = (performanceData?.allMachinePerformance || [])
    .filter(m => m.housesProcessed > 0)
    .map(m => ({
      name: m.machineNumber,
      utilization: machines.find(machine => machine.id === m.machineId)?.utilization_percent || 0,
      hof: m.avgHOF,
      houses: m.housesProcessed,
      type: m.machineType,
    }));

  const getScatterColor = (type: string) => {
    switch (type) {
      case 'setter': return 'hsl(217, 91%, 60%)';
      case 'hatcher': return 'hsl(280, 65%, 60%)';
      case 'combo': return 'hsl(172, 66%, 50%)';
      default: return 'hsl(var(--muted))';
    }
  };

  // Export handlers
  const handleExportMachineData = () => {
    const exportData = machines.map(m => ({
      'Machine Number': m.machine_number,
      'Type': m.machine_type,
      'Setter Mode': m.setter_mode || '-',
      'Status': m.status || '-',
      'Capacity': m.capacity,
      'Eggs Loaded': m.eggs_loaded || 0,
      'Utilization %': m.utilization_percent,
      'Houses': m.active_batches,
      'Unit': units?.find(u => u.id === m.unit_id)?.name || '-',
    }));
    ExportService.exportToExcel(exportData, 'machine-utilization', 'Machine Data');
  };

  const handleExportDailyUtilization = () => {
    if (!dailyUtilization) return;
    const exportData = dailyUtilization.map(d => ({
      'Date': d.date,
      'Setter Utilization %': d.setterUtilization,
      'Hatcher Utilization %': d.hatcherUtilization,
    }));
    ExportService.exportToCSV(exportData, 'daily-utilization');
  };

  const handleExportPerformance = () => {
    if (!performanceData?.allMachinePerformance) return;
    const exportData = performanceData.allMachinePerformance.map(m => ({
      'Machine': m.machineNumber,
      'Type': m.machineType,
      'Houses Processed': m.housesProcessed,
      'Avg Fertility %': m.avgFertility.toFixed(1),
      'Avg HOF %': m.avgHOF.toFixed(1),
      'Avg HOI %': m.avgHOI.toFixed(1),
      'Trend': m.trend,
    }));
    ExportService.exportToCSV(exportData, 'machine-performance');
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Filter Bar */}
      <Card className="shadow-md border-0 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Group */}
            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border shadow-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[130px] h-8 border-0 shadow-none focus-visible:ring-0 p-0"
              />
              <span className="text-muted-foreground text-sm px-1">→</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[130px] h-8 border-0 shadow-none focus-visible:ring-0 p-0"
              />
            </div>

            <div className="h-8 w-px bg-border hidden md:block" />

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="w-[150px] h-9 bg-background">
                  <Factory className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Hatchery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hatcheries</SelectItem>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={machineType} onValueChange={(v) => setMachineType(v as any)}>
                <SelectTrigger className="w-[130px] h-9 bg-background">
                  <Settings2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="setter">Setter</SelectItem>
                  <SelectItem value="hatcher">Hatcher</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={setterMode} onValueChange={(v) => setSetterMode(v as any)}>
                <SelectTrigger className="w-[120px] h-9 bg-background">
                  <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="single_setter">Single</SelectItem>
                  <SelectItem value="multi_setter">Multi</SelectItem>
                </SelectContent>
              </Select>

              {allMachines.length > 0 && (
                <Select
                  value={selectedMachineIds.length > 0 ? 'custom' : 'all'}
                  onValueChange={(v) => { if (v === 'all') setSelectedMachineIds([]); }}
                >
                  <SelectTrigger className="w-[150px] h-9 bg-background">
                    <SelectValue>
                      {selectedMachineIds.length > 0 ? `${selectedMachineIds.length} selected` : 'All Machines'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    <div className="border-t my-1" />
                    <div className="max-h-[200px] overflow-y-auto">
                      {allMachines.map((machine) => (
                        <div
                          key={machine.id}
                          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-sm"
                          onClick={(e) => { e.stopPropagation(); handleMachineSelect(machine.id); }}
                        >
                          <input type="checkbox" checked={selectedMachineIds.includes(machine.id)} onChange={() => {}} className="h-4 w-4 rounded" />
                          <span className="text-sm">{machine.machine_number}</span>
                          <Badge variant="outline" className="text-xs ml-auto">{machine.machine_type}</Badge>
                        </div>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear ({activeFiltersCount})
              </Button>
            )}

            <div className="h-8 w-px bg-border hidden md:block" />

            {/* Export Group */}
            <ExportDropdown
              onExportExcel={handleExportMachineData}
              onExportCSV={handleExportDailyUtilization}
              availableFormats={['excel', 'csv']}
              disabled={machines.length === 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards - Enterprise Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Setter Utilization */}
        <Card className="shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group border-0">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Avg Setter Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-12 w-24" /> : (
              <div className="space-y-3">
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {kpis?.avgSetterUtilization || 0}%
                </p>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/70 transition-all duration-700"
                    style={{ width: `${Math.min(kpis?.avgSetterUtilization || 0, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{kpis?.totalSetterEggs?.toLocaleString()}</span>
                  {" / "}{kpis?.totalSetterCapacity?.toLocaleString()} eggs
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hatcher Utilization */}
        <Card className="shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group border-0">
          <div className="h-1 bg-gradient-to-r from-accent via-accent/80 to-accent/60" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Avg Hatcher Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-12 w-24" /> : (
              <div className="space-y-3">
                <p className="text-4xl font-bold bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                  {kpis?.avgHatcherUtilization || 0}%
                </p>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-accent via-accent/90 to-accent/70 transition-all duration-700"
                    style={{ width: `${Math.min(kpis?.avgHatcherUtilization || 0, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{kpis?.totalHatcherEggs?.toLocaleString()}</span>
                  {" / "}{kpis?.totalHatcherCapacity?.toLocaleString()} eggs
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Houses in Setters */}
        <Card className="shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-0">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Egg className="h-4 w-4" />
              Houses in Setters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-12 w-24" /> : (
              <div>
                <p className="text-4xl font-bold text-blue-600">{kpis?.housesInSetters || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">In Setter (Day 0-17)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Houses in Hatchers */}
        <Card className="shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-0">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-300" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Houses in Hatchers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-12 w-24" /> : (
              <div>
                <p className="text-4xl font-bold text-purple-600">{kpis?.housesInHatchers || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">In Hatcher (Day 18-21)</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Process Flow Summary */}
      <Card className="shadow-md overflow-hidden border-0">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-orange-500 to-green-500" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Process Flow Summary</CardTitle>
              <CardDescription>House movement through incubation stages in selected period</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {processFlowLoading ? (
            <div className="flex items-center justify-center gap-8 py-8">
              <Skeleton className="h-28 w-36" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-28 w-36" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-28 w-36" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 md:gap-8 py-6">
              {/* Entered Setters */}
              <div className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/20 min-w-[140px] hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-md animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                    <Egg className="h-7 w-7 text-white" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-blue-600 mt-4">{processFlowData?.housesEnteredSetters || 0}</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Entered Setters</p>
              </div>

              {/* Animated Arrow */}
              <div className="flex items-center">
                <div className="w-8 md:w-12 h-0.5 bg-gradient-to-r from-blue-500 to-orange-500" />
                <ChevronRight className="h-6 w-6 text-orange-500 -ml-1 animate-pulse" />
              </div>

              {/* Transferred */}
              <div className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-500/20 min-w-[140px] hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-md animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                    <RefreshCw className="h-7 w-7 text-white" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-orange-600 mt-4">{processFlowData?.housesTransferredToHatchers || 0}</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Transferred</p>
              </div>

              {/* Animated Arrow */}
              <div className="flex items-center">
                <div className="w-8 md:w-12 h-0.5 bg-gradient-to-r from-orange-500 to-green-500" />
                <ChevronRight className="h-6 w-6 text-green-500 -ml-1 animate-pulse" />
              </div>

              {/* Hatched */}
              <div className="flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-green-500/15 to-green-600/5 border border-green-500/20 min-w-[140px] hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-md animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-green-600 mt-4">{processFlowData?.housesHatched || 0}</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Hatched</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 3: Machine Performance Overview */}
      <Card className="shadow-md overflow-hidden border-0">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-primary to-purple-500" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/10 to-teal-500/5">
              <BarChart3 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Machine Performance Overview</CardTitle>
              <CardDescription>Average performance metrics by machine type</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Setters Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">SETTERS</Badge>
                  <span className="text-sm text-muted-foreground">{performanceData?.setters.machineCount || 0} machines</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Fertility</span>
                    <span className="font-semibold text-blue-600">{performanceData?.setters.avgFertility || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg HOF</span>
                    <span className="font-semibold text-blue-600">{performanceData?.setters.avgHOF || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Houses Processed</span>
                    <span className="font-semibold">{performanceData?.setters.housesProcessed || 0}</span>
                  </div>
                </div>
              </div>

              {/* Hatchers Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">HATCHERS</Badge>
                  <span className="text-sm text-muted-foreground">{performanceData?.hatchers.machineCount || 0} machines</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg HOF</span>
                    <span className="font-semibold text-purple-600">{performanceData?.hatchers.avgHOF || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg HOI</span>
                    <span className="font-semibold text-purple-600">{performanceData?.hatchers.avgHOI || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Houses Processed</span>
                    <span className="font-semibold">{performanceData?.hatchers.housesProcessed || 0}</span>
                  </div>
                </div>
              </div>

              {/* Combo Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-600/5 border border-teal-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-teal-500/20 text-teal-600 border-teal-500/30">COMBO</Badge>
                  <span className="text-sm text-muted-foreground">{performanceData?.combo.machineCount || 0} machines</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Fertility</span>
                    <span className="font-semibold text-teal-600">{performanceData?.combo.avgFertility || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg HOF</span>
                    <span className="font-semibold text-teal-600">{performanceData?.combo.avgHOF || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Houses Processed</span>
                    <span className="font-semibold">{performanceData?.combo.housesProcessed || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 3: Top/Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="shadow-md overflow-hidden border-0">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-lg font-semibold">Top Performers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {performanceLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : (performanceData?.topPerformers || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No performance data available</p>
            ) : (
              <div className="space-y-3">
                {(performanceData?.topPerformers || []).map((machine, idx) => (
                  <div key={machine.machineId} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/10 hover:border-green-500/30 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{machine.machineNumber}</p>
                      <p className="text-xs text-muted-foreground">{machine.unitName || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{machine.avgHOF}%</p>
                      <p className="text-xs text-muted-foreground">HOF</p>
                    </div>
                    {getTrendIcon(machine.trend)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Performers */}
        <Card className="shadow-md overflow-hidden border-0">
          <div className="h-1 bg-gradient-to-r from-orange-500 to-red-400" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle className="text-lg font-semibold">Needs Attention</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {performanceLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : (performanceData?.bottomPerformers || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No performance data available</p>
            ) : (
              <div className="space-y-3">
                {(performanceData?.bottomPerformers || []).map((machine, idx) => (
                  <div key={machine.machineId} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-transparent border border-orange-500/10 hover:border-orange-500/30 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{machine.machineNumber}</p>
                      <p className="text-xs text-muted-foreground">{machine.unitName || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{machine.avgHOF}%</p>
                      <p className="text-xs text-muted-foreground">HOF</p>
                    </div>
                    {getTrendIcon(machine.trend)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Utilization Over Time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setter Utilization Chart */}
        <Card className="shadow-md overflow-hidden border-0">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Setter Utilization Over Time</CardTitle>
              </div>
              <ChartDownloadButton chartId="setter-utilization-chart" filename="setter-utilization" />
            </div>
          </CardHeader>
          <CardContent>
            {dailyUtilizationLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div id="setter-utilization-chart">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyUtilization || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tickFormatter={(value) => `${value}%`}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                    />
                    <ReferenceLine y={80} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Target', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="setterUtilization"
                      name="Setter Utilization"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hatcher Utilization Chart */}
        <Card className="shadow-md overflow-hidden border-0">
          <div className="h-1 bg-gradient-to-r from-accent via-accent/80 to-accent/60" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Hatcher Utilization Over Time</CardTitle>
              </div>
              <ChartDownloadButton chartId="hatcher-utilization-chart" filename="hatcher-utilization" />
            </div>
          </CardHeader>
          <CardContent>
            {dailyUtilizationLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div id="hatcher-utilization-chart">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyUtilization || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tickFormatter={(value) => `${value}%`}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                    />
                    <ReferenceLine y={80} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Target', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="hatcherUtilization"
                      name="Hatcher Utilization"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: 'hsl(var(--accent))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phase 3: Performance vs Utilization Scatter */}
      {scatterData.length > 0 && (
        <Card className="shadow-md overflow-hidden border-0">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-teal-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Performance vs Utilization</CardTitle>
                  <CardDescription>Correlation between machine utilization and hatch outcomes</CardDescription>
                </div>
              </div>
              <ChartDownloadButton chartId="performance-scatter-chart" filename="performance-vs-utilization" />
            </div>
          </CardHeader>
          <CardContent>
            <div id="performance-scatter-chart">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    dataKey="utilization" 
                    name="Utilization" 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Utilization %', position: 'bottom', offset: -5, fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="hof" 
                    name="HOF" 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'HOF %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <ZAxis type="number" dataKey="houses" range={[50, 400]} name="Houses" />
                  <ChartTooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm text-muted-foreground">Type: {data.type}</p>
                            <p className="text-sm">Utilization: {data.utilization}%</p>
                            <p className="text-sm">HOF: {data.hof}%</p>
                            <p className="text-sm">Houses: {data.houses}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Machines" data={scatterData} fill="hsl(var(--primary))">
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScatterColor(entry.type)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }} />
                <span className="text-sm text-muted-foreground">Setter</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(280, 65%, 60%)' }} />
                <span className="text-sm text-muted-foreground">Hatcher</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(172, 66%, 50%)' }} />
                <span className="text-sm text-muted-foreground">Combo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Machine Cards Grid - Enhanced */}
      <Card className="shadow-md overflow-hidden border-0">
        <div className="h-1 bg-gradient-to-r from-muted-foreground/30 via-muted-foreground/20 to-muted-foreground/10" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Machine Overview</CardTitle>
            </div>
            <Badge variant="secondary" className="font-medium">{machines.length} machines</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-[180px] rounded-xl" />
              ))}
            </div>
          ) : machines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No machines found matching the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {machines.map((machine) => (
                <Card
                  key={machine.id}
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 group overflow-hidden"
                  onClick={() => setSelectedMachine(machine)}
                >
                  <div className={`h-1 ${machine.machine_type === 'setter' ? 'bg-blue-500' : machine.machine_type === 'hatcher' ? 'bg-purple-500' : 'bg-teal-500'}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {machine.machine_number}
                        </h3>
                        {machine.unit_name && (
                          <p className="text-sm text-muted-foreground">{machine.unit_name}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className={`text-xs ${getMachineTypeBadge(machine.machine_type)}`}>
                        {machine.machine_type}
                      </Badge>
                      {machine.setter_mode && (machine.machine_type === 'setter' || machine.machine_type === 'combo') && (
                        <Badge variant="outline" className="text-xs">
                          {machine.setter_mode === 'multi_setter' ? 'Multi' : 'Single'}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-xs ${getStatusColor(machine.status)}`}>
                        {machine.status || 'unknown'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className="font-semibold">{machine.utilization_percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getUtilizationColor(machine.utilization_percent)}`}
                          style={{ width: `${Math.min(machine.utilization_percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{machine.eggs_loaded.toLocaleString()} eggs</span>
                        <span>{machine.active_batches} houses</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Machine Detail Dialog - Multi-setter */}
      {selectedMachine && (selectedMachine.machine_type === 'setter' || selectedMachine.machine_type === 'combo') && 
       selectedMachine.setter_mode === 'multi_setter' && (
        <MultiSetterSetsManager
          open={!!selectedMachine}
          onOpenChange={(open) => !open && setSelectedMachine(null)}
          machine={{
            id: selectedMachine.id,
            machine_number: selectedMachine.machine_number,
            machine_type: selectedMachine.machine_type,
            capacity: selectedMachine.capacity,
            unit_id: selectedMachine.unit_id,
          }}
          unitName={selectedMachine.unit_name || undefined}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      {/* Info Dialog for non-multi-setter machines */}
      <Dialog 
        open={!!selectedMachine && !(
          (selectedMachine.machine_type === 'setter' || selectedMachine.machine_type === 'combo') && 
          selectedMachine.setter_mode === 'multi_setter'
        )} 
        onOpenChange={(open) => !open && setSelectedMachine(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMachine?.machine_number}
              {selectedMachine && (
                <Badge variant="outline" className={getMachineTypeBadge(selectedMachine.machine_type)}>
                  {selectedMachine.machine_type}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedMachine?.unit_name && `${selectedMachine.unit_name} • `}
              {selectedMachine?.location || 'No location specified'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-muted-foreground">
              {selectedMachine?.machine_type === 'hatcher' 
                ? 'This is a hatcher machine. Multi-setter management is only available for setter machines.'
                : selectedMachine?.setter_mode !== 'multi_setter'
                ? 'This machine is configured as a single-setter. Multi-setter management is not available.'
                : 'Machine details view coming soon.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineUtilizationDashboard;
