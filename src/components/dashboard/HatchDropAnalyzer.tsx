import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Lightbulb, Target, FileText, ArrowRight, CheckCircle, AlertCircle, Info, Download } from "lucide-react";
import { useHatchDropAnalysis, type HatchDropAnalysis } from "@/hooks/useHatchDropAnalysis";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface HatchDropAnalyzerProps {
  batchId: string;
  onClose?: () => void;
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'critical': return 'text-red-600 bg-red-50';
    case 'high': return 'text-orange-600 bg-orange-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-green-600 bg-green-50';
    default: return 'text-muted-foreground bg-muted';
  }
};

const getImpactIcon = (impact: string) => {
  switch (impact) {
    case 'critical': return <AlertTriangle className="h-4 w-4" />;
    case 'high': return <AlertCircle className="h-4 w-4" />;
    case 'medium': return <Info className="h-4 w-4" />;
    case 'low': return <CheckCircle className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
  }
};

const HatchDropAnalyzer = ({ batchId, onClose }: HatchDropAnalyzerProps) => {
  const { data: analysis, isLoading, error } = useHatchDropAnalysis(batchId);
  const [showDetailed, setShowDetailed] = useState(false);

  const generateReport = () => {
    if (!analysis) return;

    const reportContent = `
HATCH DROP ANALYSIS REPORT
Generated: ${format(new Date(), 'MMMM dd, yyyy')}

BATCH INFORMATION
Batch Number: ${analysis.underperformingBatch.batchNumber}
Flock: ${analysis.underperformingBatch.flockName} #${analysis.underperformingBatch.flockNumber}
Breed: ${analysis.underperformingBatch.breed}
House: ${analysis.underperformingBatch.houseNumber}
Unit: ${analysis.underperformingBatch.unitName}

PERFORMANCE METRICS
Expected Hatch Rate: ${analysis.underperformingBatch.expectedHatch.toFixed(1)}%
Actual Hatch Rate: ${analysis.underperformingBatch.actualHatch.toFixed(1)}%
Hatch Drop: ${analysis.underperformingBatch.hatchDrop.toFixed(1)}%

PRIMARY CAUSE
${analysis.insights.primaryCause}
Confidence Score: ${(analysis.insights.confidenceScore * 100).toFixed(0)}%

CONTRIBUTING FACTORS
${analysis.factors.map(f => `${f.name}: ${f.impact.toUpperCase()} impact (${f.difference > 0 ? '+' : ''}${f.difference.toFixed(1)}${f.unit})`).join('\n')}

RECOMMENDATIONS
${analysis.insights.recommendations.map(r => `• ${r}`).join('\n')}

COMPARISON BATCHES
${analysis.similarBatches.map(b => `${b.batchNumber}: ${b.actualHatch.toFixed(1)}% hatch rate`).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hatch-drop-analysis-${analysis.underperformingBatch.batchNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Analysis report downloaded');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Analyzing hatch performance...</span>
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
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
            <p className="font-medium">No Significant Hatch Drop Detected</p>
            <p className="text-sm text-muted-foreground">
              This batch performed within expected parameters
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const factorChartData = analysis.factors.map(factor => ({
    name: factor.name,
    difference: Math.abs(factor.difference),
    impact: factor.impact === 'critical' ? 4 : factor.impact === 'high' ? 3 : factor.impact === 'medium' ? 2 : 1
  }));

  const comparisonData = [
    {
      name: 'Target Batch',
      hatch: analysis.underperformingBatch.actualHatch,
      fertility: analysis.underperformingBatch.fertility,
      temp: analysis.underperformingBatch.avgTemp,
      humidity: analysis.underperformingBatch.avgHumidity
    },
    ...analysis.similarBatches.map(batch => ({
      name: `${batch.batchNumber}`,
      hatch: batch.actualHatch,
      fertility: batch.fertility,
      temp: batch.avgTemp,
      humidity: batch.avgHumidity
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Analysis Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Hatch Drop Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Batch {analysis.underperformingBatch.batchNumber} • 
                  {analysis.underperformingBatch.hatchDrop.toFixed(1)}% below expected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={generateReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="outline" size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {analysis.underperformingBatch.actualHatch.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Actual Hatch</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {analysis.underperformingBatch.expectedHatch.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Expected Hatch</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analysis.underperformingBatch.hatchDrop.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Drop</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {(analysis.insights.confidenceScore * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Cause & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Primary Cause
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="font-semibold text-lg">{analysis.insights.primaryCause}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Confidence: {(analysis.insights.confidenceScore * 100).toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.insights.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributing Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Contributing Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.factors.map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getImpactColor(factor.impact)}`}>
                    {getImpactIcon(factor.impact)}
                  </div>
                  <div>
                    <div className="font-medium">{factor.name}</div>
                    <div className="text-sm text-muted-foreground">{factor.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={factor.impact === 'critical' ? 'destructive' : 
                               factor.impact === 'high' ? 'default' : 'secondary'}>
                    {factor.impact.toUpperCase()}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    {factor.difference > 0 ? '+' : ''}{factor.difference.toFixed(1)}{factor.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Toggle */}
      <div className="flex justify-center">
        <Button 
          onClick={() => setShowDetailed(!showDetailed)} 
          variant="outline"
        >
          {showDetailed ? 'Hide' : 'Show'} Detailed Analysis
        </Button>
      </div>

      {/* Detailed Charts */}
      {showDetailed && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Factor Impact Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Factor Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={factorChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="impact" fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={comparisonData.slice(0, 4)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar 
                        name="Hatch Rate" 
                        dataKey="hatch" 
                        stroke="hsl(var(--chart-1))" 
                        fill="hsl(var(--chart-1))" 
                        fillOpacity={0.25} 
                      />
                      <Radar 
                        name="Fertility" 
                        dataKey="fertility" 
                        stroke="hsl(var(--chart-2))" 
                        fill="hsl(var(--chart-2))" 
                        fillOpacity={0.25} 
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Similar Batches Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Similar High-Performing Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Batch</th>
                      <th className="text-left py-2">Flock</th>
                      <th className="text-left py-2">Hatch %</th>
                      <th className="text-left py-2">Fertility %</th>
                      <th className="text-left py-2">Avg Temp</th>
                      <th className="text-left py-2">Avg Humidity</th>
                      <th className="text-left py-2">Set Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.similarBatches.map((batch, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{batch.batchNumber}</td>
                        <td className="py-2">{batch.flockName} #{batch.flockNumber}</td>
                        <td className="py-2 text-green-600 font-medium">{batch.actualHatch.toFixed(1)}%</td>
                        <td className="py-2">{batch.fertility.toFixed(1)}%</td>
                        <td className="py-2">{batch.avgTemp.toFixed(1)}°F</td>
                        <td className="py-2">{batch.avgHumidity.toFixed(1)}%</td>
                        <td className="py-2">{format(new Date(batch.setDate), 'MMM dd, yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HatchDropAnalyzer;