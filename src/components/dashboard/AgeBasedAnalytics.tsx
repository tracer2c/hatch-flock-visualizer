import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAgeBasedPerformance } from "@/hooks/useAgeBasedPerformance";
import { Users, Filter, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AgeRangeSettings from "./AgeRangeSettings";
import { AgeRangeService } from "@/services/ageRangeService";

const AgeBasedAnalytics = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedFlock, setSelectedFlock] = useState<string>("all");
  const [selectedFlockGroup, setSelectedFlockGroup] = useState<string>("all");
  
  // Pass filters to the hook
  const { data: metrics, isLoading, refetch } = useAgeBasedPerformance({
    unitId: selectedUnit !== "all" ? selectedUnit : undefined,
    flockId: selectedFlock !== "all" ? selectedFlock : undefined,
    flockGroupId: selectedFlockGroup !== "all" ? selectedFlockGroup : undefined
  });
  
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
  
  // Fetch flocks for filtering
  const { data: flocks } = useQuery({
    queryKey: ['flocks-filter', selectedUnit],
    queryFn: async () => {
      let query = supabase
        .from('flocks')
        .select('id, flock_number, flock_name, flock_group_id, unit_id')
        .order('flock_number');
      
      if (selectedUnit !== "all") {
        query = query.eq('unit_id', selectedUnit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
  
  // Get unique flock groups
  const flockGroups = useMemo(() => {
    if (!flocks) return [];
    const groups = new Map();
    flocks.forEach(f => {
      if (f.flock_group_id) {
        if (!groups.has(f.flock_group_id)) {
          groups.set(f.flock_group_id, { id: f.flock_group_id, number: f.flock_number, name: f.flock_name });
        }
      }
    });
    return Array.from(groups.values());
  }, [flocks]);
  
  // Metrics are already filtered by the hook, just use them directly
  const filteredMetrics = metrics;
  
  if (isLoading) return <div>Loading age-based analytics...</div>;
  
  return (
    <div className="space-y-6">
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
                    {range.minWeeks}-{range.maxWeeks === 999 ? '70+' : range.maxWeeks} weeks
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
            <AgeRangeSettings onRangesUpdate={handleRangesUpdate} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Hatchery</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hatcheries</SelectItem>
                  {units?.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Flock</Label>
              <Select value={selectedFlock} onValueChange={setSelectedFlock}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Flocks</SelectItem>
                  {flocks?.filter(f => !f.flock_group_id).map(flock => (
                    <SelectItem key={flock.id} value={flock.id}>
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
                  <SelectValue />
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
                  {rangeInfo?.minWeeks}-{rangeInfo?.maxWeeks === 999 ? '70+' : rangeInfo?.maxWeeks} weeks
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
          <CardTitle>Performance by Age Range</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
      
      {/* Mortality Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Embryonic Mortality by Age Range</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AgeBasedAnalytics;
