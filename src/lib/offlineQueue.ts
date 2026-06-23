import { del, get, keys, set } from 'idb-keyval';
import { supabase } from '@/integrations/supabase/client';
import { getOfflineData } from './offlineDataCache';

export type OfflineTable = 'egg_pack_quality' | 'fertility_analysis' | 'residue_analysis' | 'batches' | (string & {});
export type OfflineOperation = 'insert' | 'update' | 'upsert' | 'delete';
export type OfflineStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict_applied';

export interface QueuedEntry {
  id: string;
  table: OfflineTable;
  operation: OfflineOperation;
  payload: Record<string, any>;
  data: Record<string, any>;
  localId: string;
  serverId?: string;
  batchId?: string;
  userId?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
  status: OfflineStatus;
  retryCount: number;
  lastError?: string;
  errorMessage?: string;
}

export interface QueueInput {
  table: OfflineTable;
  operation: OfflineOperation;
  payload?: Record<string, any>;
  data?: Record<string, any>;
  localId?: string;
  serverId?: string;
  batchId?: string;
  userId?: string;
  companyId?: string;
}

const QUEUE_PREFIX = 'offline-queue-';
const COMPLETED_PREFIX = 'offline-completed-';
const DEAD_PREFIX = 'offline-dead-';
const MAX_COMPLETED_ENTRIES = 100;
const MAX_RETRIES = 5;
const COMPANY_SCOPED_TABLES = new Set([
  'batches',
  'qa_monitoring',
  'specific_gravity_tests',
  'weight_tracking',
  'machine_transfers',
  'house_machine_allocations',
]);
const UPSERT_CONFLICT_TARGETS: Record<string, string> = {
  fertility_analysis: 'batch_id',
  residue_analysis: 'batch_id',
  weight_tracking: 'batch_id,check_date,check_day',
};

// QA types that require a second insert into qa_position_linkage after qa_monitoring is created
const QA_TYPES_WITH_LINKAGE = new Set([
  'machine_level_18point',
  'machine_wide',
  'generic',
  'candling_multi',
]);

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function sanitizePayload(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

async function getCurrentIdentity() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { userId: undefined, companyId: undefined };

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.company_id) {
      return { userId: user.id, companyId: profile.company_id };
    }
  } catch (error) {
    console.warn('Could not fetch live profile during sync; using cached identity if available.', error);
  }

  const cachedProfile = await getOfflineData<{ id: string; company_id?: string }>('current-user-profile');
  return {
    userId: user.id,
    companyId: cachedProfile?.id === user.id ? cachedProfile.company_id : undefined,
  };
}

function addSyncMetadata(entry: QueuedEntry, identity: { userId?: string; companyId?: string }): QueuedEntry {
  const payload = sanitizePayload(entry.payload || entry.data || {});
  const companyId = entry.companyId || payload.company_id || identity.companyId;
  const needsCompanyId = COMPANY_SCOPED_TABLES.has(String(entry.table));

  return {
    ...entry,
    userId: entry.userId || identity.userId,
    companyId,
    payload: needsCompanyId && companyId && !payload.company_id
      ? { ...payload, company_id: companyId }
      : payload,
    data: needsCompanyId && companyId && !payload.company_id
      ? { ...payload, company_id: companyId }
      : payload,
  };
}

async function pruneCompletedEntries() {
  const allKeys = await keys();
  const completedKeys = allKeys.filter(
    (key) => typeof key === 'string' && key.startsWith(COMPLETED_PREFIX)
  ) as string[];

  if (completedKeys.length <= MAX_COMPLETED_ENTRIES) return;

  const completed = await Promise.all(
    completedKeys.map(async (key) => ({ key, entry: await get<QueuedEntry>(key) }))
  );

  const sorted = completed
    .filter((item): item is { key: string; entry: QueuedEntry } => Boolean(item.entry))
    .sort((a, b) => new Date(a.entry.updatedAt).getTime() - new Date(b.entry.updatedAt).getTime());

  for (const item of sorted.slice(0, Math.max(0, sorted.length - MAX_COMPLETED_ENTRIES))) {
    await del(item.key);
  }
}

