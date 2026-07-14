import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSetWeekLabel } from "@/hooks/useFlockWeekHouses";
import type { FlockWeekContext } from "@/hooks/useFlockWeekBatches";
import type { ReactNode } from "react";

const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString();

const statusColor = (s: string) => {
  switch (s) {
    case "in_setter":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "in_hatcher":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

interface Props {
  ctx: FlockWeekContext;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

/**
 * Shared header used by every flock-week Data Entry page. Shows flock-level
 * totals (not one house) so the user sees the same summary numbers as the
 * Weekly Flock Rollup that led them here.
 */
export function FlockEntryHeader({ ctx, title, subtitle, icon }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {ctx.flockName ? `${ctx.flockName} · ` : ""}Flock #
              {ctx.flockNumber || "—"}
            </p>
            <p className="text-sm mt-1">
              <span className="text-muted-foreground">Set Week: </span>
              <span className="font-medium">
                {formatSetWeekLabel(ctx.weekMonday)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {ctx.batches.length}{" "}
              {ctx.batches.length === 1 ? "house" : "houses"} this week
              {subtitle ? ` · ${subtitle}` : ""}
            </p>
          </div>
          <Badge variant="outline" className={statusColor(ctx.worstStatus)}>
            {ctx.worstStatus.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border bg-muted/30 p-4">
          <div>
            <div className="text-xs text-muted-foreground">Total Eggs Set</div>
            <div className="text-xl font-semibold">
              {fmtInt(ctx.totalEggsSet)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Injected</div>
            <div className="text-xl font-semibold">
              {fmtInt(ctx.totalEggsInjected)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Clears</div>
            <div className="text-xl font-semibold">
              {fmtInt(ctx.totalEggsCleared)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Chicks Hatched</div>
            <div className="text-xl font-semibold">
              {fmtInt(ctx.totalChicksHatched)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
