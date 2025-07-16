import React, { useEffect } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { useChartInsights } from '@/hooks/useChartInsights';

interface AITooltipProps {
  chartType: string;
  data: any;
  chartConfig?: any;
  children: React.ReactNode;
  className?: string;
}

export const AITooltip: React.FC<AITooltipProps> = ({
  chartType,
  data,
  chartConfig,
  children,
  className = ""
}) => {
  const { explanation, isLoading, error, getInsight } = useChartInsights();

  useEffect(() => {
    // Debounce the insight request
    const timer = setTimeout(() => {
      getInsight(chartType, data, chartConfig);
    }, 500);

    return () => clearTimeout(timer);
  }, [chartType, data, chartConfig, getInsight]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Original tooltip content */}
      {children}
      
      {/* AI Insight Section */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Insight</span>
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Analyzing data...</span>
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