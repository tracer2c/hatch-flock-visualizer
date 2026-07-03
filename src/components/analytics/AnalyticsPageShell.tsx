import { ReactNode } from "react";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  showMode?: boolean;
  children: ReactNode;
  className?: string;
}

export function AnalyticsPageShell({ title, description, icon, showMode, children, className }: Props) {
  return (
    <div className={cn("p-4 md:p-6 space-y-4", className)}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">{icon}</div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
            {description && <p className="text-xs md:text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <AnalyticsFilters showMode={showMode} />
      </div>
      {children}
    </div>
  );
}
