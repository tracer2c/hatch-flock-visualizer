import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Search, Eye, Calendar } from "lucide-react";
import { useUnderperformingBatches } from "@/hooks/useHatchDropAnalysis";
import { format } from 'date-fns';
import HatchDropAnalyzer from './HatchDropAnalyzer';

const HatchDropDetector = () => {
  const { data: underperformingBatches, isLoading, error } = useUnderperformingBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  if (selectedBatchId) {
    return (
      <HatchDropAnalyzer 
        batchId={selectedBatchId} 
        onClose={() => setSelectedBatchId(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Scanning for hatch drops...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">Failed to scan for hatch drops</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Search className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Hatch Drop Detection</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Automated analysis of underperforming batches in the last 90 days
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {underperformingBatches?.length || 0} Issues Found
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Results */}
      {!underperformingBatches || underperformingBatches.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <TrendingDown className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">No Significant Hatch Drops Detected</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  All completed batches in the last 90 days are performing within expected parameters
                </p>
              </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Found {underperformingBatches.length} batch(es) with significant hatch drops ({">"}5% below expected)
          </div>
          
          <div className="grid gap-4">
            {underperformingBatches.map((batch) => (
              <Card key={batch.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-destructive" />
                        <div>
                          <div className="font-semibold">
                            Batch {batch.batchNumber}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {batch.flockName} #{batch.flockNumber} • {batch.breed}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Expected</div>
                          <div className="font-medium">{batch.expectedHatch.toFixed(1)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Actual</div>
                          <div className="font-medium text-destructive">{batch.actualHatch.toFixed(1)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Drop</div>
                          <div className="font-bold text-destructive">
                            -{batch.hatchDrop.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(batch.setDate), 'MMM dd, yyyy')}
                        </div>
                        <Badge 
                          variant={batch.hatchDrop > 15 ? 'destructive' : 
                                  batch.hatchDrop > 10 ? 'default' : 'secondary'}
                        >
                          {batch.hatchDrop > 15 ? 'Critical' : 
                           batch.hatchDrop > 10 ? 'High Impact' : 'Moderate'}
                        </Badge>
                      </div>
                      
                      <Button 
                        onClick={() => setSelectedBatchId(batch.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Analyze
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HatchDropDetector;