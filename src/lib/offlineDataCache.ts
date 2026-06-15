import { get, set } from 'idb-keyval';

const CACHE_PREFIX = 'offline-data-cache-';

export async function cacheOfflineData<T>(key: string, data: T): Promise<T> {
  await set(`${CACHE_PREFIX}${key}`, {
    data,
    cachedAt: new Date().toISOString(),
  });
  return data;
}

export async function getOfflineData<T>(key: string): Promise<T | undefined> {
  const cached = await get<{ data: T; cachedAt: string }>(`${CACHE_PREFIX}${key}`);
  return cached?.data;
}

export async function fetchWithOfflineFallback<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const data = await fetcher();
    await cacheOfflineData(key, data);
    return data;
  } catch (error) {
    const cached = await getOfflineData<T>(key);
    if (cached !== undefined) return cached;
    throw error;
  }
}
