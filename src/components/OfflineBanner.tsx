import React, { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, Wifi, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();
  const queryClient = useQueryClient();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // When coming back online, show the "back online" message and trigger refetch
  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowBackOnline(true);
      setDismissed(false);
      
      // Invalidate key queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['flocks'] });
      queryClient.invalidateQueries({ queryKey: ['qa_monitoring'] });
      
      // Auto-hide the "back online" message after 3 seconds
      const timer = setTimeout(() => {
        setShowBackOnline(false);
        clearWasOffline();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline, queryClient, clearWasOffline]);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  // Don't show anything if online and not showing "back online" message
  if (isOnline && !showBackOnline) return null;

  // Don't show if dismissed (only for offline state)
  if (!isOnline && dismissed) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-300 animate-in slide-in-from-top",
        isOnline && showBackOnline
          ? "bg-primary text-primary-foreground"
          : "bg-amber-500 text-white"
      )}
    >
      {isOnline && showBackOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online. Syncing latest data...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Showing cached data.</span>
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 p-1 hover:bg-amber-600 rounded-full transition-colors"
            aria-label="Dismiss offline notification"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
};
