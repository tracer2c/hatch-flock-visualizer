import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  FileInput, 
  CheckSquare, 
  Settings, 
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Home
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
  const { open, setOpen } = useSidebar();
  const collapsed = !open;
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, setOpen]);

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
      {/* Floating Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-background/80 backdrop-blur-sm",
          "border-2 border-border/50 shadow-lg hover:shadow-xl",
          "transition-all duration-300 ease-out hover:scale-105",
          "hover:bg-accent/50 hover:border-primary/30"
        )}
        onClick={() => setOpen(!open)}
        title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
      >
        {collapsed ? (
          <PanelLeft className="h-5 w-5 transition-transform duration-300" />
        ) : (
          <PanelLeftClose className="h-5 w-5 transition-transform duration-300" />
        )}
      </Button>

      <Sidebar
        side="left"
        variant="sidebar" 
        collapsible="icon"
        className={cn(
          "border-r border-border/30 bg-background/95 backdrop-blur-sm",
          "transition-all duration-300 ease-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent className={cn("pt-16", collapsed ? "px-2" : "px-4")}>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.path}
                          className={cn(
                            "group relative flex items-center rounded-lg transition-all duration-200",
                            collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "hover:bg-accent text-muted-foreground hover:text-foreground"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <Icon className={cn(
                            "flex-shrink-0 transition-colors",
                            collapsed ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          
                          {!collapsed && (
                            <span className="text-sm font-medium truncate">
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