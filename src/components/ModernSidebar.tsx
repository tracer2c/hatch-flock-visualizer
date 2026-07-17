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
  PanelLeftClose,
  Droplet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { FeatureKey } from "@/lib/featureKeys";

type SubItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  featureKey?: FeatureKey;
};
type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  featureKey?: FeatureKey;
  items?: SubItem[];
};
type NavGroup = { heading: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Monitor",
    items: [
      { label: "Dashboard", href: "/", icon: Home, featureKey: "dashboard" },
      { label: "Multi-Stage", href: "/multi-stage", icon: Layers, featureKey: "multi_stage" },
      { label: "Single-Stage", href: "/single-stage", icon: Box, featureKey: "single_stage" },
      { label: "Timeline", href: "/embrex-timeline", icon: TrendingUp, featureKey: "embrex_timeline" },
    ],
  },
  {
    heading: "Data",
    items: [
      {
        label: "Data Entry",
        href: "/data-entry",
        icon: FileInput,
        featureKey: "data_entry",
        items: [
          { label: "Weekly Rollup", href: "/data-entry", icon: FileInput },
        ],
      },
      { label: "Data Sheet", href: "/embrex-data-sheet", icon: FileSpreadsheet, featureKey: "embrex_data_sheet" },
    ],
  },
  {
    heading: "Quality",
    items: [
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
      { label: "Daily Tasks", href: "/checklist", icon: CheckSquare, featureKey: "checklist" },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      { label: "HatchAI Assistant", href: "/chat", icon: MessageSquare, featureKey: "chat" },
    ],
  },
  {
    heading: "Admin",
    items: [
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/management", icon: Settings, featureKey: "management" },
    ],
  },
];

const EXPAND_STORAGE_KEY = "sidebar:expanded-groups:v1";

function useExpanded(defaults: Record<string, boolean>) {
  const [state, setState] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(EXPAND_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });
  const toggle = (key: string) =>
    setState((s) => {
      const next = { ...s, [key]: !s[key] };
      try {
        localStorage.setItem(EXPAND_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  const setOpen = (key: string, value: boolean) =>
    setState((s) => (s[key] === value ? s : { ...s, [key]: value }));
  return { state, toggle, setOpen };
}

export function ModernSidebar() {
  const { isMobile, openMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth() as any;
  const { hasFeatureAccess } = usePermissions();
  const { pathname, search } = useLocation();
  const fullPath = pathname + (search || "");

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

  const visibleGroups = useMemo<NavGroup[]>(() => {
    if (!user) return [];
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => (i.featureKey ? hasFeatureAccess(i.featureKey) : true)),
    })).filter((g) => g.items.length > 0);
  }, [user, hasFeatureAccess]);

  const isParentActive = (item: NavItem) => {
    if (item.href === "/") return pathname === "/";
    if (pathname.startsWith(item.href)) return true;
    return !!item.items?.some((s) => fullPath === s.href || pathname === s.href.split("?")[0]);
  };

  const isSubActive = (sub: SubItem) => {
    const [subPath, subQuery] = sub.href.split("?");
    if (subQuery) return fullPath === sub.href;
    return pathname === subPath;
  };

  const defaults = useMemo(() => {
    const d: Record<string, boolean> = {};
    for (const g of visibleGroups) {
      for (const it of g.items) {
        if (it.items?.length) d[it.href] = isParentActive(it);
      }
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleGroups, pathname]);

  const { state: expanded, toggle, setOpen } = useExpanded(defaults);

  // Auto-open the group of the currently active route
  useEffect(() => {
    for (const g of visibleGroups) {
      for (const it of g.items) {
        if (it.items?.length && isParentActive(it)) setOpen(it.href, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const renderItem = (item: NavItem, groupIndex: number, itemIndex: number) => {
    const Icon = item.icon;
    const active = isParentActive(item);
    const hasSubs = !!item.items?.length;
    const isOpen = hasSubs ? expanded[item.href] ?? false : false;

    return (
      <li key={item.href} className="list-none">
        <div className="relative flex items-stretch group-data-[collapsible=icon]:block">
          <NavLink
            to={item.href}
            end={item.href === "/"}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 h-10 flex-1 rounded-lg px-3 text-sm transition-colors",
              "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:mx-auto",
              active
                ? "bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/5"
                : "text-sidebar-foreground/80 hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {active && (
              <span className="absolute -left-3 top-0 bottom-0 w-1 rounded-r-full bg-primary group-data-[collapsible=icon]:hidden" />
            )}
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
          </NavLink>
          {hasSubs && (
            <button
              type="button"
              aria-label={isOpen ? "Collapse" : "Expand"}
              onClick={() => toggle(item.href)}
              className={cn(
                "flex items-center justify-center w-7 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-transform group-data-[collapsible=icon]:hidden",
                isOpen && "rotate-90"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasSubs && isOpen && (
          <ul className="mt-1 ml-6 border-l border-border pl-3 space-y-0.5 group-data-[collapsible=icon]:hidden">
            {item.items!.map((sub) => {
              const SubIcon = sub.icon;
              const subActive = isSubActive(sub);
              return (
                <li key={sub.href} className="list-none">
                  <NavLink
                    to={sub.href}
                    className={cn(
                      "flex items-center gap-2 h-10 rounded-lg px-2 text-sm transition-colors",
                      subActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <SubIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{sub.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {isMobile && openMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpenMobile(false)}
        />
      )}

      <Sidebar
        side="left"
        variant="sidebar"
        collapsible="icon"
        className="border-r border-sidebar-border/60 bg-sidebar"
      >
        {/* Header */}
        <SidebarHeader className="h-16 shrink-0 flex-row items-center justify-between px-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
          <NavLink
            to="/"
            title="Go to dashboard"
            className="flex items-center gap-3 min-w-0 rounded-lg transition-colors hover:text-primary group-data-[collapsible=icon]:hidden"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Droplet className="h-4 w-4" />
            </div>
            <span className="text-[18px] font-semibold text-foreground truncate">
              Hatchery Pro
            </span>
          </NavLink>
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <PanelLeftClose className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </SidebarHeader>

        {/* Scrollable nav */}
        <SidebarContent className="flex-1 overflow-y-auto px-5 py-4 gap-0 group-data-[collapsible=icon]:px-2">
          {visibleGroups.map((group, gi) => (
            <div key={group.heading} className={cn(gi === 0 ? "mt-0" : "mt-5")}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground group-data-[collapsible=icon]:hidden">
                {group.heading}
              </div>
              <ul className="space-y-1">
                {group.items.map((item, ii) => renderItem(item, gi, ii))}
              </ul>
            </div>
          ))}
        </SidebarContent>
      </Sidebar>
    </>
  );
}
