
import { DataRow, RawImportData, ImportBatch } from './types';
import * as XLSX from 'xlsx';

// Updated version
export const APP_VERSION = "202511-110";

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
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

  const rows = lines.slice(1).map(line => {
    const cells = line.split(separator).map(c => c.trim());
    while (cells.length < headers.length) {
      cells.push('');
    }
    return cells;
  });

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
        });

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
 * Ex: "50 k€" -> 50, "1 200 €" -> 1200
 */
export const parseSmartNumber = (val: any, unit?: string): number => {
  if (val === undefined || val === null || val === '') return 0;
  
  let str = String(val);
  
  // Si une unité est fournie, on tente de la retirer
  if (unit && unit.trim() !== '') {
    // On échappe les caractères spéciaux regex
    const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Regex qui cherche l'unité à la fin ou au début, insensible à la casse
    const regex = new RegExp(escapedUnit, 'gi');
    str = str.replace(regex, '');
  }

  // Nettoyage générique :
  // 1. Remplacer virgule par point
  str = str.replace(',', '.');
  // 2. Supprimer les espaces insécables et espaces normaux
  str = str.replace(/\s/g, '').replace(/\u00A0/g, '');
  // 3. Supprimer tout ce qui n'est pas chiffre, point ou signe moins (au début)
  str = str.replace(/[^0-9.-]/g, '');

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
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

  // Fonction pour extraire le suffixe non numérique
  const getSuffix = (s: string) => {
    const match = s.match(/[a-zA-Z€$£%°]+$/);
    return match ? match[0] : '';
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

  // Si le candidat apparait dans plus de 50% des cas non vides
  if (maxCount > sample.length / 2) {
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
  // On exclut les nombres purs (ex: 2025) qui matcheraient YYYY
  const dateRegex = /^(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})$/;

  sample.forEach(val => {
     const lower = val.toLowerCase().trim();
     
     // Check Boolean
     if (['oui', 'non', 'yes', 'no', 'true', 'false', 'vrai', 'faux', '0', '1'].includes(lower)) {
        boolCount++;
     }
     
     // Check Date
     // On vérifie d'abord le regex, puis si c'est une date valide JS
     if (dateRegex.test(val) && !isNaN(Date.parse(val.split('/').reverse().join('-')))) {
        dateCount++;
     }

     // Check Number (supporte 1,000.00 ou 1.000,00)
     const cleanNum = val.replace(/[^0-9.,-]/g, ''); // On garde juste chiffres et separateurs
     if (cleanNum && !isNaN(parseFloat(cleanNum.replace(',', '.')))) {
        numberCount++;
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
 * Évalue une formule mathématique simple
 * @param row La ligne de données
 * @param formula La formule ex: "[Prix] * [Quantité] * 1.2"
 */
export const evaluateFormula = (row: any, formula: string): number | string | null => {
  if (!formula) return null;

  try {
    // 1. Remplacer les variables [NomChamp] par leur valeur
    // Regex : cherche ce qui est entre crochets
    const processedFormula = formula.replace(/\[(.*?)\]/g, (match, fieldName) => {
       const val = row[fieldName];
       // Si c'est un nombre formatté (ex: "1 000 €"), on le nettoie
       const num = parseSmartNumber(val); 
       return String(num); // On retourne la représentation string du nombre pour le JS
    });

    // 2. Évaluation sécurisée
    // On autorise uniquement chiffres, opérateurs mathématiques et parenthèses pour la sécurité
    // eslint-disable-next-line no-new-func
    const result = new Function('return ' + processedFormula)();
    
    if (result === Infinity || isNaN(result)) return null;
    
    // Arrondi à 2 décimales pour la propreté par défaut
    return Math.round(result * 100) / 100;
  } catch (e) {
    // console.warn("Erreur calcul formule:", formula, e);
    return null;
  }
};

/**
 * Génère des données synthétiques avec le nouveau schéma dynamique
 */
export const generateSyntheticData = (datasetId: string = 'demo'): ImportBatch[] => {
  const orgs = ['TechCorp', 'Innovate SA', 'Global Services', 'Alpha Solutions', 'Mairie de Paris', 'Ministère Intérieur'];
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Lucas', 'Emma', 'Thomas', 'Lea', 'Nicolas', 'Julie'];
  const lastNames = ['Dupont', 'Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent'];
  const domains = ['gmail.com', 'outlook.com', 'techcorp.com', 'innovate.fr', 'gouv.fr'];
  
  const batches: ImportBatch[] = [];
  const today = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(today.getMonth() - i);
    date.setDate(15); 
    const dateStr = date.toISOString().split('T')[0];
    
    const baseCount = 50 + (i * 15) + (Math.random() * 10); 
    const rowCount = Math.floor(baseCount);
    
    const rows: DataRow[] = [];
    
    for (let j = 0; j < rowCount; j++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      let orgIndex = Math.floor(Math.random() * orgs.length);
      if (i < 2 && Math.random() > 0.5) orgIndex = 0; 

      let domain = domains[0];
      if (orgIndex === 0) domain = 'techcorp.com';
      else if (orgIndex === 1) domain = 'innovate.fr';
      else if (orgIndex > 3) domain = 'gouv.fr';
      
      const hasComment = Math.random() > 0.3;
      
      const lastChangeDate = new Date(date);
      lastChangeDate.setDate(lastChangeDate.getDate() - Math.floor(Math.random() * 60));
      
      const amount = Math.floor(Math.random() * 1000) + 100;
      
      rows.push({
        id: `REF-${(5-i)}-${j.toString().padStart(4, '0')}`,
        'Nom': `${firstName} ${lastName}`,
        'Email': `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        'Organisation': orgs[orgIndex],
        'DateModif': lastChangeDate.toISOString().split('T')[0],
        'Commentaire': hasComment,
        'Budget': `${amount} k€`, // Donnée avec unité
        'Quantité': Math.floor(Math.random() * 20) + 1
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
