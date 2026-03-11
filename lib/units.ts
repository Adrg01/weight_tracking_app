// Unit conversion utilities for Scaley

export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'ft_in';

// Weight conversions
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbsToKg(value);
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLbs(kg);
}

export function formatWeight(kg: number, unit: WeightUnit, decimals: number = 1): string {
  const value = fromKg(kg, unit);
  return `${value.toFixed(decimals)} ${unit}`;
}

// Height conversions
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches: inches === 12 ? 0 : inches };
}

export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function toCm(value: number | { feet: number; inches: number }, unit: HeightUnit): number {
  if (unit === 'cm') return value as number;
  const { feet, inches } = value as { feet: number; inches: number };
  return ftInToCm(feet, inches);
}

export function formatHeight(cm: number, unit: HeightUnit): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFtIn(cm);
  return `${feet}'${inches}"`;
}

// BMI calculation (always uses metric internally)
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBMICategory(bmi: number): {
  label: string;
  color: 'positive' | 'warning' | 'negative' | 'tint';
} {
  if (bmi < 18.5) return { label: 'Underweight', color: 'warning' };
  if (bmi < 25) return { label: 'Normal', color: 'positive' };
  if (bmi < 30) return { label: 'Overweight', color: 'warning' };
  return { label: 'Obese', color: 'negative' };
}
