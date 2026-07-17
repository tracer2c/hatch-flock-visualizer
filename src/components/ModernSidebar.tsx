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
  PanelLeftClose,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
      {
        label: "Management",
        href: "/management",
        icon: Settings,
        featureKey: "management",
        items: [
          { label: "Hatcheries", href: "/management/hatcheries", icon: Building2 },
          { label: "Rooms", href: "/management/rooms", icon: Building2 },
          { label: "Machines", href: "/management/machines", icon: Cpu },
          { label: "Flocks", href: "/management/flocks", icon: Bird },
          { label: "Users", href: "/management/users", icon: UsersIcon },
          { label: "Reports", href: "/management/reports", icon: BarChart3 },
          { label: "Targets", href: "/management/targets", icon: Target },
        ],
      },
      { label: "What's New", href: "/changelogs", icon: Sparkles },
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
  const { user, profile } = useAuth() as any;
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

  const initials = (() => {
    const first = profile?.first_name?.[0] ?? "";
    const last = profile?.last_name?.[0] ?? "";
    const combined = (first + last).toUpperCase();
    if (combined) return combined;
    return (user?.email?.[0] ?? "?").toUpperCase();
  })();
  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user?.email ?? "";

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
              "group relative flex items-center gap-3 h-11 flex-1 rounded-xl px-3 text-[15px] transition-colors",
              "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:mx-auto",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-sidebar-foreground/80 hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {active && (
              <span className="absolute left-1 top-2 bottom-2 w-1 rounded-r-full bg-primary group-data-[collapsible=icon]:hidden" />
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
                "flex items-center justify-center w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-transform group-data-[collapsible=icon]:hidden",
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
        style={{ ["--sidebar-width" as any]: "264px", ["--sidebar-width-icon" as any]: "72px" }}
        className="border-r border-sidebar-border/60 bg-sidebar"
      >
        {/* Header */}
        <SidebarHeader className="h-20 shrink-0 flex-row items-center justify-between px-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-[17px] font-semibold text-foreground truncate group-data-[collapsible=icon]:hidden">
            Hatchery Pro
          </span>
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
        <SidebarContent className="flex-1 overflow-y-auto px-3 py-4 gap-0 group-data-[collapsible=icon]:px-2">
          {visibleGroups.map((group, gi) => (
            <div key={group.heading} className={cn(gi === 0 ? "mt-0" : "mt-6")}>
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground group-data-[collapsible=icon]:hidden">
                {group.heading}
              </div>
              <ul className="space-y-1">
                {group.items.map((item, ii) => renderItem(item, gi, ii))}
              </ul>
            </div>
          ))}
        </SidebarContent>

        {/* Fixed footer */}
        <SidebarFooter className="shrink-0 border-t border-sidebar-border/60 p-3 gap-2 group-data-[collapsible=icon]:px-2">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Support"
                className="h-11 px-3 rounded-xl gap-3 text-[15px] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:px-0"
              >
                <NavLink to="/support">
                  <LifeBuoy className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">Support</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Settings"
                className="h-11 px-3 rounded-xl gap-3 text-[15px] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:px-0"
              >
                <NavLink to="/management">
                  <Settings className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {user && (
            <>
              <div className="border-t border-sidebar-border/60 -mx-3 group-data-[collapsible=icon]:-mx-2" />
              <NavLink
                to="/profile"
                title={user.email || displayName}
                className="flex items-center gap-3 px-2 h-14 rounded-xl hover:bg-muted/60 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:mx-auto"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">View profile</span>
                </div>
              </NavLink>
            </>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
