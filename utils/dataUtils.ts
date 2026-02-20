import { ImportBatch, FieldConfig } from '../types';
import { parseSmartNumber } from './numberUtils';
import { parseDateValue, jsToExcelDate } from './dateUtils';

// Updated version
export const APP_VERSION = "23-02-2026-02";

/**
 * Compresse un batch de données en format colonnaire pour économiser de l'espace
 */
export const compressBatch = (batch: ImportBatch): any => {
  if (!batch.rows || batch.rows.length === 0) return batch;

  // On identifie tous les champs uniques
  const fields = Array.from(new Set(batch.rows.flatMap(r => Object.keys(r))));

  // On convertit les lignes en tableaux de valeurs
  const data = batch.rows.map(row => fields.map(f => row[f]));

  const meta = { ...batch };
  delete (meta as any).rows;

  return {
    ...meta,
    _c: true, // Flag compressé
    f: fields, // Fields (colonnes)
    d: data    // Data (valeurs)
  };
};

/**
 * Décompresse un batch de données format colonnaire en format objet standard
 */
export const decompressBatch = (batch: any): ImportBatch => {
  if (!batch || !batch._c) return batch as ImportBatch;

  const meta = { ...batch };
  const { f, d } = batch;
  delete (meta as any).f;
  delete (meta as any).d;
  delete (meta as any)._c;

  const rows = d.map((rowValues: any[]) => {
    const row: any = {};
    f.forEach((fieldName: string, i: number) => {
      const val = rowValues[i];
      if (val !== undefined && val !== null) {
        row[fieldName] = val;
      }
    });
    return row;
  });

  return { ...meta, rows } as ImportBatch;
};

/**
 * Récupère une valeur d'une ligne en gérant les préfixes de dataset
 */
export const getRowValue = (row: any, field: string): any => {
  if (row[field] !== undefined) return row[field];

  // Si le champ a un préfixe "[Dataset] ", on tente sans le préfixe
  const prefixMatch = field.match(/^\[.*?\] (.*)$/);
  if (prefixMatch) {
    const cleanField = prefixMatch[1];
    return row[cleanField];
  }

  return undefined;
};

/**
 * Compare deux tableaux de chaînes pour voir s'ils sont similaires
 * Retourne true si le tableau 'candidate' contient une majorité des champs de 'target'
 */
export const areHeadersSimilar = (target: string[], candidate: string[]): boolean => {
  if (target.length === 0) return false;

  // Normalisation
  const normTarget = target.map(t => t.toLowerCase().trim());
  const normCandidate = candidate.map(c => c.toLowerCase().trim());

  // Compter les correspondances
  let matches = 0;
  for (const t of normTarget) {
    if (normCandidate.includes(t)) matches++;
  }

  // Si plus de 75% des champs du target sont présents dans le candidat, c'est probablement le même dataset
  // OU si 100% des champs du candidat sont dans le target (sous-ensemble)
  const ratio = matches / normTarget.length;
  const isSubset = normCandidate.every(c => normTarget.includes(c));

  return ratio > 0.75 || (isSubset && normCandidate.length > 1);
};

// BOLT OPTIMIZATION: Global cache for aggregation values to avoid redundant parsing/conversions
const AGGREGATION_VALUE_CACHE = new Map<string, number>();
const MAX_AGG_CACHE_SIZE = 10000;

/**
 * Prépare une valeur pour l'agrégation numérique (TCD).
 * Gère les dates (conversion en numéro de série Excel) et les nombres.
 * BOLT OPTIMIZATION: Added global result caching for repeating values.
 */
