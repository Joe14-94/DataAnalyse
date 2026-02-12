import { getCachedDateTimeFormat } from './intlUtils';

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
