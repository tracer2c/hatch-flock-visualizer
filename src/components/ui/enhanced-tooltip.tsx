import React from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { useChartInsights } from '@/hooks/useChartInsights';

interface EnhancedTooltipProps {
  chartType: string;
  data: any;
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  className?: string;
}

export const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  chartType,
  data,
  title,
  metrics,
  className = ""
}) => {
  const { explanation, isLoading, error, getInsight } = useChartInsights();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      getInsight(chartType, data);
    }, 300);

    return () => clearTimeout(timer);
  }, [chartType, data, getInsight]);

  return (
    <div className={`bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px] ${className}`}>
      {/* Original content */}
      <div className="mb-3">
        <p className="font-medium mb-2">{title}</p>
        <div className="space-y-1">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <span style={{ color: metric.color }} className="text-sm">
                {metric.label}:
              </span>
              <span className="font-medium text-sm">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Insight Section */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Insight</span>
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Analyzing...</span>
          </div>
        )}
        
        {error && (
          <p className="text-xs text-destructive">
            Unable to generate insight
          </p>
        )}
        
        {explanation && !isLoading && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {explanation}
          </p>
        )}
      </div>
    </div>
  );
};