import * as XLSX from 'xlsx';
import { BudgetLine } from '../types';
import { generateId } from '../utils';

export interface BudgetImportData {
  headers: string[];
  rows: any[][];
  periodColumns: { index: number; periodId: string; periodName: string }[];
  accountCodeColumn: number;
  accountLabelColumn: number;
}

/**
 * Parse un fichier Excel pour l'import de budget
 */
export const readBudgetExcelFile = async (file: File): Promise<BudgetImportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // Première feuille
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Conversion en tableau
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          reject(new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données'));
          return;
        }

        const headers = jsonData[0].map((h: any) => String(h).trim());
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

        // Détection des colonnes
        const result = detectBudgetColumns(headers, rows);

        resolve({
          headers,
          rows,
          ...result
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parse un fichier CSV pour l'import de budget
 */
export const readBudgetCSVFile = async (file: File, encoding: string = 'UTF-8'): Promise<BudgetImportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
          reject(new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données'));
          return;
        }

        // Détection du délimiteur
        const delimiter = detectDelimiter(lines[0]);

        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
          return line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
        });

        // Détection des colonnes
        const result = detectBudgetColumns(headers, rows);

        resolve({
          headers,
          rows,
          ...result
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsText(file, encoding);
  });
};

/**
 * Détecte le délimiteur CSV
 */
const detectDelimiter = (firstLine: string): string => {
  const delimiters = [';', ',', '\t', '|'];
  let maxCount = 0;
  let bestDelimiter = ';';

  for (const delimiter of delimiters) {
    const count = firstLine.split(delimiter).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
};

/**
 * Détecte les colonnes de compte et de périodes
 */
const detectBudgetColumns = (headers: string[], rows: any[][]): {
  periodColumns: { index: number; periodId: string; periodName: string }[];
  accountCodeColumn: number;
  accountLabelColumn: number;
} => {
  // Détection colonne code compte
  let accountCodeColumn = -1;
  const accountCodePatterns = /^(code|compte|account|n°|numero|number)/i;
  for (let i = 0; i < headers.length; i++) {
    if (accountCodePatterns.test(headers[i])) {
      accountCodeColumn = i;
      break;
    }
  }

  // Si pas trouvé, prendre la première colonne
  if (accountCodeColumn === -1) {
    accountCodeColumn = 0;
  }

  // Détection colonne libellé
  let accountLabelColumn = -1;
  const labelPatterns = /^(libelle|libellé|label|description|intitule|intitulé|name)/i;
  for (let i = 0; i < headers.length; i++) {
    if (i !== accountCodeColumn && labelPatterns.test(headers[i])) {
      accountLabelColumn = i;
      break;
    }
  }

  // Si pas trouvé, prendre la deuxième colonne (si différente de code)
  if (accountLabelColumn === -1 && headers.length > 1) {
    accountLabelColumn = accountCodeColumn === 0 ? 1 : 0;
  }

  // Détection des colonnes de période (toutes les colonnes numériques ou de date)
  const periodColumns: { index: number; periodId: string; periodName: string }[] = [];

  for (let i = 0; i < headers.length; i++) {
    if (i === accountCodeColumn || i === accountLabelColumn) continue;

    const header = headers[i];

    // Check si c'est une période (date ou mois)
    if (isPeriodColumn(header, rows, i)) {
      const periodInfo = parsePeriodHeader(header);
      periodColumns.push({
        index: i,
        periodId: periodInfo.periodId,
        periodName: periodInfo.periodName
      });
    }
  }

  return {
    periodColumns,
    accountCodeColumn,
    accountLabelColumn
  };
};

/**
 * Vérifie si une colonne est une colonne de période
 */
const isPeriodColumn = (header: string, rows: any[][], columnIndex: number): boolean => {
  // Check si le header ressemble à une période
  const periodPatterns = [
    /^\d{4}-\d{2}$/,           // 2025-01
    /^\d{2}\/\d{4}$/,          // 01/2025
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,  // Jan, Feb, etc.
    /^(janv|fév|mars|avr|mai|juin|juil|août|sep|oct|nov|déc)/i,  // Français
    /^(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i,
    /^(m|q|t|s)\d+$/i,        // M1, M2, Q1, T1, S1
    /^période/i,
    /^period/i,
    /^\d{4}$/                  // Juste une année
  ];

  if (periodPatterns.some(pattern => pattern.test(header))) {
    return true;
  }

  // Check si les valeurs sont majoritairement numériques
  let numericCount = 0;
  const sampleSize = Math.min(10, rows.length);

  for (let i = 0; i < sampleSize; i++) {
    const value = rows[i]?.[columnIndex];
    if (value !== '' && value !== null && value !== undefined) {
      const num = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
      if (!isNaN(num)) {
        numericCount++;
      }
    }
  }

  return numericCount >= sampleSize * 0.7; // 70% de valeurs numériques
};

/**
 * Parse un header de période pour extraire l'ID et le nom
 */
const parsePeriodHeader = (header: string): { periodId: string; periodName: string } => {
  const trimmed = header.trim();

  // Format YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return {
      periodId: trimmed,
      periodName: trimmed
    };
  }

  // Format MM/YYYY
  const mmyyyyMatch = trimmed.match(/^(\d{2})\/(\d{4})$/);
  if (mmyyyyMatch) {
    return {
      periodId: `${mmyyyyMatch[2]}-${mmyyyyMatch[1]}`,
      periodName: trimmed
    };
  }

  // Mois en texte (français)
  const frenchMonths: { [key: string]: string } = {
    'janv': '01', 'janvier': '01',
    'fév': '02', 'févr': '02', 'février': '02',
    'mars': '03',
    'avr': '04', 'avril': '04',
    'mai': '05',
    'juin': '06',
    'juil': '07', 'juillet': '07',
    'août': '08', 'aout': '08',
    'sep': '09', 'sept': '09', 'septembre': '09',
    'oct': '10', 'octobre': '10',
    'nov': '11', 'novembre': '11',
    'déc': '12', 'décembre': '12'
  };

  // Mois en texte (anglais)
  const englishMonths: { [key: string]: string } = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
  };

  // Recherche dans les mois français et anglais
  const lowerHeader = trimmed.toLowerCase();
  const allMonths = { ...frenchMonths, ...englishMonths };

  for (const [monthName, monthNum] of Object.entries(allMonths)) {
    if (lowerHeader.startsWith(monthName)) {
      // Essayer de trouver l'année
      const yearMatch = trimmed.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
      return {
        periodId: `${year}-${monthNum}`,
        periodName: trimmed
      };
    }
  }

  // Format générique (M1, M2, Q1, etc.)
  const genericMatch = trimmed.match(/^(m|q|t|s)(\d+)/i);
  if (genericMatch) {
    const num = parseInt(genericMatch[2]);
    const year = new Date().getFullYear();
    const month = String(num).padStart(2, '0');
    return {
      periodId: `${year}-${month}`,
      periodName: trimmed
    };
  }

  // Par défaut, utiliser le header tel quel
  return {
    periodId: trimmed.replace(/\s+/g, '-').toLowerCase(),
    periodName: trimmed
  };
};

