import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, QueuedEntry } from '@/lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';
import { useToast } from './use-toast';

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [entries, setEntries] = useState<QueuedEntry[]>([]);
  const { isOnline } = useOnlineStatus();
  const { toast } = useToast();

  const refreshQueue = useCallback(async () => {
    const count = await offlineQueue.getCount();
    const allEntries = await offlineQueue.getAll();
    setPendingCount(count);
    setEntries(allEntries);
  }, []);

  const sync = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    const count = await offlineQueue.getCount();
    if (count === 0) return;

    setIsSyncing(true);
    
    try {
      const result = await offlineQueue.syncAll();
      
      if (result.success > 0) {
        toast({
          title: "Data synced",
          description: `Successfully synced ${result.success} ${result.success === 1 ? 'entry' : 'entries'}`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Sync partially failed",
          description: `${result.failed} ${result.failed === 1 ? 'entry' : 'entries'} failed to sync`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync offline data. Will retry later.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      await refreshQueue();
    }
  }, [isSyncing, isOnline, toast, refreshQueue]);

  // Refresh queue on mount and when online status changes
  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      // Small delay to ensure connection is stable
      const timeout = setTimeout(() => {
        sync();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, pendingCount, isSyncing, sync]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(refreshQueue, 5000);
    return () => clearInterval(interval);
  }, [refreshQueue]);

  return {
    pendingCount,
    isSyncing,
    entries,
    sync,
    refreshQueue,
  };
}
