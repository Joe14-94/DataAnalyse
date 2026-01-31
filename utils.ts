
import { DataRow, RawImportData, ImportBatch, FieldConfig, DiagnosticSuite, DiagnosticResult } from './types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Updated version
export const APP_VERSION = "2026-01-29-01";

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// --- MATH & PREDICTIVE ---
export const calculateLinearRegression = (yValues: number[]): { slope: number, intercept: number, r2: number } => {
  const n = yValues.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const xValues = Array.from({ length: n }, (_, i) => i);
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
  const sumXX = xValues.reduce((a, b) => a + b * b, 0);
  const sumYY = yValues.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R Squared calculation
  const ssTot = sumYY - (sumY * sumY) / n;
  const ssRes = sumYY - intercept * sumY - slope * sumXY; // Simplified for linear
  const r2 = 1 - (ssRes / (ssTot || 1));

  return { slope, intercept, r2 };
};

// --- INDEXED DB ENGINE ---
const DB_NAME = 'DataScopeDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const KEY_NAME = 'global_state';

export const db = {
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  save: async (data: any): Promise<void> => {
    const database = await db.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, KEY_NAME);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  load: async (): Promise<any | null> => {
    const database = await db.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  clear: async (): Promise<void> => {
    const database = await db.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
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

/**
 * Analyse le texte brut collé
 */
export const parseRawData = (text: string): RawImportData => {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headerLine = lines[0];
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const pipeCount = (headerLine.match(/\|/g) || []).length;

  let separator = '\t';
  if (semiCount > tabCount && semiCount > commaCount && semiCount > pipeCount) separator = ';';
  else if (commaCount > tabCount && commaCount > semiCount && commaCount > pipeCount) separator = ',';
  else if (pipeCount > tabCount && pipeCount > semiCount && pipeCount > commaCount) separator = '|';

  const headers = headerLine.split(separator).map(h => h.trim());

  // On filtre les lignes qui seraient totalement vides après split
  const rows = lines.slice(1).map(line => {
    const cells = line.split(separator).map(c => c.trim());
    while (cells.length < headers.length) {
      cells.push('');
    }
    return cells;
  }).filter(row => row.some(cell => cell !== '')); // Garde la ligne si au moins une cellule n'est pas vide

  return {
    headers,
    rows,
    totalRows: rows.length
  };
};

/**
 * Lit un fichier texte/CSV en gérant automatiquement l'encodage (UTF-8 ou Windows-1252)
 * Utilise TextDecoder avec fatal:true pour une détection fiable.
 */
export const readTextFile = (file: File, encoding: 'auto' | 'UTF-8' | 'windows-1252' = 'auto'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;

      if (encoding === 'auto') {
        // Tentative UTF-8 stricte
        try {
          const decoder = new TextDecoder('utf-8', { fatal: true });
          const text = decoder.decode(buffer);
          resolve(text);
        } catch (err) {
          // Echec UTF-8 -> Fallback Windows-1252 (ANSI)
          console.warn("Détection Auto : Echec UTF-8, bascule vers Windows-1252.");
          const decoder = new TextDecoder('windows-1252');
          resolve(decoder.decode(buffer));
        }
      } else {
        // Encodage forcé
        try {
          const decoder = new TextDecoder(encoding);
          resolve(decoder.decode(buffer));
        } catch (err) {
          reject(err);
        }
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Lit un fichier Excel (.xlsx, .xls) et retourne les données brutes
 */
export const readExcelFile = async (file: File): Promise<RawImportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // On prend la première feuille par défaut
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Conversion en tableau de tableaux (header: 1 signifie tableau de tableaux)
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          resolve({ headers: [], rows: [], totalRows: 0 });
          return;
        }

        // La première ligne est l'en-tête
        const headers = (jsonData[0] as string[]).map(h => String(h).trim());

        // Les autres lignes sont les données
        // On s'assure que tout est converti en string pour respecter RawImportData
        const rows = jsonData.slice(1).map(row => {
          // Remplir les cellules vides si la ligne est plus courte que les headers
          const fullRow = [...row];
          while (fullRow.length < headers.length) fullRow.push('');
          return fullRow.map(cell => cell !== undefined && cell !== null ? String(cell) : '');
        }).filter(row => row.some(cell => cell.trim() !== '')); // Filtre les lignes vides

        resolve({
          headers,
          rows,
          totalRows: rows.length
        });

      } catch (err) {
        console.error("Erreur parsing Excel", err);
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};


/**
 * Convertit les données brutes avec des clés dynamiques
 */
export const mapDataToSchema = (
  rawData: RawImportData,
  mapping: Record<number, string | 'ignore'>
): DataRow[] => {
  return rawData.rows.map(rowCells => {
    const newRow: DataRow = {
      id: generateId()
    };

    Object.entries(mapping).forEach(([colIndexStr, fieldKey]) => {
      const colIndex = parseInt(colIndexStr, 10);
      if (fieldKey === 'ignore') return;

      const cellValue = rowCells[colIndex];
      if (cellValue === undefined) return;

      // Détection basique de booléen pour les champs de type commentaire/statut
      const lower = cellValue.toLowerCase();
      if (['oui', 'yes', 'true', '1', 'vrai', 'ok'].includes(lower)) {
        newRow[fieldKey] = true;
      } else if (['non', 'no', 'false', '0', 'faux', 'ko'].includes(lower)) {
        newRow[fieldKey] = false;
      } else {
        newRow[fieldKey] = cellValue;
      }
    });

    return newRow;
  });
};

export const formatDateFr = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

export const getDaysDifference = (dateStr: string): number => {
  if (!dateStr) return 999;
  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 999;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - target.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return 999;
  }
};

/**
 * Extrait un nombre depuis une chaine avec potentiellement une unité
 * Optimisé pour la performance (Regex pre-compilé pour cas généraux)
 */
const CLEAN_NUM_REGEX = /[^0-9.-]/g;
const UNIT_REGEX_CACHE = new Map<string, RegExp>();

export const parseSmartNumber = (val: any, unit?: string): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;

  let str = String(val);

  // BOLT OPTIMIZATION: Fast path for simple numeric strings
  if (!unit && /^-?\d+(\.\d+)?$/.test(str)) {
    return parseFloat(str);
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
  return isNaN(num) ? 0 : num;
};

/**
 * Formate un nombre selon la configuration du champ
 */
export const formatNumberValue = (value: number | string, config?: FieldConfig): string => {
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
  return numVal.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + fullSuffix;
};

// Logique de regroupement de date pour le TCD et les Diagnostics
export const getGroupedLabel = (val: string, grouping: 'none' | 'year' | 'quarter' | 'month') => {
  if (!val || val === '(Vide)' || grouping === 'none') return val;

  try {
    let d: Date;

    // Détecter et parser le format français DD/MM/YYYY ou DD/MM/YY
    if (typeof val === 'string' && val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        const part1 = parseInt(parts[0]);
        const part2 = parseInt(parts[1]);
        const part3 = parseInt(parts[2]);

        // Détecter le format : si part1 > 12, c'est forcément DD/MM/YYYY
        // Si part2 > 12, c'est forcément MM/DD/YYYY (mais on privilégie DD/MM/YYYY)
        if (part1 > 12) {
          // Format DD/MM/YYYY (jour > 12)
          const day = part1;
          const month = part2;
          const year = part3 < 100 ? 2000 + part3 : part3;
          d = new Date(year, month - 1, day);
        } else if (part2 > 12) {
          // Format MM/DD/YYYY (mois > 12, donc c'est le jour)
          const month = part1;
          const day = part2;
          const year = part3 < 100 ? 2000 + part3 : part3;
          d = new Date(year, month - 1, day);
        } else {
          // Ambigu : on privilégie le format français DD/MM/YYYY
          const day = part1;
          const month = part2;
          const year = part3 < 100 ? 2000 + part3 : part3;
          d = new Date(year, month - 1, day);
        }

        // Vérifier que la date est valide
        if (isNaN(d.getTime())) {
          // Réessayer avec new Date() natif
          d = new Date(val);
          if (isNaN(d.getTime())) return val;
        }
      } else {
        d = new Date(val);
        if (isNaN(d.getTime())) return val;
      }
    } else {
      d = new Date(val);
      if (isNaN(d.getTime())) return val;
    }

    if (grouping === 'year') {
      return d.getFullYear().toString();
    }
    if (grouping === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `${d.getFullYear()}-T${q}`;
    }
    if (grouping === 'month') {
      // ISO format pour le tri correct, formaté ensuite si besoin
      return d.toISOString().slice(0, 7); // YYYY-MM
    }
  } catch (e) {
    return val;
  }
  return val;
};

/**
 * Formate un label de colonne de date pour l'affichage en français
 * Convertit les formats ISO en formats français lisibles
 */
export const formatDateLabelForDisplay = (label: string): string => {
  if (!label || label === '(Vide)') return label;

  // Format YYYY-MM (mois ISO) -> MM/YYYY (français)
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-');
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  }

  // Format YYYY-TQ (trimestre) -> TQ YYYY (français)
  if (/^\d{4}-T\d$/.test(label)) {
    const [year, quarter] = label.split('-');
    return `${quarter} ${year}`;
  }

  // Format YYYY-MM-DD (ISO date) -> DD/MM/YYYY (français)
  if (/^\d{4}-\d{2}-\d{2}/.test(label)) {
    const date = new Date(label);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
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
 * Amélioration : échantillonnage sur 100 lignes et meilleure détection des booléens
 */
export const detectColumnType = (values: string[]): 'text' | 'number' | 'boolean' | 'date' => {
  const sample = values.filter(v => v && v.trim() !== '');
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
  } catch (e) {
    return 'Format invalide';
  }
};

/**
 * Préparation des filtres pour optimisation (évite les calculs répétitifs dans les boucles)
 */
export const prepareFilters = (filters: any[]) => {
  return filters.map(f => {
    let preparedValue = f.value;
    const isArrayIn = (f.operator === 'in' || !f.operator) && Array.isArray(f.value);

    if (f.operator === 'gt' || f.operator === 'lt') {
      preparedValue = parseSmartNumber(f.value);
    } else if (isArrayIn) {
      // BOLT OPTIMIZATION: Convert filter array to Set for O(1) lookups
      preparedValue = new Set((f.value as any[]).map(v => String(v)));
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
    const rowVal = row[f.field];

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

// --- EXPORT FUNCTION (PDF/HTML) ---
export const exportView = async (
  format: 'pdf' | 'html',
  elementId: string,
  title: string,
  logo?: string,
  pdfMode: 'A4' | 'adaptive' = 'adaptive' // Nouvelle option pour contrôler la hauteur
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Élément introuvable pour l\'export');
    return;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}`;

  if (format === 'pdf') {
    try {
      // 1. Clone element to remove scrollbars and show full content
      const clone = element.cloneNode(true) as HTMLElement;

      // Force styles on clone to ensure visibility of full content
      clone.style.position = 'fixed';
      clone.style.top = '-10000px';
      clone.style.left = '0';
      clone.style.width = '1200px'; // Force fixed width to ensure consistency
      clone.style.height = 'auto'; // Let height grow
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.zIndex = '-1';
      clone.style.background = 'white';

      // Inject clone into body
      document.body.appendChild(clone);

      // 2. Capture content
      const canvas = await html2canvas(clone, {
        scale: 2, // Better resolution
        useCORS: true,
        logging: false,
        windowWidth: 1200 // Match clone width
      });

      // Remove clone
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // 3. Setup PDF
      // A4 Size in mm: 210 x 297
      const pdfWidthMM = 297; // Landscape default preference for tables
      const margin = 10;
      const contentWidthMM = pdfWidthMM - (margin * 2);

      // Calculate scaled image dimensions in mm
      const ratio = contentWidthMM / imgWidth;
      const scaledHeightMM = imgHeight * ratio;

      let pdfHeightMM = 210; // Default A4 Height (Landscape)
      let orientation: 'p' | 'l' = 'l';

      if (pdfMode === 'adaptive') {
        // Mode Adaptive: PDF page height grows to fit content
        // We add extra space for Header (30mm) + Image Height + Margin
        pdfHeightMM = Math.max(210, scaledHeightMM + 40);
        // Orientation doesn't matter much with custom size, but let's keep logic simple
      } else {
        // Mode A4 Standard: We fit into A4
        // If content is very tall, it will be shrunk (user choice)
        orientation = scaledHeightMM > 210 ? 'p' : 'l';
        if (orientation === 'p') {
          // Recalculate for Portrait
          // A4 Portrait: 210 width
          const pContentWidth = 210 - (margin * 2);
          const pRatio = pContentWidth / imgWidth;
          const pScaledHeight = imgHeight * pRatio;
          // If strictly 'A4' (not adaptive), we might just fit vertically? 
          // Usually for charts 'A4' means fit on one page.
          // If table is super long, it will be tiny.
        }
      }

      // Initialize PDF with dynamic or static size
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfMode === 'adaptive' ? [pdfWidthMM, pdfHeightMM] : 'a4'
      });

      // Recalculate content width based on final PDF page width (in case of Adaptive)
      const finalPdfWidth = pdf.internal.pageSize.getWidth();
      const finalPdfHeight = pdf.internal.pageSize.getHeight();

      // Header with Logo
      let startY = 10;
      if (logo) {
        pdf.addImage(logo, 'PNG', 10, 10, 25, 12); // Small logo top left
        startY = 25;
      }

      // Title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, logo ? 40 : 10, 18);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Exporté le ${new Date().toLocaleDateString()}`, logo ? 40 : 10, 24);

      // Render Image
      const renderWidth = finalPdfWidth - (margin * 2);
      const renderHeight = (imgHeight * renderWidth) / imgWidth;

      // If A4 strict mode, check bounds
      let finalRenderHeight = renderHeight;
      let finalRenderWidth = renderWidth;

      if (pdfMode === 'A4') {
        const availableHeight = finalPdfHeight - startY - margin;
        if (renderHeight > availableHeight) {
          const fitRatio = availableHeight / renderHeight;
          finalRenderHeight = availableHeight;
          finalRenderWidth = renderWidth * fitRatio;
        }
      }

      pdf.addImage(imgData, 'PNG', margin, startY + 5, finalRenderWidth, finalRenderHeight);
      pdf.save(`${filename}.pdf`);

    } catch (err) {
      console.error('PDF Export Error', err);
      alert('Erreur lors de la génération du PDF');
    }
  }

  else if (format === 'html') {
    try {
      // Clone element to sanitize and ensure styles
      // For a robust HTML export, we embed a minimal HTML structure with Tailwind CDN

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { padding: 2rem; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
            .export-container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
            .logo { height: 40px; width: auto; object-fit: contain; }
            .title h1 { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin: 0; }
            .title p { font-size: 0.875rem; color: #64748b; margin: 0; }
          </style>
        </head>
        <body>
          <div class="export-container">
            <div class="header">
              ${logo ? `<img src="${logo}" class="logo" alt="Logo" />` : ''}
              <div class="title">
                <h1>${title}</h1>
                <p>Exporté le ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div class="content">
              ${element.innerHTML}
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (`${filename}.html`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);

    } catch (err) {
      console.error('HTML Export Error', err);
      alert('Erreur lors de l\'export HTML');
    }
  }
};

// --- SECURE FORMULA PARSER ENGINE ---

type TokenType = 'NUMBER' | 'STRING' | 'FIELD' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

// BOLT OPTIMIZATION: Global cache for tokenized formulas to avoid repeated parsing
const FORMULA_CACHE = new Map<string, Token[]>();

class FormulaParser {
  private pos = 0;
  private tokens: Token[];
  private row: any;

  constructor(tokens: Token[], row: any) {
    this.tokens = tokens;
    this.row = row;
  }

  private error(message: string): never {
    throw new Error(`Erreur de formule: ${message}`);
  }

  public static tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < input.length) {
      const char = input[cursor];

      // BOLT OPTIMIZATION: Faster whitespace check (including non-breaking space for FR format)
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\u00A0') { cursor++; continue; }

      // BOLT OPTIMIZATION: Faster digit check
      if (char >= '0' && char <= '9') {
        let val = '';
        while (cursor < input.length && ((input[cursor] >= '0' && input[cursor] <= '9') || input[cursor] === '.')) val += input[cursor++];
        tokens.push({ type: 'NUMBER', value: val });
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        cursor++;
        let val = '';
        while (cursor < input.length && input[cursor] !== quote) val += input[cursor++];
        cursor++;
        tokens.push({ type: 'STRING', value: val });
        continue;
      }

      if (char === '[') {
        cursor++;
        let val = '';
        while (cursor < input.length && input[cursor] !== ']') val += input[cursor++];

        // Vérifier que le bracket fermant a bien été trouvé
        if (cursor >= input.length || input[cursor] !== ']') {
          throw new Error(`Erreur de syntaxe: bracket fermant ']' manquant pour le champ`);
        }

        cursor++; // Consommer le ']'
        tokens.push({ type: 'FIELD', value: val });
        continue;
      }

      if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
        let val = '';
        while (cursor < input.length && ((input[cursor] >= 'a' && input[cursor] <= 'z') || (input[cursor] >= 'A' && input[cursor] <= 'Z') || (input[cursor] >= '0' && input[cursor] <= '9') || input[cursor] === '_')) val += input[cursor++];
        tokens.push({ type: 'IDENTIFIER', value: val.toUpperCase() });
        continue;
      }

      if (['+', '-', '*', '/', '(', ')', ',', '>', '<', '=', '!'].includes(char)) {
        const next = input[cursor + 1];
        const doubleChar = char + next;
        if (['>=', '<=', '<>', '==', '!='].includes(doubleChar)) {
          tokens.push({ type: 'OPERATOR', value: doubleChar === '==' ? '=' : doubleChar === '!=' ? '<>' : doubleChar });
          cursor += 2;
        } else {
          let type: TokenType = 'OPERATOR';
          if (char === '(') type = 'LPAREN';
          else if (char === ')') type = 'RPAREN';
          else if (char === ',') type = 'COMMA';
          tokens.push({ type, value: char });
          cursor++;
        }
        continue;
      }
      cursor++;
    }
    return tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  public evaluate(): any {
    this.pos = 0;
    if (this.tokens.length === 0) return null;
    return this.parseExpression();
  }

  private parseExpression(): any {
    let left = this.parseTerm();
    while (this.peek().type === 'OPERATOR' && ['+', '-', '>', '<', '>=', '<=', '=', '<>'].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseTerm();
      if (op === '+') left = (Number(left) || 0) + (Number(right) || 0);
      else if (op === '-') left = (Number(left) || 0) - (Number(right) || 0);
      else if (op === '>') left = left > right;
      else if (op === '<') left = left < right;
      else if (op === '>=') left = left >= right;
      else if (op === '<=') left = left <= right;
      else if (op === '=') left = left == right;
      else if (op === '<>') left = left != right;
    }
    return left;
  }

  private parseTerm(): any {
    let left = this.parseFactor();
    while (this.peek().type === 'OPERATOR' && ['*', '/'].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseFactor();
      if (op === '*') left = (Number(left) || 0) * (Number(right) || 0);
      else if (op === '/') {
        const r = Number(right) || 0;
        left = r !== 0 ? (Number(left) || 0) / r : 0;
      }
    }
    return left;
  }

  private parseFactor(): any {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      this.consume();
      return parseFloat(token.value);
    }

    if (token.type === 'STRING') {
      this.consume();
      return token.value;
    }

    if (token.type === 'FIELD') {
      this.consume();
      const val = this.row[token.value];

      // Si la valeur n'existe pas, retourner 0
      if (val === undefined || val === null) return 0;

      // Si c'est déjà un nombre, le retourner
      if (typeof val === 'number') return val;

      // Si c'est une chaîne qui ressemble à un nombre, la convertir
      const strVal = String(val).trim();
      // Accepter les nombres avec ou sans unités (€, kg, %, etc.)
      if (strVal !== '' && /^[-+]?[\d\s.,]+[\w€$£%°]*$/.test(strVal)) {
        const num = parseSmartNumber(val);
        if (!isNaN(num)) return num;
      }

      // Sinon, retourner la valeur telle quelle (texte, booléen, etc.)
      return val;
    }

    if (token.type === 'IDENTIFIER') {
      return this.parseFunctionCall();
    }

    if (token.type === 'LPAREN') {
      this.consume();
      const expr = this.parseExpression();
      if (this.peek().type === 'RPAREN') this.consume();
      return expr;
    }

    // Unary minus
    if (token.type === 'OPERATOR' && token.value === '-') {
      this.consume();
      return -this.parseFactor();
    }

    // Token invalide : lever une exception au lieu de retourner 0
    this.error(`Token inattendu: ${token.type} "${token.value}"`);
  }

  private parseFunctionCall(): any {
    const funcName = this.consume().value;
    if (this.peek().type !== 'LPAREN') return 0;
    this.consume(); // (

    const args: any[] = [];
    if (this.peek().type !== 'RPAREN') {
      args.push(this.parseExpression());
      while (this.peek().type === 'COMMA') {
        this.consume();
        args.push(this.parseExpression());
      }
    }
    if (this.peek().type === 'RPAREN') this.consume();

    // Dispatch Function
    switch (funcName) {
      case 'SI': case 'IF':
        return args[0] ? args[1] : args[2];
      case 'SOMME': case 'SUM':
        return args.reduce((a, b) => a + (Number(b) || 0), 0);
      case 'MOYENNE': case 'AVG': case 'AVERAGE':
        const nums = args.filter(a => typeof a === 'number');
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      case 'MIN':
        return Math.min(...args.map(n => Number(n) || 0));
      case 'MAX':
        return Math.max(...args.map(n => Number(n) || 0));
      case 'ABS':
        return Math.abs(Number(args[0]) || 0);
      case 'ARRONDI': case 'ROUND':
        const p = Math.pow(10, args[1] || 0);
        return Math.round((Number(args[0]) || 0) * p) / p;
      case 'CONCAT':
        return args.join('');
      case 'MAJUSCULE': case 'UPPER':
        return String(args[0] || '').toUpperCase();
      case 'MINUSCULE': case 'LOWER':
        return String(args[0] || '').toLowerCase();
      default:
        return 0;
    }
  }
}

