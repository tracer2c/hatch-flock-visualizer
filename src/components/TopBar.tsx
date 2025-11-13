import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, GraduationCap, CheckCircle2, ChevronRight } from "lucide-react";
import NotificationBell from "@/components/alerts/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useNavigate } from "react-router-dom";

export function TopBar() {
  const { user, profile, signOut } = useAuth();
  const { open: sidebarOpen } = useSidebar();
  const { viewMode, setViewMode, isTrainingMode } = useViewMode();
  const navigate = useNavigate();

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <header className={cn(
      "sticky top-0 z-30 w-full border-b border-border/30",
      "bg-background/90 backdrop-blur-md",
      "shadow-sm"
    )}>
      <div className={cn(
        "flex h-12 items-center justify-between pr-6 transition-all duration-300",
        sidebarOpen ? "pl-20" : "pl-6"
      )}>
        {/* Left Side - Brand and Mode Toggle */}
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Hatchery Pro
          </h1>
          
          {/* Training/Production Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg border bg-card/50 shadow-sm">
            {isTrainingMode ? (
              <GraduationCap className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            <span className="text-xs font-medium whitespace-nowrap">
              {isTrainingMode ? '🎓 Training' : '✓ Production'}
            </span>
            <Switch
              checked={isTrainingMode}
              onCheckedChange={(checked) => setViewMode(checked ? 'dummy' : 'original')}
              className="ml-1 scale-75"
            />
          </div>
        </div>

        {/* Right Side - Notifications & User */}
        <div className="flex items-center gap-2">
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
  );
}