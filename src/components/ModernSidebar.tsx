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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  const { isMobile, openMobile, setOpenMobile, toggleSidebar } = useSidebar();
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
        style={{ ["--sidebar-width" as any]: "260px", ["--sidebar-width-icon" as any]: "3.5rem" }}
        className="border-r border-sidebar-border/50 bg-sidebar/95 backdrop-blur-md shadow-xl"
      >
        <SidebarHeader className="pt-14 pb-0 px-2 group-data-[collapsible=icon]:px-1.5">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto"
            >
              <PanelLeftClose className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
              <PanelLeftClose className="hidden h-4 w-4 rotate-180 group-data-[collapsible=icon]:block" />
            </button>
          </div>
        </SidebarHeader>
        <SidebarContent className="gap-0">

          {visibleGroups.map((group) => (
            <SidebarGroup key={group.heading} className="py-1">
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">
                {group.heading}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isParentActive(item);
                    const hasSubs = !!item.items?.length;
                    const isOpen = hasSubs ? expanded[item.href] ?? false : false;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <div className="flex items-stretch group-data-[collapsible=icon]:block">
                          <SidebarMenuButton
                            asChild
                            tooltip={item.label}
                            className={cn(
                              "group relative h-9 px-3 rounded-lg gap-3 text-sm flex-1 group-data-[collapsible=icon]:justify-center",
                              active
                                ? "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <NavLink to={item.href} end={item.href === "/"}>
                              {active && (
                                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary group-data-[collapsible=icon]:hidden" />
                              )}
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                            </NavLink>
                          </SidebarMenuButton>
                          {hasSubs && (
                            <button
                              type="button"
                              aria-label={isOpen ? "Collapse" : "Expand"}
                              onClick={() => toggle(item.href)}
                              className={cn(
                                "flex items-center justify-center w-7 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-transform group-data-[collapsible=icon]:hidden",
                                isOpen && "rotate-90"
                              )}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {hasSubs && isOpen && (
                          <SidebarMenuSub className="mt-0.5 ml-4 border-l border-sidebar-border/60 pl-2 gap-0.5">
                            {item.items!.map((sub) => {
                              const SubIcon = sub.icon;
                              const subActive = isSubActive(sub);
                              return (
                                <SidebarMenuSubItem key={sub.href}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={sub.href}
                                      className={cn(
                                        "h-8 px-2 rounded-md gap-2 text-sm",
                                        subActive
                                          ? "bg-primary/10 text-primary font-medium"
                                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                      )}
                                    >
                                      <SubIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="truncate">{sub.label}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/50 p-2 gap-1 group-data-[collapsible=icon]:px-1.5">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Support" className="h-9 px-3 rounded-lg gap-3 text-sm group-data-[collapsible=icon]:justify-center">
                <NavLink to="/support">
                  <LifeBuoy className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Support</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings" className="h-9 px-3 rounded-lg gap-3 text-sm group-data-[collapsible=icon]:justify-center">
                <NavLink to="/management">
                  <Settings className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {user && (
            <NavLink
              to="/profile"
              title={displayName}
              className="flex items-center gap-2.5 px-2 py-2 mt-1 rounded-lg hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-medium text-sidebar-foreground truncate">
                  {displayName}
                </span>
                {user.email && displayName !== user.email && (
                  <span className="text-[11px] text-muted-foreground truncate">
                    {user.email}
                  </span>
                )}
              </div>
            </NavLink>
          )}
        </SidebarFooter>
      </Sidebar>
    </>

  );
}
