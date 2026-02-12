import { FieldConfig } from '../types';
import { getCachedNumberFormat } from './intlUtils';
import { parseDateValue, formatDateFr } from './dateUtils';

/**
 * Extrait un nombre depuis une chaine avec potentiellement une unité
 * Optimisé pour la performance (Regex pre-compilé pour cas généraux)
 */
const CLEAN_NUM_REGEX = /[^0-9.-]/g;
const UNIT_REGEX_CACHE = new Map<string, RegExp>();
// BOLT OPTIMIZATION: Global cache for smart number parsing to avoid redundant regex/string ops
const SMART_NUMBER_CACHE = new Map<string, number>();
const MAX_SMART_NUMBER_CACHE_SIZE = 10000;

export const parseSmartNumber = (val: any, unit?: string): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return 0;
    return val;
  }

  // BOLT OPTIMIZATION: Result caching for repeating values
  const cacheKey = unit ? `${unit}:${val}` : String(val);
  const cached = SMART_NUMBER_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  let str = String(val);

  // BOLT OPTIMIZATION: Fast path for simple numeric strings
  if (!unit && /^-?\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (SMART_NUMBER_CACHE.size > MAX_SMART_NUMBER_CACHE_SIZE) SMART_NUMBER_CACHE.clear();
    SMART_NUMBER_CACHE.set(cacheKey, num);
    return num;
  }

  // Optimisation: Si unité présente, on l'enlève (Case Insensitive)
  if (unit && unit.length > 0) {
    // BOLT OPTIMIZATION: Cache unit regex to avoid repeated new RegExp() calls
    let unitRegex = UNIT_REGEX_CACHE.get(unit);
    if (!unitRegex) {
      const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      unitRegex = new RegExp(escapedUnit, 'i');
      UNIT_REGEX_CACHE.set(unit, unitRegex);
    }
    str = str.replace(unitRegex, '');
  }

  // BOLT OPTIMIZATION: Single regex pass for space removal
  str = str.replace(/[\s\u00A0]/g, '');

  // Détection du format français vs anglais
  const lastCommaPos = str.lastIndexOf(',');
  const lastDotPos = str.lastIndexOf('.');

  if (lastCommaPos > lastDotPos) {
    // Format français: "1.000,50" ou "1 000,50"
    // Enlever les points (séparateurs de milliers), puis remplacer virgule par point
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDotPos > lastCommaPos) {
    // Format anglais: "1,000.50"
    // Enlever les virgules (séparateurs de milliers)
    str = str.replace(/,/g, '');
  }

  // Regex clean (garde chiffres, point, moins)
  str = str.replace(CLEAN_NUM_REGEX, '');

  const num = parseFloat(str);
  const result = isNaN(num) ? 0 : num;

  // BOLT OPTIMIZATION: Save to cache
  if (SMART_NUMBER_CACHE.size > MAX_SMART_NUMBER_CACHE_SIZE) SMART_NUMBER_CACHE.clear();
  SMART_NUMBER_CACHE.set(cacheKey, result);

  return result;
};

/**
 * Formate un nombre selon la configuration du champ
 */
export const formatNumberValue = (value: number | string, config?: FieldConfig): string => {
  if (config?.type === 'date') {
    const parsedDate = parseDateValue(value);
    if (!parsedDate) return '-';
    return formatDateFr(value);
  }

  let numVal = typeof value === 'number' ? value : parseSmartNumber(value);
  if (isNaN(numVal)) return String(value);

  // Configuration par défaut
  const decimals = config?.decimalPlaces !== undefined ? config.decimalPlaces : 2;
  const scale = config?.displayScale || 'none';
  const unit = config?.unit || '';

  // Appliquer l'échelle
  let suffix = '';
  if (scale === 'thousands') {
    numVal /= 1000;
    suffix = ' k';
  } else if (scale === 'millions') {
    numVal /= 1000000;
    suffix = ' M';
  } else if (scale === 'billions') {
    numVal /= 1000000000;
    suffix = ' Md';
  }

  // Si l'unité existe, on la colle après le suffixe d'échelle
  const fullSuffix = unit ? `${suffix} ${unit}` : suffix;

  // Formater avec séparateur de milliers et décimales fixes
  return getCachedNumberFormat({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numVal) + fullSuffix;
};
