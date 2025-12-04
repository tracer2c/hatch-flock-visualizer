import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useAgeBasedPerformance } from "@/hooks/useAgeBasedPerformance";
import { useAverageFlockAge } from "@/hooks/useAverageFlockAge";
import { Users, Filter, Info, Download, Image, Calendar, Eye, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AgeRangeSettings from "./AgeRangeSettings";
import { AgeRangeService } from "@/services/ageRangeService";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { ExportService } from "@/services/exportService";

const AgeBasedAnalytics = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedHatcheries, setSelectedHatcheries] = useState<string[]>([]);
  const [selectedFlock, setSelectedFlock] = useState<string>("all");
  const [selectedFlockGroup, setSelectedFlockGroup] = useState<string>("all");
  
  // Pass filters to the hook - use first selected hatchery or undefined for all
  const { data: metrics, isLoading, refetch } = useAgeBasedPerformance({
    unitId: selectedHatcheries.length === 1 ? selectedHatcheries[0] : undefined,
    flockId: selectedFlock !== "all" ? selectedFlock : undefined,
    flockGroupId: selectedFlockGroup !== "all" ? selectedFlockGroup : undefined
  });
  
  // Average flock age hook
  const { data: avgFlockAge, isLoading: avgAgeLoading } = useAverageFlockAge();
  
  const ageRanges = useMemo(() => AgeRangeService.getCustomRanges(), [refreshKey]);
  
  const handleRangesUpdate = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };
  
  // Fetch units for filtering
  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch all flocks with their hatchery info
  const { data: allFlocks } = useQuery({
    queryKey: ['flocks-all-hatcheries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flocks')
        .select('id, flock_number, flock_name, flock_group_id, unit_id')
        .order('flock_number');
      if (error) throw error;
      return data;
    }
  });
  
  // Compute common flocks across selected hatcheries
  const commonFlocks = useMemo(() => {
    if (!allFlocks || selectedHatcheries.length === 0) {
      return allFlocks || [];
    }
    
    if (selectedHatcheries.length === 1) {
      // Single hatchery - show all flocks from that hatchery
      return allFlocks.filter(f => f.unit_id === selectedHatcheries[0]);
    }
    
    // Multiple hatcheries - find flocks with same flock_group_id that exist in ALL selected hatcheries
    const flocksByGroup = new Map<string, Set<string>>();
    
    allFlocks.forEach(f => {
      if (f.flock_group_id && selectedHatcheries.includes(f.unit_id || '')) {
        if (!flocksByGroup.has(f.flock_group_id)) {
          flocksByGroup.set(f.flock_group_id, new Set());
        }
        flocksByGroup.get(f.flock_group_id)!.add(f.unit_id || '');
      }
    });
    
    // Find group_ids that exist in ALL selected hatcheries
    const commonGroupIds = Array.from(flocksByGroup.entries())
      .filter(([, hatcheryIds]) => selectedHatcheries.every(h => hatcheryIds.has(h)))
      .map(([groupId]) => groupId);
    
    // Return one representative flock per common group
    const seenGroups = new Set<string>();
    return allFlocks.filter(f => {
      if (f.flock_group_id && commonGroupIds.includes(f.flock_group_id)) {
        if (!seenGroups.has(f.flock_group_id)) {
          seenGroups.add(f.flock_group_id);
          return true;
        }
      }
      return false;
    });
  }, [allFlocks, selectedHatcheries]);
  
  // Toggle hatchery selection
  const toggleHatchery = (hatcheryId: string) => {
    setSelectedHatcheries(prev => {
      if (prev.includes(hatcheryId)) {
        return prev.filter(id => id !== hatcheryId);
      }
      return [...prev, hatcheryId];
    });
    // Reset flock selection when hatcheries change
    setSelectedFlock("all");
    setSelectedFlockGroup("all");
  };
  
  // Get unique flock groups from common flocks
  const flockGroups = useMemo(() => {
    if (!commonFlocks) return [];
    const groups = new Map();
    commonFlocks.forEach(f => {
      if (f.flock_group_id) {
        if (!groups.has(f.flock_group_id)) {
          groups.set(f.flock_group_id, { id: f.flock_group_id, number: f.flock_number, name: f.flock_name });
        }
      }
    });
    return Array.from(groups.values());
  }, [commonFlocks]);
  
  // Metrics are already filtered by the hook, just use them directly
  const filteredMetrics = metrics;

  // Fetch candling data by age
  const { data: candlingData } = useQuery({
    queryKey: ['candling-by-age', selectedHatcheries, selectedFlock],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_monitoring')
        .select(`
          id, candling_results, day_of_incubation, check_date,
          batch:batches(
            id, batch_number, set_date,
            flock:flocks(id, flock_name, age_weeks, unit_id)
          )
        `)
        .not('candling_results', 'is', null)
        .order('check_date', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      
      // Group by flock age and calculate averages
      const ageGroups: Record<string, { fertile: number; infertile: number; count: number }> = {};
      
      data?.forEach(record => {
        const batch = record.batch as any;
        if (!batch?.flock) return;
        
        // Apply filters
        if (selectedHatcheries.length > 0 && !selectedHatcheries.includes(batch.flock.unit_id)) return;
        if (selectedFlock !== 'all' && batch.flock.id !== selectedFlock) return;
        
        const ageWeeks = batch.flock.age_weeks;
        const ageRange = AgeRangeService.getAgeRangeForAge(ageWeeks);
        
        // Parse candling results (format: "fertile: X, infertile: Y" or similar)
        let fertile = 0, infertile = 0;
        const results = record.candling_results?.toLowerCase() || '';
        const fertileMatch = results.match(/fertile[:\s]*(\d+)/);
        const infertileMatch = results.match(/infertile[:\s]*(\d+)/);
        if (fertileMatch) fertile = parseInt(fertileMatch[1]);
        if (infertileMatch) infertile = parseInt(infertileMatch[1]);
        
        if (!ageGroups[ageRange.label]) {
          ageGroups[ageRange.label] = { fertile: 0, infertile: 0, count: 0 };
        }
        ageGroups[ageRange.label].fertile += fertile;
        ageGroups[ageRange.label].infertile += infertile;
        ageGroups[ageRange.label].count += 1;
      });
      
      return Object.entries(ageGroups).map(([label, data]) => ({
        label,
        avgFertile: data.count > 0 ? Math.round(data.fertile / data.count) : 0,
        avgInfertile: data.count > 0 ? Math.round(data.infertile / data.count) : 0,
        totalChecks: data.count,
        fertilityRate: data.fertile + data.infertile > 0 
          ? Math.round((data.fertile / (data.fertile + data.infertile)) * 100) 
          : 0
      }));
    },
    enabled: true
  });

  // Export handlers
  const handleExportCSV = () => {
    if (!filteredMetrics) return;
    const exportData = filteredMetrics.map(m => ({
      'Age Range': m.label,
      'Batches': m.batchCount,
      'Avg Fertility (%)': m.avgFertility,
      'Avg Hatch (%)': m.avgHatch,
      'Avg HOF (%)': m.avgHOF,
      'Avg HOI (%)': m.avgHOI,
      'Avg Early Dead': m.earlyDeadAvg,
      'Avg Mid Dead': m.midDeadAvg,
      'Avg Late Dead': m.lateDeadAvg,
    }));
    ExportService.exportToCSV(exportData, 'age-based-analytics');
  };

  const handleExportExcel = () => {
    if (!filteredMetrics) return;
    const exportData = filteredMetrics.map(m => ({
      'Age Range': m.label,
      'Batches': m.batchCount,
      'Avg Fertility (%)': m.avgFertility,
      'Avg Hatch (%)': m.avgHatch,
      'Avg HOF (%)': m.avgHOF,
      'Avg HOI (%)': m.avgHOI,
      'Avg Early Dead': m.earlyDeadAvg,
      'Avg Mid Dead': m.midDeadAvg,
      'Avg Late Dead': m.lateDeadAvg,
    }));
    ExportService.exportToExcel(exportData, 'age-based-analytics', 'Age Based Analytics');
  };
  
  if (isLoading) return <div>Loading age-based analytics...</div>;
  
  return (
    <div className="space-y-6">
      {/* Average Flock Age KPI Card */}
      <Card className="shadow-md overflow-hidden border-0 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Average Flock Age</p>
                {avgAgeLoading ? (
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                ) : avgFlockAge ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-amber-600">{avgFlockAge.average}</span>
                    <span className="text-lg text-muted-foreground">weeks</span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">--</span>
                )}
              </div>
            </div>
            {avgFlockAge && (
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Range</p>
                  <p className="font-semibold">{avgFlockAge.min} - {avgFlockAge.max} wks</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Active Houses</p>
                  <p className="font-semibold">{avgFlockAge.count}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Age Range Legend */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Age Range Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ageRanges.map(range => (
              <div key={range.key} className="flex items-start gap-2">
                <div 
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0" 
                  style={{ backgroundColor: range.color }}
                />
                <div>
                  <p className="font-medium text-xs">{range.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {range.minWeeks}-{range.maxWeeks === 65 ? '65+' : range.maxWeeks} weeks
                  </p>
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    {range.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              <ExportDropdown
                onExportCSV={handleExportCSV}
                onExportExcel={handleExportExcel}
                availableFormats={['csv', 'excel']}
                disabled={!filteredMetrics || filteredMetrics.length === 0}
              />
              <AgeRangeSettings onRangesUpdate={handleRangesUpdate} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Multi-Hatchery Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Hatcheries (select multiple to view common flocks)
              </Label>
              <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg">
                {units?.map(unit => (
                  <label 
                    key={unit.id} 
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Checkbox
                      checked={selectedHatcheries.includes(unit.id)}
                      onCheckedChange={() => toggleHatchery(unit.id)}
                    />
                    <span className="text-sm font-medium">{unit.name}</span>
                  </label>
                ))}
                {units && units.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedHatcheries([])}
                    className="text-xs text-muted-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              {selectedHatcheries.length > 1 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Showing {commonFlocks.length} common flock(s) across {selectedHatcheries.length} hatcheries
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Flock</Label>
                <Select value={selectedFlock} onValueChange={setSelectedFlock}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Flocks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Flocks</SelectItem>
                    {commonFlocks?.filter(f => selectedHatcheries.length <= 1 || f.flock_group_id).map(flock => (
                      <SelectItem key={flock.id} value={selectedHatcheries.length > 1 ? flock.flock_group_id || flock.id : flock.id}>
                        #{flock.flock_number} - {flock.flock_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Multi-Hatchery Flock Group</Label>
                <Select value={selectedFlockGroup} onValueChange={setSelectedFlockGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {flockGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        Group #{group.number} - {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {filteredMetrics?.map((range, idx) => {
          const rangeInfo = ageRanges[idx];
          return (
            <Card key={range.ageRange} className="border-l-4" style={{ borderLeftColor: range.color }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{range.label}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {rangeInfo?.minWeeks}-{rangeInfo?.maxWeeks === 65 ? '65+' : rangeInfo?.maxWeeks} weeks
                </p>
              </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{range.batchCount}</span>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">batches analyzed</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div>
                    <p className="text-muted-foreground">Fertility</p>
                    <p className="font-semibold">{range.avgFertility}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hatch</p>
                    <p className="font-semibold">{range.avgHatch}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
      
      {/* Performance Comparison Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance by Age Range</CardTitle>
            <ChartDownloadButton chartId="age-performance-chart" filename="age-performance-chart" />
          </div>
        </CardHeader>
        <CardContent>
          <div id="age-performance-chart">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgFertility" fill="hsl(var(--chart-1))" name="Fertility %" />
                <Bar dataKey="avgHatch" fill="hsl(var(--chart-2))" name="Hatch %" />
                <Bar dataKey="avgHOF" fill="hsl(var(--chart-3))" name="HOF %" />
                <Bar dataKey="avgHOI" fill="hsl(var(--chart-4))" name="HOI %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Mortality Breakdown Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Embryonic Mortality by Age Range</CardTitle>
            <ChartDownloadButton chartId="age-mortality-chart" filename="age-mortality-chart" />
          </div>
        </CardHeader>
        <CardContent>
          <div id="age-mortality-chart">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={filteredMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis label={{ value: 'Average Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="earlyDeadAvg" stroke="hsl(var(--chart-1))" name="Early Dead" strokeWidth={2} />
                <Line type="monotone" dataKey="midDeadAvg" stroke="hsl(var(--chart-3))" name="Mid Dead" strokeWidth={2} />
                <Line type="monotone" dataKey="lateDeadAvg" stroke="hsl(var(--chart-4))" name="Late Dead" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Candling Results by Age Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Candling Results by Flock Age
            </CardTitle>
            <ChartDownloadButton chartId="candling-age-chart" filename="candling-by-age" />
          </div>
        </CardHeader>
        <CardContent>
          {candlingData && candlingData.length > 0 ? (
            <div id="candling-age-chart">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={candlingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis yAxisId="left" label={{ value: 'Avg Count', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Fertility %', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgFertile" fill="hsl(var(--chart-2))" name="Avg Fertile" />
                  <Bar yAxisId="left" dataKey="avgInfertile" fill="hsl(var(--chart-4))" name="Avg Infertile" />
                  <Line yAxisId="right" type="monotone" dataKey="fertilityRate" stroke="hsl(var(--chart-1))" name="Fertility %" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Eye className="h-12 w-12 mb-2 opacity-50" />
              <p>No candling data available</p>
              <p className="text-sm">Candling results will appear here once QA checks include candling information</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgeBasedAnalytics;
