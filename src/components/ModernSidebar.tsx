import { useEffect, useMemo, useState, type ComponentType } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Layers,
  Box,
  FileInput,
  ClipboardCheck,
  FileSpreadsheet,
  TrendingUp,
  CheckSquare,
  MessageSquare,
  Settings,
  LifeBuoy,
  ChevronRight,
  Thermometer,
  Compass,
  Droplets,
  Activity,
  Sparkles,
  Skull,
  Scale,
  Egg,
  Building2,
  Cpu,
  Bird,
  Users as UsersIcon,
  BarChart3,
  Target,
} from "lucide-react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { FeatureKey } from "@/lib/featureKeys";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SubItem = { label: string; href: string; icon: ComponentType<{ className?: string }> };
type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  featureKey?: FeatureKey;
  items?: SubItem[];
};

const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Home, featureKey: "dashboard" },
  { label: "Multi-Stage", href: "/multi-stage", icon: Layers, featureKey: "multi_stage" },
  { label: "Single-Stage", href: "/single-stage", icon: Box, featureKey: "single_stage" },
  {
    label: "Data Entry",
    href: "/data-entry",
    icon: FileInput,
    featureKey: "data_entry",
    items: [
      { label: "Weekly Flock Rollup", href: "/data-entry", icon: FileInput },
      { label: "Egg Pack", href: "/data-entry/egg-pack", icon: Egg },
      { label: "Fertility", href: "/data-entry/fertility", icon: Activity },
      { label: "Residue", href: "/data-entry/residue", icon: Scale },
      { label: "Clears & Injected", href: "/data-entry/clears-injected", icon: Sparkles },
    ],
  },
  {
    label: "QA Hub",
    href: "/qa-hub",
    icon: ClipboardCheck,
    featureKey: "qa_hub",
    items: [
      { label: "Temps", href: "/qa-hub?tab=temps", icon: Thermometer },
      { label: "Angles", href: "/qa-hub?tab=angles", icon: Compass },
      { label: "Humidity", href: "/qa-hub?tab=humidity", icon: Droplets },
      { label: "Rectal", href: "/qa-hub?tab=rectal", icon: Activity },
      { label: "Wash", href: "/qa-hub?tab=wash", icon: Sparkles },
      { label: "Culls", href: "/qa-hub?tab=culls", icon: Skull },
      { label: "Gravity", href: "/qa-hub?tab=gravity", icon: Scale },
      { label: "Hatch", href: "/qa-hub?tab=hatch", icon: Egg },
    ],
  },
  { label: "Data Sheet", href: "/embrex-data-sheet", icon: FileSpreadsheet, featureKey: "embrex_data_sheet" },
  { label: "Timeline", href: "/embrex-timeline", icon: TrendingUp, featureKey: "embrex_timeline" },
  { label: "Daily Tasks", href: "/checklist", icon: CheckSquare, featureKey: "checklist" },
  { label: "Smart Analytics", href: "/chat", icon: MessageSquare, featureKey: "chat" },
  {
    label: "Management",
    href: "/management",
    icon: Settings,
    featureKey: "management",
    items: [
      { label: "Hatcheries", href: "/management/hatcheries", icon: Building2 },
      { label: "Machines", href: "/management/machines", icon: Cpu },
      { label: "Flocks", href: "/management/flocks", icon: Bird },
      { label: "Users", href: "/management/users", icon: UsersIcon },
      { label: "Reports", href: "/management/reports", icon: BarChart3 },
      { label: "Targets", href: "/management/targets", icon: Target },
    ],
  },
];

const footerNav: NavItem[] = [
  { label: "Support", href: "/support", icon: LifeBuoy },
  { label: "Settings", href: "/management", icon: Settings },
];

function RailButton({
  item,
  active,
  onHover,
}: {
  item: NavItem;
  active: boolean;
  onHover?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          onMouseEnter={onHover}
          onFocus={onHover}
          className={cn(
            "relative flex items-center justify-center w-11 h-11 rounded-xl transition-colors",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
          {item.items && (
            <ChevronRight className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-50" />
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function ModernSidebar() {
  const { isMobile, openMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const { hasFeatureAccess } = usePermissions();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [toggleSidebar]);

  const visible = useMemo(
    () =>
      primaryNav.filter((i) => {
        if (!user) return false;
        return i.featureKey ? hasFeatureAccess(i.featureKey) : true;
      }),
    [user, hasFeatureAccess]
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const activeItem = visible.find((i) => isActive(i.href));
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const panelItem =
    (hoveredHref && visible.find((i) => i.href === hoveredHref)) || activeItem || null;
  const showPanel = !!(panelItem && panelItem.items && panelItem.items.length > 0);

  return (
    <>
      {isMobile && openMobile && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpenMobile(false)} />
      )}

      <Sidebar
        side="left"
        variant="sidebar"
        collapsible="offcanvas"
        className="border-r border-sidebar-border/50 bg-sidebar/95 backdrop-blur-md shadow-xl p-0"
      >
        <SidebarContent className="p-0">
          <TooltipProvider>
            <div
              className="flex h-full pt-14"
              onMouseLeave={() => setHoveredHref(null)}
            >
              {/* Slim icon rail */}
              <div className="flex flex-col items-center gap-1 w-[68px] py-3 border-r border-sidebar-border/50 flex-shrink-0">
                <div className="flex flex-col gap-1 flex-1">
                  {visible.map((item) => (
                    <RailButton
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      onHover={() => setHoveredHref(item.href)}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-1 pt-2 border-t border-sidebar-border/50 w-full items-center">
                  {footerNav.map((item) => (
                    <RailButton
                      key={item.label}
                      item={item}
                      active={false}
                      onHover={() => setHoveredHref(null)}
                    />
                  ))}
                </div>
              </div>

              {/* Secondary panel */}
              {showPanel && panelItem && (
                <div className="w-56 py-4 px-2 animate-in fade-in slide-in-from-left-2 duration-150">
                  <div className="px-3 pb-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {panelItem.label}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {panelItem.items!.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive =
                        pathname + search === sub.href ||
                        (sub.href.includes("?")
                          ? pathname + search === sub.href
                          : pathname === sub.href);
                      return (
                        <NavLink
                          key={sub.href}
                          to={sub.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                            subActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <SubIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TooltipProvider>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
