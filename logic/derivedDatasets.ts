import { Dataset, DerivedDatasetConfig, ImportBatch, DataRow } from '../types';
import { PivotConfig, PivotResult } from '../types/pivot';
import { calculatePivotData } from './pivotEngine';
import { generateId } from '../utils';

/**
 * Crée un nouveau Dataset dérivé depuis un TCD
 */
export const createDatasetFromPivot = (
  sourceDataset: Dataset,
  pivotConfig: PivotConfig,
  pivotResult: PivotResult,
  options: {
    name: string;
    flattenMode: 'rows' | 'pivot';
  }
): Dataset => {
  // Extraire les champs du résultat du TCD
  const fields: string[] = [];

  if (options.flattenMode === 'rows') {
    // Mode "rows": une ligne par cellule du TCD
    // Champs: [rowField1, rowField2, ..., column, value]
    fields.push(...pivotConfig.rowFields);
    if (pivotConfig.colFields.length > 0) {
      fields.push('Colonne');
    }
    fields.push(pivotConfig.valField);
  } else {
    // Mode "pivot": garder la structure TCD
    // Champs: [rowField1, rowField2, ..., col1, col2, col3, ..., Total]
    fields.push(...pivotConfig.rowFields);
    fields.push(...pivotResult.colHeaders);
    fields.push('Total');
  }

  // Configuration de dérivation
  const derivedConfig: DerivedDatasetConfig = {
    sourceDatasetId: sourceDataset.id,
    pivotConfig: {
      rowFields: pivotConfig.rowFields,
      colFields: pivotConfig.colFields,
      colGrouping: pivotConfig.colGrouping,
      valField: pivotConfig.valField,
      aggType: pivotConfig.aggType,
      filters: pivotConfig.filters,
      sortBy: pivotConfig.sortBy,
      sortOrder: pivotConfig.sortOrder,
      showSubtotals: pivotConfig.showSubtotals
    },
    flattenMode: options.flattenMode
  };

  // Créer le nouveau Dataset
  const newDataset: Dataset = {
    id: generateId(),
    name: options.name,
    fields,
    fieldConfigs: {},
    createdAt: Date.now(),
    derivedFrom: derivedConfig
  };

  // Configurer les types de champs
  pivotConfig.rowFields.forEach(field => {
    const sourceFieldConfig = sourceDataset.fieldConfigs?.[field];
    if (sourceFieldConfig) {
      newDataset.fieldConfigs![field] = { ...sourceFieldConfig };
    } else {
      newDataset.fieldConfigs![field] = { type: 'text' };
    }
  });

  // Les colonnes numériques
  if (options.flattenMode === 'rows') {
    const valFieldConfig = sourceDataset.fieldConfigs?.[pivotConfig.valField];
    newDataset.fieldConfigs![pivotConfig.valField] = valFieldConfig || { type: 'number' };
    if (pivotConfig.colFields.length > 0) {
      newDataset.fieldConfigs!['Colonne'] = { type: 'text' };
    }
  } else {
    pivotResult.colHeaders.forEach(col => {
      const valFieldConfig = sourceDataset.fieldConfigs?.[pivotConfig.valField];
      newDataset.fieldConfigs![col] = valFieldConfig || { type: 'number' };
    });
    newDataset.fieldConfigs!['Total'] = sourceDataset.fieldConfigs?.[pivotConfig.valField] || { type: 'number' };
  }

  return newDataset;
};

/**
 * Génère un batch pour un Dataset dérivé depuis un batch source
 */
export const generateDerivedBatch = (
  derivedDataset: Dataset,
  sourceBatch: ImportBatch,
  sourceDataset: Dataset
): ImportBatch => {
  if (!derivedDataset.derivedFrom) {
    throw new Error('Ce Dataset n\'est pas un Dataset dérivé');
  }

  const { pivotConfig, flattenMode } = derivedDataset.derivedFrom;

  // Calculer le TCD sur le batch source
  const pivotResult = calculatePivotData({
    ...pivotConfig,
    rows: sourceBatch.rows
  } as any);

  if (!pivotResult) {
    throw new Error('Erreur lors du calcul du TCD pour le Dataset dérivé');
  }

  // Convertir le résultat du TCD en lignes plates
  const derivedRows: DataRow[] = [];

  if (flattenMode === 'rows') {
    // Mode "rows": une ligne par cellule du TCD
    pivotResult.displayRows.forEach(row => {
      if (row.type === 'data') {
        // Pour chaque colonne, créer une ligne
        Object.entries(row.metrics).forEach(([colName, value]) => {
          const derivedRow: DataRow = {
            id: generateId()
          };

          // Ajouter les clés de ligne (rowFields)
          row.keys.forEach((key, idx) => {
            derivedRow[pivotConfig.rowFields[idx]] = key;
          });

          // Ajouter la colonne si applicable
          if (pivotConfig.colFields.length > 0) {
            derivedRow['Colonne'] = colName;
          }

          // Ajouter la valeur
          derivedRow[pivotConfig.valField] = value;

          derivedRows.push(derivedRow);
        });

        // Ajouter aussi le total de la ligne si pas de colonnes
        if (pivotConfig.colFields.length === 0) {
          const derivedRow: DataRow = {
            id: generateId()
          };
          row.keys.forEach((key, idx) => {
            derivedRow[pivotConfig.rowFields[idx]] = key;
          });
          derivedRow[pivotConfig.valField] = row.rowTotal;
          derivedRows.push(derivedRow);
        }
      }
    });
  } else {
    // Mode "pivot": garder la structure TCD
    pivotResult.displayRows.forEach(row => {
      if (row.type === 'data') {
        const derivedRow: DataRow = {
          id: generateId()
        };

        // Ajouter les clés de ligne
        row.keys.forEach((key, idx) => {
          derivedRow[pivotConfig.rowFields[idx]] = key;
        });

        // Ajouter toutes les colonnes
        Object.entries(row.metrics).forEach(([colName, value]) => {
          derivedRow[colName] = value;
        });

        // Ajouter le total
        derivedRow['Total'] = row.rowTotal;

        derivedRows.push(derivedRow);
      }
    });
  }

  // Créer le nouveau batch
  const newBatch: ImportBatch = {
    id: generateId(),
    datasetId: derivedDataset.id,
    date: sourceBatch.date,
    createdAt: Date.now(),
    rows: derivedRows
  };

  return newBatch;
};

/**
 * Met à jour tous les Datasets dérivés d'un Dataset source
 */
export const updateDerivedDatasets = (
  sourceDatasetId: string,
  sourceBatch: ImportBatch,
  allDatasets: Dataset[],
  sourceDataset: Dataset
): ImportBatch[] => {
  // Trouver tous les Datasets dérivés de ce Dataset source
  const derivedDatasets = allDatasets.filter(
    ds => ds.derivedFrom?.sourceDatasetId === sourceDatasetId
  );

  // Générer un nouveau batch pour chaque Dataset dérivé
  const newBatches = derivedDatasets.map(derivedDs =>
    generateDerivedBatch(derivedDs, sourceBatch, sourceDataset)
  );

  return newBatches;
};
