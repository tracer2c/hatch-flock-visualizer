import { offlineQueue } from '@/lib/offlineQueue';
import {
  submitHouseLevelQA,
  submitMachineLevelQA,
  submitMachineWideQA,
  submitGenericQAWithLinkage,
  submitSpecificGravityTest,
  submitWeightTracking,
  submitCandlingQA,
  type MachineWideQARecord,
  type FlockLinkage,
} from './qaSubmissionService';
import { type OccupancyInfo } from '@/utils/setterPositionMapping';

interface OfflineSubmissionResult {
  success: boolean;
  offline?: boolean;
  qaMonitoringId?: string;
  error?: string;
}

/**
 * Offline-aware wrapper for house-level QA submissions
 */
export async function submitHouseLevelQAOffline(
  record: Parameters<typeof submitHouseLevelQA>[0],
  isOnline: boolean
): Promise<OfflineSubmissionResult> {
  if (isOnline) {
    const result = await submitHouseLevelQA(record);
    return { ...result, offline: false };
  }

  await offlineQueue.add({
    table: 'qa_monitoring',
    operation: 'insert',
    data: { ...record, entry_mode: 'house', _qaType: 'house_level' }
  });

  return { success: true, offline: true };
}

/**
 * Offline-aware wrapper for machine-level QA (18-point temps)
 */
export async function submitMachineLevelQAOffline(
  record: Parameters<typeof submitMachineLevelQA>[0],
  positionOccupancy: Map<string, OccupancyInfo>,
  isOnline: boolean
): Promise<OfflineSubmissionResult> {
  if (isOnline) {
    const result = await submitMachineLevelQA(record, positionOccupancy);
    return { ...result, offline: false };
  }

  // Convert Map to serializable format
  const occupancyArray = Array.from(positionOccupancy.entries()).map(([key, value]) => ({
    position: key,
    ...value
  }));

  await offlineQueue.add({
    table: 'qa_monitoring',
    operation: 'insert',
    data: {
      ...record,
      _qaType: 'machine_level_18point',
      _positionOccupancy: occupancyArray
    }
  });

  return { success: true, offline: true };
}

/**
 * Offline-aware wrapper for machine-wide QA (angles/humidity)
 */
export async function submitMachineWideQAOffline(
  record: MachineWideQARecord,
  uniqueFlocks: FlockLinkage[],
  isOnline: boolean
): Promise<OfflineSubmissionResult> {
  if (isOnline) {
    const result = await submitMachineWideQA(record, uniqueFlocks);
    return { ...result, offline: false };
  }

  await offlineQueue.add({
    table: 'qa_monitoring',
    operation: 'insert',
    data: {
      ...record,
      _qaType: 'machine_wide',
      _uniqueFlocks: uniqueFlocks
    }
  });

  return { success: true, offline: true };
}

/**
 * Offline-aware wrapper for generic QA with linkage
 */
export async function submitGenericQAOffline(
  machineId: string,
  inspectorName: string,
  checkDate: string,
  qaType: string,
  qaData: Record<string, any>,
  uniqueFlocks: FlockLinkage[],
  isOnline: boolean,
  notes?: string | null
): Promise<OfflineSubmissionResult> {
  if (isOnline) {
    const result = await submitGenericQAWithLinkage(
      machineId, inspectorName, checkDate, qaType, qaData, uniqueFlocks, notes
    );
    return { ...result, offline: false };
  }

  await offlineQueue.add({
    table: 'qa_monitoring',
    operation: 'insert',
    data: {
      machine_id: machineId,
      inspector_name: inspectorName,
      check_date: checkDate,
      notes,
      _qaType: 'generic',
      _genericQaType: qaType,
      _qaData: qaData,
      _uniqueFlocks: uniqueFlocks
    }
  });

  return { success: true, offline: true };
}

/**
 * Offline-aware wrapper for specific gravity tests
 */
export async function submitSpecificGravityOffline(
  data: Parameters<typeof submitSpecificGravityTest>[0],
  isOnline: boolean
): Promise<OfflineSubmissionResult> {
  if (isOnline) {
    const result = await submitSpecificGravityTest(data);
    return { ...result, offline: false };
  }

  await offlineQueue.add({
    table: 'specific_gravity_tests',
    operation: 'insert',
    data
  });

  return { success: true, offline: true };
}

/**
 * Offline-aware wrapper for weight tracking
 */
export async function submitWeightTrackingOffline(
  data: Parameters<typeof submitWeightTracking>[0],
  isOnline: boolean
): Promise<OfflineSubmissionResult> {
  if (isOnline) {
    const result = await submitWeightTracking(data);
    return { ...result, offline: false };
  }

  await offlineQueue.add({
    table: 'weight_tracking',
    operation: 'insert',
    data
  });

  return { success: true, offline: true };
}

/**
 * Offline-aware wrapper for candling QA
 */
export async function submitCandlingQAOffline(
  data: Parameters<typeof submitCandlingQA>[0],
  isOnline: boolean
): Promise<OfflineSubmissionResult> {
  if (isOnline) {
    const result = await submitCandlingQA(data);
    return { ...result, offline: false };
  }

  await offlineQueue.add({
    table: 'qa_monitoring',
    operation: 'insert',
    data: {
      ...data,
      _qaType: 'candling'
    }
  });

  return { success: true, offline: true };
}
