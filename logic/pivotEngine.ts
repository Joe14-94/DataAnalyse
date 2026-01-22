
import { parseSmartNumber, getGroupedLabel, formatNumberValue } from '../utils';
import { FieldConfig, Dataset, FilterRule, PivotJoin } from '../types';

// Types spécifiques au moteur
export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'list';
export type SortBy = 'label' | 'value' | string; // 'value' = Grand Total, string = Specific Column Key
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
  filters: FilterRule[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  showSubtotals: boolean;
  
  // Context pour le formatage
  currentDataset?: Dataset | null;
  joins?: PivotJoin[]; // NEW: Multi-join support
  datasets?: Dataset[];
  valFormatting?: Partial<FieldConfig>;
}

export interface PivotResult {
  colHeaders: string[];
  displayRows: PivotRow[];
  colTotals: Record<string, number | string>;
  grandTotal: number | string;
}

// Structure optimisée pour le calcul interne
interface OptimizedRow {
  rowKeys: string[];
  colKey: string;
  metricVal: number;
  rawVal: any; // Pour le type 'list'
}

// Interface pour le cache des stats de groupe
interface GroupStats {
    metrics: Record<string, number | string>;
    rowTotal: number | string;
    // Données brutes pour usage interne (tri)
    rawRowTotal: number; 
    rawMetrics: Map<string, number>; 
}

/**
 * MOTEUR TCD : Logique pure de calcul optimisée
 */