async function syncQAPositionLinkage(
  qaType: string,
  qaMonitoringId: string,
  rawPayload: Record<string, any>
): Promise<void> {
  let linkageRecords: Record<string, any>[] = [];

  if (qaType === 'machine_level_18point') {
    // Rebuild 18 position rows from stored occupancy array + temperatures map
    const occupancyArray: Array<{ position: string; flock_id?: string; batch_id?: string; set_id?: string }> =
      rawPayload._positionOccupancy || [];
    const occupancyByPos = new Map(occupancyArray.map(o => [o.position, o]));
    const temperatures: Record<string, number> = rawPayload.temperatures || {};

    // Derive position keys from temperature field names (temp_front_top_left -> front_top_left)
    const positionKeys = Object.keys(temperatures)
      .filter(k => k.startsWith('temp_'))
      .map(k => k.slice(5));

    linkageRecords = positionKeys.map(posKey => {
      const occupancy = occupancyByPos.get(posKey);
      return {
        qa_monitoring_id: qaMonitoringId,
        position: posKey,
        temperature: temperatures[`temp_${posKey}`] || 0,
        linkage_type: 'position',
        multi_setter_set_id: occupancy?.set_id || null,
        resolved_flock_id: occupancy?.flock_id || null,
        resolved_batch_id: occupancy?.batch_id || null,
      };
    });
  } else {
    // machine_wide, generic, candling_multi — one row per flock
    const uniqueFlocks: Array<{ flock_id: string; batch_id: string | null }> =
      rawPayload._uniqueFlocks || [];
    linkageRecords = uniqueFlocks.map(flock => ({
      qa_monitoring_id: qaMonitoringId,
      position: 'machine_wide',
      temperature: 0,
      linkage_type: 'machine_wide',
      multi_setter_set_id: null,
      resolved_flock_id: flock.flock_id,
      resolved_batch_id: flock.batch_id,
    }));
  }

  if (linkageRecords.length === 0) return;

  const { error } = await supabase.from('qa_position_linkage').insert(linkageRecords as any);
  if (error) {
    // Non-fatal: qa_monitoring row landed; log and continue
    console.warn('[offlineQueue] qa_position_linkage insert failed during sync:', error.message);
  }
}

