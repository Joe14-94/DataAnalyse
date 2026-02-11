import { ImportBatch, FieldConfig } from '../types';

// Updated version
export const APP_VERSION = "11-02-2026-03";

export const generateId = (): string => {
  return crypto.randomUUID();
};

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

// BOLT OPTIMIZATION: Global cache for Intl formatters to avoid expensive object creation
const FORMATTER_CACHE = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

export const getCachedNumberFormat = (options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = `num:${JSON.stringify(options)}`;
  let f = FORMATTER_CACHE.get(key) as Intl.NumberFormat;
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', options);
    FORMATTER_CACHE.set(key, f);
  }
  return f;
};

export const getCachedDateTimeFormat = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = `date:${JSON.stringify(options)}`;
  let f = FORMATTER_CACHE.get(key) as Intl.DateTimeFormat;
  if (!f) {
    f = new Intl.DateTimeFormat('fr-FR', options);
    FORMATTER_CACHE.set(key, f);
  }
  return f;
};

/**
 * Convertit un numéro de série Excel (OLE Automation Date) en objet Date JS
 */
export const excelToJSDate = (serial: number): Date => {
  // 25569 est le nombre de jours entre 30/12/1899 et 01/01/1970
  // On arrondit pour éviter les problèmes de précision flottante sur les secondes
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
};

/**
 * Convertit un objet Date JS en numéro de série Excel (OLE Automation Date)
 */
export const jsToExcelDate = (date: Date): number => {
  // 25569 est le nombre de jours entre 30/12/1899 et 01/01/1970
  return (date.getTime() / (1000 * 86400)) + 25569;
};

// BOLT OPTIMIZATION: Global cache for date parsing to avoid redundant parsing in tight loops
const DATE_CACHE = new Map<any, Date | null>();
const MAX_DATE_CACHE_SIZE = 10000;

/**
 * Parse une date avec support du format français DD/MM/YYYY et des dates Excel
 */
export const parseDateValue = (dateValue: any): Date | null => {
  // Defensive check for all kinds of "falsy" or "empty" date representations
  if (dateValue === undefined || dateValue === null || dateValue === '') return null;

  const sVal = String(dateValue).trim();
  if (sVal === '' || sVal === 'null' || sVal === 'undefined' || sVal === '-' || sVal === '(Vide)') return null;

  // Robust check for numeric zero in any format ("0", "0,00", 0)
  const numericVal = parseFloat(sVal.replace(',', '.'));
  if (numericVal === 0) return null;

  if (typeof dateValue === 'number' && (isNaN(dateValue) || !isFinite(dateValue))) return null;

  // BOLT OPTIMIZATION: Return cached result if available
  const cached = DATE_CACHE.get(dateValue);
  if (cached !== undefined) return cached;

  let date: Date | null = null;

  if (typeof dateValue === 'number') {
    // Détection Excel (numéros de série entre 1900 et 2173) vs Timestamps
    if (dateValue > 0 && dateValue < 100000) {
      date = excelToJSDate(dateValue);
    } else {
      date = new Date(dateValue);
    }
  } else if (typeof dateValue === 'string') {
    // Format string (ISO, DD/MM/YYYY, numeric string, etc.)
    if (/^\d{5}(\.\d+)?$/.test(dateValue)) {
      const num = parseFloat(dateValue);
      if (num > 0 && num < 100000) {
        date = excelToJSDate(num);
      }
    }

    if (!date) {
      if (dateValue.includes('/')) {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const part1 = parseInt(parts[0]);
          const part2 = parseInt(parts[1]);
          const part3 = parseInt(parts[2]);

          // Détecter le format : si part1 > 12, c'est forcément DD/MM/YYYY
          if (part1 > 12) {
            const day = part1;
            const month = part2;
            const year = part3 < 100 ? 2000 + part3 : part3;
            date = new Date(year, month - 1, day);
          } else if (part2 > 12) {
            const month = part1;
            const day = part2;
            const year = part3 < 100 ? 2000 + part3 : part3;
            date = new Date(year, month - 1, day);
          } else {
            // Ambigu : on privilégie le format français DD/MM/YYYY
            const day = part1;
            const month = part2;
            const year = part3 < 100 ? 2000 + part3 : part3;
            date = new Date(year, month - 1, day);
          }
        }
      }

      if (!date || isNaN(date.getTime())) {
        date = new Date(dateValue);
      }
    }
  } else if (dateValue instanceof Date) {
    date = dateValue;
  }

  if (!date || isNaN(date.getTime())) {
    if (DATE_CACHE.size < MAX_DATE_CACHE_SIZE) DATE_CACHE.set(dateValue, null);
    return null;
  }

  if (DATE_CACHE.size < MAX_DATE_CACHE_SIZE) DATE_CACHE.set(dateValue, date);
  return date;
};

