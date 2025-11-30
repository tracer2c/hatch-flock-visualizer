export type AgeRange = 'young' | 'peak' | 'aging' | 'retirement';

export interface AgeRangeDefinition {
  key: AgeRange;
  label: string;
  minWeeks: number;
  maxWeeks: number;
  color: string;
  description: string;
}

export const AGE_RANGES: AgeRangeDefinition[] = [
  {
    key: 'young',
    label: 'Young Flocks',
    minWeeks: 0,
    maxWeeks: 29,
    color: 'hsl(var(--chart-1))',
    description: 'Building production capacity'
  },
  {
    key: 'peak',
    label: 'Peak Production',
    minWeeks: 30,
    maxWeeks: 50,
    color: 'hsl(var(--chart-2))',
    description: 'Optimal performance window'
  },
  {
    key: 'aging',
    label: 'Aging Flocks',
    minWeeks: 51,
    maxWeeks: 70,
    color: 'hsl(var(--chart-3))',
    description: 'Declining performance expected'
  },
  {
    key: 'retirement',
    label: 'Retirement Age',
    minWeeks: 71,
    maxWeeks: 999,
    color: 'hsl(var(--chart-4))',
    description: 'Consider flock replacement'
  }
];

export class AgeRangeService {
  static getCustomRanges(): AgeRangeDefinition[] {
    const stored = localStorage.getItem('customAgeRanges');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error loading custom age ranges:', e);
      }
    }
    return AGE_RANGES;
  }
  
  static getAgeRange(ageWeeks: number): AgeRangeDefinition {
    const ranges = this.getCustomRanges();
    return ranges.find(
      range => ageWeeks >= range.minWeeks && ageWeeks <= range.maxWeeks
    ) || ranges[0];
  }
  
  // Alias for getAgeRange - used in age-based analytics
  static getAgeRangeForAge(ageWeeks: number): AgeRangeDefinition {
    return this.getAgeRange(ageWeeks);
  }
  
  static getAgeRangeLabel(ageWeeks: number): string {
    return this.getAgeRange(ageWeeks).label;
  }
  
  static getAgeRangeColor(ageWeeks: number): string {
    return this.getAgeRange(ageWeeks).color;
  }
}
