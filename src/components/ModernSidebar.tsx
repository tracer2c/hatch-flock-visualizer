import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  FileInput, 
  CheckSquare, 
  Settings, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Home
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
    description: 'Overview & Analytics',
    requiresAuth: true,
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    path: '/data-entry',
    label: 'Data Entry',
    icon: FileInput,
    description: 'Input Operations',
    requiresAuth: true,
    gradient: 'from-green-500 to-green-600'
  },
  {
    path: '/checklist',
    label: 'Daily Tasks',
    icon: CheckSquare,
    description: 'Track Progress',
    requiresAuth: true,
    gradient: 'from-orange-500 to-orange-600'
  },
  {
    path: '/chat',
    label: 'Smart Analytics',
    icon: MessageSquare,
    description: 'AI Insights',
    requiresAuth: true,
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    path: '/management',
    label: 'Management',
    icon: Settings,
    description: 'System Config',
    requiresAuth: true,
    requiredRole: 'company_admin' as const,
    gradient: 'from-red-500 to-red-600'
  }
];

export function ModernSidebar() {
  const { open, setOpen } = useSidebar();
  const collapsed = !open;
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

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
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
      className={cn(
        "border-r border-border/50 bg-gradient-to-b from-background to-muted/20",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-72"
      )}
    >
      {/* Toggle Button */}
      <div className="absolute -right-3 top-6 z-50">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-6 w-6 rounded-full bg-background border-2 border-border",
            "shadow-lg hover:shadow-xl transition-all duration-200",
            "hover:scale-110"
          )}
          onClick={() => setOpen(!open)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      <SidebarContent className="p-4">
        {/* Brand Section */}
        <div className={cn(
          "mb-8 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5",
          "border border-primary/20 backdrop-blur-sm",
          "transition-all duration-300"
        )}>
          {!collapsed ? (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Hatchery Pro
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Smart Operations
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-xs font-semibold text-muted-foreground uppercase tracking-wider",
            collapsed && "sr-only"
          )}>
            Navigation
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-3 rounded-xl",
                          "transition-all duration-300 ease-out",
                          "hover:scale-[1.02] hover:shadow-lg",
                          active
                            ? cn(
                                "bg-gradient-to-r text-white shadow-lg",
                                `bg-gradient-to-r ${item.gradient}`,
                                "shadow-primary/25"
                              )
                            : "hover:bg-accent/50 text-foreground/80 hover:text-foreground"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          "flex-shrink-0 w-5 h-5 flex items-center justify-center",
                          active && "text-white"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        {!collapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {item.label}
                            </div>
                            <div className={cn(
                              "text-xs transition-colors",
                              active 
                                ? "text-white/80" 
                                : "text-muted-foreground group-hover:text-foreground/60"
                            )}>
                              {item.description}
                            </div>
                          </div>
                        )}

                        {/* Active Indicator */}
                        {active && (
                          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full opacity-80" />
                        )}

                        {/* Glow Effect */}
                        {active && (
                          <div className={cn(
                            "absolute inset-0 rounded-xl opacity-20 blur-xl",
                            `bg-gradient-to-r ${item.gradient}`
                          )} />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto pt-4">
          {!collapsed && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                v2.0.1 • Modern UI
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}