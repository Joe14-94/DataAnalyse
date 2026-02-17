import * as XLSX from 'xlsx';
import { RawImportData, DataRow } from '../types';
import { generateId } from './common';

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
  }).filter(row => row.some(cell => cell !== ''));

  return {
    headers,
    rows,
    totalRows: rows.length
  };
};

/**
 * Lit un fichier texte/CSV en gérant automatiquement l'encodage (UTF-8 ou Windows-1252)
 */
export const readTextFile = (file: File, encoding: 'auto' | 'UTF-8' | 'windows-1252' = 'auto'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;

      if (encoding === 'auto') {
        try {
          const decoder = new TextDecoder('utf-8', { fatal: true });
          const text = decoder.decode(buffer);
          resolve(text);
        } catch {
          console.warn("Détection Auto : Echec UTF-8, bascule vers Windows-1252.");
          const decoder = new TextDecoder('windows-1252');
          resolve(decoder.decode(buffer));
        }
      } else {
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
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          resolve({ headers: [], rows: [], totalRows: 0 });
          return;
        }

        const headers = (jsonData[0] as string[]).map(h => String(h).trim());

        const rows = jsonData.slice(1).map(row => {
          const fullRow = [...row];
          while (fullRow.length < headers.length) fullRow.push('');
          return fullRow.map(cell => cell !== undefined && cell !== null ? String(cell) : '');
        }).filter(row => row.some(cell => cell.trim() !== ''));

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

const TRUE_VALUES = new Set(['oui', 'yes', 'true', '1', 'vrai', 'ok']);
const FALSE_VALUES = new Set(['non', 'no', 'false', '0', 'faux', 'ko']);

/**
 * Convertit les données brutes avec des clés dynamiques
 */
export const mapDataToSchema = (
  rawData: RawImportData,
  mapping: Record<number, string | 'ignore'>
): DataRow[] => {
  const activeMappings = Object.entries(mapping)
    .filter(([, fieldKey]) => fieldKey !== 'ignore')
    .map(([colIndexStr, fieldKey]) => ({
      colIndex: parseInt(colIndexStr, 10),
      fieldKey: fieldKey as string
    }));

  const numMappings = activeMappings.length;

  return rawData.rows.map(rowCells => {
    const newRow: DataRow = {
      id: generateId()
    };

    for (let i = 0; i < numMappings; i++) {
      const { colIndex, fieldKey } = activeMappings[i];
      const cellValue = rowCells[colIndex];

      if (cellValue === undefined || cellValue === null || cellValue === '') continue;

      const lower = cellValue.toLowerCase();
      if (TRUE_VALUES.has(lower)) {
        newRow[fieldKey] = true;
      } else if (FALSE_VALUES.has(lower)) {
        newRow[fieldKey] = false;
      } else {
        newRow[fieldKey] = cellValue;
      }
    }

    return newRow;
  });
};
