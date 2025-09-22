import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { EnhancedTimelineControls } from "./EnhancedTimelineControls";
import { Badge } from "@/components/ui/badge";
import { useEntityOptions } from "@/hooks/useEntityData";
import { 
  Upload, 
  Download, 
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  Activity,
  Grid3X3,
  GitCompare,
  RotateCcw,
  AlertCircle,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { 
  downloadCSVTemplate, 
  parseCSVContent, 
  exportTimelineToCSV, 
  EmbrexCSVData 
} from "@/utils/csvUtils";

interface TimelineData {
  period: string;
  [flockKey: string]: number | string;
}

interface EntityOption {
  id: string;
  name: string;
  number: number;
  color: string;
}

interface EnhancedEmbrexTimelineProps {
  className?: string;
}

const FLOCK_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8B5CF6',
  '#06B6D4',
  '#F59E0B',
];

export const EnhancedEmbrexTimeline = ({ className }: EnhancedEmbrexTimelineProps) => {
  const [viewType, setViewType] = useState<'bar' | 'line' | 'area' | 'stacked' | 'heatmap' | 'small-multiples'>('area');
  const [selectionMode, setSelectionMode] = useState<'flocks' | 'houses' | 'hatcheries'>('flocks');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [metric, setMetric] = useState<string>('totalEggs');
  const [timeScale, setTimeScale] = useState<string>('months');
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [importedData, setImportedData] = useState<EmbrexCSVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Use the entity options hook based on selection mode
  const { data: entityOptions = [], isLoading: entitiesLoading } = useEntityOptions(selectionMode);

  // Auto-select first 3 entities when options are loaded and no entities are selected
  useEffect(() => {
    if (entityOptions && entityOptions.length > 0 && selectedEntities.length === 0) {
      const defaultEntities = entityOptions.slice(0, Math.min(3, entityOptions.length)).map(e => e.id);
      setSelectedEntities(defaultEntities);
    }
  }, [entityOptions, selectedEntities.length]);

  useEffect(() => {
    if (entityOptions && entityOptions.length > 0) {
      loadTimelineData();
    }
  }, [selectedEntities, selectionMode, metric, timeScale, fromDate, toDate, importedData, entityOptions]);

  // Handle selection mode changes - clear selected entities to prevent conflicts
  useEffect(() => {
    setSelectedEntities([]);
  }, [selectionMode]);

  // Removed loadFlockOptions as it's now handled by useEntityOptions hook

  const loadTimelineData = async () => {
    if (selectedEntities.length === 0) {
      setTimelineData([]);
      setLoading(false);
      return;
    }

    console.log('Loading timeline data:', { 
      selectionMode, 
      selectedEntities, 
      metric, 
      timeScale,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString()
    });

    setLoading(true);

    try {
      let query = supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          total_eggs_set,
          eggs_cleared,
          eggs_injected,
          set_date,
          unit_id,
          flocks!inner (
            id,
            flock_name,
            flock_number,
            house_number
          )
        `);

      // Apply filtering based on selection mode
      if (selectionMode === 'flocks') {
        query = query.in('flocks.id', selectedEntities);
      } else if (selectionMode === 'houses') {
        // For houses, selectedEntities contains house_number values (like "H1", "TH2", etc.)
        query = query.in('flocks.house_number', selectedEntities);
      } else if (selectionMode === 'hatcheries') {
        query = query.in('unit_id', selectedEntities);
      }

      if (fromDate) {
        query = query.gte('set_date', fromDate.toISOString());
      }
      if (toDate) {
        query = query.lte('set_date', toDate.toISOString());
      }

      const { data: batchData, error } = await query;
      if (error) throw error;

      console.log('Batch data loaded:', { 
        count: batchData?.length || 0, 
        selectionMode, 
        selectedEntities,
        sampleData: batchData?.slice(0, 2)
      });

      const processedData = new Map<string, any>();

      // Fetch residue analysis data for selected entities
      let residueData: any[] = [];
      if (metric === 'residuePercent' && selectedEntities.length > 0) {
        let residueQuery = supabase
          .from('residue_analysis')
          .select(`
            *,
            batches!inner (
              id,
              set_date,
              unit_id,
              flocks!inner (
                id,
                flock_name,
                flock_number,
                house_number
              )
            )
          `);

        // Apply filtering based on selection mode
        if (selectionMode === 'flocks') {
          residueQuery = residueQuery.in('batches.flock_id', selectedEntities);
        } else if (selectionMode === 'houses') {
          // For houses, selectedEntities contains house_number values
          residueQuery = residueQuery.in('batches.flocks.house_number', selectedEntities);
        } else if (selectionMode === 'hatcheries') {
          residueQuery = residueQuery.in('batches.unit_id', selectedEntities);
        }

        const { data: residue, error: residueError } = await residueQuery;
        
        if (!residueError) {
          residueData = residue || [];
        }
      }

      // Process batch data
      batchData?.forEach((batch: any) => {
        const date = new Date(batch.set_date);
        let period = '';
        
        switch (timeScale) {
          case 'months':
            period = format(date, 'yyyy-MM');
            break;
          case 'weeks':
            period = format(date, 'yyyy-\'W\'ww');
            break;
          case 'days':
            period = format(date, 'yyyy-MM-dd');
            break;
          default:
            period = format(date, 'yyyy-MM');
        }

        if (!processedData.has(period)) {
          processedData.set(period, { period });
        }

        const periodData = processedData.get(period);
        let entityKey = '';
        
        // Create entity key based on selection mode
        if (selectionMode === 'flocks') {
          entityKey = `${batch.flocks.flock_name}_${metric}_${batch.flocks.id}`;
        } else if (selectionMode === 'houses') {
          entityKey = `House ${batch.flocks.house_number}_${metric}_${batch.flocks.house_number}`;
        } else if (selectionMode === 'hatcheries') {
          const unit = entityOptions.find(e => e.id === batch.unit_id);
          entityKey = `${unit?.name || 'Unknown Hatchery'}_${metric}_${batch.unit_id}`;
        }

        if (metric === 'totalEggs') {
          periodData[entityKey] = (periodData[entityKey] || 0) + batch.total_eggs_set;
        } else if (metric === 'eggsCleared') {
          periodData[entityKey] = (periodData[entityKey] || 0) + (batch.eggs_cleared || 0);
        } else if (metric === 'eggsInjected') {
          periodData[entityKey] = (periodData[entityKey] || 0) + (batch.eggs_injected || 0);
        }
      });

      // Process residue analysis data
      residueData?.forEach((residue: any) => {
        const date = new Date(residue.batches.set_date);
        let period = '';
        
        switch (timeScale) {
          case 'months':
            period = format(date, 'yyyy-MM');
            break;
          case 'weeks':
            period = format(date, 'yyyy-\'W\'ww');
            break;
          case 'days':
            period = format(date, 'yyyy-MM-dd');
            break;
          default:
            period = format(date, 'yyyy-MM');
        }

        if (!processedData.has(period)) {
          processedData.set(period, { period });
        }

        const periodData = processedData.get(period);
        let entityKey = '';
        
        // Create entity key based on selection mode
        if (selectionMode === 'flocks') {
          entityKey = `${residue.batches.flocks.flock_name}_${metric}_${residue.batches.flocks.id}`;
        } else if (selectionMode === 'houses') {
          entityKey = `House ${residue.batches.flocks.house_number}_${metric}_${residue.batches.flocks.house_number}`;
        } else if (selectionMode === 'hatcheries') {
          const unit = entityOptions.find(e => e.id === residue.batches.unit_id);
          entityKey = `${unit?.name || 'Unknown Hatchery'}_${metric}_${residue.batches.unit_id}`;
        }

        if (metric === 'residuePercent') {
          periodData[entityKey] = residue.residue_percent || 0;
        }
      });

      // Process imported CSV data
      importedData.forEach((record) => {
        const date = new Date(record.date);
        let period = '';
        
        switch (timeScale) {
          case 'months':
            period = format(date, 'yyyy-MM');
            break;
          case 'weeks':
            period = format(date, 'yyyy-\'W\'ww');
            break;
          case 'days':
            period = format(date, 'yyyy-MM-dd');
            break;
          default:
            period = format(date, 'yyyy-MM');
        }

        if (!processedData.has(period)) {
          processedData.set(period, { period });
        }

        const periodData = processedData.get(period);
        const flockKey = `${record.flockName}_${metric}_imported_${Math.random().toString(36).substr(2, 9)}`;

        if (metric === 'totalEggs') {
          periodData[flockKey] = (periodData[flockKey] || 0) + record.totalEggs;
        } else if (metric === 'eggsCleared') {
          periodData[flockKey] = (periodData[flockKey] || 0) + (record.eggsCleared || 0);
        } else if (metric === 'eggsInjected') {
          periodData[flockKey] = (periodData[flockKey] || 0) + (record.eggsInjected || 0);
        }
      });

      const finalData = Array.from(processedData.values()).sort((a, b) => 
        a.period.localeCompare(b.period)
      );

      console.log('Final timeline data:', { 
        periods: finalData.length,
        dataKeys: Object.keys(finalData[0] || {}).filter(k => k !== 'period'),
        samplePeriod: finalData[0]
      });

      setTimelineData(finalData);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      toast({
        title: "Error",
        description: "Failed to load timeline data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setUploadProgress(0);

    try {
      const text = await file.text();
      setUploadProgress(30);
      
      const parsedData = parseCSVContent(text);
      setUploadProgress(70);
      
      setImportedData(parsedData);
      setUploadProgress(100);
      
      toast({
        title: "Import Successful",
        description: `Imported ${parsedData.length} records from CSV`,
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import CSV file",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleExportData = async () => {
    try {
      await exportTimelineToCSV(timelineData, `enhanced-embrex-timeline-${new Date().toISOString().split('T')[0]}`);
      toast({
        title: "Export Successful",
        description: "Timeline data exported to CSV",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export timeline data",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSelectedEntities([]);
    setSelectionMode('flocks');
    setMetric('totalEggs');
    setTimeScale('months');
    setFromDate(undefined);
    setToDate(undefined);
    setImportedData([]);
  };

  const getEntityDataKeys = () => {
    const keys: string[] = [];
    selectedEntities.forEach((entityId, index) => {
      const entity = entityOptions.find(e => e.id === entityId);
      if (entity) {
        // Use entity ID with index to ensure uniqueness
        keys.push(`${entity.name}_${metric}_${entityId}_${index}`);
      }
    });
    return keys;
  };

  const renderHeatmapChart = () => {
    const dataKeys = getEntityDataKeys();
    if (dataKeys.length === 0 || timelineData.length === 0) return null;

    // Get all unique periods
    const periods = timelineData.map(item => item.period).sort();
    
    // Calculate min/max values for color scaling
    const allValues = timelineData.flatMap(item => 
      dataKeys.map(key => (item[key] as number) || 0)
    );
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    // Create a color intensity function
    const getColorIntensity = (value: number) => {
      if (maxValue === minValue) return 0.5;
      return (value - minValue) / (maxValue - minValue);
    };

    // Get color for value
    const getHeatmapColor = (value: number, entityIndex: number) => {
      const intensity = getColorIntensity(value);
      if (value === 0) return 'hsl(var(--muted))';
      
      // Use sophisticated color gradients based on intensity
      const baseHue = 200 + (entityIndex * 40) % 360; // Different hue for each entity
      const saturation = 70;
      const lightness = Math.max(20, 80 - (intensity * 50)); // Darker = higher value
      
      return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">{selectionMode.charAt(0).toUpperCase() + selectionMode.slice(0, -1)} Performance Heatmap</h4>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
              <span>No data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(200, 70%, 70%)' }}></div>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(200, 70%, 40%)' }}></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(200, 70%, 20%)' }}></div>
              <span>High</span>
            </div>
          </div>
        </div>
        
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground min-w-[120px]">
                    {selectionMode.charAt(0).toUpperCase() + selectionMode.slice(0, -1)} Name
                  </th>
                  {periods.map(period => (
                    <th key={period} className="p-3 text-center font-medium text-muted-foreground min-w-[100px]">
                      {period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataKeys.map((key, entityIndex) => {
                  const entityName = key.split('_')[0]; // Extract entity name from key
                  return (
                    <tr key={key} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium bg-muted/30 border-r border-border">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: FLOCK_COLORS[entityIndex % FLOCK_COLORS.length] }}
                          />
                          {entityName}
                        </div>
                      </td>
                      {periods.map(period => {
                        const dataPoint = timelineData.find(item => item.period === period);
                        const value = (dataPoint?.[key] as number) || 0;
                        const backgroundColor = getHeatmapColor(value, entityIndex);
                        const textColor = getColorIntensity(value) > 0.6 ? '#ffffff' : 'hsl(var(--foreground))';
                        
                        return (
                          <td 
                            key={period}
                            className="p-3 text-center relative group transition-all duration-200 hover:ring-2 hover:ring-primary/50"
                            style={{ 
                              backgroundColor,
                              color: textColor
                            }}
                          >
                            <div className="font-medium">
                              {value === 0 ? '—' : value.toLocaleString()}
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                              <div className="text-sm font-medium text-popover-foreground whitespace-nowrap">
                                {entityName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {period}: {value.toLocaleString()} {metric === 'totalEggs' ? 'eggs' : metric === 'eggsCleared' ? 'cleared' : 'injected'}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total {metric === 'totalEggs' ? 'Eggs' : metric === 'eggsCleared' ? 'Cleared' : 'Injected'}</div>
            <div className="text-2xl font-bold">{allValues.reduce((sum, val) => sum + val, 0).toLocaleString()}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Average per Period</div>
            <div className="text-2xl font-bold">{Math.round(allValues.reduce((sum, val) => sum + val, 0) / periods.length).toLocaleString()}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Peak Performance</div>
            <div className="text-2xl font-bold">{maxValue.toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderSmallMultiplesChart = () => {
    const dataKeys = getEntityDataKeys();
    if (dataKeys.length === 0) return null;

    // Determine grid layout based on number of items
    const getGridCols = (count: number) => {
      if (count <= 2) return 'grid-cols-1 lg:grid-cols-2';
      if (count <= 4) return 'grid-cols-1 md:grid-cols-2';
      if (count <= 6) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
      return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
    };

    return (
      <ScrollArea className="max-h-[600px]">
        <div className={`grid ${getGridCols(dataKeys.length)} gap-4 pr-3`}>
          {dataKeys.map((key, index) => {
            const entityName = key.split('_')[0]; // Extract entity name from unique key
            return (
              <Card key={key} className="p-4 min-h-[200px]">
                <h4 className="text-sm font-medium mb-2 truncate" title={entityName}>
                  {entityName}
                </h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                    <XAxis 
                      dataKey="period" 
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={key} 
                      stroke={FLOCK_COLORS[index % FLOCK_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const renderStandardChart = () => {
    if (loading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading timeline data...</p>
          </div>
        </div>
      );
    }

    if (timelineData.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-muted-foreground mb-2">No data available</p>
              <p className="text-sm text-muted-foreground">Select {selectionMode} and import CSV data or adjust your filters</p>
            </div>
          </div>
        </div>
      );
    }

    const dataKeys = getEntityDataKeys();
    
    const customTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-card border border-border rounded-lg p-4 shadow-lg backdrop-blur-sm">
            <p className="font-semibold text-card-foreground mb-3 text-base">{label}</p>
            <div className="space-y-2">
              {payload.map((entry: any, index: number) => (
                <div key={index} className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {entry.dataKey.split('_')[0]}:
                    </span>
                  </div>
                  <span className="font-medium text-card-foreground">
                    {entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <ResponsiveContainer width="100%" height={400}>
        {viewType === 'bar' || viewType === 'stacked' ? (
          <BarChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
            <XAxis 
              dataKey="period" 
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={customTooltip} />
            <Legend />
            {dataKeys.map((key, index) => (
              <Bar 
                key={key}
                dataKey={key} 
                fill={FLOCK_COLORS[index % FLOCK_COLORS.length]}
                name={key.split('_')[0]}
                stackId={viewType === 'stacked' ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        ) : viewType === 'line' ? (
          <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
            <XAxis 
              dataKey="period" 
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={customTooltip} />
            <Legend />
            {dataKeys.map((key, index) => (
              <Line 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={FLOCK_COLORS[index % FLOCK_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 4 }}
                name={key.split('_')[0]}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              {dataKeys.map((key, index) => (
                <linearGradient key={key} id={`areaGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={FLOCK_COLORS[index % FLOCK_COLORS.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={FLOCK_COLORS[index % FLOCK_COLORS.length]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
            <XAxis 
              dataKey="period" 
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip content={customTooltip} />
            <Legend />
            {dataKeys.map((key, index) => (
              <Area 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={FLOCK_COLORS[index % FLOCK_COLORS.length]}
                strokeWidth={2}
                fill={`url(#areaGradient${index})`}
                name={key.split('_')[0]}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25">
      <div className="p-3 bg-muted/50 rounded-full mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No {selectionMode} Selected</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        Select one or more {selectionMode} from the dropdown above to view timeline data and analytics.
      </p>
      <p className="text-xs text-muted-foreground">
        Available: {entityOptions.length} {selectionMode}
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-64 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );

  const renderNoDataState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-muted/20 rounded-lg border border-muted-foreground/25">
      <div className="p-3 bg-muted/50 rounded-full mb-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        No timeline data found for the selected {selectionMode} in the specified date range.
      </p>
      <p className="text-xs text-muted-foreground">
        Try adjusting your date range or selecting different {selectionMode}.
      </p>
    </div>
  );

  const renderChart = () => {
    // Show loading state while entities are loading
    if (entitiesLoading) {
      return renderLoadingState();
    }

    // Show empty state if no entities selected
    if (selectedEntities.length === 0) {
      return renderEmptyState();
    }

    // Show loading state while data is loading
    if (loading) {
      return renderLoadingState();
    }

    // Show no data state if no timeline data
    if (timelineData.length === 0) {
      return renderNoDataState();
    }

    // Render the appropriate chart
    if (viewType === 'heatmap') {
      return renderHeatmapChart();
    }
    if (viewType === 'small-multiples') {
      return renderSmallMultiplesChart();
    }
    return renderStandardChart();
  };

  return (
    <Card className={cn("overflow-hidden", className)} id="enhanced-embrex-timeline">
      <CardHeader className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 border-b py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Enhanced Embrex Timeline</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Multi-{selectionMode.slice(0, -1)} comparison with CSV import/export capabilities
                </p>
              </div>
            </div>
            {(importedData.length > 0 || selectedEntities.length > 0) && (
              <div className="flex gap-2">
                {importedData.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <FileSpreadsheet className="h-3 w-3" />
                    {importedData.length} imported records
                  </Badge>
                )}
                {selectedEntities.length > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <GitCompare className="h-3 w-3" />
                    Comparing {selectedEntities.length} {selectionMode}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadCSVTemplate}
              className="gap-2 bg-card hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Template
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2 bg-card hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportData}
              disabled={timelineData.length === 0}
              className="gap-2 bg-card hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <ChartDownloadButton chartId="enhanced-embrex-timeline" filename="enhanced-embrex-timeline" />
          </div>
        </div>
        
        {importing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Importing CSV...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6 p-6">
        {/* Enhanced Controls */}
        <EnhancedTimelineControls
          viewType={viewType}
          setViewType={setViewType}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedEntities={selectedEntities}
          setSelectedEntities={setSelectedEntities}
          metric={metric}
          setMetric={setMetric}
          timeScale={timeScale}
          setTimeScale={setTimeScale}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          entityOptions={entityOptions}
          onReset={handleReset}
        />

        {/* Chart Display */}
        <div className="space-y-4">
          {selectedEntities.length > 6 && viewType !== 'heatmap' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Tip:</strong> With {selectedEntities.length} {selectionMode} selected, consider using the Heatmap view for better readability.
              </p>
            </div>
          )}
          {renderChart()}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileImport}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};