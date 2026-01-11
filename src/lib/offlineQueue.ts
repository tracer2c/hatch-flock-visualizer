import { get, set, del, keys } from 'idb-keyval';
import { supabase } from '@/integrations/supabase/client';

export interface QueuedEntry {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  data: Record<string, any>;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

const QUEUE_PREFIX = 'offline-queue-';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const offlineQueue = {
  add: async (entry: Omit<QueuedEntry, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<string> => {
    const id = generateId();
    const queuedEntry: QueuedEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    await set(`${QUEUE_PREFIX}${id}`, queuedEntry);
    return id;
  },

  get: async (id: string): Promise<QueuedEntry | undefined> => {
    return await get<QueuedEntry>(`${QUEUE_PREFIX}${id}`);
  },

  getAll: async (): Promise<QueuedEntry[]> => {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(QUEUE_PREFIX)
    );
    
    const entries: QueuedEntry[] = [];
    for (const key of queueKeys) {
      const entry = await get<QueuedEntry>(key as string);
      if (entry) {
        entries.push(entry);
      }
    }
    
    return entries.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  update: async (id: string, updates: Partial<QueuedEntry>): Promise<void> => {
    const existing = await get<QueuedEntry>(`${QUEUE_PREFIX}${id}`);
    if (existing) {
      await set(`${QUEUE_PREFIX}${id}`, { ...existing, ...updates });
    }
  },

  remove: async (id: string): Promise<void> => {
    await del(`${QUEUE_PREFIX}${id}`);
  },

  getCount: async (): Promise<number> => {
    const entries = await offlineQueue.getAll();
    return entries.filter(e => e.status === 'pending' || e.status === 'failed').length;
  },

  syncOne: async (entry: QueuedEntry): Promise<boolean> => {
    try {
      await offlineQueue.update(entry.id, { status: 'syncing' });
      
      let result;
      const tableName = entry.table as any;
      
      switch (entry.operation) {
        case 'insert':
          result = await supabase.from(tableName).insert(entry.data);
          break;
        case 'update':
          if (entry.data.id) {
            const { id, ...updateData } = entry.data;
            result = await supabase.from(tableName).update(updateData).eq('id', id);
          } else {
            throw new Error('Update requires an id field');
          }
          break;
        case 'upsert':
          result = await supabase.from(tableName).upsert(entry.data);
          break;
        case 'delete':
          if (entry.data.id) {
            result = await supabase.from(tableName).delete().eq('id', entry.data.id);
          } else {
            throw new Error('Delete requires an id field');
          }
          break;
      }

      if (result?.error) {
        throw result.error;
      }

      await offlineQueue.remove(entry.id);
      return true;
    } catch (error: any) {
      await offlineQueue.update(entry.id, {
        status: 'failed',
        retryCount: entry.retryCount + 1,
        errorMessage: error.message || 'Unknown error',
      });
      return false;
    }
  },

  syncAll: async (): Promise<{ success: number; failed: number }> => {
    const entries = await offlineQueue.getAll();
    const pendingEntries = entries.filter(e => e.status === 'pending' || e.status === 'failed');
    
    let success = 0;
    let failed = 0;

    for (const entry of pendingEntries) {
      const result = await offlineQueue.syncOne(entry);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  },

  clear: async (): Promise<void> => {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(QUEUE_PREFIX)
    );
    
    for (const key of queueKeys) {
      await del(key as string);
    }
  },
};
