import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UnitComparisonSummaryProps {
  selectedUnitIds: string[];
  dateRange: { from: Date; to: Date };
  unitNames: Record<string, string>;
}

interface UnitSummaryData {
  unitName: string;
  unitId: string;
  totalBatches: number;
  completedBatches: number;
  metrics: {
    fertilityPercent: number;
    hatchPercent: number;
    qualityScore: number;
    residuePercent: number;
    avgTemperature: number;
    avgHumidity: number;
  };
  recentBatches: Array<{
    batchNumber: string;
    breed: string;
    status: string;
    setDate: string;
  }>;
}

const UnitComparisonSummary: React.FC<UnitComparisonSummaryProps> = ({
  selectedUnitIds,
  dateRange,
  unitNames
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<{
    unitSummary: UnitSummaryData[];
    aiSummary: string;
    dateRange: { from: string; to: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    if (selectedUnitIds.length === 0) {
      toast.error("Please select at least one unit to analyze");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('unit-comparison-summary', {
        body: {
          selectedUnits: selectedUnitIds,
          dateRange: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          }
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSummary(data);
      toast.success("AI analysis completed successfully");
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      toast.error("Failed to generate AI summary");
    } finally {
      setIsLoading(false);
    }
  };

  const formatAISummary = (text: string) => {
    const sections = text.split(/\d+\.\s*\*\*([^*]+)\*\*:/);
    const formattedSections = [];
    
    for (let i = 1; i < sections.length; i += 2) {
      const title = sections[i];
      const content = sections[i + 1];
      
      let icon = <Info className="h-4 w-4" />;
      if (title.toLowerCase().includes('ranking')) icon = <TrendingUp className="h-4 w-4" />;
      if (title.toLowerCase().includes('issues')) icon = <AlertTriangle className="h-4 w-4" />;
      
      formattedSections.push(
        <div key={title} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <h4 className="font-semibold text-foreground">{title}</h4>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-line pl-6">
            {content?.trim()}
          </div>
        </div>
      );
    }
    
    return formattedSections.length > 0 ? formattedSections : (
      <div className="text-sm text-muted-foreground whitespace-pre-line">{text}</div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Unit Comparison Analysis
          </CardTitle>
          <Button 
            onClick={generateSummary}
            disabled={isLoading || selectedUnitIds.length === 0}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generate Analysis
              </>
            )}
          </Button>
        </div>
        {selectedUnitIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedUnitIds.map(unitId => (
              <Badge key={unitId} variant="secondary" className="text-xs">
                {unitNames[unitId] || `Unit ${unitId}`}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {selectedUnitIds.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Select one or more units above to generate an AI-powered performance analysis and comparison.
            </AlertDescription>
          </Alert>
        )}

        {summary && (
          <div className="space-y-6">
            {/* Unit Summary Cards */}
            <div>
              <h3 className="font-semibold mb-3 text-foreground">Performance Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary.unitSummary.map((unit) => (
                  <Card key={unit.unitId} className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{unit.unitName}</CardTitle>
                      <div className="text-xs text-muted-foreground">
                        {unit.completedBatches} of {unit.totalBatches} batches completed
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Fertility</div>
                          <div className="font-medium">{unit.metrics.fertilityPercent}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Hatch Rate</div>
                          <div className="font-medium">{unit.metrics.hatchPercent}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Quality</div>
                          <div className="font-medium">{unit.metrics.qualityScore}/100</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Residue</div>
                          <div className="font-medium">{unit.metrics.residuePercent}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* AI Analysis */}
            <div>
              <h3 className="font-semibold mb-3 text-foreground">Comparison Analysis & Recommendations</h3>
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardContent className="pt-6">
                  {formatAISummary(summary.aiSummary)}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnitComparisonSummary;