import { supabase } from '@/integrations/supabase/client';
import { ImportRecord, ImportType, ImportResult, ImportConfig } from '@/types/import';

export class BulkImporter {
  private companyId: string | null = null;
  
  // Column variations for flexible matching
  private columnVariations: Record<string, string[]> = {
    'FLOCK': ['FLOCK#', 'FLOCK #', 'Flock#', 'Flock #', 'FLOCK NUMBER', 'Flock Number', 'FLOCK', 'Flock'],
    'SIZE': ['SIZE', 'SAMPLE SIZE', 'Sample Size', 'SAMPLE_SIZE'],
    'INFERTILE': ['INFERTILE', 'INFERTILE EGGS', 'Infertile'],
    'DEAD': ['DEAD', 'ED', 'Early Dead'],
    'FERTILITY': ['FERTILITY', 'FERTILITY%', 'Fertility %'],
    'HATCH': ['HATCH%', 'HATCH', 'Hatch %'],
    'HOF': ['HOF%', 'HOF', 'Hof %'],
    'TOTAL_EGGS_PULLED': ['Total Eggs Pulled', 'TOTAL EGGS PULLED', 'Total Pulled'],
    'STAINED': ['Stained', 'STAINED'],
    'DIRTY': ['Dirty', 'DIRTY'],
    'CRACKED': ['Cracked', 'CRACKED'],
    'SMALL': ['Small', 'SMALL'],
    'TOTAL_WEIGHT': ['TOTAL WEIGHT', 'Total Weight'],
    'PERCENT_LOSS': ['% LOSS', '%LOSS', 'PERCENT LOSS'],
    'DATE_CHECK': ['DATE CHECK', 'Date Check'],
    'TOP_WEIGHT': ['TOP WEIGHT', 'Top Weight'],
    'MIDDLE_WEIGHT': ['MIDDLE WEIGHT', 'Middle Weight'],
    'BOTTOM_WEIGHT': ['BOTTOM WEIGHT', 'Bottom Weight'],
    'AGE': ['Age', 'AGE', 'Age Weeks'],
    'CONC': ['Conc', 'CONC', 'Concentration'],
    'FLOAT': ['Float', 'FLOAT'],
    'PERCENT': ['%', 'PERCENT', 'Percent'],
    'DIFFERENCE': ['Difference', 'DIFFERENCE', 'Diff']
  };
  
  private findColumn(row: ImportRecord, fieldName: string): any {
    const variations = this.columnVariations[fieldName.toUpperCase()] || [fieldName];
    
    for (const variant of variations) {
      if (row[variant] !== undefined) {
        return row[variant];
      }
    }
    
    // Try normalized matching
    const normalizedField = fieldName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const columnMap = (row as any).__columnMap;
    
    if (columnMap && columnMap[normalizedField]) {
      const actualKey = columnMap[normalizedField];
      return row[actualKey];
    }
    
    // Try all variations with normalized matching
    for (const variant of variations) {
      const normalizedVariant = variant.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (columnMap && columnMap[normalizedVariant]) {
        const actualKey = columnMap[normalizedVariant];
        return row[actualKey];
      }
    }
    
    return undefined;
  }

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
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const size = this.parseNumber(this.findColumn(row, 'SIZE')) || 648;
    const infertile = this.parseNumber(this.findColumn(row, 'INFERTILE')) || 0;

    const data = {
      batch_id: batchId,
      analysis_date: config.defaultValues?.analysisDate || new Date().toISOString().split('T')[0],
      sample_size: size,
      infertile_eggs: infertile,
      fertile_eggs: size - infertile,
      early_dead: this.parseNumber(this.findColumn(row, 'DEAD')) || 0,
      late_dead: 0,
      fertility_percent: this.parseNumber(this.findColumn(row, 'FERTILITY')),
      hatch_percent: this.parseNumber(this.findColumn(row, 'HATCH')),
      hof_percent: this.parseNumber(this.findColumn(row, 'HOF')),
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
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const data = {
      batch_id: batchId,
      analysis_date: config.defaultValues?.analysisDate || new Date().toISOString().split('T')[0],
      sample_size: 648,
      total_residue_count: (this.parseNumber(this.findColumn(row, 'INFERTILE')) || 0) + 
                           (this.parseNumber(this.findColumn(row, 'ED')) || 0) + 
                           (this.parseNumber(this.findColumn(row, 'MD')) || 0),
      contaminated_eggs: this.parseNumber(this.findColumn(row, 'Cont')) || 0,
      malformed_chicks: this.parseNumber(this.findColumn(row, 'Abnormal')) || 0,
      mid_dead: this.parseNumber(this.findColumn(row, 'MD')) || 0,
      pip_number: this.parseNumber(this.findColumn(row, 'DY egg')) || 0,
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
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const batchId = await this.findOrCreateBatch(flockNumber, config);

    const totalPulled = this.parseNumber(this.findColumn(row, 'TOTAL_EGGS_PULLED')) || 0;
    const stained = this.parseNumber(this.findColumn(row, 'STAINED')) || 0;
    const dirty = this.parseNumber(this.findColumn(row, 'DIRTY')) || 0;
    const cracked = this.parseNumber(this.findColumn(row, 'CRACKED')) || 0;

    const data = {
      batch_id: batchId,
      inspection_date: config.defaultValues?.inspectionDate || new Date().toISOString().split('T')[0],
      sample_size: totalPulled,
      grade_a: totalPulled - stained - dirty - cracked,
      grade_b: 0,
      grade_c: 0,
      cracked,
      dirty,
      small: this.parseNumber(this.findColumn(row, 'SMALL')) || 0,
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
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const batchId = await this.findOrCreateBatch(flockNumber, config);
    const flockId = await this.findFlockId(flockNumber);

    const dateCheck = this.findColumn(row, 'DATE_CHECK');

    const data = {
      batch_id: batchId,
      flock_id: flockId,
      check_date: config.defaultValues?.checkDate || new Date().toISOString().split('T')[0],
      day_of_incubation: dateCheck?.includes('18') ? 18 : 1,
      check_day: dateCheck,
      top_weight: this.parseNumber(this.findColumn(row, 'TOP_WEIGHT')),
      middle_weight: this.parseNumber(this.findColumn(row, 'MIDDLE_WEIGHT')),
      bottom_weight: this.parseNumber(this.findColumn(row, 'BOTTOM_WEIGHT')),
      total_weight: this.parseNumber(this.findColumn(row, 'TOTAL_WEIGHT')),
      percent_loss: this.parseNumber(this.findColumn(row, 'PERCENT_LOSS')),
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
    const flockNumber = this.parseNumber(this.findColumn(row, 'FLOCK'));
    const flockId = await this.findFlockId(flockNumber);

    const data = {
      flock_id: flockId,
      test_date: config.defaultValues?.testDate || new Date().toISOString().split('T')[0],
      age_weeks: this.parseNumber(this.findColumn(row, 'AGE')) || 0,
      concentration: this.findColumn(row, 'CONC'),
      float_count: this.parseNumber(this.findColumn(row, 'FLOAT')) || 0,
      sample_size: 100,
      float_percentage: this.parseNumber(this.findColumn(row, 'PERCENT')) || 0,
      difference: this.parseNumber(this.findColumn(row, 'DIFFERENCE')),
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