/**
 * Convertit les données importées en lignes budgétaires
 */
export const convertImportToBudgetLines = (
  importData: BudgetImportData,
  _chartOfAccountsId: string
): BudgetLine[] => {
  const lines: BudgetLine[] = [];

  for (const row of importData.rows) {
    const accountCode = String(row[importData.accountCodeColumn] || '').trim();

    // Skip empty rows
    if (!accountCode) continue;

    const accountLabel = importData.accountLabelColumn >= 0
      ? String(row[importData.accountLabelColumn] || '').trim()
      : '';

    // Extract period values
    const periodValues: { [periodId: string]: number } = {};

    for (const periodCol of importData.periodColumns) {
      const value = row[periodCol.index];
      if (value !== '' && value !== null && value !== undefined) {
        const numValue = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(numValue)) {
          periodValues[periodCol.periodId] = numValue;
        }
      }
    }

    // Create budget line
    lines.push({
      id: generateId(),
      accountCode,
      accountLabel: accountLabel || undefined,
      periodValues,
      isLocked: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  return lines;
};

/**
 * Exporte un budget vers Excel
 */
export const exportBudgetToExcel = (
  budgetName: string,
  lines: BudgetLine[],
  periods: { id: string; name: string }[]
): void => {
  // Créer les headers
  const headers = ['Code Compte', 'Libellé', ...periods.map(p => p.name), 'Total'];

  // Créer les lignes de données
  const data = lines.map(line => {
    const row: any[] = [
      line.accountCode,
      line.accountLabel || ''
    ];

    // Ajouter les valeurs par période
    let total = 0;
    for (const period of periods) {
      const value = line.periodValues?.[period.id] || 0;
      row.push(value);
      total += value;
    }

    // Ajouter le total
    row.push(total);

    return row;
  });

  // Créer la feuille
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Appliquer des largeurs de colonnes
  const colWidths = [
    { wch: 15 }, // Code
    { wch: 30 }, // Libellé
    ...periods.map(() => ({ wch: 12 })), // Périodes
    { wch: 15 }  // Total
  ];
  ws['!cols'] = colWidths;

  // Créer le classeur
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Budget');

  // Télécharger
  XLSX.writeFile(wb, `${budgetName}.xlsx`);
};

/**
 * Crée un template Excel vide pour l'import de budget
 */
export const downloadBudgetTemplate = (fiscalYear: number): void => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const headers = [
    'Code Compte',
    'Libellé',
    ...months.map((m) => `${m} ${fiscalYear}`)
  ];

  // Ajouter quelques lignes d'exemple
  const exampleData = [
    ['601000', 'Achats de matières premières', 10000, 10500, 11000, 10800, 11200, 11500, 12000, 11800, 12200, 12500, 13000, 13500],
    ['641000', 'Rémunérations du personnel', 50000, 50000, 50000, 52000, 52000, 52000, 54000, 54000, 54000, 56000, 56000, 56000],
    ['615000', 'Entretien et réparations', 2000, 2000, 2000, 2000, 2000, 2000, 2500, 2500, 2500, 2500, 2500, 2500]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);

  // Largeurs de colonnes
  const colWidths = [
    { wch: 15 }, // Code
    { wch: 35 }, // Libellé
    ...months.map(() => ({ wch: 15 })) // Mois
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Budget');

  XLSX.writeFile(wb, `Template_Budget_${fiscalYear}.xlsx`);
};
