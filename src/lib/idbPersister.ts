import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const CACHE_KEY = 'hatchery-react-query-cache';

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(CACHE_KEY, client);
      } catch (error) {
        console.error('Failed to persist query client:', error);
      }
    },
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        return await get<PersistedClient>(CACHE_KEY);
      } catch (error) {
        console.error('Failed to restore query client:', error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(CACHE_KEY);
      } catch (error) {
        console.error('Failed to remove query client:', error);
      }
    },
  };
}
