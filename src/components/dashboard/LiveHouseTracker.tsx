import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, AlertTriangle, CheckCircle, Search, Filter, 
  LayoutGrid, Table as TableIcon, ArrowUpDown, TrendingUp, Egg, 
  Activity, ChevronRight
} from "lucide-react";
import { useViewMode } from '@/contexts/ViewModeContext';
import { format, differenceInDays, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculateHOIPercent } from '@/utils/hatcheryFormulas';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const LiveHouseTracker = () => {
  const { viewMode } = useViewMode();
  const navigate = useNavigate();

  // Fetch active houses with units included
  const { data: activeHouses, isLoading } = useQuery({
    queryKey: ['active-houses-tracking', viewMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks (flock_number, flock_name, age_weeks),
          machines (machine_number, machine_type, status),
          units (id, name)
        `)
        .eq('data_type', viewMode)
        .in('status', ['setting', 'incubating', 'hatching'])
        .order('set_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filters
  const [hatcheryFilter, setHatcheryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('daysSinceSet');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards');

  // Fetch units for hatchery filter
  const { data: units } = useQuery({
    queryKey: ['units-for-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('units').select('id, name').eq('status', 'active');
      return data || [];
    }
  });

  // Fetch performance data (fertility & residue)
  const { data: performanceData } = useQuery({
    queryKey: ['house-performance-data', viewMode],
    queryFn: async () => {
      const { data: fertility } = await supabase
        .from('fertility_analysis')
        .select('batch_id, fertility_percent, hatch_percent');
      
      const { data: residue } = await supabase
        .from('residue_analysis')
        .select('batch_id, hof_percent, hoi_percent');

      const { data: batches } = await supabase
        .from('batches')
        .select('id, eggs_injected, chicks_hatched')
        .eq('data_type', viewMode);

      return { fertility, residue, batches };
    }
  });

  const getPhaseInfo = (daysSinceSet: number) => {
    if (daysSinceSet <= 0) return { phase: 'Setting', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50', nextPhase: 'Incubating', daysToNext: 1 - daysSinceSet };
    if (daysSinceSet <= 18) return { phase: 'Incubating', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50', nextPhase: 'Hatching', daysToNext: 19 - daysSinceSet };
    return { phase: 'Hatching', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50', nextPhase: 'Complete', daysToNext: 22 - daysSinceSet };
  };

  const getCriticalDayInfo = (daysSinceSet: number) => {
    const criticalDays = [
      { day: 7, label: 'Fertility Check', description: 'Candling to check fertility' },
      { day: 14, label: 'Second Candling', description: 'Remove clear eggs' },
      { day: 18, label: 'Transfer Day', description: 'Move to hatcher' },
      { day: 21, label: 'Hatch Day', description: 'Expected hatching' }
    ];
    return criticalDays.find(cd => Math.abs(cd.day - daysSinceSet) <= 1);
  };

  const housesWithProgress = useMemo(() => {
    if (!activeHouses) return [];

    return activeHouses.map(house => {
      const daysSinceSet = Math.max(0, differenceInDays(new Date(), new Date(house.set_date)));
      const expectedHatchDate = addDays(new Date(house.set_date), 21);
      const phaseInfo = getPhaseInfo(daysSinceSet);
      const criticalDay = getCriticalDayInfo(daysSinceSet);
      const progressPercentage = Math.min(100, (daysSinceSet / 21) * 100);
      
      // Get performance metrics
      const fertilityRecord = performanceData?.fertility?.find(f => f.batch_id === house.id);
      const residueRecord = performanceData?.residue?.find(r => r.batch_id === house.id);
      const batchRecord = performanceData?.batches?.find(b => b.id === house.id);

      const fertilityPercent = fertilityRecord?.fertility_percent;
      const hofPercent = residueRecord?.hof_percent;
      const hoiPercent = residueRecord?.hoi_percent || 
        (batchRecord?.chicks_hatched && batchRecord?.eggs_injected 
          ? calculateHOIPercent(batchRecord.chicks_hatched, batchRecord.eggs_injected) 
          : null);

      return {
        ...house,
        daysSinceSet,
        expectedHatchDate,
        phaseInfo,
        criticalDay,
        progressPercentage,
        daysRemaining: Math.max(0, 21 - daysSinceSet),
        fertilityPercent,
        hofPercent,
        hoiPercent,
        unitName: (house as any).units?.name || 'Unknown'
      };
    });
  }, [activeHouses, performanceData]);

  // Apply filters
  const filteredHouses = useMemo(() => {
    let result = housesWithProgress;

    if (hatcheryFilter !== 'all') {
      result = result.filter(h => h.unit_id === hatcheryFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(h => h.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(h => 
        h.batch_number?.toLowerCase().includes(term) ||
        h.flocks?.flock_name?.toLowerCase().includes(term) ||
        h.machines?.machine_number?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'daysSinceSet':
          comparison = a.daysSinceSet - b.daysSinceSet;
          break;
        case 'progressPercentage':
          comparison = a.progressPercentage - b.progressPercentage;
          break;
        case 'hatchery':
          comparison = (a.unitName || '').localeCompare(b.unitName || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comparison = a.daysSinceSet - b.daysSinceSet;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [housesWithProgress, hatcheryFilter, statusFilter, searchTerm, sortBy, sortOrder]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const setting = housesWithProgress.filter(h => h.phaseInfo.phase === 'Setting').length;
    const incubating = housesWithProgress.filter(h => h.phaseInfo.phase === 'Incubating').length;
    const hatching = housesWithProgress.filter(h => h.phaseInfo.phase === 'Hatching').length;
    const criticalAlerts = housesWithProgress.filter(h => h.criticalDay).length;
    const avgProgress = housesWithProgress.length > 0 
      ? Math.round(housesWithProgress.reduce((sum, h) => sum + h.progressPercentage, 0) / housesWithProgress.length)
      : 0;
    
    return { setting, incubating, hatching, criticalAlerts, avgProgress };
  }, [housesWithProgress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading house tracking data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Egg className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{summaryStats.setting}</div>
            <div className="text-xs text-blue-600">Setting</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-700">{summaryStats.incubating}</div>
            <div className="text-xs text-amber-600">Incubating</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{summaryStats.hatching}</div>
            <div className="text-xs text-green-600">Hatching</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-700">{summaryStats.criticalAlerts}</div>
            <div className="text-xs text-orange-600">Critical Days</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">{summaryStats.avgProgress}%</div>
            <div className="text-xs text-primary/80">Avg Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>

            <Select value={hatcheryFilter} onValueChange={setHatcheryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Hatcheries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hatcheries</SelectItem>
                {units?.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
                <SelectItem value="incubating">Incubating</SelectItem>
                <SelectItem value="hatching">Hatching</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search house, flock, machine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daysSinceSet">Days Since Set</SelectItem>
                <SelectItem value="progressPercentage">Progress %</SelectItem>
                <SelectItem value="hatchery">Hatchery</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className={cn("h-4 w-4", sortOrder === 'desc' && "rotate-180")} />
            </Button>

            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewType === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('cards')}
                className="rounded-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewType === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('table')}
                className="rounded-none"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Setting (Day 0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span>Incubating (Days 1-18)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Hatching (Days 19-21)</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-orange-500" />
          <span>Critical Day Alert</span>
        </div>
      </div>

      {/* Houses Grid/Table */}
      {filteredHouses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Active Houses</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || hatcheryFilter !== 'all' || statusFilter !== 'all'
                ? 'No houses match your filters. Try adjusting your search criteria.'
                : 'All houses have been completed or no houses are currently in progress.'}
            </p>
          </CardContent>
        </Card>
      ) : viewType === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredHouses.map((house) => (
            <Card 
              key={house.id} 
              className={cn(
                "overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer",
                house.criticalDay && "ring-2 ring-orange-400"
              )}
              onClick={() => navigate(`/data-entry/house/${house.id}`)}
            >
              <CardHeader className={cn("py-3 px-4", house.phaseInfo.bgLight)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{house.batch_number}</h3>
                    <Badge className={cn(house.phaseInfo.color, "text-white")}>
                      {house.phaseInfo.phase}
                    </Badge>
                    {house.criticalDay && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {house.criticalDay.label}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">{house.unitName}</Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Progress Timeline */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={cn("font-medium", house.phaseInfo.textColor)}>
                      Day {house.daysSinceSet} of 21
                    </span>
                    <span className="text-muted-foreground">
                      {house.daysRemaining} days remaining
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                    {/* Phase sections */}
                    <div className="absolute inset-0 flex">
                      <div className="w-[4.76%] bg-blue-200 border-r border-white/50" title="Setting"></div>
                      <div className="w-[80.95%] bg-amber-200 border-r border-white/50" title="Incubating"></div>
                      <div className="w-[14.29%] bg-green-200" title="Hatching"></div>
                    </div>
                    
                    {/* Progress fill */}
                    <div 
                      className={cn("absolute top-0 left-0 h-full transition-all duration-500", house.phaseInfo.color)}
                      style={{ width: `${house.progressPercentage}%` }}
                    ></div>

                    {/* Day markers */}
                    {[7, 14, 18].map(day => (
                      <div
                        key={day}
                        className="absolute top-0 bottom-0 w-0.5 bg-white/70"
                        style={{ left: `${(day / 21) * 100}%` }}
                      >
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
                          {day}
                        </span>
                      </div>
                    ))}

                    {/* Current position indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-foreground shadow-md"
                      style={{ left: `${house.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Phase Transition Info */}
                {house.phaseInfo.nextPhase !== 'Complete' && (
                  <div className="flex items-center gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Entering <span className="font-medium text-foreground">{house.phaseInfo.nextPhase}</span> in {house.phaseInfo.daysToNext} day{house.phaseInfo.daysToNext !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* House Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Flock:</span>
                    <div className="font-medium truncate">{house.flocks?.flock_name || '-'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Machine:</span>
                    <div className="font-medium">{house.machines?.machine_number || '-'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Set Date:</span>
                    <div className="font-medium">{format(new Date(house.set_date), 'MMM d, yyyy')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Hatch:</span>
                    <div className="font-medium">{format(house.expectedHatchDate, 'MMM d, yyyy')}</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {(house.fertilityPercent || house.hofPercent || house.hoiPercent) && (
                  <div className="flex gap-3 pt-2 border-t">
                    {house.fertilityPercent && (
                      <Badge variant="outline" className="bg-blue-50">
                        Fertility: {house.fertilityPercent.toFixed(1)}%
                      </Badge>
                    )}
                    {house.hofPercent && (
                      <Badge variant="outline" className="bg-green-50">
                        HOF: {house.hofPercent.toFixed(1)}%
                      </Badge>
                    )}
                    {house.hoiPercent && (
                      <Badge variant="outline" className="bg-amber-50">
                        HOI: {house.hoiPercent.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                )}

                {/* Critical Day Alert */}
                {house.criticalDay && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{house.criticalDay.label}</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      {house.criticalDay.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">House</th>
                  <th className="text-left p-3 font-medium">Hatchery</th>
                  <th className="text-left p-3 font-medium">Phase</th>
                  <th className="text-center p-3 font-medium">Day</th>
                  <th className="text-left p-3 font-medium">Progress</th>
                  <th className="text-left p-3 font-medium">Flock</th>
                  <th className="text-left p-3 font-medium">Machine</th>
                  <th className="text-center p-3 font-medium">Fertility</th>
                  <th className="text-center p-3 font-medium">HOF%</th>
                  <th className="text-center p-3 font-medium">HOI%</th>
                  <th className="text-center p-3 font-medium">Alert</th>
                </tr>
              </thead>
              <tbody>
                {filteredHouses.map((house) => (
                  <tr 
                    key={house.id} 
                    className={cn(
                      "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                      house.criticalDay && "bg-orange-50/50"
                    )}
                    onClick={() => navigate(`/data-entry/house/${house.id}`)}
                  >
                    <td className="p-3 font-medium">{house.batch_number}</td>
                    <td className="p-3">{house.unitName}</td>
                    <td className="p-3">
                      <Badge className={cn(house.phaseInfo.color, "text-white text-xs")}>
                        {house.phaseInfo.phase}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-medium">{house.daysSinceSet}</td>
                    <td className="p-3">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", house.phaseInfo.color)}
                          style={{ width: `${house.progressPercentage}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3 truncate max-w-[120px]">{house.flocks?.flock_name || '-'}</td>
                    <td className="p-3">{house.machines?.machine_number || '-'}</td>
                    <td className="p-3 text-center">
                      {house.fertilityPercent ? `${house.fertilityPercent.toFixed(1)}%` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {house.hofPercent ? `${house.hofPercent.toFixed(1)}%` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {house.hoiPercent ? `${house.hoiPercent.toFixed(1)}%` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {house.criticalDay && (
                        <AlertTriangle className="h-4 w-4 text-orange-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LiveHouseTracker;
