/**
 * STANDARDIZED HATCHERY CALCULATION FORMULAS
 * 
 * This utility provides centralized, consistent formulas for all hatchery metrics
 * across the application. All components must use these functions to ensure
 * calculation consistency.
 * 
 * CRITICAL: These are the ONLY correct formulas. Do not create alternative calculations.
 */

/**
 * Calculate Hatch Percentage
 * Formula: (Chicks Hatched / Sample Size) × 100
 * 
 * @param chicksHatched - Number of chicks that successfully hatched
 * @param sampleSize - Total sample size (typically 648)
 * @returns Hatch percentage rounded to 2 decimal places
 */
export const calculateHatchPercent = (
  chicksHatched: number,
  sampleSize: number
): number => {
  if (sampleSize <= 0) return 0;
  return Number(((chicksHatched / sampleSize) * 100).toFixed(2));
};

/**
 * Calculate Hatch of Fertile (HOF%)
 * Formula: (Chicks Hatched / Fertile Eggs) × 100
 * 
 * @param chicksHatched - Number of chicks that successfully hatched
 * @param fertileEggs - Number of fertile eggs
 * @returns HOF percentage rounded to 2 decimal places
 */
export const calculateHOFPercent = (
  chicksHatched: number,
  fertileEggs: number
): number => {
  if (fertileEggs <= 0) return 0;
  return Number(((chicksHatched / fertileEggs) * 100).toFixed(2));
};

/**
 * Calculate Hatch of Injection (HOI%)
 * Formula: (Chicks Hatched / Eggs Injected) × 100
 * 
 * @param chicksHatched - Number of chicks that successfully hatched
 * @param eggsInjected - Number of eggs that were injected
 * @returns HOI percentage rounded to 2 decimal places
 */
export const calculateHOIPercent = (
  chicksHatched: number,
  eggsInjected: number
): number => {
  if (eggsInjected <= 0) return 0;
  return Number(((chicksHatched / eggsInjected) * 100).toFixed(2));
};

/**
 * Calculate Infertile Development Percentage (I/F dev %)
 * Formula: (Infertile Eggs / Fertile Eggs) × 100
 * 
 * Shows the proportion of infertile eggs relative to fertile eggs
 * 
 * @param infertileEggs - Number of infertile eggs
 * @param fertileEggs - Number of fertile eggs
 * @returns I/F dev percentage rounded to 2 decimal places
 */
export const calculateIFPercent = (
  infertileEggs: number,
  fertileEggs: number
): number => {
  if (fertileEggs <= 0) return 0;
  return Number(((infertileEggs / fertileEggs) * 100).toFixed(2));
};

/**
 * Calculate Fertility Percentage
 * Formula: (Fertile Eggs / Sample Size) × 100
 * 
 * @param fertileEggs - Number of fertile eggs
 * @param sampleSize - Total sample size
 * @returns Fertility percentage rounded to 2 decimal places
 */
export const calculateFertilityPercent = (
  fertileEggs: number,
  sampleSize: number
): number => {
  if (sampleSize <= 0) return 0;
  return Number(((fertileEggs / sampleSize) * 100).toFixed(2));
};

/**
 * Calculate Chicks Hatched from Residue Analysis Components
 * Formula: Sample Size - Infertile - Early Dead - Mid Dead - Late Dead - Culls - Live Pips - Dead Pips
 * 
 * @param sampleSize - Total sample size (typically 648)
 * @param infertile - Number of infertile eggs
 * @param earlyDead - Number of early dead embryos (0-7 days)
 * @param midDead - Number of mid dead embryos (8-14 days)
 * @param lateDead - Number of late dead embryos (15-21 days)
 * @param culls - Number of culled chicks
 * @param livePips - Number of live pipped eggs
 * @param deadPips - Number of dead pipped eggs
 * @returns Number of chicks hatched (minimum 0)
 */
export const calculateChicksHatched = (
  sampleSize: number,
  infertile: number,
  earlyDead: number,
  midDead: number,
  lateDead: number,
  culls: number,
  livePips: number,
  deadPips: number
): number => {
  return Math.max(
    0,
    sampleSize - infertile - earlyDead - midDead - lateDead - culls - livePips - deadPips
  );
};

/**
 * Calculate Fertile Eggs
 * Formula: Sample Size - Infertile Eggs
 * 
 * @param sampleSize - Total sample size
 * @param infertileEggs - Number of infertile eggs
 * @returns Number of fertile eggs (minimum 0)
 */
export const calculateFertileEggs = (
  sampleSize: number,
  infertileEggs: number
): number => {
  return Math.max(0, sampleSize - infertileEggs);
};

/**
 * Calculate Embryonic Mortality
 * Formula: Early Dead + Mid Dead + Late Dead + Live Pips + Dead Pips
 * 
 * Represents all embryos that died during the incubation period, including
 * those that died during early, mid, and late stages, as well as pipped eggs.
 * 
 * @param earlyDead - Number of early dead embryos (0-7 days)
 * @param midDead - Number of mid dead embryos (8-14 days)
 * @param lateDead - Number of late dead embryos (15-21 days)
 * @param livePips - Number of live pipped eggs
 * @param deadPips - Number of dead pipped eggs
 * @returns Total embryonic mortality count
 */
export const calculateEmbryonicMortality = (
  earlyDead: number,
  midDead: number,
  lateDead: number,
  livePips: number,
  deadPips: number
): number => {
  return earlyDead + midDead + lateDead + livePips + deadPips;
};
