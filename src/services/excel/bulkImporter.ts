import { supabase } from '@/integrations/supabase/client';
import { ImportRecord, ImportType, ImportResult, ImportConfig } from '@/types/import';

export class BulkImporter {
  private companyId: string | null = null;

  async initialize() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    this.companyId = profile?.company_id || null;
  }

  async import(
    rows: ImportRecord[], 
    type: ImportType, 
    config: ImportConfig
  ): Promise<ImportResult> {
    await this.initialize();

    const result: ImportResult = {
      success: 0,
      failed: 0,
      warnings: 0,
      errors: [],
      createdRecords: []
    };

    for (let i = 0; i < rows.length; i++) {
      try {
        const record = await this.importRow(rows[i], type, config);
        if (record) {
          result.success++;
          result.createdRecords.push(record);
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 2,
          column: '',
          value: rows[i],
          error: error.message,
          severity: 'error'
        });
      }
    }

    return result;
  }

  private async importRow(
    row: ImportRecord, 
    type: ImportType, 
    config: ImportConfig
  ): Promise<any> {
    switch (type) {
      case 'fertility':
        return this.importFertility(row, config);
      case 'residue':
        return this.importResidue(row, config);
      case 'egg_pack':
        return this.importEggPack(row, config);
      case 'weight_loss':
        return this.importWeightLoss(row, config);
      case 'specific_gravity':
        return this.importSpecificGravity(row, config);
      default:
        throw new Error(`Unsupported import type: ${type}`);
    }
  }

  private async importFertility(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(row['FLOCK#']);
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const data = {
      batch_id: batchId,
      analysis_date: config.defaultValues?.analysisDate || new Date().toISOString().split('T')[0],
      sample_size: this.parseNumber(row['SIZE']) || 648,
      infertile_eggs: this.parseNumber(row['INFERTILE']) || 0,
      fertile_eggs: this.parseNumber(row['SIZE']) - this.parseNumber(row['INFERTILE']) || 0,
      early_dead: this.parseNumber(row['DEAD']) || 0,
      late_dead: 0,
      fertility_percent: this.parseNumber(row['FERTILITY']),
      hatch_percent: this.parseNumber(row['HATCH%']),
      hof_percent: this.parseNumber(row['HOF%']),
      cull_chicks: 0
    };

    const { data: inserted, error } = await supabase
      .from('fertility_analysis')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async importResidue(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(row['FLOCK#']);
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const data = {
      batch_id: batchId,
      analysis_date: config.defaultValues?.analysisDate || new Date().toISOString().split('T')[0],
      sample_size: 648,
      total_residue_count: (this.parseNumber(row['Infertile']) || 0) + 
                           (this.parseNumber(row['ED']) || 0) + 
                           (this.parseNumber(row['MD']) || 0),
      contaminated_eggs: this.parseNumber(row['Cont']) || 0,
      malformed_chicks: this.parseNumber(row['Abnormal']) || 0,
      mid_dead: this.parseNumber(row['MD']) || 0,
      pip_number: this.parseNumber(row['DY egg']) || 0,
      pipped_not_hatched: 0,
      unhatched_fertile: 0
    };

    const { data: inserted, error } = await supabase
      .from('residue_analysis')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async importEggPack(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(row['Flock#']);
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const totalPulled = this.parseNumber(row['Total Eggs Pulled']) || 0;

    const data = {
      batch_id: batchId,
      inspection_date: config.defaultValues?.inspectionDate || new Date().toISOString().split('T')[0],
      sample_size: totalPulled,
      grade_a: totalPulled - (this.parseNumber(row['Stained']) || 0) - 
               (this.parseNumber(row['Dirty']) || 0) - (this.parseNumber(row['Cracked']) || 0),
      grade_b: 0,
      grade_c: 0,
      cracked: this.parseNumber(row['Cracked']) || 0,
      dirty: this.parseNumber(row['Dirty']) || 0,
      small: this.parseNumber(row['Small']) || 0,
      large: 0
    };

    const { data: inserted, error } = await supabase
      .from('egg_pack_quality')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async importWeightLoss(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(row['FLOCK#']);
    const batchId = await this.findOrCreateBatch(flockNumber, config);
    const flockId = await this.findFlockId(flockNumber);

    const data = {
      batch_id: batchId,
      flock_id: flockId,
      check_date: config.defaultValues?.checkDate || new Date().toISOString().split('T')[0],
      day_of_incubation: row['DATE CHECK']?.includes('18') ? 18 : 1,
      check_day: row['DATE CHECK'],
      top_weight: this.parseNumber(row['TOP WEIGHT']),
      middle_weight: this.parseNumber(row['MIDDLE WEIGHT']),
      bottom_weight: this.parseNumber(row['BOTTOM WEIGHT']),
      total_weight: this.parseNumber(row['TOTAL WEIGHT']),
      percent_loss: this.parseNumber(row['% LOSS']),
      company_id: this.companyId
    };

    const { data: inserted, error } = await supabase
      .from('weight_tracking')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async importSpecificGravity(row: ImportRecord, config: ImportConfig) {
    const flockNumber = this.parseNumber(row['Flock#']);
    const flockId = await this.findFlockId(flockNumber);

    const data = {
      flock_id: flockId,
      test_date: config.defaultValues?.testDate || new Date().toISOString().split('T')[0],
      age_weeks: this.parseNumber(row['Age']) || 0,
      concentration: row['Conc'],
      float_count: this.parseNumber(row['Float']) || 0,
      sample_size: 100,
      float_percentage: this.parseNumber(row['%']) || 0,
      difference: this.parseNumber(row['Difference']),
      company_id: this.companyId
    };

    const { data: inserted, error } = await supabase
      .from('specific_gravity_tests')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted;
  }

  private async findOrCreateBatch(flockNumber: number, config: ImportConfig): Promise<string> {
    // First try to find existing flock
    const { data: flock } = await supabase
      .from('flocks')
      .select('id')
      .eq('flock_number', flockNumber)
      .eq('company_id', this.companyId)
      .maybeSingle();

    if (!flock && !config.createMissingEntities) {
      throw new Error(`Flock #${flockNumber} not found`);
    }

    let flockId = flock?.id;

    // Create flock if needed
    if (!flockId && config.createMissingEntities) {
      const { data: newFlock, error } = await supabase
        .from('flocks')
        .insert({
          flock_number: flockNumber,
          flock_name: `Flock ${flockNumber}`,
          breed: 'cobb' as any,
          age_weeks: 30,
          arrival_date: new Date().toISOString().split('T')[0],
          company_id: this.companyId
        } as any)
        .select()
        .single();

      if (error) throw error;
      flockId = newFlock.id;
    }

    // Find most recent batch for this flock
    const { data: batch } = await supabase
      .from('batches')
      .select('id')
      .eq('flock_id', flockId)
      .order('set_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (batch) return batch.id;

    // Create batch if needed
    if (config.createMissingEntities) {
      const { data: machines } = await supabase
        .from('machines')
        .select('id')
        .eq('company_id', this.companyId)
        .limit(1);

      const { data: newBatch, error } = await supabase
        .from('batches')
        .insert({
          batch_number: `Batch-${flockNumber}`,
          flock_id: flockId,
          machine_id: machines?.[0]?.id,
          set_date: new Date().toISOString().split('T')[0],
          expected_hatch_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_eggs_set: 0,
          status: 'completed',
          company_id: this.companyId
        })
        .select()
        .single();

      if (error) throw error;
      return newBatch.id;
    }

    throw new Error(`No batch found for flock #${flockNumber}`);
  }

  private async findFlockId(flockNumber: number): Promise<string> {
    const { data: flock } = await supabase
      .from('flocks')
      .select('id')
      .eq('flock_number', flockNumber)
      .eq('company_id', this.companyId)
      .maybeSingle();

    if (!flock) throw new Error(`Flock #${flockNumber} not found`);
    return flock.id;
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}
