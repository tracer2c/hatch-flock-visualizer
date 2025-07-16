import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useActiveBatches, useBatchPerformanceMetrics, useQAAlerts, useMachineUtilization, useOngoingBatchMetrics } from "@/hooks/useBatchData";
import { Calendar, AlertTriangle, TrendingUp, TrendingDown, Activity, Thermometer, Package } from "lucide-react";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const BatchOverviewDashboard = () => {
  const { data: activeBatches, isLoading: activeBatchesLoading } = useActiveBatches();
  const { data: performanceMetrics, isLoading: performanceLoading } = useBatchPerformanceMetrics();
  const { data: qaAlerts, isLoading: alertsLoading } = useQAAlerts();
  const { data: machineUtil, isLoading: machineLoading } = useMachineUtilization();

  if (activeBatchesLoading || performanceLoading || alertsLoading || machineLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading dashboard data...</div>;
  }

  // Calculate key metrics - handle null values
  const totalActiveBatches = activeBatches?.length || 0;
  
  // Only calculate averages from batches with fertility data
  const fertilityData = performanceMetrics?.filter(batch => batch.fertility !== null) || [];
  const avgFertility = fertilityData.length > 0 
    ? fertilityData.reduce((sum, batch) => sum + batch.fertility, 0) / fertilityData.length 
    : 0;
    
  const hatchData = performanceMetrics?.filter(batch => batch.hatch !== null) || [];
  const avgHatch = hatchData.length > 0 
    ? hatchData.reduce((sum, batch) => sum + batch.hatch, 0) / hatchData.length 
    : 0;
    
  const totalAlerts = qaAlerts?.length || 0;
  const avgMachineUtil = machineUtil?.length 
    ? machineUtil.reduce((sum, machine) => sum + machine.utilization, 0) / machineUtil.length 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'incubating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hatching': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysFromSet = (setDate: string) => {
    const set = new Date(setDate);
    const now = new Date();
    return Math.floor((now.getTime() - set.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="glass-card hover:scale-105 transition-transform duration-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{totalActiveBatches}</div>
                  <p className="text-xs text-muted-foreground">Currently in process</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent asChild>
              <EnhancedTooltip 
                chartType="batch-overview"
                data={{ totalActiveBatches, activeBatches }}
                title="Active Batches"
                metrics={[
                  { label: "Total Active", value: totalActiveBatches },
                  { label: "Status", value: "Currently processing" }
                ]}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="glass-card hover:scale-105 transition-transform duration-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Fertility</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{avgFertility.toFixed(1)}%</div>
                  <p className={`text-xs flex items-center ${avgFertility > 85 ? 'text-green-600' : 'text-destructive'}`}>
                    {avgFertility > 85 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {avgFertility > 85 ? 'Above target' : 'Below target'}
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent asChild>
              <EnhancedTooltip 
                chartType="batch-overview"
                data={{ avgFertility, fertilityData, target: 85 }}
                title="Average Fertility"
                metrics={[
                  { label: "Current Average", value: `${avgFertility.toFixed(1)}%` },
                  { label: "Target", value: "85%" },
                  { label: "Sample Size", value: `${fertilityData.length} batches` }
                ]}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Card className="glass-card hover:scale-105 transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hatch Rate</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{avgHatch.toFixed(1)}%</div>
            <p className={`text-xs flex items-center ${avgHatch > 80 ? 'text-green-600' : 'text-destructive'}`}>
              {avgHatch > 80 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {avgHatch > 80 ? 'Above target' : 'Below target'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QA Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Machine Utilization</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{avgMachineUtil.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Average usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Batches Pipeline */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Active Batches Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeBatches && activeBatches.length > 0 ? (
            <div className="space-y-4">
              {activeBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium text-card-foreground">{batch.batch_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {batch.flocks?.flock_name} (Flock {batch.flocks?.flock_number})
                      </div>
                    </div>
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-card-foreground">
                      Day {getDaysFromSet(batch.set_date)} of 21
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {batch.machines?.machine_number} ({batch.machines?.machine_type})
                    </div>
                  </div>
                  
                  <div className="w-32">
                    <Progress 
                      value={(getDaysFromSet(batch.set_date) / 21) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active batches found. Start a new batch from the Data Entry page.
            </div>
          )}
        </CardContent>
      </Card>

      {/* QA Alerts */}
      {qaAlerts && qaAlerts.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              QA Alerts Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qaAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <div>
                      <div className="font-medium text-card-foreground">
                        {alert.batches?.batch_number} - Temperature/Humidity Alert
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Temp: {alert.temperature}°F, Humidity: {alert.humidity}%
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {alert.check_date}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Machine Utilization */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Machine Utilization Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machineUtil?.map((machine) => (
              <div key={machine.id} className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-card-foreground">{machine.machine_number}</div>
                  <Badge variant={machine.currentStatus === 'available' ? 'secondary' : 'default'}>
                    {machine.currentStatus}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="text-card-foreground">{machine.utilization.toFixed(0)}%</span>
                  </div>
                  <Progress value={machine.utilization} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {machine.currentLoad.toLocaleString()} / {machine.capacity.toLocaleString()} capacity
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchOverviewDashboard;