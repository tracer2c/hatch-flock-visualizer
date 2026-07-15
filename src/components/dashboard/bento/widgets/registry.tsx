import { ComponentType } from "react";
import { Egg, TrendingUp, Activity, Target, Building2, AlertOctagon, BarChart3, LucideIcon } from "lucide-react";
import { EggsHeroWidget } from "./EggsHeroWidget";
import { MetricTileWidget } from "./MetricTileWidget";
import { HousesPipelineWidget } from "./HousesPipelineWidget";
import { QaAlertsWidget } from "./QaAlertsWidget";
import { WeeklyFlockStatusWidget } from "./WeeklyFlockStatusWidget";

export interface WidgetDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  Component: ComponentType<{ editing?: boolean; onRemove?: () => void }>;
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  {
    id: "eggs-hero",
    title: "Eggs Set — Hero",
    description: "Oversized total eggs set with trend and sparkline.",
    icon: Egg,
    defaultSize: { w: 7, h: 4 },
    Component: EggsHeroWidget,
  },
  {
    id: "metric-fertility",
    title: "Fertility %",
    description: "Average fertility for the range with target.",
    icon: TrendingUp,
    defaultSize: { w: 5, h: 2 },
    Component: (p) => <MetricTileWidget metric="fertility_pct" {...p} />,
  },
  {
    id: "metric-hatch",
    title: "Hatch of Fertile %",
    description: "Average HOF for the range with target.",
    icon: Activity,
    defaultSize: { w: 5, h: 2 },
    Component: (p) => <MetricTileWidget metric="hof_pct" {...p} />,
  },
  {
    id: "metric-hoi",
    title: "Hatch of Injected %",
    description: "Average HOI for the range with target.",
    icon: Target,
    defaultSize: { w: 4, h: 2 },
    Component: (p) => <MetricTileWidget metric="hoi_pct" {...p} />,
  },
  {
    id: "houses-pipeline",
    title: "Active Houses Pipeline",
    description: "Setter / Hatcher / Completed with striped progress.",
    icon: Building2,
    defaultSize: { w: 8, h: 4 },
    Component: HousesPipelineWidget,
  },
  {
    id: "qa-alerts",
    title: "QA Critical Alerts",
    description: "Live list of critical QA alerts.",
    icon: AlertOctagon,
    defaultSize: { w: 5, h: 4 },
    Component: QaAlertsWidget,
  },
  {
    id: "weekly-flock-status",
    title: "Weekly Flock Status",
    description: "Total / Complete / Missing / Critical tiles.",
    icon: BarChart3,
    defaultSize: { w: 7, h: 4 },
    Component: WeeklyFlockStatusWidget,
  },
];

export const getWidget = (id: string) => WIDGET_REGISTRY.find((w) => w.id === id);
