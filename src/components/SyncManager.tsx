import React from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export function SyncManager() {
  const { pendingCount, isSyncing, sync, entries } = useOfflineQueue();
  const { isOnline } = useOnlineStatus();

  const failedCount = entries.filter(e => e.status === 'failed').length;

  if (pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all",
        failedCount > 0
          ? "bg-destructive text-destructive-foreground"
          : "bg-amber-500 text-white"
      )}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">
            Syncing {pendingCount} {pendingCount === 1 ? 'item' : 'items'}...
          </span>
        </>
      ) : (
        <>
          {isOnline ? (
            <Cloud className="h-4 w-4" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {failedCount > 0 ? (
              <>
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {failedCount} failed, {pendingCount - failedCount} pending
              </>
            ) : (
              `${pendingCount} ${pendingCount === 1 ? 'item' : 'items'} pending sync`
            )}
          </span>
          {isOnline && (
            <Button
              size="sm"
              variant="secondary"
              className="ml-2 h-7 px-2 text-xs"
              onClick={sync}
              disabled={isSyncing}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync now
            </Button>
          )}
        </>
      )}
    </div>
  );
}