/**
 * Prépare une valeur pour l'agrégation numérique (TCD).
 * Gère les dates (conversion en numéro de série Excel) et les nombres.
 */
export const getValueForAggregation = (val: any, fieldConfig?: FieldConfig): number => {
  if (val === undefined || val === null || val === '') return 0;

  if (fieldConfig?.type === 'date') {
    const d = parseDateValue(val);
    if (d) return jsToExcelDate(d);
    return 0;
  }

  if (typeof val === 'number') return val;

  // Si c'est une chaîne qui ressemble à une date et que le type n'est pas spécifié,
  // on tente quand même une détection pour éviter le mangling de parseSmartNumber
  if (typeof val === 'string' && (val.includes('/') || val.includes('-'))) {
    const d = parseDateValue(val);
    if (d) return jsToExcelDate(d);
  }

  return parseSmartNumber(val, fieldConfig?.unit);
};

export const formatDateFr = (dateStr: string | number): string => {
  const date = parseDateValue(dateStr);
  if (!date) return '-';

  try {
    return getCachedDateTimeFormat({
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return String(dateStr);
  }
};

export const getDaysDifference = (dateStr: any): number => {
  if (!dateStr) return 999;
  try {
    const target = parseDateValue(dateStr);
    if (!target) return 999;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - target.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
};

/**
 * Formate une différence en jours (delta de dates)
 */
export const formatDateDelta = (days: number): string => {
  if (days === 0) return '-';
  const prefix = days > 0 ? '+' : '';
  const rounded = Math.round(days * 10) / 10; // Garder une décimale si nécessaire
  return `${prefix}${rounded} j`;
};

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
  if (typeof val === 'number') return val;

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

// BOLT OPTIMIZATION: Global cache for grouped labels to avoid redundant date parsing
const GROUPED_LABEL_CACHE = new Map<string, string>();

// Logique de regroupement de date pour le TCD et les Diagnostics
export const getGroupedLabel = (val: string, grouping: 'none' | 'year' | 'quarter' | 'month') => {
  if (!val || val === '(Vide)' || grouping === 'none') return val;

  const cacheKey = `${grouping}:${val}`;
  const cached = GROUPED_LABEL_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  let result = val;
  try {
    const d = parseDateValue(val);
    if (!d) return val;

    if (grouping === 'year') {
      result = d.getFullYear().toString();
    } else if (grouping === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      result = `${d.getFullYear()}-T${q}`;
    } else if (grouping === 'month') {
      // ISO format pour le tri correct, formaté ensuite si besoin
      result = d.toISOString().slice(0, 7); // YYYY-MM
    }
  } catch {
    result = val;
  }

  GROUPED_LABEL_CACHE.set(cacheKey, result);
  return result;
};

/**
 * Formate un label de colonne de date pour l'affichage en français
 * Convertit les formats ISO ou Excel en formats français lisibles
 */
export const formatDateLabelForDisplay = (label: string): string => {
  if (!label || label === '(Vide)') return label;

  // Format YYYY-MM (mois ISO) -> MM/YYYY (français)
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-');
    return `${month}/${year}`;
  }

  // Format YYYY-TQ (trimestre) -> TQ YYYY (français)
  if (/^\d{4}-T\d$/.test(label)) {
    const [year, quarter] = label.split('-');
    return `${quarter} ${year}`;
  }

  // Utilisation de parseDateValue pour gérer tous les autres formats (ISO, US, Excel...)
  const date = parseDateValue(label);
  if (date && !isNaN(date.getTime())) {
    return formatDateFr(label);
  }

  return label;
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
 * BOLT OPTIMIZATION: Sampling on 100 lines and avoid O(N) filter() for large datasets.
 */
export const detectColumnType = (values: string[]): 'text' | 'number' | 'boolean' | 'date' => {
  // BOLT OPTIMIZATION: Use a representative sample for performance on large datasets
  const sample: string[] = [];
  for (let i = 0; i < values.length && sample.length < 500; i++) {
    const v = values[i];
    if (v && v.trim() !== '') {
      sample.push(v);
    }
  }

  if (sample.length === 0) return 'text';

  let numberCount = 0;
  let trueBoolCount = 0; // Vrais booléens (oui, non, true, false, etc.)
  let zeroOneCount = 0; // Compteur pour 0 et 1
  let dateCount = 0;
  let otherNumericCount = 0; // Autres nombres (2, 3, 4, -5, 10.5, etc.)

  const dateRegex = /^(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})$/;

  sample.forEach(val => {
    const cleanVal = val.trim();
    const lower = cleanVal.toLowerCase();

    // Détection des vrais booléens (sans 0 et 1)
    if (['oui', 'non', 'yes', 'no', 'true', 'false', 'vrai', 'faux'].includes(lower)) {
      trueBoolCount++;
    } else if (['0', '1'].includes(lower)) {
      // 0 et 1 sont comptés séparément
      zeroOneCount++;
    }

    // Détection des dates
    if (dateRegex.test(cleanVal) && !isNaN(Date.parse(cleanVal.split('/').reverse().join('-')))) {
      dateCount++;
    }

    // Détection des nombres (y compris pourcentages et unités)
    const hasNumbers = /[0-9]/.test(cleanVal);
    if (hasNumbers) {
      // Supprimer les unités courantes à la fin ou au début
      const withoutUnit = cleanVal
        .replace(/[\s]?[a-zA-Z%€$£%°]+$/, '') // Unité à la fin (ex: 12.5 %)
        .replace(/^[$€£][\s]?/, '');         // Symbole au début (ex: $ 100)

      // On vérifie si la partie restante est purement numérique
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

  // Dates en priorité
  if (dateCount >= threshold) return 'date';

  // Booléens : SEULEMENT si on a des vrais mots booléens ET PAS d'autres nombres
  // Si on a seulement des 0 et 1 SANS vrais booléens, c'est probablement numérique
  if (trueBoolCount > 0 && (trueBoolCount + zeroOneCount) >= threshold && otherNumericCount === 0) {
    return 'boolean';
  }

  // Nombres : si on a beaucoup de valeurs numériques OU si on a des nombres autres que 0/1
  if (numberCount >= threshold || otherNumericCount > sample.length * 0.2) {
    return 'number';
  }

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

    if (f.operator === 'gt' || f.operator === 'lt') {
      preparedValue = parseSmartNumber(f.value);
    } else if (isArrayIn) {
      if (Array.isArray(f.value)) {
        // BOLT OPTIMIZATION: Convert filter array to Set for O(1) lookups
        preparedValue = new Set((f.value as any[]).map(v => String(v)));
      } else {
        // Support multiple values as string (e.g. pasted from Excel or comma-separated)
        const strVal = String(f.value || '');
        let values: string[] = [];

        // Heuristic: If commas are present, use them as primary separators.
        // Otherwise, split by semicolon, then by whitespace (space, tab, newline).
        if (strVal.includes(',')) {
          values = strVal.split(',').map(v => v.trim());
        } else if (strVal.includes(';')) {
          values = strVal.split(';').map(v => v.trim());
        } else {
          // Split by any whitespace or special \x1F separator
          values = strVal.split(/[\s\x1F]+/).map(v => v.trim());
        }

        preparedValue = new Set(values.filter(v => v !== ''));
      }
    } else if (typeof f.value === 'string' && f.operator !== 'in') {
      preparedValue = f.value.toLowerCase();
    }
    return { ...f, preparedValue, isArrayIn };
  });
};

/**
 * Applique un filtre préparé sur une ligne de données
 */
export const applyPreparedFilters = (row: any, preparedFilters: any[]): boolean => {
  if (preparedFilters.length === 0) return true;

  for (const f of preparedFilters) {
    const rowVal = getRowValue(row, f.field);

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

    if (f.operator === 'starts_with' && !strRowVal.startsWith(strFilterVal)) return false;
    if (f.operator === 'contains' && !strRowVal.includes(strFilterVal)) return false;
    if (f.operator === 'eq' && strRowVal !== strFilterVal) return false;
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
