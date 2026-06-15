import React, { useCallback } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineQueue } from '@/lib/offlineQueue';
import { cn } from '@/lib/utils';

export function SyncManager() {
  const { pendingCount, isSyncing, sync, entries, refreshQueue } = useOfflineQueue();
  const { isOnline } = useOnlineStatus();

  const failedCount = entries.filter(e => e.status === 'failed').length;
  const pendingOnly = pendingCount - failedCount;

  const dismissFailed = useCallback(async () => {
    await offlineQueue.clearFailed();
    await refreshQueue();
    window.dispatchEvent(new CustomEvent('offline-queue-changed'));
  }, [refreshQueue]);

  if (pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg transition-all",
        failedCount > 0 && pendingOnly === 0
          ? "bg-destructive text-destructive-foreground"
          : failedCount > 0
          ? "bg-orange-600 text-white"
          : "bg-amber-500 text-white"
      )}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          <span className="text-sm font-medium">
            Syncing {pendingCount} {pendingCount === 1 ? 'item' : 'items'}...
          </span>
        </>
      ) : (
        <>
          {isOnline ? <Cloud className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}

          <span className="text-sm font-medium">
            {failedCount > 0 && pendingOnly === 0
              ? `${failedCount} failed to sync`
              : failedCount > 0
              ? `${failedCount} failed · ${pendingOnly} pending`
              : `${pendingCount} ${pendingCount === 1 ? 'item' : 'items'} pending sync`}
          </span>

          {/* Retry button — only when there are pending (non-failed) items or we want to retry failed */}
          {isOnline && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => sync()}
              disabled={isSyncing}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}

          {/* Dismiss button — only shown when there are failed entries */}
          {failedCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs opacity-80 hover:opacity-100"
              onClick={dismissFailed}
              title="Dismiss failed entries"
            >
              <X className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
          )}
        </>
      )}
    </div>
  );
}
