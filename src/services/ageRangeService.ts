export type AgeRange = 'young' | 'peak' | 'middle' | 'older';

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
    minWeeks: 26,
    maxWeeks: 30,
    color: 'hsl(var(--chart-1))',
    description: 'Building production capacity'
  },
  {
    key: 'peak',
    label: 'Peak Production',
    minWeeks: 31,
    maxWeeks: 34,
    color: 'hsl(var(--chart-2))',
    description: 'Optimal performance window'
  },
  {
    key: 'middle',
    label: 'Middle Flocks',
    minWeeks: 35,
    maxWeeks: 45,
    color: 'hsl(var(--chart-3))',
    description: 'Sustained production period'
  },
  {
    key: 'older',
    label: 'Older Flocks',
    minWeeks: 46,
    maxWeeks: 65,
    color: 'hsl(var(--chart-4))',
    description: 'Consider flock management'
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
