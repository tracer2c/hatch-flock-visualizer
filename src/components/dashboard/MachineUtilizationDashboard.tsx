import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar, Factory, Settings2, Layers, X, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useMachineMetrics, useUnitsForFilter, MachineWithMetrics } from '@/hooks/useMachineMetrics';
import MultiSetterSetsManager from './MultiSetterSetsManager';

const MachineUtilizationDashboard: React.FC = () => {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [unitId, setUnitId] = useState<string>('all');
  const [machineType, setMachineType] = useState<'setter' | 'hatcher' | 'combo' | 'all'>('all');
  const [setterMode, setSetterMode] = useState<'single_setter' | 'multi_setter' | 'all'>('all');
  const [selectedMachine, setSelectedMachine] = useState<MachineWithMetrics | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: units } = useUnitsForFilter();
  const { data, isLoading } = useMachineMetrics({
    dateFrom,
    dateTo,
    unitId: unitId !== 'all' ? unitId : undefined,
    machineType: machineType !== 'all' ? machineType : undefined,
    setterMode: setterMode !== 'all' ? setterMode : undefined,
  });

  const machines = data?.machines || [];
  const kpis = data?.kpis;

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

  const activeFiltersCount = [
    unitId !== 'all',
    machineType !== 'all',
    setterMode !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setUnitId('all');
    setMachineType('all');
    setSetterMode('all');
    setDateFrom(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    setDateTo(format(new Date(), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card className="shadow-md">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px] h-9"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[140px] h-9"
                />
              </div>
            </div>

            <div className="h-8 w-px bg-border" />

            {/* Hatchery Filter */}
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-muted-foreground" />
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Hatcheries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hatcheries</SelectItem>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Machine Type Filter */}
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <Select value={machineType} onValueChange={(v) => setMachineType(v as any)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Machine Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="setter">Setter</SelectItem>
                  <SelectItem value="hatcher">Hatcher</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Setter Mode Filter */}
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Select value={setterMode} onValueChange={(v) => setSetterMode(v as any)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Setter Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="single_setter">Single</SelectItem>
                  <SelectItem value="multi_setter">Multi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="h-4 w-4 mr-1" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Setter Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-primary">
                  {kpis?.avgSetterUtilization || 0}%
                </p>
                <Progress 
                  value={kpis?.avgSetterUtilization || 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {kpis?.totalSetterEggs?.toLocaleString()} / {kpis?.totalSetterCapacity?.toLocaleString()} eggs
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Hatcher Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-accent">
                  {kpis?.avgHatcherUtilization || 0}%
                </p>
                <Progress 
                  value={kpis?.avgHatcherUtilization || 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {kpis?.totalHatcherEggs?.toLocaleString()} / {kpis?.totalHatcherCapacity?.toLocaleString()} eggs
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Houses in Setters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div>
                <p className="text-3xl font-bold">{kpis?.housesInSetters || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Setting or Incubating
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Houses in Hatchers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div>
                <p className="text-3xl font-bold">{kpis?.housesInHatchers || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently Hatching
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Machine Cards Grid */}
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Machine Overview</CardTitle>
            <Badge variant="secondary">{machines.length} machines</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-[180px] rounded-lg" />
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
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 group"
                  onClick={() => setSelectedMachine(machine)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {machine.machine_number}
                        </h3>
                        {machine.unit_name && (
                          <p className="text-sm text-muted-foreground">
                            {machine.unit_name}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getMachineTypeBadge(machine.machine_type)}`}
                      >
                        {machine.machine_type}
                      </Badge>
                      {machine.setter_mode && (machine.machine_type === 'setter' || machine.machine_type === 'combo') && (
                        <Badge variant="outline" className="text-xs">
                          {machine.setter_mode === 'multi_setter' ? 'Multi' : 'Single'}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(machine.status)}`}
                      >
                        {machine.status || 'unknown'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className="font-medium">{machine.utilization_percent}%</span>
                      </div>
                      <Progress 
                        value={machine.utilization_percent} 
                        className={`h-2 ${getUtilizationColor(machine.utilization_percent)}`}
                      />
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

      {/* Machine Detail Dialog - Only for multi-setter machines */}
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
                <Badge 
                  variant="outline" 
                  className={getMachineTypeBadge(selectedMachine.machine_type)}
                >
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
