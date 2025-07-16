import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { useActiveBatches } from '@/hooks/useBatchData';
import { format, differenceInDays, addDays } from 'date-fns';

interface IncubationTimelineProps {
  className?: string;
}

const IncubationTimeline = ({ className }: IncubationTimelineProps) => {
  const { data: activeBatches, isLoading } = useActiveBatches();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setting': return 'bg-blue-500';
      case 'incubating': return 'bg-yellow-500';
      case 'hatching': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'setting': return 'secondary';
      case 'incubating': return 'default';
      case 'hatching': return 'default';
      default: return 'outline';
    }
  };

  const getCriticalDays = (daysSinceSet: number) => {
    const criticalDays = [7, 14, 18, 21]; // Key incubation milestones
    return criticalDays.filter(day => Math.abs(day - daysSinceSet) <= 1);
  };

  const getProgressPercentage = (daysSinceSet: number) => {
    return Math.min(100, (daysSinceSet / 21) * 100);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Incubation Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading timeline...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const batchesWithProgress = activeBatches?.map(batch => {
    const daysSinceSet = differenceInDays(new Date(), new Date(batch.set_date));
    const expectedHatchDate = addDays(new Date(batch.set_date), 21);
    const criticalDays = getCriticalDays(daysSinceSet);
    const progressPercentage = getProgressPercentage(daysSinceSet);
    
    return {
      ...batch,
      daysSinceSet,
      expectedHatchDate,
      criticalDays,
      progressPercentage,
      daysRemaining: Math.max(0, 21 - daysSinceSet)
    };
  }) || [];

  // Sort by days since set (earliest first)
  batchesWithProgress.sort((a, b) => a.daysSinceSet - b.daysSinceSet);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Incubation Timeline
            </CardTitle>
            <CardDescription>
              Real-time progress tracking for all active batches
            </CardDescription>
          </div>
          <ChartDownloadButton chartId="incubation-timeline" filename="incubation-timeline" />
        </div>
      </CardHeader>
      <CardContent>
        <div id="incubation-timeline" className="space-y-6">
          {/* Timeline Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Setting (Days 1-3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Incubating (Days 4-18)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Hatching (Days 19-21)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              <span>Critical Day</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {batchesWithProgress.map((batch, index) => (
              <div key={batch.id} className="relative">
                {/* Batch Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">
                      Batch {batch.batch_number}
                    </h3>
                    <Badge variant={getStatusVariant(batch.status)}>
                      {batch.status}
                    </Badge>
                    {batch.criticalDays.length > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Critical Day
                      </Badge>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>Day {batch.daysSinceSet} of 21</div>
                    <div>{batch.daysRemaining} days remaining</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                  {/* Progress fill */}
                  <div 
                    className={`h-full transition-all duration-500 ${getStatusColor(batch.status)}`}
                    style={{ width: `${batch.progressPercentage}%` }}
                  ></div>
                  
                  {/* Day markers */}
                  <div className="absolute inset-0 flex items-center">
                    {[7, 14, 18, 21].map(day => (
                      <div
                        key={day}
                        className="absolute top-0 bottom-0 flex items-center"
                        style={{ left: `${(day / 21) * 100}%` }}
                      >
                        <div className="w-0.5 h-full bg-white/50"></div>
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                          {day}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Current day indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-md"
                    style={{ left: `${batch.progressPercentage}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                      Day {batch.daysSinceSet}
                    </div>
                  </div>
                </div>

                {/* Batch Details */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Flock:</span>
                    <div className="font-medium">{batch.flocks?.flock_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Machine:</span>
                    <div className="font-medium">{batch.machines?.machine_number}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Set Date:</span>
                    <div className="font-medium">{format(new Date(batch.set_date), 'MMM d, yyyy')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Hatch:</span>
                    <div className="font-medium">{format(batch.expectedHatchDate, 'MMM d, yyyy')}</div>
                  </div>
                </div>

                {/* Critical Days Alert */}
                {batch.criticalDays.length > 0 && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Critical Day Alert</span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      Day {batch.daysSinceSet} is a critical milestone. Extra monitoring recommended.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeBatches?.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No Active Batches</h3>
              <p className="text-sm text-muted-foreground">All batches have been completed or no batches are currently in progress.</p>
            </div>
          )}

          {/* Summary Stats */}
          {activeBatches && activeBatches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {batchesWithProgress.filter(b => b.criticalDays.length > 0).length}
                </div>
                <div className="text-sm text-muted-foreground">Batches at Critical Days</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {batchesWithProgress.filter(b => b.status === 'hatching').length}
                </div>
                <div className="text-sm text-muted-foreground">Batches Hatching</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(batchesWithProgress.reduce((sum, b) => sum + b.progressPercentage, 0) / batchesWithProgress.length) || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Average Progress</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IncubationTimeline;