import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, AlertTriangle, CheckCircle, Search, Filter, 
  LayoutGrid, Table as TableIcon, ArrowUpDown, TrendingUp, Egg, 
  Activity, ChevronRight, History
} from "lucide-react";
import { format, differenceInDays, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculateHOIPercent } from '@/utils/hatcheryFormulas';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const LiveHouseTracker = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Fetch houses based on tab selection
  const { data: houses, isLoading } = useQuery({
    queryKey: ['houses-tracking', activeTab],
    queryFn: async () => {
      const statusFilter = activeTab === 'active' 
        ? ['scheduled', 'in_setter', 'in_hatcher'] as const
        : ['completed'] as const;
      
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks (flock_number, flock_name, age_weeks),
          machines (machine_number, machine_type, status),
          units (id, name)
        `)
        .in('status', statusFilter)
        .order('set_date', { ascending: activeTab === 'active' });
      
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
    queryKey: ['house-performance-data'],
    queryFn: async () => {
      const { data: fertility } = await supabase
        .from('fertility_analysis')
        .select('batch_id, fertility_percent, hatch_percent');
      
      const { data: residue } = await supabase
        .from('residue_analysis')
        .select('batch_id, hof_percent, hoi_percent');

      const { data: batches } = await supabase
        .from('batches')
        .select('id, eggs_injected, chicks_hatched');

      return { fertility, residue, batches };
    }
  });

  const getPhaseInfo = (daysSinceSet: number, status: string) => {
    if (status === 'completed') return { phase: 'Completed', color: 'bg-slate-500', textColor: 'text-slate-700', bgLight: 'bg-slate-50', nextPhase: null, daysToNext: 0 };
    if (status === 'scheduled' || daysSinceSet < 0) return { phase: 'Scheduled', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50', nextPhase: 'In Setter', daysToNext: Math.abs(daysSinceSet) };
    if (daysSinceSet < 18) return { phase: 'In Setter', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50', nextPhase: 'In Hatcher', daysToNext: 18 - daysSinceSet };
    if (daysSinceSet < 21) return { phase: 'In Hatcher', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', nextPhase: 'Complete', daysToNext: 21 - daysSinceSet };
    return { phase: 'Complete', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50', nextPhase: null, daysToNext: 0 };
  };

  const getCriticalDayInfo = (daysSinceSet: number) => {
    // Candling is done once between Day 10-13
    if (daysSinceSet >= 10 && daysSinceSet <= 13) {
      return { day: daysSinceSet, label: 'Candling', description: 'Candling to check fertility (Day 10-13)' };
    }
    // Transfer Day (Day 18)
    if (Math.abs(18 - daysSinceSet) <= 1) {
      return { day: 18, label: 'Transfer Day', description: 'Move to hatcher' };
    }
    // Hatch Day (Day 21)
    if (Math.abs(21 - daysSinceSet) <= 1) {
      return { day: 21, label: 'Hatch Day', description: 'Expected hatching' };
    }
    return null;
  };

  const housesWithProgress = useMemo(() => {
    if (!houses) return [];

    return houses.map(house => {
      const daysSinceSet = Math.max(0, differenceInDays(new Date(), new Date(house.set_date)));
      const expectedHatchDate = addDays(new Date(house.set_date), 21);
      const phaseInfo = getPhaseInfo(daysSinceSet, house.status);
      const criticalDay = activeTab === 'active' ? getCriticalDayInfo(daysSinceSet) : null;
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
  }, [houses, performanceData, activeTab]);

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
        case 'setDate':
          comparison = new Date(a.set_date).getTime() - new Date(b.set_date).getTime();
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
    if (activeTab === 'completed') {
      const avgFertility = housesWithProgress.filter(h => h.fertilityPercent).length > 0
        ? Math.round(housesWithProgress.reduce((sum, h) => sum + (h.fertilityPercent || 0), 0) / housesWithProgress.filter(h => h.fertilityPercent).length)
        : 0;
      const avgHOF = housesWithProgress.filter(h => h.hofPercent).length > 0
        ? Math.round(housesWithProgress.reduce((sum, h) => sum + (h.hofPercent || 0), 0) / housesWithProgress.filter(h => h.hofPercent).length)
        : 0;
      const avgHOI = housesWithProgress.filter(h => h.hoiPercent).length > 0
        ? Math.round(housesWithProgress.reduce((sum, h) => sum + (h.hoiPercent || 0), 0) / housesWithProgress.filter(h => h.hoiPercent).length)
        : 0;
      return { total: housesWithProgress.length, avgFertility, avgHOF, avgHOI };
    }
    
    const scheduled = housesWithProgress.filter(h => h.phaseInfo.phase === 'Scheduled').length;
    const inSetter = housesWithProgress.filter(h => h.phaseInfo.phase === 'In Setter').length;
    const inHatcher = housesWithProgress.filter(h => h.phaseInfo.phase === 'In Hatcher').length;
    const criticalAlerts = housesWithProgress.filter(h => h.criticalDay).length;
    const avgProgress = housesWithProgress.length > 0 
      ? Math.round(housesWithProgress.reduce((sum, h) => sum + h.progressPercentage, 0) / housesWithProgress.length)
      : 0;
    
    return { scheduled, inSetter, inHatcher, criticalAlerts, avgProgress };
  }, [housesWithProgress, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading house tracking data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs for Active/Completed */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Active Houses
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Completed Houses
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Statistics - Different for Active vs Completed */}
      {activeTab === 'active' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 text-center">
              <Egg className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-700">{summaryStats.scheduled}</div>
              <div className="text-xs text-gray-600">Scheduled</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">{summaryStats.inSetter}</div>
              <div className="text-xs text-blue-600">In Setter</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-700">{summaryStats.inHatcher}</div>
              <div className="text-xs text-orange-600">In Hatcher</div>
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-slate-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-700">{summaryStats.total}</div>
              <div className="text-xs text-slate-600">Total Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Egg className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">{summaryStats.avgFertility}%</div>
              <div className="text-xs text-blue-600">Avg Fertility</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{summaryStats.avgHOF}%</div>
              <div className="text-xs text-green-600">Avg HOF%</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-700">{summaryStats.avgHOI}%</div>
              <div className="text-xs text-amber-600">Avg HOI%</div>
            </CardContent>
          </Card>
        </div>
      )}

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

            {activeTab === 'active' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_setter">In Setter</SelectItem>
                  <SelectItem value="in_hatcher">In Hatcher</SelectItem>
                </SelectContent>
              </Select>
            )}

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
                <SelectItem value="setDate">Set Date</SelectItem>
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

      {/* Phase Legend - Only for Active */}
      {activeTab === 'active' && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>In Setter (Day 0-18)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>In Hatcher (Day 18-21)</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-orange-500" />
            <span>Critical Day Alert</span>
          </div>
        </div>
      )}

      {/* Houses Grid/Table */}
      {filteredHouses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {activeTab === 'active' ? 'No Active Houses' : 'No Completed Houses'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || hatcheryFilter !== 'all' || statusFilter !== 'all'
                ? 'No houses match your filters. Try adjusting your search criteria.'
                : activeTab === 'active' 
                  ? 'All houses have been completed or no houses are currently in progress.'
                  : 'No houses have been completed yet.'}
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
                {/* Progress Timeline - Only for Active */}
                {activeTab === 'active' && (
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
                )}

                {/* Completed House - Duration Info */}
                {activeTab === 'completed' && (
                  <div className="text-sm text-muted-foreground">
                    <span>Completed on </span>
                    <span className="font-medium text-foreground">
                      {house.actual_hatch_date 
                        ? format(new Date(house.actual_hatch_date), 'MMM d, yyyy')
                        : format(house.expectedHatchDate, 'MMM d, yyyy')}
                    </span>
                    <span> • Duration: {house.daysSinceSet} days</span>
                  </div>
                )}

                {/* Phase Transition Info - Only for Active */}
                {activeTab === 'active' && house.phaseInfo.nextPhase && house.phaseInfo.nextPhase !== 'Complete' && (
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
                    <span className="text-muted-foreground">{activeTab === 'completed' ? 'Hatch Date:' : 'Expected Hatch:'}</span>
                    <div className="font-medium">
                      {activeTab === 'completed' && house.actual_hatch_date
                        ? format(new Date(house.actual_hatch_date), 'MMM d, yyyy')
                        : format(house.expectedHatchDate, 'MMM d, yyyy')}
                    </div>
                  </div>
                  {activeTab === 'completed' && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Eggs Set:</span>
                        <div className="font-medium">{house.total_eggs_set?.toLocaleString() || '-'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Chicks Hatched:</span>
                        <div className="font-medium">{house.chicks_hatched?.toLocaleString() || '-'}</div>
                      </div>
                    </>
                  )}
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

                {/* Critical Day Alert - Only for Active */}
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
                  <th className="text-center p-3 font-medium">{activeTab === 'active' ? 'Day' : 'Duration'}</th>
                  {activeTab === 'active' && <th className="text-left p-3 font-medium">Progress</th>}
                  <th className="text-left p-3 font-medium">Flock</th>
                  <th className="text-left p-3 font-medium">Machine</th>
                  <th className="text-center p-3 font-medium">Fertility</th>
                  <th className="text-center p-3 font-medium">HOF%</th>
                  <th className="text-center p-3 font-medium">HOI%</th>
                  {activeTab === 'active' && <th className="text-center p-3 font-medium">Alert</th>}
                  {activeTab === 'completed' && <th className="text-center p-3 font-medium">Chicks</th>}
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
                    <td className="p-3 text-center font-medium">
                      {activeTab === 'active' ? house.daysSinceSet : `${house.daysSinceSet}d`}
                    </td>
                    {activeTab === 'active' && (
                      <td className="p-3">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", house.phaseInfo.color)}
                            style={{ width: `${house.progressPercentage}%` }}
                          />
                        </div>
                      </td>
                    )}
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
                    {activeTab === 'active' && (
                      <td className="p-3 text-center">
                        {house.criticalDay && (
                          <AlertTriangle className="h-4 w-4 text-orange-500 mx-auto" />
                        )}
                      </td>
                    )}
                    {activeTab === 'completed' && (
                      <td className="p-3 text-center">{house.chicks_hatched?.toLocaleString() || '-'}</td>
                    )}
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