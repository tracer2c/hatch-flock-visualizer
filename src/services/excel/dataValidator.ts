import { ValidationError, ImportRecord, ImportType } from '@/types/import';

export class DataValidator {
  private errors: ValidationError[] = [];

  validate(rows: ImportRecord[], type: ImportType): ValidationError[] {
    this.errors = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // Account for header row

      switch (type) {
        case 'fertility':
          this.validateFertility(row, rowNum);
          break;
        case 'residue':
          this.validateResidue(row, rowNum);
          break;
        case 'egg_pack':
          this.validateEggPack(row, rowNum);
          break;
        case 'weight_loss':
          this.validateWeightLoss(row, rowNum);
          break;
        case 'specific_gravity':
          this.validateSpecificGravity(row, rowNum);
          break;
        case 'qa_temps':
          this.validateQATemps(row, rowNum);
          break;
      }
    });

    return this.errors;
  }

  private validateFertility(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK#', rowNum);
    this.requireNumeric(row, 'SIZE', rowNum);
    this.requireNumeric(row, 'INFERTILE', rowNum);
    
    const size = this.parseNumber(row['SIZE']);
    const infertile = this.parseNumber(row['INFERTILE']);
    
    if (size && infertile && infertile > size) {
      this.addError(rowNum, 'INFERTILE', infertile, 
        'Infertile eggs cannot exceed sample size', 'error');
    }

    // Warn if fertility seems low
    const fertility = this.parseNumber(row['FERTILITY']);
    if (fertility && fertility < 70) {
      this.addError(rowNum, 'FERTILITY', fertility, 
        `Low fertility: ${fertility}%`, 'warning', 'Verify this is correct');
    }
  }

  private validateResidue(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK#', rowNum);
    this.requireNumeric(row, 'Infertile', rowNum);
  }

  private validateEggPack(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'Flock#', rowNum);
    this.requireNumeric(row, 'Total Eggs Pulled', rowNum);
    
    const totalPulled = this.parseNumber(row['Total Eggs Pulled']);
    const stained = this.parseNumber(row['Stained']);
    
    if (stained && totalPulled && stained > totalPulled) {
      this.addError(rowNum, 'Stained', stained, 
        'Defect count exceeds total eggs', 'error');
    }
  }

  private validateWeightLoss(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'FLOCK#', rowNum);
    this.requireNumeric(row, 'TOTAL WEIGHT', rowNum);
    
    const percentLoss = this.parseNumber(row['% LOSS']);
    if (percentLoss) {
      if (percentLoss < 0) {
        this.addError(rowNum, '% LOSS', percentLoss, 
          'Weight loss cannot be negative', 'error');
      } else if (percentLoss > 15) {
        this.addError(rowNum, '% LOSS', percentLoss, 
          'Weight loss exceeds 15% - verify accuracy', 'warning');
      }
    }
  }

  private validateSpecificGravity(row: ImportRecord, rowNum: number) {
    this.requireField(row, 'Flock#', rowNum);
    this.requireNumeric(row, 'Float', rowNum);
    
    const floatPct = this.parseNumber(row['%']);
    if (floatPct && (floatPct < 0 || floatPct > 100)) {
      this.addError(rowNum, '%', floatPct, 
        'Percentage must be between 0-100', 'error');
    }
  }

  private validateQATemps(row: ImportRecord, rowNum: number) {
    // Temperature validation
    const tempFields = Object.keys(row).filter(k => 
      k.toLowerCase().includes('temp') || k.toLowerCase().includes('temperature')
    );
    
    tempFields.forEach(field => {
      const temp = this.parseNumber(row[field]);
      if (temp && (temp < 90 || temp > 110)) {
        this.addError(rowNum, field, temp, 
          'Temperature outside normal range (90-110°F)', 'warning');
      }
    });
  }

  private requireField(row: ImportRecord, field: string, rowNum: number) {
    const value = row[field];
    if (value === null || value === undefined || value === '') {
      this.addError(rowNum, field, value, 'Required field is missing', 'error');
    }
  }

  private requireNumeric(row: ImportRecord, field: string, rowNum: number) {
    const value = row[field];
    if (value !== null && value !== undefined && value !== '') {
      const num = this.parseNumber(value);
      if (num === null) {
        this.addError(rowNum, field, value, 'Must be a number', 'error');
      }
    }
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  private addError(
    row: number, 
    column: string, 
    value: any, 
    error: string, 
    severity: 'error' | 'warning',
    suggestion?: string
  ) {
    this.errors.push({ row, column, value, error, severity, suggestion });
  }
}
