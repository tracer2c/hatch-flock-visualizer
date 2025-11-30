import { supabase } from '@/integrations/supabase/client';
import { 
  ALL_POSITION_KEYS, 
  columnToPositionKey,
  type OccupancyInfo 
} from '@/utils/setterPositionMapping';

interface SubmissionResult {
  success: boolean;
  qaMonitoringId?: string;
  error?: string;
}

interface HouseLevelQARecord {
  batch_id: string;
  machine_id: string | null;
  inspector_name: string;
  check_date: string;
  check_time: string;
  day_of_incubation: number;
  temperature: number;
  humidity: number;
  notes?: string | null;
  // 18-point temperature fields
  temp_front_top_left?: number;
  temp_front_top_right?: number;
  temp_front_mid_left?: number;
  temp_front_mid_right?: number;
  temp_front_bottom_left?: number;
  temp_front_bottom_right?: number;
  temp_middle_top_left?: number;
  temp_middle_top_right?: number;
  temp_middle_mid_left?: number;
  temp_middle_mid_right?: number;
  temp_middle_bottom_left?: number;
  temp_middle_bottom_right?: number;
  temp_back_top_left?: number;
  temp_back_top_right?: number;
  temp_back_mid_left?: number;
  temp_back_mid_right?: number;
  temp_back_bottom_left?: number;
  temp_back_bottom_right?: number;
  // Averages
  temp_avg_overall?: number | null;
  temp_avg_front?: number | null;
  temp_avg_middle?: number | null;
  temp_avg_back?: number | null;
  // Candling results (JSON metadata)
  candling_results?: string;
}

interface MachineLevelQARecord {
  machine_id: string;
  inspector_name: string;
  check_date: string;
  check_time: string;
  day_of_incubation: number;
  temperature: number;
  humidity: number;
  notes?: string | null;
  // 18-point temperature values
  temperatures: Record<string, number>;
  // Averages
  temp_avg_overall: number | null;
  temp_avg_front: number | null;
  temp_avg_middle: number | null;
  temp_avg_back: number | null;
}

/**
 * Submit house-level QA record (single-setter mode)
 * Links to a specific batch/house
 */
