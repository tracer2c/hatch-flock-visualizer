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
 * Submit generic QA record with machine-wide linkage to all flocks
 * Used for rectal temps, tray wash, culls, hatch progression in multi-setter mode
 */
export async function submitGenericQAWithLinkage(
  machineId: string,
  inspectorName: string,
  checkDate: string,
  qaType: string,
  qaData: Record<string, any>,
  uniqueFlocks: FlockLinkage[],
  notes?: string | null
): Promise<SubmissionResult> {
  try {
    const qaMonitoringRecord: any = {
      batch_id: null,
      machine_id: machineId,
      inspector_name: inspectorName,
      check_date: checkDate,
      check_time: new Date().toTimeString().split(' ')[0],
      day_of_incubation: 0,
      temperature: qaData.temperature || 100,
      humidity: qaData.humidity || 55,
      mortality_count: qaData.mortalityCount || null,
      notes: notes || null,
      entry_mode: 'machine',
      candling_results: JSON.stringify({ type: qaType, ...qaData })
    };

    const { data: result, error: qaError } = await supabase
      .from('qa_monitoring')
      .insert(qaMonitoringRecord)
      .select('id')
      .single();

    if (qaError) throw qaError;

    const qaMonitoringId = result.id;

    // Create machine-wide linkage for ALL flocks in machine
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
    console.error('Error submitting generic QA with linkage:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit specific gravity test to dedicated table
 */
export async function submitSpecificGravityTest(data: {
  flock_id: string;
  batch_id: string | null;
  test_date: string;
  age_weeks: number;
  sample_size: number;
  float_count: number;
  float_percentage: number;
  notes?: string | null;
}): Promise<SubmissionResult> {
  try {
    const sinkCount = data.sample_size - data.float_count;
    const threshold = data.age_weeks >= 25 && data.age_weeks <= 40 ? 10 : 15;
    const meetsStandard = data.float_percentage < threshold;

    const { error } = await supabase.from('specific_gravity_tests').insert({
      flock_id: data.flock_id,
      batch_id: data.batch_id,
      test_date: data.test_date,
      age_weeks: data.age_weeks,
      sample_size: data.sample_size,
      float_count: data.float_count,
      sink_count: sinkCount,
      float_percentage: data.float_percentage,
      meets_standard: meetsStandard,
      standard_min: 0,
      standard_max: threshold,
      difference: data.float_percentage - threshold,
      notes: data.notes || null
    });

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting specific gravity test:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit moisture loss / weight tracking to dedicated table
 */
export async function submitWeightTracking(data: {
  batch_id: string;
  flock_id: string | null;
  machine_id: string | null;
  check_date: string;
  day_of_incubation: number;
  total_weight: number;
  percent_loss: number;
  notes?: string | null;
}): Promise<SubmissionResult> {
  try {
    const { error } = await supabase.from('weight_tracking').insert({
      batch_id: data.batch_id,
      flock_id: data.flock_id,
      machine_id: data.machine_id,
      check_date: data.check_date,
      day_of_incubation: data.day_of_incubation,
      total_weight: data.total_weight,
      percent_loss: data.percent_loss,
      notes: data.notes || null
    });

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting weight tracking:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit weight tracking for multiple flocks (multi-setter mode)
 */
export async function submitWeightTrackingMulti(
  machineId: string,
  checkDate: string,
  dayOfIncubation: number,
  totalWeight: number,
  percentLoss: number,
  flocks: FlockLinkage[],
  notes?: string | null
): Promise<SubmissionResult> {
  try {
    const records = flocks.map(flock => ({
      batch_id: flock.batch_id || '00000000-0000-0000-0000-000000000000', // Placeholder if no batch
      flock_id: flock.flock_id,
      machine_id: machineId,
      check_date: checkDate,
      day_of_incubation: dayOfIncubation,
      total_weight: totalWeight,
      percent_loss: percentLoss,
      notes: notes || null
    }));

    // Filter out records without valid batch_id (weight_tracking requires batch_id)
    const validRecords = records.filter(r => r.batch_id && r.batch_id !== '00000000-0000-0000-0000-000000000000');

    if (validRecords.length === 0) {
      return { success: false, error: 'No valid batches to link weight tracking' };
    }

    const { error } = await supabase.from('weight_tracking').insert(validRecords);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting weight tracking multi:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit candling QA for single-setter mode
 * Links directly to batch_id and flock_id
 */
export async function submitCandlingQA(data: {
  batch_id: string;
  flock_id: string;
  machine_id: string | null;
  inspector_name: string;
  check_date: string;
  sample_size: number;
  fertile_eggs: number;
  infertile_eggs: number;
  fertility_percent: number;
  notes?: string | null;
}): Promise<SubmissionResult> {
  try {
    const { data: result, error } = await supabase
      .from('qa_monitoring')
      .insert({
        batch_id: data.batch_id,
        machine_id: data.machine_id,
        check_date: data.check_date,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: 0,
        temperature: 100,
        humidity: 55,
        inspector_name: data.inspector_name,
        notes: data.notes || null,
        entry_mode: 'house',
        candling_results: JSON.stringify({
          type: 'candling',
          flock_id: data.flock_id,
          sample_size: data.sample_size,
          fertile_eggs: data.fertile_eggs,
          infertile_eggs: data.infertile_eggs,
          fertility_percent: data.fertility_percent
        })
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, qaMonitoringId: result.id };
  } catch (err: any) {
    console.error('Error submitting candling QA:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit candling QA for multi-setter mode
 * Creates qa_monitoring record + qa_position_linkage for each flock
 */
export async function submitCandlingQAMulti(
  machineId: string,
  inspectorName: string,
  checkDate: string,
  sampleSize: number,
  fertileEggs: number,
  infertileEggs: number,
  fertilityPercent: number,
  flocks: FlockLinkage[],
  notes?: string | null
): Promise<SubmissionResult> {
  try {
    const { data: result, error: qaError } = await supabase
      .from('qa_monitoring')
      .insert({
        batch_id: null,
        machine_id: machineId,
        check_date: checkDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: 0,
        temperature: 100,
        humidity: 55,
        inspector_name: inspectorName,
        notes: notes || null,
        entry_mode: 'machine',
        candling_results: JSON.stringify({
          type: 'candling',
          sample_size: sampleSize,
          fertile_eggs: fertileEggs,
          infertile_eggs: infertileEggs,
          fertility_percent: fertilityPercent
        })
      })
      .select('id')
      .single();

    if (qaError) throw qaError;

    const qaMonitoringId = result.id;

    // Create machine-wide linkage for all flocks
    if (flocks.length > 0) {
      const linkageRecords = flocks.map(flock => ({
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
    console.error('Error submitting candling QA multi:', err);
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