export const calculatePivotData = (config: PivotConfig): PivotResult | null => {
  const { 
    rows, rowFields, colField, colGrouping, valField, aggType, 
    filters, sortBy, sortOrder, showSubtotals 
  } = config;

  if (rows.length === 0 || rowFields.length === 0) return null;

  // --- PHASE 0 : PREPARATION CONFIG & META-DONNEES ---
  
  // Cache pour l'unité du champ valeur
  let valUnit: string | undefined = undefined;
  
  // 1. Chercher dans dataset principal
  if (config.currentDataset?.fieldConfigs?.[valField]?.unit) {
      valUnit = config.currentDataset.fieldConfigs[valField].unit;
  } else if (config.currentDataset?.calculatedFields) {
      const cf = config.currentDataset.calculatedFields.find(c => c.name === valField);
      if (cf?.unit) valUnit = cf.unit;
  } else if (config.datasets) {
      // 2. Chercher dans les datasets joints via préfixe
      const prefixMatch = valField.match(/^\[(.*?)\] (.*)$/);
      if (prefixMatch) {
          const dsName = prefixMatch[1];
          const originalFieldName = prefixMatch[2];
          const sourceDS = config.datasets.find(d => d.name === dsName);
          if (sourceDS?.fieldConfigs?.[originalFieldName]?.unit) {
              valUnit = sourceDS.fieldConfigs[originalFieldName].unit;
          } else if (sourceDS?.calculatedFields) {
              const cf = sourceDS.calculatedFields.find(c => c.name === originalFieldName);
              if (cf?.unit) valUnit = cf.unit;
          }
      }
  }

  // Optimisation 1.1 : Pré-calcul des valeurs de filtres
  // On évite de parser les nombres ou lowercase les chaînes à chaque ligne
  const preparedFilters = filters.map(f => {
      let preparedValue = f.value;
      if (f.operator === 'gt' || f.operator === 'lt') {
          preparedValue = parseSmartNumber(f.value);
      } else if (typeof f.value === 'string' && f.operator !== 'in') {
          preparedValue = f.value.toLowerCase();
      }
      return { ...f, preparedValue };
  });

  // --- PHASE 1 : FILTRAGE & PRE-CALCUL (O(N)) ---
  
  const optimizedRows: OptimizedRow[] = [];
  const colHeadersSet = new Set<string>();

  // Boucle unique optimisée
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // 1.1 Filtrage Rapide
    if (preparedFilters.length > 0) {
      let pass = true;
      for (const f of preparedFilters) {
         const rowVal = row[f.field];
         
         // Optimisation In : Set lookup si possible, sinon array includes
         if (Array.isArray(f.value) && (!f.operator || f.operator === 'in')) {
             // Note: Pour de très gros filtres, transformer f.value en Set serait mieux, 
             // mais Array.includes est très rapide pour les petits tableaux (<20 items)
             if (f.value.length > 0 && !f.value.includes(String(rowVal))) {
                 pass = false; break;
             }
             continue;
         }
         
         if (f.operator === 'gt' || f.operator === 'lt') {
             const rowNum = parseSmartNumber(rowVal);
             if (f.operator === 'gt' && rowNum <= (f.preparedValue as number)) { pass = false; break; }
             if (f.operator === 'lt' && rowNum >= (f.preparedValue as number)) { pass = false; break; }
             continue;
         }

         // Comparaisons String
         const strRowVal = String(rowVal || '').toLowerCase();
         const strFilterVal = f.preparedValue as string;

         if (f.operator === 'starts_with' && !strRowVal.startsWith(strFilterVal)) { pass = false; break; }
         if (f.operator === 'contains' && !strRowVal.includes(strFilterVal)) { pass = false; break; }
         if (f.operator === 'eq' && strRowVal !== strFilterVal) { pass = false; break; }
      }
      if (!pass) continue;
    }

    // 1.2 Extraction Clés Lignes
    const rowKeys = new Array(rowFields.length);
    for(let j=0; j<rowFields.length; j++) {
        const v = row[rowFields[j]];
        // Gérer null, undefined ET chaînes vides
        rowKeys[j] = v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '(Vide)';
    }

    // 1.3 Extraction Clé Colonne
    let colKey = 'ALL';
    if (colField) {
       let v = row[colField];
       if (v === undefined || v === null) v = '(Vide)';
       else v = String(v);
       colKey = getGroupedLabel(v, colGrouping);
       colHeadersSet.add(colKey);
    }

    // 1.4 Extraction Métrique
    let metricVal = 0;
    // On ne parse que si nécessaire
    if (aggType !== 'count' && aggType !== 'list') {
       metricVal = parseSmartNumber(row[valField], valUnit);
    }

    optimizedRows.push({
       rowKeys,
       colKey,
       metricVal,
       rawVal: row[valField]
    });
  }

  const sortedColHeaders = Array.from(colHeadersSet).sort();

  // --- PHASE 2 : AGREGATION ---

  const initStats = () => ({
      colMetrics: new Map<string, any>(),
      rowTotalMetric: (aggType === 'min' ? Infinity : aggType === 'max' ? -Infinity : (aggType === 'list' ? new Set() : 0)) as any,
      count: 0,
      colCounts: new Map<string, number>()
  });

  const computeGroupStats = (groupRows: OptimizedRow[]): GroupStats => {
      const stats = initStats();

      // Boucle chaude : doit être la plus performante possible
      for (let i = 0; i < groupRows.length; i++) {
          const row = groupRows[i];
          const val = aggType === 'count' ? 1 : row.metricVal;
          const colKey = row.colKey;

          // Mise à jour Total Ligne
          if (aggType === 'sum' || aggType === 'count' || aggType === 'avg') {
              stats.rowTotalMetric += val;
              if (aggType === 'avg') stats.count++;
          } else if (aggType === 'min') {
              if (val < stats.rowTotalMetric) stats.rowTotalMetric = val;
          } else if (aggType === 'max') {
              if (val > stats.rowTotalMetric) stats.rowTotalMetric = val;
          } else if (aggType === 'list') {
              if (row.rawVal) stats.rowTotalMetric.add(String(row.rawVal));
          }

          // Mise à jour Métrique Colonne
          if (colField) {
              let currentVal = stats.colMetrics.get(colKey);
              
              if (currentVal === undefined) {
                  if (aggType === 'min') currentVal = Infinity;
                  else if (aggType === 'max') currentVal = -Infinity;
                  else if (aggType === 'list') currentVal = new Set();
                  else currentVal = 0;
              }

              if (aggType === 'sum' || aggType === 'count' || aggType === 'avg') {
                  stats.colMetrics.set(colKey, currentVal + val);
                  if (aggType === 'avg') {
                      stats.colCounts.set(colKey, (stats.colCounts.get(colKey) || 0) + 1);
                  }
              } else if (aggType === 'min') {
                  if (val < currentVal) stats.colMetrics.set(colKey, val);
              } else if (aggType === 'max') {
                  if (val > currentVal) stats.colMetrics.set(colKey, val);
              } else if (aggType === 'list') {
                  if (row.rawVal) {
                      currentVal.add(String(row.rawVal));
                      // Set modifie la référence, pas besoin de set() strict mais plus propre
                  }
              }
          }
      }

      return finalizeStats(stats, sortedColHeaders, aggType);
  };

  const finalizeStats = (stats: any, headers: string[], type: AggregationType): GroupStats => {
      const finalMetrics: Record<string, number | string> = {};
      const rawMetrics = new Map<string, number>(); // Pour le tri par colonne
      let finalTotal = stats.rowTotalMetric;
      let rawRowTotal = 0;

      // Finalisation AVG
      if (type === 'avg') {
          if (stats.count > 0) finalTotal = finalTotal / stats.count;
          else finalTotal = 0;
          
          stats.colMetrics.forEach((val: number, key: string) => {
              const count = stats.colCounts.get(key) || 1;
              stats.colMetrics.set(key, val / count);
          });
      }

      // Stockage de la valeur numérique brute pour le tri
      if (typeof finalTotal === 'number') rawRowTotal = finalTotal;
      else if (type === 'list') rawRowTotal = (finalTotal as Set<string>).size; // Tri par nombre d'éléments

      // Finalisation LIST
      if (type === 'list') {
          const formatList = (s: Set<string>) => {
              const arr = Array.from(s);
              if (arr.length === 0) return '-';
              if (arr.length > 3) return `${arr.slice(0, 3).join(', ')} (+${arr.length - 3})`;
              return arr.join(', ');
          };
          finalTotal = formatList(finalTotal);
          stats.colMetrics.forEach((val: Set<string>, key: string) => {
              stats.colMetrics.set(key, formatList(val));
          });
      }

      // Nettoyage Infinity
      if (type === 'min' || type === 'max') {
          if (!isFinite(finalTotal)) finalTotal = 0;
          rawRowTotal = Number(finalTotal);
      }

      // Remplissage dense
      headers.forEach(h => {
          let val = stats.colMetrics.get(h);
          
          // Stockage brute pour tri
          if (typeof val === 'number') rawMetrics.set(h, val);
          else if (val instanceof Set) rawMetrics.set(h, val.size);
          else rawMetrics.set(h, 0);

          if (val === undefined) {
              if (type === 'min' || type === 'max') val = undefined;
              else if (type === 'list') val = '-';
              else val = undefined; 
          } else if ((type === 'min' || type === 'max') && !isFinite(val)) {
              val = undefined;
          }
          finalMetrics[h] = val;
      });

      return { metrics: finalMetrics, rowTotal: finalTotal, rawRowTotal, rawMetrics };
  };

  const displayRows: PivotRow[] = [];

  const processLevel = (levelRows: OptimizedRow[], level: number, parentKeys: string[]) => {
    // 1. Groupement
    const groups = new Map<string, OptimizedRow[]>();
    for (let i = 0; i < levelRows.length; i++) {
        const r = levelRows[i];
        const key = r.rowKeys[level];
        let g = groups.get(key);
        if (!g) {
            g = [];
            groups.set(key, g);
        }
        g.push(r);
    }

    // Optimisation 1.2 : Cache du tri par valeur
    // Calculer les stats pour chaque groupe UNE SEULE FOIS avant le tri
    // Structure: Map<Key, ComputedStats>
    const groupStatsCache = new Map<string, GroupStats>();
    
    // Si on trie par valeur, on doit pré-calculer
    // Si on trie par label, on peut calculer à la demande (lazy), mais pour simplifier 
    // et comme on a besoin des stats pour l'affichage de toute façon, on pré-calcule tout ici.
    // C'est beaucoup plus performant que de recalculer dans le .sort()
    
    const groupKeys = Array.from(groups.keys());
    
    // Calcul en masse
    for (const key of groupKeys) {
        const rows = groups.get(key)!;
        groupStatsCache.set(key, computeGroupStats(rows));
    }

    // 2. Tri avec Lookup (O(1) access inside sort)
    const sortedKeys = groupKeys.sort((a, b) => {
      if (sortBy === 'label') {
        return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      } else {
        const statsA = groupStatsCache.get(a)!;
        const statsB = groupStatsCache.get(b)!;
        
        let valA = 0;
        let valB = 0;

        if (sortBy === 'value') { // Grand Total
          valA = statsA.rawRowTotal;
          valB = statsB.rawRowTotal;
        } else { // Specific Column
          valA = statsA.rawMetrics.get(sortBy) ?? 0;
          valB = statsB.rawMetrics.get(sortBy) ?? 0;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    // 3. Construction des lignes (Réutilisation du cache)
    for (const key of sortedKeys) {
      const subgroupRows = groups.get(key)!;
      const currentKeys = [...parentKeys, key];
      const stats = groupStatsCache.get(key)!; // Récupération directe, pas de recalcul !

      if (level === rowFields.length - 1) {
        // Niveau Feuille
        displayRows.push({
          type: 'data',
          keys: currentKeys,
          level,
          metrics: stats.metrics,
          rowTotal: stats.rowTotal
        });
      } else {
        // Niveau Nœud
        processLevel(subgroupRows, level + 1, currentKeys);

        if (showSubtotals) {
          displayRows.push({
            type: 'subtotal',
            keys: currentKeys,
            level,
            metrics: stats.metrics,
            rowTotal: stats.rowTotal,
            label: `Total ${key}`
          });
        }
      }
    }
  };

  // Lancement récursif
  processLevel(optimizedRows, 0, []);

  // Total Général
  // On utilise la fonction standard car elle n'est appelée qu'une fois
  const grandTotalStats = computeGroupStats(optimizedRows);

  return {
    colHeaders: sortedColHeaders,
    displayRows,
    colTotals: grandTotalStats.metrics,
    grandTotal: grandTotalStats.rowTotal
  };
};

/**
 * Helper de formatage d'affichage
 */
export const formatPivotOutput = (val: number | string, valField: string, aggType: string, dataset?: Dataset | null, secondaryDatasetId?: string, allDatasets?: Dataset[], overrideConfig?: Partial<FieldConfig>) => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'string') return val;
    
    // Utiliser config standard si numérique
    if (aggType !== 'count' && valField) {
        // Si une config spécifique est fournie par le TCD, on l'utilise
        if (overrideConfig && (overrideConfig.decimalPlaces !== undefined || overrideConfig.displayScale !== undefined || overrideConfig.unit)) {
            return formatNumberValue(val, overrideConfig as FieldConfig);
        }

        let config = dataset?.fieldConfigs?.[valField];
        
        // Si pas de config standard, chercher dans calculated fields
        if (!config && dataset?.calculatedFields) {
            const cf = dataset.calculatedFields.find(c => c.name === valField);
            if (cf?.unit) {
                config = { type: 'number', unit: cf.unit };
            }
        }

        // Si toujours rien, chercher dans les datasets secondaires via préfixe
        if (!config && allDatasets) {
           const prefixMatch = valField.match(/^\[(.*?)\] (.*)$/);
           if (prefixMatch) {
               const dsName = prefixMatch[1];
               const originalFieldName = prefixMatch[2];
               const sourceDS = allDatasets.find(d => d.name === dsName);
               config = sourceDS?.fieldConfigs?.[originalFieldName];
               
               if (!config && sourceDS?.calculatedFields) {
                   const cf = sourceDS.calculatedFields.find(c => c.name === originalFieldName);
                   if (cf?.unit) {
                       config = { type: 'number', unit: cf.unit };
                   }
               }
           }
        }
        
        if (config) return formatNumberValue(val, config);
    }
    
    // Fallback
    if (val % 1 !== 0) return val.toFixed(2);
    return val.toLocaleString();
};