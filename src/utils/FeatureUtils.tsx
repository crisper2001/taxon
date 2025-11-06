import type { Feature } from '../types';

const UNIT_PREFIX_MAP: Record<string, string> = { 'kilo': 'k', 'hecto': 'h', 'deca': 'da', 'deci': 'd', 'centi': 'c', 'milli': 'm', 'micro': 'µ', 'none': '' };
const BASE_UNIT_MAP: Record<string, string> = { 'metre': 'm', 'square metre': 'm²', 'cubic metre': 'm³', 'litre': 'l', 'degrees celcius': '°C', 'degrees planar': '°', 'none': '' };

export const getUnitSymbol = (feature: Feature | undefined): string => {
  if (!feature || feature.type !== 'numeric') return '';
  const prefix = UNIT_PREFIX_MAP[feature.unit_prefix || 'none'] || '';
  const base = BASE_UNIT_MAP[feature.base_unit || 'none'] || '';
  return prefix + base;
};