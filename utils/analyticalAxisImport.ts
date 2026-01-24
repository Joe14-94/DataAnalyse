import * as XLSX from 'xlsx';
import { AnalyticalAxis, AxisValue } from '../types';
import { generateId } from '../utils';

export interface AnalyticalAxisImportData {
  headers: string[];
  rows: any[][];
  axisCode?: string;
  axisName?: string;
  valueCodeColumn: number;
  valueLabelColumn: number;
  parentCodeColumn?: number;
  responsibleNameColumn?: number;
  responsibleEmailColumn?: number;
}

/**
 * Parse un fichier Excel pour l'import d'axes analytiques
 */
export const readAnalyticalAxisExcelFile = async (file: File): Promise<AnalyticalAxisImportData> => {
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
        const result = detectAnalyticalAxisColumns(headers);

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
 * Parse un fichier CSV pour l'import d'axes analytiques
 */
export const readAnalyticalAxisCSVFile = async (file: File, encoding: string = 'UTF-8'): Promise<AnalyticalAxisImportData> => {
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
        }).filter(row => row.some(cell => cell !== ''));

        // Détection des colonnes
        const result = detectAnalyticalAxisColumns(headers);

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
 * Détection automatique des colonnes dans le fichier d'import
 */
const detectAnalyticalAxisColumns = (headers: string[]): {
  valueCodeColumn: number;
  valueLabelColumn: number;
  parentCodeColumn?: number;
  responsibleNameColumn?: number;
  responsibleEmailColumn?: number;
} => {
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Détection de la colonne "Code"
  let valueCodeColumn = lowerHeaders.findIndex(h =>
    h.includes('code') && !h.includes('parent')
  );
  if (valueCodeColumn === -1) valueCodeColumn = 0; // Par défaut première colonne

  // Détection de la colonne "Libellé/Label/Nom"
  let valueLabelColumn = lowerHeaders.findIndex(h =>
    h.includes('libellé') || h.includes('libelle') || h.includes('label') ||
    h.includes('nom') || h.includes('name') || h.includes('intitulé') || h.includes('intitule')
  );
  if (valueLabelColumn === -1 && headers.length > 1) valueLabelColumn = 1; // Par défaut deuxième colonne

  // Détection de la colonne "Code Parent" (optionnel)
  const parentCodeColumn = lowerHeaders.findIndex(h =>
    h.includes('parent') && h.includes('code')
  );

  // Détection de la colonne "Responsable"
  const responsibleNameColumn = lowerHeaders.findIndex(h =>
    h.includes('responsable') && !h.includes('email') && !h.includes('mail')
  );

  // Détection de la colonne "Email Responsable"
  const responsibleEmailColumn = lowerHeaders.findIndex(h =>
    (h.includes('email') || h.includes('mail')) && (h.includes('responsable') || h.includes('contact'))
  );

  return {
    valueCodeColumn,
    valueLabelColumn,
    parentCodeColumn: parentCodeColumn >= 0 ? parentCodeColumn : undefined,
    responsibleNameColumn: responsibleNameColumn >= 0 ? responsibleNameColumn : undefined,
    responsibleEmailColumn: responsibleEmailColumn >= 0 ? responsibleEmailColumn : undefined
  };
};

/**
 * Détection du délimiteur CSV
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
 * Conversion des données importées en AxisValue
 */
export const convertImportToAxisValues = (
  importData: AnalyticalAxisImportData,
  axisId: string
): AxisValue[] => {
  const {
    rows,
    valueCodeColumn,
    valueLabelColumn,
    parentCodeColumn,
    responsibleNameColumn,
    responsibleEmailColumn
  } = importData;

  return rows.map(row => {
    const code = String(row[valueCodeColumn] || '').trim();
    const label = String(row[valueLabelColumn] || '').trim();

    if (!code) {
      throw new Error('Chaque ligne doit avoir un code');
    }

    const axisValue: AxisValue = {
      id: generateId(),
      axisId,
      code,
      label: label || code,
      isActive: true,
      createdAt: Date.now()
    };

    // Ajouter les champs optionnels s'ils existent
    if (parentCodeColumn !== undefined && row[parentCodeColumn]) {
      axisValue.parentId = String(row[parentCodeColumn]).trim();
    }

    if (responsibleNameColumn !== undefined && row[responsibleNameColumn]) {
      axisValue.responsibleName = String(row[responsibleNameColumn]).trim();
    }

    if (responsibleEmailColumn !== undefined && row[responsibleEmailColumn]) {
      axisValue.responsibleEmail = String(row[responsibleEmailColumn]).trim();
    }

    return axisValue;
  });
};

/**
 * Export des valeurs d'axe vers Excel
 */
export const exportAxisValuesToExcel = (
  axisValues: AxisValue[],
  axisName: string
) => {
  // Préparation des données
  const data = axisValues.map(value => ({
    'Code': value.code,
    'Libellé': value.label,
    'Code Parent': value.parentId || '',
    'Responsable': value.responsibleName || '',
    'Email Responsable': value.responsibleEmail || '',
    'Actif': value.isActive ? 'Oui' : 'Non'
  }));

  // Création du workbook
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Valeurs');

  // Téléchargement
  const fileName = `${axisName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Télécharge un template vide pour l'import d'axes analytiques
 */
export const downloadAnalyticalAxisTemplate = () => {
  const templateData = [
    {
      'Code': 'CC-001',
      'Libellé': 'Direction Générale',
      'Code Parent': '',
      'Responsable': 'John Doe',
      'Email Responsable': 'john.doe@example.com'
    },
    {
      'Code': 'CC-002',
      'Libellé': 'Direction Marketing',
      'Code Parent': 'CC-001',
      'Responsable': 'Jane Smith',
      'Email Responsable': 'jane.smith@example.com'
    },
    {
      'Code': 'CC-003',
      'Libellé': 'Direction Technique',
      'Code Parent': 'CC-001',
      'Responsable': 'Bob Wilson',
      'Email Responsable': 'bob.wilson@example.com'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  XLSX.writeFile(workbook, 'Template_Axe_Analytique.xlsx');
};
