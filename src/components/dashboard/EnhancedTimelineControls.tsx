import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  ChevronDown, 
  ChevronUp, 
  CalendarIcon, 
  RotateCcw,
  Settings,
  BarChart3,
  TrendingUp,
  Activity,
  GitCompare,
  Grid3X3,
  Building2,
  Home,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EntityOption {
  id: string;
  name: string;
  number: number;
  color: string;
}

interface EnhancedTimelineControlsProps {
  viewType: 'bar' | 'line' | 'area' | 'stacked' | 'heatmap' | 'small-multiples';
  setViewType: (type: 'bar' | 'line' | 'area' | 'stacked' | 'heatmap' | 'small-multiples') => void;
  selectionMode: 'flocks' | 'houses' | 'hatcheries';
  setSelectionMode: (mode: 'flocks' | 'houses' | 'hatcheries') => void;
  selectedEntities: string[];
  setSelectedEntities: (entities: string[]) => void;
  metric: string;
  setMetric: (metric: string) => void;
  timeScale: string;
  setTimeScale: (scale: string) => void;
  fromDate?: Date;
  setFromDate: (date?: Date) => void;
  toDate?: Date;
  setToDate: (date?: Date) => void;
  entityOptions: EntityOption[];
  onReset: () => void;
  className?: string;
}

export const EnhancedTimelineControls = ({
  viewType,
  setViewType,
  selectionMode,
  setSelectionMode,
  selectedEntities,
  setSelectedEntities,
  metric,
  setMetric,
  timeScale,
  setTimeScale,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  entityOptions,
  onReset,
  className
}: EnhancedTimelineControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Auto-collapse when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        // Check if the click is not on a popover or dropdown content
        const target = event.target as Element;
        if (!target.closest('[data-radix-popper-content-wrapper]') && 
            !target.closest('[role="dialog"]') &&
            !target.closest('[data-radix-popover-content]') &&
            !target.closest('.radix-popover-content')) {
          setIsOpen(false);
          setShowEntityDropdown(false);
        }
      }
    };

    if (isOpen || showEntityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, showEntityDropdown]);

  const toggleEntitySelection = (entityId: string) => {
    if (selectedEntities.includes(entityId)) {
      setSelectedEntities(selectedEntities.filter(id => id !== entityId));
    } else {
      setSelectedEntities([...selectedEntities, entityId]);
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

  const getSelectionModeIcon = (mode: string) => {
    switch (mode) {
      case 'flocks': return <Users className="h-4 w-4" />;
      case 'houses': return <Home className="h-4 w-4" />;
      case 'hatcheries': return <Building2 className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getSuggestedChartType = () => {
    if (selectedEntities.length > 6) return 'heatmap';
    if (selectedEntities.length > 4) return 'small-multiples';
    if (selectedEntities.length > 2) return 'stacked';
    return 'line';
  };

  const handleAutoOptimize = () => {
    const suggested = getSuggestedChartType();
    setViewType(suggested as any);
    setIsOpen(false);
  };

  const chartTypes = [
    { value: 'line', label: 'Line', icon: TrendingUp },
    { value: 'bar', label: 'Bar', icon: BarChart3 },
    { value: 'area', label: 'Area', icon: Activity },
    { value: 'stacked', label: 'Stacked', icon: BarChart3 },
    { value: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
    { value: 'small-multiples', label: 'Multiples', icon: GitCompare }
  ];

  const currentChartType = chartTypes.find(t => t.value === viewType);

  return (
    <div ref={controlsRef}>
      <Card className={cn("border-muted", className)}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">Visualization Controls</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedEntities.length} {selectionMode} • {metric} • {currentChartType?.label} chart
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
              {/* Selection Mode */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Visualization Mode</h4>
                <RadioGroup 
                  value={selectionMode} 
                  onValueChange={(value) => {
                    setSelectionMode(value as 'flocks' | 'houses' | 'hatcheries');
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flocks" id="flocks" />
                    <Label htmlFor="flocks" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Flocks
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="houses" id="houses" />
                    <Label htmlFor="houses" className="flex items-center gap-2 cursor-pointer">
                      <Home className="h-4 w-4" />
                      Houses
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hatcheries" id="hatcheries" />
                    <Label htmlFor="hatcheries" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="h-4 w-4" />
                      Hatcheries
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Entity Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  {getSelectionModeIcon(selectionMode)}
                  {selectionMode.charAt(0).toUpperCase() + selectionMode.slice(1)} Selection ({selectedEntities.length})
                </h4>
                <Popover open={showEntityDropdown} onOpenChange={setShowEntityDropdown}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEntityDropdown(!showEntityDropdown);
                      }}
                    >
                      <span>
                        {selectedEntities.length === 0 
                          ? `Select ${selectionMode}...` 
                          : `${selectedEntities.length} ${selectionMode} selected`
                        }
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-2 max-h-64 overflow-y-auto" align="start">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntities(entityOptions.map(e => e.id))}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntities([])}
                        >
                          Clear All
                        </Button>
                      </div>
                      {entityOptions.map((entity) => (
                        <div
                          key={entity.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => toggleEntitySelection(entity.id)}
                        >
                          <Checkbox
                            checked={selectedEntities.includes(entity.id)}
                            onChange={() => {}}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div 
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: entity.color }}
                            />
                            <span className="text-sm">{entity.name}</span>
                            <Badge variant="outline" className="text-xs">
                              #{entity.number}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Chart Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Chart Type Dropdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Chart Type</h4>
                    {selectedEntities.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedEntities.length > 6 ? 'Heatmap' : 'Multiples'} recommended
                      </Badge>
                    )}
                  </div>
                  <Select value={viewType} onValueChange={setViewType}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        {currentChartType && (
                          <currentChartType.icon className="h-4 w-4" />
                        )}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {chartTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Metric */}
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

                {/* Time Scale */}
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
    </div>
  );
};