/**
 * Évalue une formule de manière sécurisée sans utiliser eval() ni new Function()
 * BOLT OPTIMIZATION: Uses a global cache for tokenized formulas to improve performance in loops.
 */
export const evaluateFormula = (row: any, formula: string): number | string | null => {
  if (!formula || !formula.trim()) return null;

  try {
    let tokens = FORMULA_CACHE.get(formula);
    if (!tokens) {
      tokens = FormulaParser.tokenize(formula);
      FORMULA_CACHE.set(formula, tokens);
    }

    const parser = new FormulaParser(tokens, row);
    const result = parser.evaluate();

    // Nettoyage résultat final
    if (typeof result === 'number') {
      if (!isFinite(result) || isNaN(result)) return null;
      return Math.round(result * 10000) / 10000; // Round to 4 decimals
    }
    return result;
  } catch (e) {
    // Fail silently on syntax error to avoid crashing UI
    return null;
  }
};

// Données partagées pour les jointures
const ORGS_LIST = ['TechCorp', 'Innovate SA', 'Global Services', 'Alpha Solutions', 'Mairie de Paris', 'Ministère Intérieur', 'CyberDefense Ltd', 'Green Energy', 'Transport Express', 'Banque Populaire'];

/**
 * Génère des données synthétiques (RH)
 */
