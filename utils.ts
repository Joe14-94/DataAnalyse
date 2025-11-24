

import { DataRow, RawImportData, ImportBatch, FieldConfig, DiagnosticSuite, DiagnosticResult } from './types';
import * as XLSX from 'xlsx';

// Updated version
export const APP_VERSION = "202511-174";

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
 * Ex: ["10 kg", "20 kg", "5 kg"] -> "kg"
 */
export const detectUnit = (values: string[]): string => {
  if (values.length === 0) return '';

  // On regarde les suffixes communs
  // Stratégie simple : On prend la première valeur non vide, on regarde si elle a des caractères non numériques à la fin
  const sample = values.slice(0, 10).filter(v => v && v.trim());
  if (sample.length === 0) return '';

  // Fonction pour extraire le suffixe non numérique (ex: " k€" ou "kg")
  const getSuffix = (s: string) => {
    // Capture tout ce qui n'est pas chiffre/point/virgule/tiret à la fin
    // On ignore les espaces avant le suffixe pour le comptage, mais on les inclura si besoin dans le résultat final si nécessaire
    // Ici on extrait purement l'unité textuelle
    const match = s.match(/[a-zA-Z€$£%°]+$/); 
    return match ? match[0].trim() : '';
  };

  const candidates = sample.map(getSuffix).filter(s => s !== '');
  if (candidates.length === 0) return '';

  // Trouver le candidat le plus fréquent
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

  // Si le candidat apparait dans plus de 40% des cas non vides (tolérance pour cellules vides ou mal formatées)
  if (maxCount >= sample.length * 0.4) {
    return bestCandidate;
  }

  return '';
};

/**
 * Détecte le type de colonne le plus probable (Text, Number, Boolean, Date)
 */
export const detectColumnType = (values: string[]): 'text' | 'number' | 'boolean' | 'date' => {
  const sample = values.slice(0, 20).filter(v => v && v.trim() !== '');
  if (sample.length === 0) return 'text';

  let numberCount = 0;
  let boolCount = 0;
  let dateCount = 0;
  
  // Regex dates communes : YYYY-MM-DD ou DD/MM/YYYY ou DD-MM-YYYY
  const dateRegex = /^(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})$/;

  sample.forEach(val => {
     const cleanVal = val.trim();
     const lower = cleanVal.toLowerCase();
     
     // Check Boolean
     if (['oui', 'non', 'yes', 'no', 'true', 'false', 'vrai', 'faux', '0', '1'].includes(lower)) {
        boolCount++;
     }
     
     // Check Date
     // On vérifie d'abord le regex, puis si c'est une date valide JS
     if (dateRegex.test(cleanVal) && !isNaN(Date.parse(cleanVal.split('/').reverse().join('-')))) {
        dateCount++;
     }

     // Check Number (supporte 1,000.00 ou 1.000,00 ET les unités suffixées comme 10 k€)
     // Stratégie : On retire l'unité probable (lettres/symboles à la fin), puis on check si c'est un nombre
     // IMPORTANT: Une chaine qui commence par des lettres (ex: "Ref 123") n'est PAS un nombre.
     // Seuls les nombres commençant par un chiffre, un signe ou un symbole monétaire sont acceptés.
     
     // 1. Check start
     const startsWithValidNumChar = /^[-+0-9.,]/.test(cleanVal);
     const startsWithCurrency = /^[$€£]/.test(cleanVal);
     
     if (startsWithValidNumChar || startsWithCurrency) {
        // 2. Remove potential unit at the end
        const withoutUnit = cleanVal.replace(/[\s]?[a-zA-Z%€$£%°]+$/, '');
        // 3. Clean grouping separators
        const cleanNum = withoutUnit.replace(/[^0-9.,-]/g, ''); 
        
        if (cleanNum && !isNaN(parseFloat(cleanNum.replace(',', '.')))) {
           numberCount++;
        }
     }
  });

  const threshold = sample.length * 0.8; // 80% de correspondance requise

  if (dateCount >= threshold) return 'date';
  if (boolCount >= threshold) return 'boolean';
  // Priorité à Date sur Nombre si conflit (ex: 2025-01-01 pourrait être mal interprété si on parse mal)
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

