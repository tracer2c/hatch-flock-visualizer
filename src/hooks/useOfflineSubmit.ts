import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineQueue, OfflineOperation, OfflineTable } from '@/lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';
import { useToast } from './use-toast';
import { activityLogger } from '@/services/activityLogger';

interface UseOfflineSubmitOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  invalidateQueries?: string[];
}

interface OfflineSubmitMeta {
  localId?: string;
  serverId?: string;
  batchId?: string;
  optimisticData?: Record<string, any>;
}

function isNetworkFailure(error: any): boolean {
  const message = String(error?.message || error?.details || error || '').toLowerCase();
  return error instanceof TypeError || message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network request failed');
}

export function useOfflineSubmit(
  table: OfflineTable,
  options: UseOfflineSubmitOptions = {}
) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const submit = useCallback(
    async (data: Record<string, any>, operation: OfflineOperation = 'insert', meta: OfflineSubmitMeta = {}) => {
      const queueOffline = async () => {
        const queueId = await offlineQueue.add({
          table,
          operation,
          payload: data,
          localId: meta.localId,
          serverId: meta.serverId,
          batchId: meta.batchId,
        });

        toast({
          title: "Saved offline",
          description: "Data will sync when you're back online",
        });

        options.onSuccess?.();
        queryClient.invalidateQueries({ queryKey: [table] });
        if (options.invalidateQueries) {
          options.invalidateQueries.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
          });
        }
        window.dispatchEvent(new CustomEvent('offline-queue-changed'));
        window.dispatchEvent(new CustomEvent('offline-record-queued', {
          detail: {
            queueId,
            table,
            operation,
            payload: data,
            optimisticData: meta.optimisticData || data,
            batchId: meta.batchId || data.batch_id || data.id,
          },
        }));
        return null;
      };

      try {
        if (isOnline) {
          // Direct Supabase operation
          let result;
          const tableName = table as any;

          switch (operation) {
            case 'insert':
              result = await supabase.from(tableName).insert(data).select();
              break;
            case 'update':
              if (data.id) {
                const { id, ...updateData } = data;
                result = await supabase.from(tableName).update(updateData).eq('id', id).select();
              } else {
                throw new Error('Update requires an id field');
              }
              break;
            case 'upsert':
              result = await supabase.from(tableName).upsert(data).select();
              break;
            case 'delete':
              if (data.id) {
                result = await supabase.from(tableName).delete().eq('id', data.id);
              } else {
                throw new Error('Delete requires an id field');
              }
              break;
          }

          if (result?.error) {
            throw result.error;
          }

          // Log the activity
          const resourceId = result?.data?.[0]?.id || data.id || '';
          const resourceName = data.batch_number || data.flock_name || data.machine_number || data.name || '';
          
          if (operation === 'insert') {
            activityLogger.logCreate(table, resourceId, resourceName, data).catch(console.error);
          } else if (operation === 'update' || operation === 'upsert') {
            activityLogger.logUpdate(table, resourceId, resourceName, {}, data).catch(console.error);
          } else if (operation === 'delete') {
            activityLogger.logDelete(table, resourceId, resourceName, data).catch(console.error);
          }

          // Invalidate related queries
          if (options.invalidateQueries) {
            options.invalidateQueries.forEach((queryKey) => {
              queryClient.invalidateQueries({ queryKey: [queryKey] });
            });
          }
          queryClient.invalidateQueries({ queryKey: [table] });

          toast({
            title: "Saved",
            description: "Data saved successfully",
          });

          options.onSuccess?.();
          return result?.data;
        } else {
          return queueOffline();
        }
      } catch (error: any) {
        if (isOnline && isNetworkFailure(error)) {
          console.warn('Network save failed; queued for offline sync:', error);
          return queueOffline();
        }

        console.error('Submit error:', error);
        
        toast({
          title: "Error",
          description: error.message || "Failed to save data",
          variant: "destructive",
        });

        options.onError?.(error);
        throw error;
      }
    },
    [isOnline, table, queryClient, toast, options]
  );

  return { submit, isOnline };
}
