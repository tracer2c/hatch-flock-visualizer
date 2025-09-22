import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  CalendarIcon, 
  Search, 
  RotateCcw,
  Settings,
  BarChart3,
  TrendingUp,
  Activity,
  GitCompare,
  Grid3X3
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FlockOption {
  id: string;
  name: string;
  number: number;
  color: string;
}

interface CollapsibleTimelineControlsProps {
  viewType: 'bar' | 'line' | 'area' | 'stacked' | 'heatmap' | 'small-multiples';
  setViewType: (type: 'bar' | 'line' | 'area' | 'stacked' | 'heatmap' | 'small-multiples') => void;
  selectedFlocks: string[];
  setSelectedFlocks: (flocks: string[]) => void;
  metric: string;
  setMetric: (metric: string) => void;
  timeScale: string;
  setTimeScale: (scale: string) => void;
  fromDate?: Date;
  setFromDate: (date?: Date) => void;
  toDate?: Date;
  setToDate: (date?: Date) => void;
  flockSearch: string;
  setFlockSearch: (search: string) => void;
  flockOptions: FlockOption[];
  onReset: () => void;
  className?: string;
}

export const CollapsibleTimelineControls = ({
  viewType,
  setViewType,
  selectedFlocks,
  setSelectedFlocks,
  metric,
  setMetric,
  timeScale,
  setTimeScale,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  flockSearch,
  setFlockSearch,
  flockOptions,
  onReset,
  className
}: CollapsibleTimelineControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFlockDropdown, setShowFlockDropdown] = useState(false);

  const filteredFlockOptions = flockOptions.filter(flock =>
    flock.name.toLowerCase().includes(flockSearch.toLowerCase()) ||
    flock.number.toString().includes(flockSearch)
  );

  const toggleFlockSelection = (flockId: string) => {
    if (selectedFlocks.includes(flockId)) {
      setSelectedFlocks(selectedFlocks.filter(id => id !== flockId));
    } else {
      setSelectedFlocks([...selectedFlocks, flockId]);
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return <BarChart3 className="h-4 w-4" />;
      case 'line': return <TrendingUp className="h-4 w-4" />;
      case 'area': return <Activity className="h-4 w-4" />;
      case 'stacked': return <BarChart3 className="h-4 w-4" />;
      case 'heatmap': return <Grid3X3 className="h-4 w-4" />;
      case 'small-multiples': return <GitCompare className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getSuggestedChartType = () => {
    if (selectedFlocks.length > 6) return 'heatmap';
    if (selectedFlocks.length > 4) return 'small-multiples';
    if (selectedFlocks.length > 2) return 'stacked';
    return 'line';
  };

  const handleAutoOptimize = () => {
    const suggested = getSuggestedChartType();
    setViewType(suggested as any);
    setIsOpen(false);
  };

  return (
    <Card className={cn("border-muted", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Visualization Controls</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFlocks.length} flocks • {metric} • {viewType} chart
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAutoOptimize();
                }}
                className="gap-2"
              >
                Auto-Optimize
              </Button>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Flock Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Flock Selection ({selectedFlocks.length})</h4>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search flocks..."
                    value={flockSearch}
                    onChange={(e) => setFlockSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Popover open={showFlockDropdown} onOpenChange={setShowFlockDropdown}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>
                        {selectedFlocks.length === 0 
                          ? "Select flocks..." 
                          : `${selectedFlocks.length} flocks selected`
                        }
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-2 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFlocks(flockOptions.map(f => f.id))}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFlocks([])}
                        >
                          Clear All
                        </Button>
                      </div>
                      {filteredFlockOptions.map((flock) => (
                        <div
                          key={flock.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => toggleFlockSelection(flock.id)}
                        >
                          <Checkbox
                            checked={selectedFlocks.includes(flock.id)}
                            onChange={() => {}}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div 
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: flock.color }}
                            />
                            <span className="text-sm">{flock.name}</span>
                            <Badge variant="outline" className="text-xs">
                              #{flock.number}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Chart Type with Smart Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Chart Type</h4>
                {selectedFlocks.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedFlocks.length > 6 ? 'Heatmap recommended' : 'Small multiples recommended'}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'line', label: 'Line', icon: TrendingUp },
                  { value: 'bar', label: 'Bar', icon: BarChart3 },
                  { value: 'area', label: 'Area', icon: Activity },
                  { value: 'stacked', label: 'Stacked', icon: BarChart3 },
                  { value: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
                  { value: 'small-multiples', label: 'Multiples', icon: GitCompare }
                ].map((type) => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.value}
                      variant={viewType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewType(type.value as any)}
                      className="gap-2"
                    >
                      <Icon className="h-3 w-3" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Metric and Time Scale */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Metric</h4>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalEggs">Total Eggs</SelectItem>
                    <SelectItem value="eggsCleared">Eggs Cleared</SelectItem>
                    <SelectItem value="eggsInjected">Eggs Injected</SelectItem>
                    <SelectItem value="residuePercent">Residue %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Time Scale</h4>
                <Select value={timeScale} onValueChange={setTimeScale}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Daily</SelectItem>
                    <SelectItem value="weeks">Weekly</SelectItem>
                    <SelectItem value="months">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Date Range</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={onReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                Apply & Close
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};