export const offlineQueue = {
  add: async (entry: QueueInput): Promise<string> => {
    const now = new Date().toISOString();
    const id = generateId();
    const payload = sanitizePayload(entry.payload || entry.data || {});
    const queuedEntry: QueuedEntry = {
      id,
      table: entry.table,
      operation: entry.operation,
      payload,
      data: payload,
      localId: entry.localId || payload.id || id,
      serverId: entry.serverId || payload.id,
      batchId: entry.batchId || payload.batch_id || payload.id,
      userId: entry.userId,
      companyId: entry.companyId,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      retryCount: 0,
    };

    await set(`${QUEUE_PREFIX}${id}`, queuedEntry);
    return id;
  },

  get: async (id: string): Promise<QueuedEntry | undefined> => {
    return get<QueuedEntry>(`${QUEUE_PREFIX}${id}`);
  },

  getAll: async (): Promise<QueuedEntry[]> => {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(QUEUE_PREFIX)
    ) as string[];

    const entries = await Promise.all(queueKeys.map((key) => get<QueuedEntry>(key)));

    return entries
      .filter((entry): entry is QueuedEntry => Boolean(entry))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  getCompleted: async (): Promise<QueuedEntry[]> => {
    const allKeys = await keys();
    const completedKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(COMPLETED_PREFIX)
    ) as string[];

    const entries = await Promise.all(completedKeys.map((key) => get<QueuedEntry>(key)));

    return entries
      .filter((entry): entry is QueuedEntry => Boolean(entry))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  update: async (id: string, updates: Partial<QueuedEntry>): Promise<void> => {
    const existing = await get<QueuedEntry>(`${QUEUE_PREFIX}${id}`);
    if (existing) {
      await set(`${QUEUE_PREFIX}${id}`, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }
  },

  remove: async (id: string): Promise<void> => {
    await del(`${QUEUE_PREFIX}${id}`);
  },

  getCount: async (): Promise<number> => {
    const entries = await offlineQueue.getAll();
    return entries.filter((entry) => entry.status === 'pending' || entry.status === 'failed').length;
  },

  getPendingForRecord: async (table: OfflineTable, recordId?: string, batchId?: string): Promise<QueuedEntry[]> => {
    const entries = await offlineQueue.getAll();
    return entries.filter((entry) => {
      if (entry.table !== table) return false;
      if (!['pending', 'failed', 'syncing'].includes(entry.status)) return false;
      if (recordId && entry.localId !== recordId && entry.serverId !== recordId && entry.payload.id !== recordId) return false;
      if (batchId && entry.batchId !== batchId && entry.payload.batch_id !== batchId) return false;
      return true;
    });
  },

  syncOne: async (entry: QueuedEntry): Promise<boolean> => {
    try {
      await offlineQueue.update(entry.id, { status: 'syncing', lastError: undefined, errorMessage: undefined });

      const rawPayload = sanitizePayload(entry.payload || entry.data);

      // Strip internal offline metadata — never sent to Supabase
      const {
        _qaType,
        _positionOccupancy,
        _uniqueFlocks,
        _qaData,
        _genericQaType,
        _candlingData,
        ...stripped
      } = rawPayload as Record<string, any>;

      // For machine-level 18-point temps, spread the nested temperatures object
      // into individual columns (temp_front_top_left, etc.) that qa_monitoring expects
      let payload: Record<string, any>;
      if (_qaType === 'machine_level_18point' && stripped.temperatures) {
        const { temperatures, ...rest } = stripped;
        payload = sanitizePayload({
          ...rest,
          ...temperatures,
          candling_results: JSON.stringify({ type: 'setter_temperature_18point', entry_mode: 'machine' }),
          entry_mode: 'machine',
        });
      } else if (_qaType === 'machine_wide') {
        payload = sanitizePayload({
          ...stripped,
          entry_mode: 'machine',
        });
      } else if (_qaType === 'generic' && _genericQaType) {
        payload = sanitizePayload({
          ...stripped,
          entry_mode: 'machine',
          candling_results: JSON.stringify({ type: _genericQaType, ...(_qaData || {}) }),
        });
      } else if (_qaType === 'candling_multi' && _candlingData) {
        payload = sanitizePayload({
          ...stripped,
          entry_mode: 'machine',
          candling_results: JSON.stringify({ type: 'candling', ..._candlingData }),
        });
      } else {
        payload = sanitizePayload(stripped);
      }

      const tableName = entry.table as any;
      let result;

      switch (entry.operation) {
        case 'insert':
          result = await supabase.from(tableName).insert(payload).select();
          break;
        case 'update': {
          const id = payload.id || entry.serverId;
          if (!id) throw new Error('Update requires an id field');
          const { id: _id, ...updateData } = payload;
          result = await supabase.from(tableName).update(updateData).eq('id', id).select();
          break;
        }
        case 'upsert':
          result = await supabase
            .from(tableName)
            .upsert(
              payload,
              UPSERT_CONFLICT_TARGETS[String(entry.table)]
                ? { onConflict: UPSERT_CONFLICT_TARGETS[String(entry.table)] }
                : undefined
            )
            .select();
          break;
        case 'delete': {
          const id = payload.id || entry.serverId;
          if (!id) throw new Error('Delete requires an id field');
          result = await supabase.from(tableName).delete().eq('id', id);
          break;
        }
      }

      if (result?.error) throw result.error;

      const qaMonitoringId: string | undefined = result?.data?.[0]?.id;

      // Two-step sync: after qa_monitoring insert, create qa_position_linkage rows
      if (
        tableName === 'qa_monitoring' &&
        _qaType &&
        QA_TYPES_WITH_LINKAGE.has(_qaType) &&
        qaMonitoringId
      ) {
        await syncQAPositionLinkage(_qaType, qaMonitoringId, rawPayload);
      }

      const now = new Date().toISOString();
      const syncedEntry: QueuedEntry = {
        ...entry,
        payload,
        data: payload,
        serverId: qaMonitoringId || entry.serverId || payload.id,
        status: entry.retryCount > 0 ? 'conflict_applied' : 'synced',
        updatedAt: now,
        lastError: undefined,
        errorMessage: undefined,
      };

      await set(`${COMPLETED_PREFIX}${entry.id}`, syncedEntry);
      await offlineQueue.remove(entry.id);
      await pruneCompletedEntries();
      return true;
    } catch (error: any) {
      const message = [
        error?.message,
        error?.details,
        error?.hint,
        error?.code,
      ].filter(Boolean).join(' | ') || 'Unknown sync error';

      const newRetryCount = entry.retryCount + 1;

      // Auto-discard after MAX_RETRIES — move to dead-letter so it stops blocking the queue
      if (newRetryCount >= MAX_RETRIES) {
        const deadEntry: QueuedEntry = {
          ...entry,
          status: 'failed',
          retryCount: newRetryCount,
          lastError: message,
          errorMessage: `Permanently failed after ${MAX_RETRIES} attempts: ${message}`,
          updatedAt: new Date().toISOString(),
        };
        await set(`${DEAD_PREFIX}${entry.id}`, deadEntry);
        await offlineQueue.remove(entry.id);
        console.warn(`[offlineQueue] Entry ${entry.id} moved to dead-letter after ${MAX_RETRIES} retries.`);
      } else {
        await offlineQueue.update(entry.id, {
          status: 'failed',
          retryCount: newRetryCount,
          lastError: message,
          errorMessage: message,
        });
      }

      return false;
    }
  },

  syncAll: async (): Promise<{ success: number; failed: number }> => {
    const identity = await getCurrentIdentity();
    const entries = await offlineQueue.getAll();
    const pendingEntries = entries.filter((entry) => entry.status === 'pending' || entry.status === 'failed');

    let success = 0;
    let failed = 0;

    for (const entry of pendingEntries) {
      const enrichedEntry = addSyncMetadata(entry, identity);
      const result = await offlineQueue.syncOne(enrichedEntry);
      if (result) success += 1;
      else failed += 1;
    }

    return { success, failed };
  },

  clear: async (): Promise<void> => {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(QUEUE_PREFIX)
    ) as string[];
    for (const key of queueKeys) {
      await del(key);
    }
  },

  // Move all currently-failed active entries to dead-letter and remove from queue
  clearFailed: async (): Promise<number> => {
    const entries = await offlineQueue.getAll();
    const failed = entries.filter(e => e.status === 'failed');
    for (const entry of failed) {
      const deadEntry: QueuedEntry = {
        ...entry,
        errorMessage: `Dismissed by user: ${entry.errorMessage || entry.lastError || 'unknown error'}`,
        updatedAt: new Date().toISOString(),
      };
      await set(`${DEAD_PREFIX}${entry.id}`, deadEntry);
      await offlineQueue.remove(entry.id);
    }
    return failed.length;
  },

  getDeadLetters: async (): Promise<QueuedEntry[]> => {
    const allKeys = await keys();
    const deadKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(DEAD_PREFIX)
    ) as string[];
    const entries = await Promise.all(deadKeys.map(k => get<QueuedEntry>(k)));
    return entries
      .filter((e): e is QueuedEntry => Boolean(e))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },
};
