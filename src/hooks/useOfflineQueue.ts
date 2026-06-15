import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { offlineQueue, QueuedEntry } from '@/lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';
import { useToast } from './use-toast';

function isNetworkErrorMessage(message?: string) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed');
}

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [entries, setEntries] = useState<QueuedEntry[]>([]);
  const { isOnline } = useOnlineStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const nextAutoSyncAt = useRef(0);

  const refreshQueue = useCallback(async () => {
    const count = await offlineQueue.getCount();
    const allEntries = await offlineQueue.getAll();
    setPendingCount(count);
    setEntries(allEntries);
  }, []);

  const sync = useCallback(async (options?: { silentNetworkFailure?: boolean }) => {
    if (isSyncing || !isOnline) return;

    const count = await offlineQueue.getCount();
    if (count === 0) return;

    setIsSyncing(true);
    
    try {
      const result = await offlineQueue.syncAll();
      
      if (result.success > 0) {
        queryClient.invalidateQueries({ queryKey: ['houses'] });
        queryClient.invalidateQueries({ queryKey: ['batches'] });
        queryClient.invalidateQueries({ queryKey: ['egg_pack_quality'] });
        queryClient.invalidateQueries({ queryKey: ['fertility_analysis'] });
        queryClient.invalidateQueries({ queryKey: ['residue_analysis'] });
        queryClient.invalidateQueries({ queryKey: ['qa_monitoring'] });
        queryClient.invalidateQueries({ queryKey: ['recent-qa-entries'] });
        queryClient.invalidateQueries({ queryKey: ['specific_gravity_tests'] });
        queryClient.invalidateQueries({ queryKey: ['weight_tracking'] });
        queryClient.invalidateQueries({ queryKey: ['dataCounts'] });
        toast({
          title: "Data synced",
          description: `Successfully synced ${result.success} ${result.success === 1 ? 'entry' : 'entries'}`,
        });
      }
      
      if (result.failed > 0) {
        const latestEntries = await offlineQueue.getAll();
        const failedEntries = latestEntries.filter(entry => entry.status === 'failed');
        const failedBecauseNetwork = failedEntries.length > 0 && failedEntries.every(entry => isNetworkErrorMessage(entry.lastError || entry.errorMessage));

        if (failedBecauseNetwork) {
          nextAutoSyncAt.current = Date.now() + 60_000;
        }

        if (!(options?.silentNetworkFailure && failedBecauseNetwork)) {
          const firstError = failedEntries.find(entry => entry.lastError || entry.errorMessage)?.lastError ||
            failedEntries.find(entry => entry.lastError || entry.errorMessage)?.errorMessage;
          toast({
            title: failedBecauseNetwork ? "Still offline" : "Sync partially failed",
            description: failedBecauseNetwork
              ? `${result.failed} ${result.failed === 1 ? 'entry is' : 'entries are'} saved locally and will retry when the connection is back.`
              : firstError
                ? `${result.failed} ${result.failed === 1 ? 'entry' : 'entries'} failed: ${firstError}`
                : `${result.failed} ${result.failed === 1 ? 'entry' : 'entries'} failed to sync`,
            variant: failedBecauseNetwork ? "default" : "destructive",
          });
        }
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
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }
  }, [isSyncing, isOnline, toast, refreshQueue, queryClient]);

  // Refresh queue on mount and when online status changes
  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing && Date.now() >= nextAutoSyncAt.current) {
      // Small delay to ensure connection is stable
      const timeout = setTimeout(() => {
        sync({ silentNetworkFailure: true });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, pendingCount, isSyncing, sync]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(refreshQueue, 5000);
    window.addEventListener('offline-queue-changed', refreshQueue);
    return () => {
      clearInterval(interval);
      window.removeEventListener('offline-queue-changed', refreshQueue);
    };
  }, [refreshQueue]);

  return {
    pendingCount,
    isSyncing,
    entries,
    sync,
    refreshQueue,
  };
}
