import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineQueue } from '@/lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';
import { useToast } from './use-toast';

type Operation = 'insert' | 'update' | 'upsert' | 'delete';

interface UseOfflineSubmitOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  invalidateQueries?: string[];
}

export function useOfflineSubmit(
  table: string,
  options: UseOfflineSubmitOptions = {}
) {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const submit = useCallback(
    async (data: Record<string, any>, operation: Operation = 'insert') => {
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
          // Queue for later sync
          await offlineQueue.add({
            table,
            operation,
            data,
          });

          toast({
            title: "Saved offline",
            description: "Data will sync when you're back online",
          });

          options.onSuccess?.();
          return null;
        }
      } catch (error: any) {
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
