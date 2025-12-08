import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronRight, ArrowLeft, Home, Search } from "lucide-react";
import NotificationBell from "@/components/alerts/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import CommandPalette from "@/components/CommandPalette";

export function TopBar() {
  const { user, profile, signOut } = useAuth();
  const { open: sidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const isOnDashboard = location.pathname === '/';

  return (
    <>
      <header className={cn(
        "fixed top-0 right-0 z-40 border-b border-border/30",
        "bg-background/95 backdrop-blur-md",
        "shadow-sm transition-all duration-300",
        sidebarOpen ? "left-[240px]" : "left-[56px]"
      )}>
        <div className="flex h-12 items-center justify-between px-6">
          {/* Left Side - Back Button + Brand */}
          <div className="flex items-center gap-3">
            {/* Back Button - hidden on dashboard */}
            {!isOnDashboard && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            <h1 className="text-base font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Hatchery Pro
            </h1>
          </div>

          {/* Right Side - Search, Dashboard Icon, Notifications & User */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="h-8 px-3 gap-2 text-muted-foreground hover:text-foreground border-border/50 hover:border-border"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Search...</span>
              <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Dashboard Home Icon */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className={cn(
                "h-9 w-9 hover:bg-primary/10 hover:text-primary",
                isOnDashboard && "bg-primary/10 text-primary"
              )}
              title="Go to Dashboard"
            >
              <Home className="h-4 w-4" strokeWidth={1.5} />
            </Button>

            {/* Notification Bell */}
            <div className="relative">
              <NotificationBell />
            </div>

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button 
                    variant="ghost" 
                    className={cn(
                      "relative h-9 w-9 rounded-full",
                      "hover:ring-2 hover:ring-primary/20 transition-all duration-200",
                      "hover:scale-105"
                    )}
                  >
                    <Avatar className="h-8 w-8 ring-1 ring-border shadow-sm">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-primary/10 to-primary/20 text-primary font-medium text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-64 mr-4" 
                  align="end"
                  side="bottom"
                  sideOffset={8}
                >
                  <DropdownMenuItem 
                    className="flex items-center p-3 focus:bg-accent/50 cursor-pointer"
                    onClick={() => navigate('/profile')}
                  >
                    <User className="mr-3 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-sm font-medium">
                        {profile?.first_name && profile?.last_name 
                          ? `${profile.first_name} ${profile.last_name}`
                          : user.email
                        }
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="flex items-center p-3 text-red-600 focus:bg-red-50 focus:text-red-700 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="text-sm font-medium">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