export const getValueForAggregation = (val: any, fieldConfig?: FieldConfig): number => {
  // Defensive: explicitly handle empty values by returning 0
  if (val === undefined || val === null || val === '' || val === '-' || val === '(Vide)') return 0;

  // Handle numeric values first - BOLT FIX: Corrected priority to handle date-typed numbers
  if (typeof val === 'number') {
    if (fieldConfig?.type === 'date') {
      const d = parseDateValue(val);
      return (d && !isNaN(d.getTime())) ? jsToExcelDate(d) : 0;
    }
    return (isNaN(val) || !isFinite(val)) ? 0 : val;
  }

  // BOLT OPTIMIZATION: Result caching for repeating string values
  const cacheKey = fieldConfig ? `${fieldConfig.type}:${fieldConfig.unit}:${val}` : String(val);
  const cached = AGGREGATION_VALUE_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  let result = 0;

  if (fieldConfig?.type === 'date') {
    const d = parseDateValue(val);
    result = (d && !isNaN(d.getTime())) ? jsToExcelDate(d) : 0;
  } else {
    // Si c'est une chaîne qui ressemble à une date et que le type n'est pas spécifié,
    // on tente quand même une détection pour éviter le mangling de parseSmartNumber
    const strVal = String(val).trim();
    if (strVal.includes('/') || strVal.includes('-')) {
      const d = parseDateValue(val);
      if (d && !isNaN(d.getTime())) {
        result = jsToExcelDate(d);
      } else {
        result = parseSmartNumber(val, fieldConfig?.unit);
      }
    } else {
      result = parseSmartNumber(val, fieldConfig?.unit);
    }
  }

  if (AGGREGATION_VALUE_CACHE.size > MAX_AGG_CACHE_SIZE) AGGREGATION_VALUE_CACHE.clear();
  AGGREGATION_VALUE_CACHE.set(cacheKey, result);
  return result;
};

/**
 * Détecte l'unité la plus probable dans une liste de valeurs
 */
export const detectUnit = (values: string[]): string => {
  if (values.length === 0) return '';
  const sample = values.filter(v => v && v.trim());
  if (sample.length === 0) return '';

  const getSuffix = (s: string) => {
    const match = s.match(/[a-zA-Z€$£%°]+$/);
    return match ? match[0].trim() : '';
  };

  const candidates = sample.map(getSuffix).filter(s => s !== '');
  if (candidates.length === 0) return '';

  const counts: Record<string, number> = {};
  let maxCount = 0;
  let bestCandidate = '';

  candidates.forEach(c => {
    counts[c] = (counts[c] || 0) + 1;
    if (counts[c] > maxCount) {
      maxCount = counts[c];
      bestCandidate = c;
    }
  });

  if (maxCount >= sample.length * 0.4) return bestCandidate;
  return '';
};

/**
 * Détecte le type de colonne le plus probable
 */
export const detectColumnType = (values: string[]): 'text' | 'number' | 'boolean' | 'date' => {
  const sample: string[] = [];
  for (let i = 0; i < values.length && sample.length < 500; i++) {
    const v = values[i];
    if (v && v.trim() !== '') {
      sample.push(v);
    }
  }

  if (sample.length === 0) return 'text';

  let numberCount = 0;
  let trueBoolCount = 0;
  let zeroOneCount = 0;
  let dateCount = 0;
  let otherNumericCount = 0;

  const dateRegex = /^(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})$/;

  sample.forEach(val => {
    const cleanVal = val.trim();
    const lower = cleanVal.toLowerCase();

    if (['oui', 'non', 'yes', 'no', 'true', 'false', 'vrai', 'faux'].includes(lower)) {
      trueBoolCount++;
    } else if (['0', '1'].includes(lower)) {
      zeroOneCount++;
    }

    if (dateRegex.test(cleanVal) && !isNaN(Date.parse(cleanVal.split('/').reverse().join('-')))) {
      dateCount++;
    }

    const hasNumbers = /[0-9]/.test(cleanVal);
    if (hasNumbers) {
      const withoutUnit = cleanVal
        .replace(/[\s]?[a-zA-Z%€$£%°]+$/, '')
        .replace(/^[$€£][\s]?/, '');

      const isPurelyNumeric = /^[-+0-9.,\s]*$/.test(withoutUnit);

      if (isPurelyNumeric) {
        const cleanNum = withoutUnit.replace(/[^0-9.,-]/g, '');
        const parsed = parseFloat(cleanNum.replace(',', '.'));

        if (!isNaN(parsed)) {
          numberCount++;
          if (parsed !== 0 && parsed !== 1) {
            otherNumericCount++;
          }
        }
      }
    }
  });

  const threshold = sample.length * 0.8;
  if (dateCount >= threshold) return 'date';
  if (trueBoolCount > 0 && (trueBoolCount + zeroOneCount) >= threshold && otherNumericCount === 0) return 'boolean';
  if (numberCount >= threshold || otherNumericCount > sample.length * 0.2) return 'number';
  return 'text';
};

