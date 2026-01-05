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
  TrendingUp,
  FileSpreadsheet,
  ClipboardCheck
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
    path: '/qa-hub',
    label: 'QA Hub',
    icon: ClipboardCheck,
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


export function ModernSidebar() {
  const { open, setOpen, toggleSidebar, isMobile: isMobileContext, openMobile } = useSidebar();
  const collapsed = isMobileContext ? !openMobile : !open;
  const { user, hasRole } = useAuth();
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

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

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
          "border-r border-sidebar-border/50 bg-sidebar/95 backdrop-blur-md",
          "transition-all duration-300 shadow-xl"
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Sidebar Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-success to-accent" />
        
        <SidebarContent className="pt-16 px-3">

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
                          "group relative flex items-center rounded-xl transition-all duration-300 touch-manipulation",
                          collapsed ? "justify-center p-3 w-11 h-11 min-h-[44px]" : "gap-3 px-4 py-3 min-h-[44px]",
                          active
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                            : "hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground active:bg-sidebar-accent/80"
                        )}
                      >
                        <NavLink
                          to={item.path}
                          className="flex items-center w-full h-full"
                        >
                          <Icon className={cn(
                            "flex-shrink-0 transition-all duration-300",
                            collapsed ? "h-5 w-5" : "h-4 w-4",
                            active && "drop-shadow-sm"
                          )} />
                          
                          {!collapsed && (
                            <span className="ml-3 text-sm font-medium truncate">
                              {item.label}
                            </span>
                          )}

                          {/* Active indicator for collapsed state */}
                          {active && collapsed && (
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-primary to-success rounded-full shadow-lg" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Version Footer */}
          <div className="mt-auto pt-4 pb-2">
            {!collapsed ? (
              <div className="mx-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 text-center">
                <span className="text-xs font-medium text-sidebar-accent-foreground">v1.2</span>
              </div>
            ) : (
              <div className="mx-2 px-2 py-2 rounded-lg bg-sidebar-accent/50 text-center">
                <span className="text-xs font-medium text-sidebar-accent-foreground">1.2</span>
              </div>
            )}
          </div>

        </SidebarContent>
      </Sidebar>
    </>
  );
}
