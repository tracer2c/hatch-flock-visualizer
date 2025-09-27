import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { PanelLeftOpen, PanelLeftClose, BarChart3, Download, RotateCcw, BookOpen, Eye, Calendar, Clock, Target, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Mock data for the Embrex timeline
const mockTimelineData = [
  {
    id: 1,
    batchId: "EMB-2024-001",
    stage: "Embryo Development",
    currentDay: 12,
    totalDays: 21,
    progress: 57,
    status: "On Track",
    temperature: 99.5,
    humidity: 55,
    turning: "Active",
    nextMilestone: "Day 14 - Candling",
    alerts: [],
    details: {
      setter: "2024-01-15",
      expectedHatch: "2024-02-05",
      eggCount: 15000,
      fertility: 92,
      hatchability: 85
    }
  },
  {
    id: 2,
    batchId: "EMB-2024-002",
    stage: "Pre-Hatch",
    currentDay: 19,
    totalDays: 21,
    progress: 90,
    status: "Critical",
    temperature: 98.5,
    humidity: 65,
    turning: "Stopped",
    nextMilestone: "Hatching",
    alerts: ["Temperature variation detected"],
    details: {
      setter: "2024-01-18",
      expectedHatch: "2024-02-08",
      eggCount: 12000,
      fertility: 89,
      hatchability: 82
    }
  },
  {
    id: 3,
    batchId: "EMB-2024-003",
    stage: "Hatching",
    currentDay: 21,
    totalDays: 21,
    progress: 100,
    status: "Hatching",
    temperature: 98.0,
    humidity: 70,
    turning: "Stopped",
    nextMilestone: "Chick Processing",
    alerts: [],
    details: {
      setter: "2024-01-20",
      expectedHatch: "2024-02-10",
      eggCount: 18000,
      fertility: 94,
      hatchability: 88
    }
  }
];

const EmbrexTimelinePage = () => {
  const [timelineData, setTimelineData] = useState(mockTimelineData);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const { open, setOpen } = useSidebar();

  const handleSaveView = () => {
    toast({
      title: "View Saved",
      description: "Current view configuration has been saved to your preferences.",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Timeline data is being exported to Excel format.",
    });
  };

  const handleReset = () => {
    setCompareMode(false);
    setSelectedColumns('all');
    toast({
      title: "View Reset",
      description: "Timeline view has been reset to default settings.",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Track': return 'bg-green-500';
      case 'Critical': return 'bg-red-500';
      case 'Hatching': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'Embryo Development': return <Target className="h-4 w-4" />;
      case 'Pre-Hatch': return <Clock className="h-4 w-4" />;
      case 'Hatching': return <TrendingUp className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2"
              >
                {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                <span className="hidden sm:inline">Toggle Sidebar</span>
              </Button>
              <div>
                <CardTitle className="text-xl font-semibold">Embrex Timeline Dashboard</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Monitor embryo development stages and batch progress
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="compare-mode"
                  checked={compareMode}
                  onCheckedChange={setCompareMode}
                />
                <Label htmlFor="compare-mode" className="text-sm">Compare</Label>
              </div>
              <Select value={selectedColumns} onValueChange={setSelectedColumns}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Columns</SelectItem>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleSaveView}>
                <BookOpen className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Batches</p>
                    <p className="text-2xl font-bold">{timelineData.length}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Eggs</p>
                    <p className="text-2xl font-bold">
                      {timelineData.reduce((sum, batch) => sum + batch.details.eggCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Fertility</p>
                    <p className="text-2xl font-bold">
                      {Math.round(timelineData.reduce((sum, batch) => sum + batch.details.fertility, 0) / timelineData.length)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Alerts</p>
                    <p className="text-2xl font-bold text-red-500">
                      {timelineData.reduce((sum, batch) => sum + batch.alerts.length, 0)}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </Card>
            </div>

            {/* Timeline Cards */}
            <div className="space-y-4">
              {timelineData.map((batch) => (
                <Card key={batch.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStageIcon(batch.stage)}
                        <h3 className="text-lg font-semibold">{batch.batchId}</h3>
                      </div>
                      <Badge className={`${getStatusColor(batch.status)} text-white`}>
                        {batch.status}
                      </Badge>
                      {batch.alerts.length > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {batch.alerts.length} Alert{batch.alerts.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Batch Details - {batch.batchId}</DialogTitle>
                          <DialogDescription>
                            Comprehensive information about this incubation batch
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-muted-foreground">BATCH INFORMATION</h4>
                              <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <div className="font-medium">Setter Date:</div>
                                <div>{batch.details.setter}</div>
                                <div className="font-medium">Expected Hatch:</div>
                                <div>{batch.details.expectedHatch}</div>
                                <div className="font-medium">Egg Count:</div>
                                <div>{batch.details.eggCount.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-muted-foreground">PERFORMANCE METRICS</h4>
                              <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <div className="font-medium">Fertility Rate:</div>
                                <div>{batch.details.fertility}%</div>
                                <div className="font-medium">Hatchability:</div>
                                <div>{batch.details.hatchability}%</div>
                                <div className="font-medium">Current Stage:</div>
                                <div>{batch.stage}</div>
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">ENVIRONMENTAL CONDITIONS</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center p-3 bg-muted rounded-lg">
                                <div className="font-medium">Temperature</div>
                                <div className="text-lg font-bold">{batch.temperature}°F</div>
                              </div>
                              <div className="text-center p-3 bg-muted rounded-lg">
                                <div className="font-medium">Humidity</div>
                                <div className="text-lg font-bold">{batch.humidity}%</div>
                              </div>
                              <div className="text-center p-3 bg-muted rounded-lg">
                                <div className="font-medium">Turning</div>
                                <div className="text-lg font-bold">{batch.turning}</div>
                              </div>
                            </div>
                          </div>
                          {batch.alerts.length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm text-muted-foreground">ACTIVE ALERTS</h4>
                                <div className="space-y-2">
                                  {batch.alerts.map((alert, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                      <span className="text-sm text-red-700">{alert}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">Day {batch.currentDay} of {batch.totalDays}</span>
                      </div>
                      <Progress value={batch.progress} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        Next: {batch.nextMilestone}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">CURRENT CONDITIONS</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground">Temp</div>
                          <div className="font-semibold">{batch.temperature}°F</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Humidity</div>
                          <div className="font-semibold">{batch.humidity}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Turning</div>
                          <div className="font-semibold">{batch.turning}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">BATCH METRICS</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Eggs</div>
                          <div className="font-semibold">{batch.details.eggCount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Fertility</div>
                          <div className="font-semibold">{batch.details.fertility}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbrexTimelinePage;