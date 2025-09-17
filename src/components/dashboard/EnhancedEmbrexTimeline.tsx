import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { Progress } from "@/components/ui/progress";
import { 
  RotateCcw, 
  CalendarIcon, 
  Search, 
  ChevronDown, 
  Upload, 
  Download, 
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Legend
} from 'recharts';
import { 
  downloadCSVTemplate, 
  parseCSVContent, 
  exportTimelineToCSV, 
  EmbrexCSVData 
} from "@/utils/csvUtils";

interface TimelineData {
  period: string;
  totalEggs: number;
  eggsCleared?: number;
  eggsInjected?: number;
  flockName: string;
  batchNumber: string;
  setDate: string;
  flockColor?: string;
}

interface FlockOption {
  id: string;
  name: string;
  number: number;
  color: string;
}

interface EnhancedEmbrexTimelineProps {
  className?: string;
}

const FLOCK_COLORS = [
  'hsl(var(--chart-1))', // blue
  'hsl(var(--chart-2))', // green
  'hsl(var(--chart-3))', // orange
  'hsl(var(--chart-4))', // violet
  'hsl(var(--chart-5))', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#F59E0B', // amber
];

export const EnhancedEmbrexTimeline = ({ className }: EnhancedEmbrexTimelineProps) => {
  const [viewType, setViewType] = useState<'bar' | 'line' | 'area'>('area');
  const [selectedFlock, setSelectedFlock] = useState<string>('all');
  const [metric, setMetric] = useState<string>('total_eggs');
  const [timeScale, setTimeScale] = useState<string>('months');
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [compareFlocks, setCompareFlocks] = useState<string[]>([]);
  const [flockSearch, setFlockSearch] = useState("");
  const [showFlockDropdown, setShowFlockDropdown] = useState(false);
  
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [importedData, setImportedData] = useState<EmbrexCSVData[]>([]);
  const [flockOptions, setFlockOptions] = useState<FlockOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFlockOptions();
    loadTimelineData();
  }, []);

  useEffect(() => {
    loadTimelineData();
  }, [selectedFlock, metric, timeScale, fromDate, toDate, compareFlocks, importedData]);

  const loadFlockOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('flocks')
        .select('id, flock_name, flock_number')
        .order('flock_number');

      if (error) throw error;

      const options: FlockOption[] = data?.map((flock: any, index: number) => ({
        id: flock.id,
        name: flock.flock_name,
        number: flock.flock_number,
        color: FLOCK_COLORS[index % FLOCK_COLORS.length],
      })) || [];

      setFlockOptions(options);
    } catch (error) {
      console.error('Error loading flock options:', error);
    }
  };

  const loadTimelineData = async () => {
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
          flocks!inner (
            id,
            flock_name,
            flock_number
          )
        `)
        .order('set_date', { ascending: true });

      // Apply flock filter
      if (selectedFlock !== 'all') {
        query = query.eq('flocks.id', selectedFlock);
      }

      // Apply date range filter
      if (fromDate) {
        query = query.gte('set_date', fromDate.toISOString().split('T')[0]);
      }
      if (toDate) {
        query = query.lte('set_date', toDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process database data
      const processedDbData: TimelineData[] = data?.map((batch: any) => {
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

        const flockOption = flockOptions.find(f => f.id === batch.flocks.id);

        return {
          period,
          totalEggs: batch.total_eggs_set || 0,
          eggsCleared: batch.eggs_cleared || 0,
          eggsInjected: batch.eggs_injected || 0,
          flockName: batch.flocks.flock_name,
          batchNumber: batch.batch_number,
          setDate: batch.set_date,
          flockColor: flockOption?.color || FLOCK_COLORS[0],
        };
      }) || [];

      // Process imported CSV data
      const processedImportedData: TimelineData[] = importedData.map((record) => {
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

        return {
          period,
          totalEggs: record.totalEggs,
          eggsCleared: record.eggsCleared || 0,
          eggsInjected: record.eggsInjected || 0,
          flockName: record.flockName,
          batchNumber: record.batchNumber,
          setDate: record.date,
          flockColor: '#8B5CF6', // Purple for imported data
        };
      });

      // Combine and aggregate data
      const allData = [...processedDbData, ...processedImportedData];
      
      // Aggregate by time period
      const aggregatedData = allData.reduce((acc: Record<string, TimelineData>, curr) => {
        if (!acc[curr.period]) {
          acc[curr.period] = {
            period: curr.period,
            totalEggs: 0,
            eggsCleared: 0,
            eggsInjected: 0,
            flockName: curr.flockName,
            batchNumber: curr.batchNumber,
            setDate: curr.setDate,
            flockColor: curr.flockColor,
          };
        }
        acc[curr.period].totalEggs += curr.totalEggs;
        acc[curr.period].eggsCleared! += curr.eggsCleared || 0;
        acc[curr.period].eggsInjected! += curr.eggsInjected || 0;
        return acc;
      }, {});

      const finalData = Object.values(aggregatedData).sort((a, b) => 
        a.period.localeCompare(b.period)
      );

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
      
      // Reset file input
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

  const handleExportData = () => {
    try {
      exportTimelineToCSV(timelineData, 'embrex-timeline-export');
      toast({
        title: "Export Successful",
        description: "Timeline data exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export timeline data",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSelectedFlock('all');
    setMetric('total_eggs');
    setTimeScale('months');
    setFromDate(undefined);
    setToDate(undefined);
    setCompareFlocks([]);
    setFlockSearch("");
    setImportedData([]);
  };

  const filteredFlockOptions = flockOptions.filter(flock =>
    flock.name.toLowerCase().includes(flockSearch.toLowerCase()) ||
    flock.number.toString().includes(flockSearch)
  );

  const toggleFlockComparison = (flockId: string) => {
    if (compareFlocks.includes(flockId)) {
      setCompareFlocks(compareFlocks.filter(id => id !== flockId));
    } else if (compareFlocks.length < 4) {
      setCompareFlocks([...compareFlocks, flockId]);
    }
  };

  const renderChart = () => {
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
              <p className="text-sm text-muted-foreground">Import CSV data or adjust your filters</p>
            </div>
          </div>
        </div>
      );
    }

    const chartData = timelineData;

    const customTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
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
                      {entry.dataKey === 'totalEggs' ? 'Total Eggs' :
                       entry.dataKey === 'eggsCleared' ? 'Eggs Cleared' :
                       entry.dataKey === 'eggsInjected' ? 'Eggs Injected' : entry.dataKey}:
                    </span>
                  </div>
                  <span className="font-medium text-card-foreground">
                    {entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-border mt-3">
                <div className="text-xs text-muted-foreground">
                  Flock: {data.flockName} | Batch: {data.batchNumber}
                </div>
              </div>
            </div>
          </div>
        );
      }
      return null;
    };

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    return (
      <ResponsiveContainer width="100%" height={400}>
        {viewType === 'bar' ? (
          <BarChart {...commonProps}>
            <defs>
              <linearGradient id="totalEggsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="eggsClearedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="eggsInjectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis 
              dataKey="period" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            <Bar 
              dataKey="totalEggs" 
              fill="url(#totalEggsGradient)" 
              name="Total Eggs" 
              radius={[2, 2, 0, 0]}
            />
            {metric === 'all' && (
              <>
                <Bar 
                  dataKey="eggsCleared" 
                  fill="url(#eggsClearedGradient)" 
                  name="Eggs Cleared" 
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="eggsInjected" 
                  fill="url(#eggsInjectedGradient)" 
                  name="Eggs Injected" 
                  radius={[2, 2, 0, 0]}
                />
              </>
            )}
          </BarChart>
        ) : viewType === 'line' ? (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis 
              dataKey="period" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="totalEggs" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={3}
              dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: "hsl(var(--chart-1))", strokeWidth: 2 }}
              name="Total Eggs"
            />
            {metric === 'all' && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="eggsCleared" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: "hsl(var(--chart-2))", strokeWidth: 2 }}
                  name="Eggs Cleared"
                />
                <Line 
                  type="monotone" 
                  dataKey="eggsInjected" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: "hsl(var(--chart-3))", strokeWidth: 2 }}
                  name="Eggs Injected"
                />
              </>
            )}
          </LineChart>
        ) : (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGradient1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="areaGradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="areaGradient3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis 
              dataKey="period" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={customTooltip} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="totalEggs" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              fill="url(#areaGradient1)"
              name="Total Eggs"
            />
            {metric === 'all' && (
              <>
                <Area 
                  type="monotone" 
                  dataKey="eggsCleared" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  fill="url(#areaGradient2)"
                  name="Eggs Cleared"
                />
                <Area 
                  type="monotone" 
                  dataKey="eggsInjected" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  fill="url(#areaGradient3)"
                  name="Eggs Injected"
                />
              </>
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <Card className={cn("overflow-hidden", className)} id="enhanced-embrex-timeline">
      <CardHeader className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Enhanced Embrex Timeline</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Advanced visualization with CSV import/export capabilities
                </p>
              </div>
            </div>
            {importedData.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                {importedData.length} imported records
              </Badge>
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
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Visualization Controls
            </h3>
            <div className="text-sm text-muted-foreground">
              {timelineData.length} data points
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Flock Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Flock</label>
              <Select value={selectedFlock} onValueChange={setSelectedFlock}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All flocks</SelectItem>
                  {flockOptions.map((flock) => (
                    <SelectItem key={flock.id} value={flock.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: flock.color }}
                        />
                        #{flock.number} — {flock.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metric Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Metrics</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_eggs">Total Eggs Only</SelectItem>
                  <SelectItem value="all">All Metrics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Scale */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Scale</label>
              <Select value={timeScale} onValueChange={setTimeScale}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Daily</SelectItem>
                  <SelectItem value="weeks">Weekly</SelectItem>
                  <SelectItem value="months">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enhanced View Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart Type</label>
              <div className="grid grid-cols-3 rounded-lg bg-muted p-1 gap-1">
                <Button
                  variant={viewType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('area')}
                  className="text-xs"
                >
                  Area
                </Button>
                <Button
                  variant={viewType === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('line')}
                  className="text-xs"
                >
                  Line
                </Button>
                <Button
                  variant={viewType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('bar')}
                  className="text-xs"
                >
                  Bar
                </Button>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-card",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-card",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Selected Flocks */}
          {compareFlocks.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Comparing Flocks</label>
              <div className="flex flex-wrap gap-2">
                {compareFlocks.map((flockId) => {
                  const flock = flockOptions.find(f => f.id === flockId);
                  return flock ? (
                    <Badge key={flockId} variant="secondary" className="gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: flock.color }}
                      />
                      #{flock.number} — {flock.name}
                      <button
                        onClick={() => toggleFlockComparison(flockId)}
                        className="ml-1 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Timeline Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Timeline Visualization</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {importedData.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  Imported Data
                </div>
              )}
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-chart-1" />
                Database Data
              </div>
            </div>
          </div>
          <div className="border rounded-xl bg-gradient-to-b from-card to-card/50 p-6 shadow-sm">
            {renderChart()}
          </div>
        </div>
      </CardContent>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileImport}
        className="hidden"
      />
    </Card>
  );
};