export const extractDomain = (email: string): string => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return 'Inconnu';
  try {
    return email.split('@')[1].trim().toLowerCase();
  } catch {
    return 'Format invalide';
  }
};

/**
 * Préparation des filtres pour optimisation (évite les calculs répétitifs dans les boucles)
 */
export const prepareFilters = (filters: any[]) => {
  return filters.map(f => {
    let preparedValue = f.value;
    const isArrayIn = (f.operator === 'in' || !f.operator) && (Array.isArray(f.value) || typeof f.value === 'string');

    // BOLT OPTIMIZATION: Pre-calculate cleanField to avoid repeated regex in getRowValue
    const prefixMatch = f.field.match(/^\[.*?\] (.*)$/);
    const cleanField = prefixMatch ? prefixMatch[1] : f.field;

    if (f.operator === 'gt' || f.operator === 'lt') {
      preparedValue = parseSmartNumber(f.value);
    } else if (isArrayIn) {
      if (Array.isArray(f.value)) {
        preparedValue = new Set((f.value as any[]).map(v => String(v)));
      } else {
        const strVal = String(f.value || '');
        let values: string[] = [];
        if (strVal.includes(',')) {
          values = strVal.split(',').map(v => v.trim());
        } else if (strVal.includes(';')) {
          values = strVal.split(';').map(v => v.trim());
        } else {
          values = strVal.split(/[\s\x1F]+/).map(v => v.trim());
        }
        preparedValue = new Set(values.filter(v => v !== ''));
      }
    } else if (typeof f.value === 'string' && f.operator !== 'in') {
      preparedValue = f.value.toLowerCase();
    }
    return { ...f, preparedValue, isArrayIn, cleanField };
  });
};

/**
 * Applique un filtre préparé sur une ligne de données
 * BOLT OPTIMIZATION: Hoisted regex-based field lookup and added result caching for string ops.
 */
export const applyPreparedFilters = (row: any, preparedFilters: any[]): boolean => {
  const len = preparedFilters.length;
  if (len === 0) return true;

  for (let i = 0; i < len; i++) {
    const f = preparedFilters[i];

    // BOLT OPTIMIZATION: Direct access with fallback to avoid getRowValue regex overhead
    let rowVal = row[f.field];
    if (rowVal === undefined && f.cleanField !== f.field) {
      rowVal = row[f.cleanField];
    }

    if (f.isArrayIn && f.preparedValue instanceof Set) {
      if (f.preparedValue.size > 0 && !f.preparedValue.has(String(rowVal))) {
        return false;
      }
      continue;
    }

    if (f.operator === 'gt' || f.operator === 'lt') {
      const rowNum = parseSmartNumber(rowVal);
      if (f.operator === 'gt' && rowNum <= (f.preparedValue as number)) return false;
      if (f.operator === 'lt' && rowNum >= (f.preparedValue as number)) return false;
      continue;
    }

    const strRowVal = String(rowVal || '').toLowerCase();
    const strFilterVal = String(f.preparedValue || '');

    if (f.operator === 'starts_with') {
      if (!strRowVal.startsWith(strFilterVal)) return false;
    } else if (f.operator === 'contains') {
      if (!strRowVal.includes(strFilterVal)) return false;
    } else if (f.operator === 'eq') {
      if (strRowVal !== strFilterVal) return false;
    }
  }

  return true;
};

/**
 * Valide qu'un logo est sécurisé (data URL ou blob)
 */
export const getSafeLogo = (logo?: string): string => {
  if (!logo) return '';
  if (logo.startsWith('data:image/') || logo.startsWith('blob:')) return logo;
  return '';
};
