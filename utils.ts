

import { DataRow, RawImportData, ImportBatch, FieldConfig, DiagnosticSuite, DiagnosticResult } from './types';
import * as XLSX from 'xlsx';

// Updated version
export const APP_VERSION = "202511-206";

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
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
           while(fullRow.length < headers.length) fullRow.push('');
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

export const parseSmartNumber = (val: any, unit?: string): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let str = String(val);
  
  // Optimisation: Si unité présente, on l'enlève (Case Insensitive)
  if (unit && unit.length > 0) {
    // Escape special chars for regex (ex: $ or .)
    const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const unitRegex = new RegExp(escapedUnit, 'i');
    str = str.replace(unitRegex, '');
  }

  // Nettoyage générique optimisé
  // 1. Remplacer virgule par point
  str = str.replace(',', '.');
  // 2. Supprimer les espaces
  str = str.replace(/\s/g, '').replace(/\u00A0/g, '');
  // 3. Regex clean (garde chiffres, point, moins)
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
       const d = new Date(val);
       if (isNaN(d.getTime())) return val;

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
 * Détecte l'unité la plus probable dans une liste de valeurs
 */
export const detectUnit = (values: string[]): string => {
  if (values.length === 0) return '';
  const sample = values.slice(0, 10).filter(v => v && v.trim());
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
  const sample = values.slice(0, 20).filter(v => v && v.trim() !== '');
  if (sample.length === 0) return 'text';

  let numberCount = 0;
  let boolCount = 0;
  let dateCount = 0;
  
  const dateRegex = /^(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})$/;

  sample.forEach(val => {
     const cleanVal = val.trim();
     const lower = cleanVal.toLowerCase();
     if (['oui', 'non', 'yes', 'no', 'true', 'false', 'vrai', 'faux', '0', '1'].includes(lower)) boolCount++;
     if (dateRegex.test(cleanVal) && !isNaN(Date.parse(cleanVal.split('/').reverse().join('-')))) dateCount++;

     const startsWithValidNumChar = /^[-+0-9.,]/.test(cleanVal);
     const startsWithCurrency = /^[$€£]/.test(cleanVal);
     if (startsWithValidNumChar || startsWithCurrency) {
        const withoutUnit = cleanVal.replace(/[\s]?[a-zA-Z%€$£%°]+$/, '');
        const cleanNum = withoutUnit.replace(/[^0-9.,-]/g, ''); 
        if (cleanNum && !isNaN(parseFloat(cleanNum.replace(',', '.')))) numberCount++;
     }
  });

  const threshold = sample.length * 0.8;
  if (dateCount >= threshold) return 'date';
  if (boolCount >= threshold) return 'boolean';
  if (numberCount >= threshold) return 'number';
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

// --- SECURE FORMULA PARSER ENGINE ---

type TokenType = 'NUMBER' | 'STRING' | 'FIELD' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

class FormulaParser {
  private pos = 0;
  private tokens: Token[] = [];
  private row: any = {};

  constructor(formula: string, row: any) {
    this.row = row;
    this.tokens = this.tokenize(formula);
  }

  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < input.length) {
      const char = input[cursor];

      if (/\s/.test(char)) { cursor++; continue; }

      if (/[0-9]/.test(char)) {
        let val = '';
        while (cursor < input.length && /[0-9.]/.test(input[cursor])) val += input[cursor++];
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
        cursor++;
        tokens.push({ type: 'FIELD', value: val });
        continue;
      }

      if (/[a-zA-Z]/.test(char)) {
        let val = '';
        while (cursor < input.length && /[a-zA-Z0-9_]/.test(input[cursor])) val += input[cursor++];
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
      // Auto-convert to number if possible
      const num = parseSmartNumber(val);
      if (!isNaN(num) && val !== '' && val !== null && val !== undefined) return num;
      return val === undefined ? 0 : val;
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

    this.consume(); // Skip unknown
    return 0;
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
 * Remplace l'ancienne implémentation vulnérable.
 */
export const evaluateFormula = (row: any, formula: string): number | string | null => {
  if (!formula || !formula.trim()) return null;

  try {
    const parser = new FormulaParser(formula, row);
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
    const baseCount = 65 + (5-i) * 6 + (Math.random() * 15); 
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
        id: `REF-${(10-i)}-${j.toString().padStart(4, '0')}`,
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

   return suites;
};