/**
 * Évalue une formule mathématique simple avec support de fonctions avancées
 * @param row La ligne de données
 * @param formula La formule ex: "[Prix] * [Quantité]" ou "SI([Age]>18, 'Majeur', 'Mineur')"
 */
export const evaluateFormula = (row: any, formula: string): number | string | null => {
  if (!formula) return null;

  try {
    // 1. Remplacer les variables [NomChamp] par leur valeur
    // Regex : cherche ce qui est entre crochets
    const processedFormula = formula.replace(/\[(.*?)\]/g, (match, fieldName) => {
       const val = row[fieldName];
       // Si c'est un nombre, on l'injecte tel quel
       if (typeof val === 'number') return String(val);
       // Si c'est une chaine qui ressemble à un nombre, on tente le parse
       const num = parseSmartNumber(val); 
       if (!isNaN(num) && val !== '' && val !== null && val !== undefined) return String(num);
       // Sinon on l'injecte comme string (avec quotes pour la sécurité JS)
       return `"${String(val).replace(/"/g, '\\"')}"`;
    });

    // 2. Contexte de fonctions Excel-like (Français)
    const context = {
       SI: (condition: boolean, siVrai: any, siFaux: any) => condition ? siVrai : siFaux,
       SOMME: (...args: number[]) => args.reduce((a, b) => a + (Number(b) || 0), 0),
       MOYENNE: (...args: number[]) => {
          const nums = args.filter(a => typeof a === 'number');
          if (nums.length === 0) return 0;
          return nums.reduce((a, b) => a + b, 0) / nums.length;
       },
       MIN: Math.min,
       MAX: Math.max,
       ARRONDI: (val: number, precision: number = 0) => {
          const factor = Math.pow(10, precision);
          return Math.round(val * factor) / factor;
       },
       ABS: Math.abs,
       CONCAT: (...args: any[]) => args.join(''),
       MAJUSCULE: (txt: string) => String(txt).toUpperCase(),
       MINUSCULE: (txt: string) => String(txt).toLowerCase(),
       // Alias anglais
       IF: (condition: boolean, t: any, f: any) => condition ? t : f,
       SUM: (...args: number[]) => args.reduce((a, b) => a + (Number(b) || 0), 0),
       AVG: (...args: number[]) => args.length ? args.reduce((a,b)=>a+Number(b),0)/args.length : 0,
    };

    // 3. Évaluation sécurisée via Function avec scope limité
    const keys = Object.keys(context);
    const values = Object.values(context);
    
    // On wrap la formule dans un return pour que Function renvoie le résultat
    // eslint-disable-next-line no-new-func
    const result = new Function(...keys, `return ${processedFormula}`)(...values);
    
    if (typeof result === 'number') {
       if (result === Infinity || isNaN(result)) return null;
       return Math.round(result * 1000) / 1000; // Arrondi de propreté à 3 décimales
    }
    return result;

  } catch (e) {
    // console.warn("Erreur calcul formule:", formula, e);
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
  
  // On génère 6 lots dynamiques sur les 6 derniers mois
  for (let i = 5; i >= 0; i--) {
    const date = new Date(); // Date du jour
    date.setMonth(date.getMonth() - i);
    date.setDate(15); // On fixe au 15 du mois pour la cohérence

    const dateStr = date.toISOString().split('T')[0];
    
    // Variation du nombre de lignes pour simuler une croissance
    const baseCount = 65 + (5-i) * 6 + (Math.random() * 15); 
    const rowCount = Math.floor(baseCount);
    
    const rows: DataRow[] = [];
    
    for (let j = 0; j < rowCount; j++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      let orgIndex = Math.floor(Math.random() * 6); // Core orgs
      if (i === 0) orgIndex = Math.floor(Math.random() * ORGS_LIST.length); // Plus de diversité sur le dernier import

      let domain = domains[0];
      if (orgIndex === 0) domain = 'techcorp.com';
      else if (orgIndex === 1) domain = 'innovate.fr';
      else if (orgIndex > 3) domain = 'gouv.fr';
      
      const hasComment = Math.random() > 0.3;
      
      const lastChangeDate = new Date(date);
      lastChangeDate.setDate(lastChangeDate.getDate() - Math.floor(Math.random() * 60));
      
      const amount = Math.floor(Math.random() * 1400) + 150;
      
      rows.push({
        id: `REF-${(10-i)}-${j.toString().padStart(4, '0')}`, // IDs évolutifs
        'Nom': `${firstName} ${lastName}`,
        'Email': `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        'Organisation': ORGS_LIST[orgIndex],
        'DateModif': lastChangeDate.toISOString().split('T')[0],
        'Commentaire': hasComment,
        'Budget': `${amount} k€`, // Donnée avec unité pour tester la détection
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
 * Génère des données de Référentiel (Table de dimension)
 */
export const generateRefData = (datasetId: string): ImportBatch[] => {
   const sectors = ['IT Services', 'Software', 'Consulting', 'Intégration', 'Public', 'Etat', 'Défense', 'Energie', 'Logistique', 'Finance'];
   const cities = ['Paris', 'Lyon', 'Bordeaux', 'Nantes', 'Lille', 'Marseille', 'Strasbourg', 'Toulouse'];
   const sizes = ['PME', 'ETI', 'Grand Compte', 'Administration', 'Startup'];

   const rows: DataRow[] = ORGS_LIST.map((org, index) => {
      return {
         id: `ORG-${index + 1}`,
         'Organisation': org, // CLE DE JOINTURE
         'Secteur': sectors[index % sectors.length],
         'Ville Siège': cities[index % cities.length],
         'Taille': sizes[index % sizes.length],
         'Note Client': Math.floor(Math.random() * 5) + 1 + '/5',
         'Date Contrat': '2023-01-15'
      };
   });

   // On ne génère qu'un seul batch car c'est un référentiel (donnée statique par nature pour cet exemple)
   const today = new Date().toISOString().split('T')[0];
   
   return [{
      id: generateId(),
      datasetId: datasetId,
      date: today,
      createdAt: Date.now(),
      rows
   }];
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
   
   // Validation réelle
   parsingTests.forEach(t => {
      if (t.actual !== t.expected) {
         t.status = 'failure';
         t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`;
      }
   });
   suites.push({ category: 'Moteur de Parsing Numérique', tests: parsingTests });

   // SUITE 2: Moteur de Formule
   const formulaTests: DiagnosticResult[] = [
      { 
         id: 'f1', 
         name: 'Multiplication simple', 
         status: 'success', 
         expected: 100, 
         actual: evaluateFormula({ 'A': 10, 'B': 10 }, '[A] * [B]') 
      },
      { 
         id: 'f2', 
         name: 'Calcul avec unité', 
         status: 'success', 
         expected: 120, 
         actual: evaluateFormula({ 'Prix': '10 €', 'Qte': 12 }, '[Prix] * [Qte]') 
      },
      { 
         id: 'f3', 
         name: 'Fonction SI', 
         status: 'success', 
         expected: 'Grand', 
         actual: evaluateFormula({ 'Age': 20 }, "SI([Age] > 18, 'Grand', 'Petit')") 
      },
      { 
         id: 'f4', 
         name: 'Fonction SOMME', 
         status: 'success', 
         expected: 30, 
         actual: evaluateFormula({ 'A': 10, 'B': 20 }, "SOMME([A], [B])") 
      }
   ];
   formulaTests.forEach(t => {
      if (t.actual !== t.expected) {
         t.status = 'failure';
         t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`;
      }
   });
   suites.push({ category: 'Calculateur de Champs', tests: formulaTests });

   // SUITE 3: Regroupement TCD (Dates)
   const groupingTests: DiagnosticResult[] = [
      { id: 'd1', name: 'Année (2025-01-15)', expected: '2025', actual: getGroupedLabel('2025-01-15', 'year'), status: 'success' },
      { id: 'd2', name: 'Mois (2025-01-15)', expected: '2025-01', actual: getGroupedLabel('2025-01-15', 'month'), status: 'success' },
      { id: 'd3', name: 'Trimestre (2025-01-15)', expected: '2025-T1', actual: getGroupedLabel('2025-01-15', 'quarter'), status: 'success' },
      { id: 'd4', name: 'Trimestre (2025-05-20)', expected: '2025-T2', actual: getGroupedLabel('2025-05-20', 'quarter'), status: 'success' },
   ];
   groupingTests.forEach(t => {
      if (t.actual !== t.expected) {
         t.status = 'failure';
         t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`;
      }
   });
   suites.push({ category: 'Moteur de Regroupement Temporel', tests: groupingTests });

   return suites;
};