export const generateSyntheticData = (datasetId: string = 'demo'): ImportBatch[] => {
  const firstNames = ['Pierre', 'Paul', 'Jacques', 'Marie', 'Sophie', 'Isabelle', 'Thomas', 'Lucas', 'Nicolas', 'Julien', 'Camille', 'Antoine', 'Sarah', 'Alexandre', 'Manon', 'Emma', 'Chloé', 'Inès'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand'];
  const domains = ['gmail.com', 'outlook.com', 'techcorp.com', 'innovate.fr', 'gouv.fr', 'cyber-defense.eu', 'energy.com'];

  const batches: ImportBatch[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(15);

    const dateStr = date.toISOString().split('T')[0];
    const baseCount = 65 + (5 - i) * 6 + (Math.random() * 15);
    const rowCount = Math.floor(baseCount);
    const rows: DataRow[] = [];

    for (let j = 0; j < rowCount; j++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

      let orgIndex = Math.floor(Math.random() * 6);
      if (i === 0) orgIndex = Math.floor(Math.random() * ORGS_LIST.length);

      let domain = domains[0];
      if (orgIndex === 0) domain = 'techcorp.com';
      else if (orgIndex === 1) domain = 'innovate.fr';
      else if (orgIndex > 3) domain = 'gouv.fr';

      const hasComment = Math.random() > 0.3;
      const lastChangeDate = new Date(date);
      lastChangeDate.setDate(lastChangeDate.getDate() - Math.floor(Math.random() * 60));
      const amount = Math.floor(Math.random() * 1400) + 150;

      rows.push({
        id: `REF-${(10 - i)}-${j.toString().padStart(4, '0')}`,
        'Nom': `${firstName} ${lastName}`,
        'Email': `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        'Organisation': ORGS_LIST[orgIndex],
        'DateModif': lastChangeDate.toISOString().split('T')[0],
        'Commentaire': hasComment,
        'Budget': `${amount} k€`,
        'Quantité': Math.floor(Math.random() * 25) + 1
      });
    }

    batches.push({
      id: generateId(),
      datasetId: datasetId,
      date: dateStr,
      createdAt: Date.now() - (i * 30 * 24 * 60 * 60 * 1000),
      rows
    });
  }
  return batches;
};

/**
 * Génère des données de projets IT avec des clés communes (Organisation)
 */
export const generateProjectsData = (datasetId: string): ImportBatch[] => {
  const projectNames = [
    'Migration Cloud', 'Refonte CRM', 'Cybersécurité', 'Dashboard Analytics',
    'Formation DevOps', 'API Gateway', 'Application Mobile', 'Infrastructure Azure',
    'Data Lake', 'Automatisation RH', 'Plateforme E-commerce', 'Business Intelligence'
  ];
  const statuses = ['Planifié', 'En cours', 'En pause', 'Terminé', 'Annulé'];
  const responsables = ['Pierre Martin', 'Sophie Bernard', 'Thomas Dubois', 'Marie Laurent', 'Lucas Moreau', 'Antoine Simon', 'Sarah Michel'];

  const batches: ImportBatch[] = [];

  // Génération de 3 batches (snapshots)
  for (let i = 2; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i * 2);
    const dateStr = date.toISOString().split('T')[0];

    const rows: DataRow[] = [];
    const projectCount = 8 + Math.floor(Math.random() * 5);

    for (let j = 0; j < projectCount; j++) {
      const org = ORGS_LIST[Math.floor(Math.random() * ORGS_LIST.length)];
      const projectName = projectNames[j % projectNames.length];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const budget = (50 + Math.floor(Math.random() * 450)) + ' k€';
      const responsable = responsables[Math.floor(Math.random() * responsables.length)];

      const startDate = new Date(date);
      startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12));

      rows.push({
        id: generateId(),
        'Projet': projectName,
        'Organisation': org,
        'Statut': status,
        'DateDébut': startDate.toISOString().split('T')[0],
        'Budget': budget,
        'Responsable': responsable,
        'Priorité': ['Haute', 'Moyenne', 'Basse'][Math.floor(Math.random() * 3)]
      });
    }

    batches.push({
      id: generateId(),
      datasetId,
      date: dateStr,
      createdAt: Date.now() - (i * 60 * 24 * 60 * 60 * 1000),
      rows
    });
  }

  return batches;
};

/**
 * Génère des données budgétaires avec clés communes (Organisation)
 */
export const generateBudgetData = (datasetId: string): ImportBatch[] => {
  const departments = ['IT', 'RH', 'Marketing', 'Commercial', 'Finance', 'Juridique', 'R&D'];
  const batches: ImportBatch[] = [];

  // Génération de 4 batches (trimestres)
  for (let quarter = 0; quarter < 4; quarter++) {
    const date = new Date(2024, quarter * 3, 1);
    const dateStr = date.toISOString().split('T')[0];
    const quarterLabel = `Q${quarter + 1} 2024`;

    const rows: DataRow[] = [];

    // Pour chaque organisation, créer plusieurs départements
    for (let i = 0; i < 6; i++) {
      const org = ORGS_LIST[i];
      const deptsCount = 3 + Math.floor(Math.random() * 3);

      for (let j = 0; j < deptsCount; j++) {
        const dept = departments[j % departments.length];
        const previsionnel = 100 + Math.floor(Math.random() * 500);
        const realise = previsionnel + Math.floor((Math.random() - 0.5) * 60);
        const ecart = realise - previsionnel;

        rows.push({
          id: generateId(),
          'Département': dept,
          'Organisation': org,
          'Prévisionnel': `${previsionnel} k€`,
          'Réalisé': `${realise} k€`,
          'Ecart': `${ecart >= 0 ? '+' : ''}${ecart} k€`,
          'Trimestre': quarterLabel
        });
      }
    }

    batches.push({
      id: generateId(),
      datasetId,
      date: dateStr,
      createdAt: Date.now() - ((3 - quarter) * 90 * 24 * 60 * 60 * 1000),
      rows
    });
  }

  return batches;
};

/**
 * Génère des données de ventes avec produits et organisations
 */
export const generateSalesData = (datasetId: string): ImportBatch[] => {
  const products = ['Licence Pro', 'Licence Standard', 'Support Premium', 'Support Basic', 'Formation', 'Consulting'];
  const regions = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];

  const batches: ImportBatch[] = [];

  // Génération de 6 batches (mois)
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const dateStr = date.toISOString().split('T')[0];

    const rows: DataRow[] = [];
    const salesCount = 20 + Math.floor(Math.random() * 30);

    for (let j = 0; j < salesCount; j++) {
      const org = ORGS_LIST[Math.floor(Math.random() * ORGS_LIST.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = 1 + Math.floor(Math.random() * 50);
      const unitPrice = product.includes('Premium') ? 500 : (product.includes('Licence') ? 200 : 150);
      const total = quantity * unitPrice;
      const region = regions[Math.floor(Math.random() * regions.length)];

      const saleDate = new Date(date);
      saleDate.setDate(Math.floor(Math.random() * 28) + 1);

      rows.push({
        id: generateId(),
        'Produit': product,
        'Organisation': org,
        'Région': region,
        'Quantité': quantity,
        'Prix Unitaire': `${unitPrice} €`,
        'Montant Total': `${total} €`,
        'Date Vente': saleDate.toISOString().split('T')[0],
        'Commercial': ['Alice Dupont', 'Bob Martin', 'Claire Durand', 'David Leroy'][Math.floor(Math.random() * 4)]
      });
    }

    batches.push({
      id: generateId(),
      datasetId,
      date: dateStr,
      createdAt: Date.now() - (i * 30 * 24 * 60 * 60 * 1000),
      rows
    });
  }

  return batches;
};

// --- AUDIT SYSTEM ---
export const runSelfDiagnostics = (): DiagnosticSuite[] => {
  const suites: DiagnosticSuite[] = [];

  // SUITE 1: Parsing Numérique
  const parsingTests: DiagnosticResult[] = [
    { id: '1', name: 'Nombre simple (123)', status: 'success', expected: 123, actual: parseSmartNumber('123') },
    { id: '2', name: 'Nombre décimal (12.5)', status: 'success', expected: 12.5, actual: parseSmartNumber('12.5') },
    { id: '3', name: 'Nombre avec unité (10 k€)', status: 'success', expected: 10, actual: parseSmartNumber('10 k€', 'k€') },
    { id: '4', name: 'Espace insécable (1 000)', status: 'success', expected: 1000, actual: parseSmartNumber('1 000') },
    { id: '5', name: 'Format FR (1.000,50)', status: 'success', expected: 1000.5, actual: parseSmartNumber('1.000,50') },
  ];
  parsingTests.forEach(t => {
    if (t.actual !== t.expected) { t.status = 'failure'; t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`; }
  });
  suites.push({ category: 'Moteur de Parsing Numérique', tests: parsingTests });

  // SUITE 2: Moteur de Formule (Tests du nouveau parser)
  const formulaTests: DiagnosticResult[] = [
    { id: 'f1', name: 'Opération simple', status: 'success', expected: 100, actual: evaluateFormula({ 'A': 10, 'B': 10 }, '[A] * [B]') },
    { id: 'f2', name: 'Calcul avec unité', status: 'success', expected: 120, actual: evaluateFormula({ 'Prix': '10 €', 'Qte': 12 }, '[Prix] * [Qte]') },
    { id: 'f3', name: 'Fonction SI', status: 'success', expected: 'Grand', actual: evaluateFormula({ 'Age': 20 }, "SI([Age] > 18, 'Grand', 'Petit')") },
    { id: 'f4', name: 'Fonction SOMME', status: 'success', expected: 30, actual: evaluateFormula({ 'A': 10, 'B': 20 }, "SOMME([A], [B])") },
    { id: 'f5', name: 'Priorité opérateurs', status: 'success', expected: 14, actual: evaluateFormula({}, "2 + 3 * 4") },
    { id: 'f6', name: 'Parenthèses', status: 'success', expected: 20, actual: evaluateFormula({}, "(2 + 3) * 4") },
  ];
  formulaTests.forEach(t => {
    if (t.actual !== t.expected) { t.status = 'failure'; t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`; }
  });
  suites.push({ category: 'Calculateur de Champs (Parser Sécurisé)', tests: formulaTests });

  // SUITE 3: Regroupement TCD
  const groupingTests: DiagnosticResult[] = [
    { id: 'd1', name: 'Année (2025-01-15)', expected: '2025', actual: getGroupedLabel('2025-01-15', 'year'), status: 'success' },
    { id: 'd2', name: 'Mois (2025-01-15)', expected: '2025-01', actual: getGroupedLabel('2025-01-15', 'month'), status: 'success' },
  ];
  groupingTests.forEach(t => {
    if (t.actual !== t.expected) { t.status = 'failure'; t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`; }
  });
  suites.push({ category: 'Moteur de Regroupement Temporel', tests: groupingTests });

  // SUITE 4: Régression Linéaire
  const regResult = calculateLinearRegression([10, 20, 30, 40]);
  const regTest: DiagnosticResult = { id: 'r1', name: 'Régression Parfaite', status: regResult.r2 > 0.99 ? 'success' : 'failure', expected: '> 0.99', actual: regResult.r2.toFixed(2) };
  suites.push({ category: 'Moteur Statistique', tests: [regTest] });

  return suites;
};
