/**
 * Calculate days between two dates
 */
export const calculateDaysSinceSet = (setDate: string, analysisDate: string): number => {
  const set = new Date(setDate);
  const analysis = new Date(analysisDate);
  const diffTime = analysis.getTime() - set.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Validate if fertility analysis date is within recommended window (Days 10-14)
 */
export const validateFertilityAnalysisDate = (setDate: string, analysisDate: string) => {
  const daysSinceSet = calculateDaysSinceSet(setDate, analysisDate);
  
  if (daysSinceSet < 10 || daysSinceSet > 14) {
    return {
      isValid: true, // Still allow submission (warning only)
      daysSinceSet,
      warning: `Fertility analysis is typically done on Days 10-14 after set. Current: Day ${daysSinceSet}`
    };
  }
  
  return { 
    isValid: true, 
    daysSinceSet,
    warning: null 
  };
};

/**
 * Validate if residue analysis date is after hatch date
 */
export const validateResidueAnalysisDate = (hatchDate: string, analysisDate: string) => {
  const hatch = new Date(hatchDate);
  const analysis = new Date(analysisDate);
  
  if (analysis < hatch) {
    return {
      isValid: false,
      error: 'Residue analysis must be performed after hatch date'
    };
  }
  
  const daysSinceHatch = calculateDaysSinceSet(hatchDate, analysisDate);
  
  if (daysSinceHatch > 3) {
    return {
      isValid: true,
      warning: `Residue analysis is typically done within 1-2 days of hatch. Current: ${daysSinceHatch} days after hatch`
    };
  }
  
  return { isValid: true, warning: null };
};
