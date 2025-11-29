import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  FileInput, 
  CheckSquare, 
  Settings, 
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Home,
  Workflow,
  ChevronDown,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Upload,
  Activity
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useIsTablet } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: Home,
    requiresAuth: true
  },
  {
    path: '/data-entry',
    label: 'Data Entry',
    icon: FileInput,
    requiresAuth: true
  },
  {
    path: '/bulk-import',
    label: 'Bulk Import',
    icon: Upload,
    requiresAuth: true
  },
  {
    path: '/embrex-data-sheet',
    label: 'Data Sheet',
    icon: FileSpreadsheet,
    requiresAuth: true
  },
  {
    path: '/embrex-timeline',
    label: 'Timeline',
    icon: TrendingUp,
    requiresAuth: true
  },
  {
    path: '/live-tracking',
    label: 'Live Tracking',
    icon: Activity,
    requiresAuth: true
  },
  {
    path: '/checklist',
    label: 'Daily Tasks',
    icon: CheckSquare,
    requiresAuth: true
  },
  {
    path: '/chat',
    label: 'Smart Analytics',
    icon: MessageSquare,
    requiresAuth: true
  },
  {
    path: '/management',
    label: 'Management',
    icon: Settings,
    requiresAuth: true,
    requiredRole: 'company_admin' as const
  }
];

const advancedAnalyticsItems = [
  {
    path: '/comparison-model',
    label: 'Comparison Model',
    icon: BarChart3,
    requiresAuth: true,
    requiredRole: undefined
  },
  {
    path: '/process-flow',
    label: 'Process Flow',
    icon: Workflow,
    requiresAuth: true,
    requiredRole: undefined
  },
  {
    path: '/house-flow',
    label: 'House Flow',
    icon: Workflow,
    requiresAuth: true,
    requiredRole: undefined
  }
];

export function ModernSidebar() {
  const { open, setOpen, toggleSidebar, isMobile: isMobileContext, openMobile } = useSidebar();
  const collapsed = isMobileContext ? !openMobile : !open;
  const { user, hasRole } = useAuth();
  const { viewMode } = useViewMode();
  const location = useLocation();
  const currentPath = location.pathname;
  const previousSidebarState = useRef<boolean>(open);
  const isTablet = useIsTablet();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [toggleSidebar]);

  // Swipe gesture handlers for touch devices
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const currentOpen = isMobileContext ? openMobile : open;
    
    if (isLeftSwipe && currentOpen) {
      toggleSidebar();
    }
    if (isRightSwipe && !currentOpen && touchStart < 50) {
      toggleSidebar();
    }
  };

  const visibleNavItems = navigationItems.filter(item => {
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (item.requiredRole) {
      return hasRole(item.requiredRole);
    }
    return true;
  });

  const visibleAdvancedItems = advancedAnalyticsItems.filter(item => {
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (item.requiredRole) {
      return hasRole(item.requiredRole);
    }
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const hasActiveAdvancedItem = visibleAdvancedItems.some(item => isActive(item.path));

  return (
    <>
      {/* Overlay backdrop for tablet/mobile */}
      {(isMobileContext ? openMobile : open) && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Simple Toggle Button */}
      <Button
        variant="outline"
        size="touch-lg"
        className={cn(
          "fixed top-4 left-4 z-[100] rounded-lg bg-background/80",
          "border-2 border-border/50 shadow-lg",
          "transition-all duration-300",
          "hover:bg-accent/50",
          "cursor-pointer touch-manipulation"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSidebar();
        }}
        title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
      >
        {collapsed ? (
          <PanelLeft className="h-6 w-6 pointer-events-none" />
        ) : (
          <PanelLeftClose className="h-6 w-6 pointer-events-none" />
        )}
      </Button>

      <Sidebar
        side="left"
        variant="sidebar" 
        collapsible="offcanvas"
        className={cn(
          "border-r border-border/30 bg-background/95",
          "transition-all duration-300"
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <SidebarContent className="pt-16 px-2">

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center rounded-lg transition-all duration-200 touch-manipulation",
                          collapsed ? "justify-center p-3 w-11 h-11 min-h-[44px]" : "gap-3 px-3 py-3 min-h-[44px]",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-accent text-muted-foreground hover:text-foreground active:bg-accent/80"
                        )}
                      >
                        <NavLink
                          to={item.path}
                          className="flex items-center w-full h-full"
                        >
                          <Icon className={cn(
                            "flex-shrink-0 transition-colors",
                            collapsed ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          
                          {!collapsed && (
                            <span className="ml-3 text-sm font-medium truncate">
                              {item.label}
                            </span>
                          )}

                          {/* Active indicator for collapsed state */}
                          {active && collapsed && (
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* Advanced Analytics Dropdown */}
                <SidebarMenuItem>
                  <Collapsible
                    defaultOpen={hasActiveAdvancedItem}
                    className="group/collapsible"
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={collapsed ? "Advanced Analytics" : undefined}
                          className={cn(
                            "group relative flex items-center rounded-lg transition-all duration-200 touch-manipulation",
                            collapsed ? "justify-center p-3 w-11 h-11 min-h-[44px]" : "gap-3 px-3 py-3 min-h-[44px]",
                            hasActiveAdvancedItem
                              ? "bg-accent text-foreground"
                              : "hover:bg-accent text-muted-foreground hover:text-foreground active:bg-accent/80"
                          )}
                        >
                          <TrendingUp className={cn(
                            "flex-shrink-0 transition-colors",
                            collapsed ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          
                          {!collapsed && (
                            <>
                              <span className="ml-3 text-sm font-medium truncate">
                                Advanced Analytics
                              </span>
                              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}

                          {/* Active indicator for collapsed state */}
                          {hasActiveAdvancedItem && collapsed && (
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      {!collapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {visibleAdvancedItems.map((item) => {
                              const Icon = item.icon;
                              const active = isActive(item.path);
                              
                              return (
                                <SidebarMenuSubItem key={item.path}>
                                   <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={item.path}
                                       className={cn(
                                         "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation min-h-[44px]",
                                         active
                                           ? "bg-black text-white shadow-sm"
                                           : "hover:bg-accent text-muted-foreground hover:text-foreground active:bg-accent/80"
                                       )}
                                    >
                                      <Icon className="h-4 w-4 flex-shrink-0" />
                                      <span className="text-sm truncate">
                                        {item.label}
                                      </span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Version Footer */}
          <div className="mt-auto pt-4">
            {!collapsed ? (
              <div className="px-3 py-2 text-center">
                <span className="text-xs text-muted-foreground">v1.1</span>
              </div>
            ) : (
              <div className="px-2 py-2 text-center">
                <span className="text-xs text-muted-foreground">1.1</span>
              </div>
            )}
          </div>

        </SidebarContent>
      </Sidebar>
    </>
  );
}