import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trendLabel?: string;
  trendDirection?: "up" | "down" | null;
  sparklineData?: number[];
  className?: string;
  description?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trendLabel, 
  trendDirection = null, 
  sparklineData, 
  className,
  description,
  accentColor = "from-primary via-accent to-primary"
}) => {
  const data = React.useMemo(() =>
    (sparklineData || []).map((v, i) => ({ i, v })),
  [sparklineData]);

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
      className
    )}>
      {/* Gradient Accent Line */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", accentColor)} />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            {title}
          </CardTitle>
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {/* Icon in gradient pill background */}
        {icon && (
          <div className="rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 p-2.5 shadow-sm">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        {trendLabel && (
          <p
            className={cn(
              "text-xs flex items-center mt-2 font-medium",
              trendDirection === "up" && "text-emerald-600",
              trendDirection === "down" && "text-destructive",
              trendDirection === null && "text-muted-foreground"
            )}
          >
            {trendDirection === "up" && <TrendingUp className="h-3.5 w-3.5 mr-1" />}
            {trendDirection === "down" && <TrendingDown className="h-3.5 w-3.5 mr-1" />}
            {trendLabel}
          </p>
        )}
        {data.length > 1 && (
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
