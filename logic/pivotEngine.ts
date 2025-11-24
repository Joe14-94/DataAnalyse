
import { parseSmartNumber, getGroupedLabel, detectColumnType, formatNumberValue } from '../utils';
import { FieldConfig, Dataset } from '../types';

// Types spécifiques au moteur
export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'list';
export type SortBy = 'label' | 'value';
export type SortOrder = 'asc' | 'desc';
export type DateGrouping = 'none' | 'year' | 'quarter' | 'month';

export interface PivotRow {
  type: 'data' | 'subtotal' | 'grandTotal';
  keys: string[];
  level: number;
  metrics: Record<string, number | string>;
  rowTotal: number | string;
  label?: string;
  isCollapsed?: boolean;
}

export interface PivotConfig {
  rows: any[]; // Données brutes (déjà jointes/blended si nécessaire)
  rowFields: string[];
  colField: string;
  colGrouping: DateGrouping;
  valField: string;
  aggType: AggregationType;
  filters: { field: string, values: string[] }[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  showSubtotals: boolean;
  
  // Context pour le formatage
  currentDataset?: Dataset | null;
  secondaryDatasetId?: string;
  datasets?: Dataset[];
}

export interface PivotResult {
  colHeaders: string[];
  displayRows: PivotRow[];
  colTotals: Record<string, number | string>;
  grandTotal: number | string;
}

/**
 * MOTEUR TCD : Logique pure de calcul
 */
export const calculatePivotData = (config: PivotConfig): PivotResult | null => {
  const { 
    rows, rowFields, colField, colGrouping, valField, aggType, 
    filters, sortBy, sortOrder, showSubtotals 
  } = config;

  if (rows.length === 0 || rowFields.length === 0) return null;

  // 1. Filtrage (Support multi-valeurs)
  const filteredRows = rows.filter(row => {
    if (filters.length === 0) return true;
    return filters.every(f => {
       if (f.values.length === 0) return true;
       return f.values.includes(String(row[f.field]));
    });
  });

  // 2. Extraction des en-têtes de colonnes (Distinct)
  const colHeaders = new Set<string>();
  if (colField) {
    filteredRows.forEach(row => {
      let val = row[colField] !== undefined ? String(row[colField]) : '(Vide)';
      val = getGroupedLabel(val, colGrouping);
      colHeaders.add(val);
    });
  }
  const sortedColHeaders = Array.from(colHeaders).sort();

  // Helper: Récupération valeur numérique sécurisée
  const getNumericValue = (row: any, fieldName: string): number => {
      const raw = row[fieldName];
      // Tentative de récupération de l'unité depuis les datasets passés en config
      let unit = config.currentDataset?.fieldConfigs?.[fieldName]?.unit;
      if (!unit && config.secondaryDatasetId && config.datasets) {
         const secDS = config.datasets.find(d => d.id === config.secondaryDatasetId);
         unit = secDS?.fieldConfigs?.[fieldName]?.unit;
      }
      return parseSmartNumber(raw, unit);
  };

  // Helper: Valeur pour agrégation
  const getMetricValue = (row: any) => {
      if (aggType === 'count') return 1;
      if (aggType === 'list') return String(row[valField] || '');
      return getNumericValue(row, valField);
  };

  // 3. Fonction d'agrégation (Single Pass)
  const computeStats = (groupRows: any[]) => {
      const stats: Record<string, number | Set<string> | string[] | string> = {}; 
      let total: number | Set<string> | string[] | string = aggType === 'min' ? Infinity : aggType === 'max' ? -Infinity : 0;
      
      if (aggType === 'list') total = new Set();
      else if (aggType === 'min' || aggType === 'max') total = aggType === 'min' ? Infinity : -Infinity;
      else total = 0;

      // Init stats
      sortedColHeaders.forEach(c => {
          if (aggType === 'list') stats[c] = new Set();
          else if (aggType === 'min') stats[c] = Infinity;
          else if (aggType === 'max') stats[c] = -Infinity;
          else stats[c] = 0;
      });

      let totalCount = 0; // Pour AVG global
      const colCounts: Record<string, number> = {}; // Pour AVG par colonne

      groupRows.forEach(row => {
          const val = getMetricValue(row);
          
          // Clé de colonne
          let colKey = 'ALL'; 
          if (colField) {
             let v = row[colField] !== undefined ? String(row[colField]) : '(Vide)';
             colKey = getGroupedLabel(v, colGrouping);
          }

          // Mise à jour Total Ligne
          if (aggType === 'sum' || aggType === 'count') {
              total = (total as number) + (val as number);
          } else if (aggType === 'avg') {
              total = (total as number) + (val as number);
              totalCount++;
          } else if (aggType === 'min') {
              total = Math.min(total as number, val as number);
          } else if (aggType === 'max') {
              total = Math.max(total as number, val as number);
          } else if (aggType === 'list') {
              if (val) (total as Set<string>).add(val as string);
          }

          // Mise à jour Métrique Colonne
          if (colField && stats[colKey] !== undefined) {
               if (aggType === 'sum' || aggType === 'count') {
                  stats[colKey] = (stats[colKey] as number) + (val as number);
               } else if (aggType === 'avg') {
                  stats[colKey] = (stats[colKey] as number) + (val as number);
                  colCounts[colKey] = (colCounts[colKey] || 0) + 1;
               } else if (aggType === 'min') {
                  stats[colKey] = Math.min(stats[colKey] as number, val as number);
              } else if (aggType === 'max') {
                  stats[colKey] = Math.max(stats[colKey] as number, val as number);
              } else if (aggType === 'list') {
                  if (val) (stats[colKey] as Set<string>).add(val as string);
              }
          }
      });

      // Finalisation AVG et LIST
      if (aggType === 'avg') {
          if (totalCount > 0) total = (total as number) / totalCount;
          sortedColHeaders.forEach(c => {
              if (colCounts[c] > 0) stats[c] = (stats[c] as number) / colCounts[c];
          });
      }
      if (aggType === 'list') {
          const formatList = (s: Set<string>) => {
              const arr = Array.from(s);
              if (arr.length === 0) return '-';
              if (arr.length > 3) return `${arr.slice(0, 3).join(', ')} (+${arr.length - 3})`;
              return arr.join(', ');
          };
          total = formatList(total as Set<string>);
          sortedColHeaders.forEach(c => {
              stats[c] = formatList(stats[c] as Set<string>);
          });
      }

      // Nettoyage Infinity
      if (aggType === 'min' || aggType === 'max') {
           if (total === Infinity || total === -Infinity) total = 0;
           sortedColHeaders.forEach(c => {
               if (stats[c] === Infinity || stats[c] === -Infinity) stats[c] = 0;
           });
      }

      return { metrics: stats as Record<string, number|string>, rowTotal: total as number|string };
  };

  // 4. Regroupement Récursif
  const displayRows: PivotRow[] = [];

  const processLevel = (groupRows: any[], level: number, parentKeys: string[]) => {
    const currentField = rowFields[level];
    
    // Groupement
    const groups: Record<string, any[]> = {};
    groupRows.forEach(row => {
      const key = row[currentField] !== undefined ? String(row[currentField]) : '(Vide)';
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    // Tri des clés
    const keys = Object.keys(groups).sort((a, b) => {
      if (sortBy === 'label') {
        return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      } else {
        // Tri par valeur (nécessite un pré-calcul léger)
        const valA = computeStats(groups[a]).rowTotal;
        const valB = computeStats(groups[b]).rowTotal;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      }
    });

    // Traitement
    keys.forEach(key => {
      const subgroupRows = groups[key];
      const currentKeys = [...parentKeys, key];

      // Niveau le plus bas (Donnée)
      if (level === rowFields.length - 1) {
        const { metrics, rowTotal } = computeStats(subgroupRows);
        displayRows.push({
          type: 'data',
          keys: currentKeys,
          level,
          metrics,
          rowTotal
        });
      } else {
        // Niveau intermédiaire
        processLevel(subgroupRows, level + 1, currentKeys);

        // Sous-total
        if (showSubtotals) {
          const { metrics, rowTotal } = computeStats(subgroupRows);
          displayRows.push({
            type: 'subtotal',
            keys: currentKeys,
            level,
            metrics,
            rowTotal,
            label: `Total ${key}`
          });
        }
      }
    });
  };

  // Lancement récursif
  processLevel(filteredRows, 0, []);

  // Total Général
  const { metrics: colTotals, rowTotal: grandTotal } = computeStats(filteredRows);

  return {
    colHeaders: sortedColHeaders,
    displayRows,
    colTotals,
    grandTotal
  };
};

/**
 * Helper de formatage d'affichage
 */
export const formatPivotOutput = (val: number | string, valField: string, aggType: string, dataset?: Dataset | null, secondaryDatasetId?: string, allDatasets?: Dataset[]) => {
    if (typeof val === 'string') return val;
    
    // Utiliser config standard si numérique
    if (aggType !== 'count' && valField) {
        const config = dataset?.fieldConfigs?.[valField];
        if (!config && secondaryDatasetId && allDatasets) {
           const secDS = allDatasets.find(d => d.id === secondaryDatasetId);
           const secConfig = secDS?.fieldConfigs?.[valField];
           if (secConfig) return formatNumberValue(val, secConfig);
        }
        if (config) return formatNumberValue(val, config);
    }
    
    // Fallback
    if (val % 1 !== 0) return val.toFixed(2);
    return val.toLocaleString();
};
