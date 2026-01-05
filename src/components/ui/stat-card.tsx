import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trendLabel?: string;
  trendDirection?: "up" | "down" | null;
  sparklineData?: number[];
  className?: string;
  description?: string;
  variant?: "default" | "primary" | "accent" | "success";
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
  variant = "default"
}) => {
  const data = React.useMemo(() =>
    (sparklineData || []).map((v, i) => ({ i, v })),
  [sparklineData]);

  const getAccentGradient = () => {
    switch (variant) {
      case "primary":
        return "from-primary via-primary/70 to-primary/40";
      case "accent":
        return "from-accent via-accent/70 to-accent/40";
      case "success":
        return "from-primary via-primary/60 to-primary/30";
      default:
        return "from-primary via-primary/60 to-primary/30";
    }
  };

  const getIconBackground = () => {
    switch (variant) {
      case "primary":
        return "from-primary/20 to-primary/5";
      case "accent":
        return "from-accent/20 to-accent/5";
      case "success":
        return "from-primary/20 to-primary/5";
      default:
        return "from-primary/15 to-primary/5";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "primary":
        return "text-primary";
      case "accent":
        return "text-accent";
      case "success":
        return "text-primary";
      default:
        return "text-primary";
    }
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "hover:shadow-xl hover:-translate-y-1 hover:border-primary/30",
      "bg-gradient-to-br from-card via-card to-muted/20 border-border/50",
      className
    )}>
      {/* Vibrant Gradient Accent Bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r",
        getAccentGradient()
      )} />
      
      {/* Subtle Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
        {description ? (
          <TooltipPrimitive.Provider delayDuration={100}>
            <TooltipPrimitive.Root>
              <TooltipPrimitive.Trigger asChild>
                <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground cursor-help hover:text-foreground transition-colors">
                  {title}
                </CardTitle>
              </TooltipPrimitive.Trigger>
              <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                  side="top"
                  sideOffset={12}
                  className="z-[9999] max-w-xs rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95"
                >
                  <p>{description}</p>
                  <TooltipPrimitive.Arrow className="fill-popover" />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
          </TooltipPrimitive.Provider>
        ) : (
          <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {title}
          </CardTitle>
        )}
        {icon && (
          <div className={cn(
            "p-2 rounded-lg bg-gradient-to-br transition-all duration-300 group-hover:scale-110",
            getIconBackground()
          )}>
            <div className={cn(
              "transition-colors [&>svg]:stroke-[1.5] [&>svg]:w-5 [&>svg]:h-5",
              getIconColor()
            )}>
              {icon}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
        {trendLabel && (
          <p
            className={cn(
              "text-xs flex items-center mt-2 font-medium",
              trendDirection === "up" && "text-success",
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
                <defs>
                  <linearGradient id={`gradient-${variant}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="v" 
                  stroke="hsl(var(--primary))" 
                  fill={`url(#gradient-${variant})`}
                  strokeWidth={2.5} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