export async function submitHouseLevelQA(
  record: HouseLevelQARecord
): Promise<SubmissionResult> {
  try {
    const { data, error } = await supabase
      .from('qa_monitoring')
      .insert({
        ...record,
        entry_mode: 'house'
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, qaMonitoringId: data.id };
  } catch (err: any) {
    console.error('Error submitting house-level QA:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit machine-level QA record (multi-setter mode)
 * Creates qa_monitoring record with batch_id=NULL and entry_mode='machine'
 * Then creates 18 qa_position_linkage records linking each position to its flock/house
 */
export async function submitMachineLevelQA(
  record: MachineLevelQARecord,
  positionOccupancy: Map<string, OccupancyInfo>
): Promise<SubmissionResult> {
  try {
    // 1. Insert qa_monitoring record with batch_id = null and entry_mode = 'machine'
    const qaMonitoringRecord = {
      batch_id: null, // Machine-level entry has no single batch
      machine_id: record.machine_id,
      inspector_name: record.inspector_name,
      check_date: record.check_date,
      check_time: record.check_time,
      day_of_incubation: record.day_of_incubation,
      temperature: record.temperature,
      humidity: record.humidity,
      notes: record.notes || null,
      entry_mode: 'machine',
      // 18 temperature columns
      temp_front_top_left: record.temperatures.temp_front_top_left,
      temp_front_top_right: record.temperatures.temp_front_top_right,
      temp_front_mid_left: record.temperatures.temp_front_mid_left,
      temp_front_mid_right: record.temperatures.temp_front_mid_right,
      temp_front_bottom_left: record.temperatures.temp_front_bottom_left,
      temp_front_bottom_right: record.temperatures.temp_front_bottom_right,
      temp_middle_top_left: record.temperatures.temp_middle_top_left,
      temp_middle_top_right: record.temperatures.temp_middle_top_right,
      temp_middle_mid_left: record.temperatures.temp_middle_mid_left,
      temp_middle_mid_right: record.temperatures.temp_middle_mid_right,
      temp_middle_bottom_left: record.temperatures.temp_middle_bottom_left,
      temp_middle_bottom_right: record.temperatures.temp_middle_bottom_right,
      temp_back_top_left: record.temperatures.temp_back_top_left,
      temp_back_top_right: record.temperatures.temp_back_top_right,
      temp_back_mid_left: record.temperatures.temp_back_mid_left,
      temp_back_mid_right: record.temperatures.temp_back_mid_right,
      temp_back_bottom_left: record.temperatures.temp_back_bottom_left,
      temp_back_bottom_right: record.temperatures.temp_back_bottom_right,
      // Averages
      temp_avg_overall: record.temp_avg_overall,
      temp_avg_front: record.temp_avg_front,
      temp_avg_middle: record.temp_avg_middle,
      temp_avg_back: record.temp_avg_back,
      // Metadata
      candling_results: JSON.stringify({
        type: 'setter_temperature_18point',
        entry_mode: 'machine'
      })
    };

    const { data: qaData, error: qaError } = await supabase
      .from('qa_monitoring')
      .insert(qaMonitoringRecord)
      .select('id')
      .single();

    if (qaError) throw qaError;

    const qaMonitoringId = qaData.id;

    // 2. Create 18 qa_position_linkage records
    const positionLinkageRecords = ALL_POSITION_KEYS.map(positionKey => {
      const columnName = `temp_${positionKey}`;
      const temperature = record.temperatures[columnName];
      const occupancy = positionOccupancy.get(positionKey);

      return {
        qa_monitoring_id: qaMonitoringId,
        position: positionKey,
        temperature: temperature || 0,
        multi_setter_set_id: occupancy?.set_id || null,
        resolved_flock_id: occupancy?.flock_id || null,
        resolved_batch_id: occupancy?.batch_id || null
      };
    });

    const { error: linkageError } = await supabase
      .from('qa_position_linkage')
      .insert(positionLinkageRecords);

    if (linkageError) throw linkageError;

    return { success: true, qaMonitoringId };
  } catch (err: any) {
    console.error('Error submitting machine-level QA:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch position linkage data for a QA monitoring record
 */
export async function fetchPositionLinkage(qaMonitoringId: string) {
  const { data, error } = await supabase
    .from('qa_position_linkage')
    .select(`
      *,
      flocks:resolved_flock_id(flock_name, flock_number),
      batches:resolved_batch_id(batch_number),
      multi_setter_sets(zone, side, level, set_date)
    `)
    .eq('qa_monitoring_id', qaMonitoringId);

  if (error) {
    console.error('Error fetching position linkage:', error);
    return null;
  }

  return data;
}

export interface MachineWideQARecord {
  machine_id: string;
  inspector_name: string;
  check_date: string;
  check_time: string;
  qa_type: 'angles' | 'humidity';
  temperature: number;
  humidity: number;
  notes?: string | null;
  // For angles - individual fields
  angle_top_left?: number;
  angle_mid_left?: number;
  angle_bottom_left?: number;
  angle_top_right?: number;
  angle_mid_right?: number;
  angle_bottom_right?: number;
}

export interface FlockLinkage {
  flock_id: string;
  batch_id: string | null;
}

/**
 * Submit machine-wide QA record (angles/humidity)
 * Creates qa_monitoring record with batch_id=NULL and entry_mode='machine'
 * Then creates linkage records for each unique flock in that machine
 */
export async function submitMachineWideQA(
  record: MachineWideQARecord,
  uniqueFlocks: FlockLinkage[]
): Promise<SubmissionResult> {
  try {
    const qaMonitoringRecord: any = {
      batch_id: null,
      machine_id: record.machine_id,
      inspector_name: record.inspector_name,
      check_date: record.check_date,
      check_time: record.check_time,
      day_of_incubation: 0,
      temperature: record.temperature || 0,
      humidity: record.humidity || 0,
      notes: record.notes || null,
      entry_mode: 'machine'
    };

    // Add angles if provided
    if (record.qa_type === 'angles') {
      qaMonitoringRecord.angle_top_left = record.angle_top_left;
      qaMonitoringRecord.angle_mid_left = record.angle_mid_left;
      qaMonitoringRecord.angle_bottom_left = record.angle_bottom_left;
      qaMonitoringRecord.angle_top_right = record.angle_top_right;
      qaMonitoringRecord.angle_mid_right = record.angle_mid_right;
      qaMonitoringRecord.angle_bottom_right = record.angle_bottom_right;
      qaMonitoringRecord.candling_results = JSON.stringify({
        type: 'setter_angles',
        entry_mode: 'machine'
      });
    } else if (record.qa_type === 'humidity') {
      qaMonitoringRecord.candling_results = JSON.stringify({
        type: 'humidity',
        entry_mode: 'machine'
      });
    }

    const { data: qaData, error: qaError } = await supabase
      .from('qa_monitoring')
      .insert(qaMonitoringRecord)
      .select('id')
      .single();

    if (qaError) throw qaError;

    const qaMonitoringId = qaData.id;

    // Create linkage records for each unique flock (machine-wide linkage)
    if (uniqueFlocks.length > 0) {
      const linkageRecords = uniqueFlocks.map(flock => ({
        qa_monitoring_id: qaMonitoringId,
        position: 'machine_wide',
        temperature: 0,
        linkage_type: 'machine_wide',
        multi_setter_set_id: null,
        resolved_flock_id: flock.flock_id,
        resolved_batch_id: flock.batch_id
      }));

      const { error: linkageError } = await supabase
        .from('qa_position_linkage')
        .insert(linkageRecords);

      if (linkageError) throw linkageError;
    }

    return { success: true, qaMonitoringId };
  } catch (err: any) {
    console.error('Error submitting machine-wide QA:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch machine-level QA records for a specific machine
 * Used to display read-only QA data on house pages
 */
export async function fetchMachineQARecords(machineId: string) {
  const { data, error } = await supabase
    .from('qa_monitoring')
    .select(`
      *,
      qa_position_linkage(
        id,
        position,
        temperature,
        linkage_type,
        resolved_flock_id,
        resolved_batch_id
      )
    `)
    .eq('machine_id', machineId)
    .eq('entry_mode', 'machine')
    .order('check_date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching machine QA records:', error);
    return [];
  }

  return data || [];
}
