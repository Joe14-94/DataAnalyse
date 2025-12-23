
import { parseSmartNumber, getGroupedLabel, detectColumnType, formatNumberValue } from '../utils';
import { FieldConfig, Dataset, FilterRule } from '../types';

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
  secondaryDatasetId?: string;
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

/**
 * MOTEUR TCD : Logique pure de calcul optimisée
 */
export const calculatePivotData = (config: PivotConfig): PivotResult | null => {
  const { 
    rows, rowFields, colField, colGrouping, valField, aggType, 
    filters, sortBy, sortOrder, showSubtotals 
  } = config;

  if (rows.length === 0 || rowFields.length === 0) return null;

  // --- PHASE 1 : FILTRAGE & PRE-CALCUL (O(N)) ---
  // On prépare les données une seule fois pour éviter de parser les nombres/dates dans les boucles récursives.
  
  const optimizedRows: OptimizedRow[] = [];
  const colHeadersSet = new Set<string>();

  // Cache pour l'unité du champ valeur (évite de chercher dans dataset config à chaque ligne)
  let valUnit: string | undefined = undefined;
  
  // 1. Chercher dans fieldConfigs du dataset principal
  if (config.currentDataset?.fieldConfigs?.[valField]?.unit) {
      valUnit = config.currentDataset.fieldConfigs[valField].unit;
  } 
  // 2. Chercher dans calculatedFields du dataset courant
  else if (config.currentDataset?.calculatedFields) {
      const cf = config.currentDataset.calculatedFields.find(c => c.name === valField);
      if (cf?.unit) valUnit = cf.unit;
  }
  // 3. Chercher dans dataset secondaire (blending avec préfixe)
  else if (config.secondaryDatasetId && config.datasets) {
      // Vérifier si le champ commence par [NomDataset]
      const prefixMatch = valField.match(/^\[(.*?)\] (.*)$/);
      if (prefixMatch) {
          const dsName = prefixMatch[1];
          const originalFieldName = prefixMatch[2];
          // Trouver le dataset correspondant au nom
          const sourceDS = config.datasets.find(d => d.name === dsName);
          if (sourceDS?.fieldConfigs?.[originalFieldName]?.unit) {
              valUnit = sourceDS.fieldConfigs[originalFieldName].unit;
          } else if (sourceDS?.calculatedFields) {
              const cf = sourceDS.calculatedFields.find(c => c.name === originalFieldName);
              if (cf?.unit) valUnit = cf.unit;
          }
      }
  }

  // Boucle unique de préparation
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // 1.1 Filtrage
    if (filters && filters.length > 0) {
      let pass = true;
      for (const f of filters) {
         const rowVal = row[f.field];
         // Optimisation: traitement direct si tableau (cas fréquent)
         if (Array.isArray(f.value) && (!f.operator || f.operator === 'in')) {
             if (f.value.length > 0 && !f.value.includes(String(rowVal))) {
                 pass = false; break;
             }
             continue;
         }
         
         const strRowVal = String(rowVal || '').toLowerCase();
         const strFilterVal = String(f.value || '').toLowerCase();

         if (f.operator === 'starts_with' && !strRowVal.startsWith(strFilterVal)) { pass = false; break; }
         if (f.operator === 'contains' && !strRowVal.includes(strFilterVal)) { pass = false; break; }
         if (f.operator === 'eq' && strRowVal !== strFilterVal) { pass = false; break; }
         if (f.operator === 'gt' && parseSmartNumber(rowVal) <= parseSmartNumber(f.value)) { pass = false; break; }
         if (f.operator === 'lt' && parseSmartNumber(rowVal) >= parseSmartNumber(f.value)) { pass = false; break; }
      }
      if (!pass) continue;
    }

    // 1.2 Extraction Clés Lignes
    const rowKeys = rowFields.map(field => {
       const v = row[field];
       return v !== undefined && v !== null ? String(v) : '(Vide)';
    });

    // 1.3 Extraction Clé Colonne
    let colKey = 'ALL';
    if (colField) {
       let v = row[colField];
       if (v === undefined || v === null) v = '(Vide)';
       else v = String(v);
       colKey = getGroupedLabel(v, colGrouping);
       colHeadersSet.add(colKey);
    }

    // 1.4 Extraction Métrique (Parsing Unique)
    let metricVal = 0;
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

  // --- PHASE 2 : AGREGATION RECURSIVE ---

  // Helper pour initialiser les stats d'un groupe
  const initStats = () => {
      // Utilisation d'une Map pour les colonnes éparses (Performance + Memory)
      return {
          colMetrics: new Map<string, any>(),
          rowTotalMetric: (aggType === 'min' ? Infinity : aggType === 'max' ? -Infinity : (aggType === 'list' ? new Set() : 0)) as any,
          count: 0, // Pour AVG global
          colCounts: new Map<string, number>() // Pour AVG par colonne
      };
  };

  const computeGroupStats = (groupRows: OptimizedRow[]) => {
      const stats = initStats();

      for (const row of groupRows) {
          const val = aggType === 'count' ? 1 : row.metricVal;
          const colKey = row.colKey;

          // Mise à jour Total Ligne
          if (aggType === 'sum' || aggType === 'count') {
              stats.rowTotalMetric += val;
          } else if (aggType === 'avg') {
              stats.rowTotalMetric += val;
              stats.count++;
          } else if (aggType === 'min') {
              stats.rowTotalMetric = Math.min(stats.rowTotalMetric, val);
          } else if (aggType === 'max') {
              stats.rowTotalMetric = Math.max(stats.rowTotalMetric, val);
          } else if (aggType === 'list') {
              if (row.rawVal) stats.rowTotalMetric.add(String(row.rawVal));
          }

          // Mise à jour Métrique Colonne (Si colonne définie)
          if (colField) {
              let currentVal = stats.colMetrics.get(colKey);
              
              // Init value if undefined
              if (currentVal === undefined) {
                  if (aggType === 'min') currentVal = Infinity;
                  else if (aggType === 'max') currentVal = -Infinity;
                  else if (aggType === 'list') currentVal = new Set();
                  else currentVal = 0;
              }

              if (aggType === 'sum' || aggType === 'count') {
                  stats.colMetrics.set(colKey, currentVal + val);
              } else if (aggType === 'avg') {
                  stats.colMetrics.set(colKey, currentVal + val);
                  stats.colCounts.set(colKey, (stats.colCounts.get(colKey) || 0) + 1);
              } else if (aggType === 'min') {
                  stats.colMetrics.set(colKey, Math.min(currentVal, val));
              } else if (aggType === 'max') {
                  stats.colMetrics.set(colKey, Math.max(currentVal, val));
              } else if (aggType === 'list') {
                  if (row.rawVal) currentVal.add(String(row.rawVal));
                  stats.colMetrics.set(colKey, currentVal); // Set reference back if needed (for Set it works by ref but good practice)
              }
          }
      }

      return finalizeStats(stats, sortedColHeaders, aggType);
  };

  // Transformation finale des stats (Map -> Object pour affichage)
  const finalizeStats = (stats: any, headers: string[], type: AggregationType) => {
      const finalMetrics: Record<string, number | string> = {};
      let finalTotal = stats.rowTotalMetric;

      // Finalisation AVG
      if (type === 'avg') {
          if (stats.count > 0) finalTotal = finalTotal / stats.count;
          else finalTotal = 0;
          
          stats.colMetrics.forEach((val: number, key: string) => {
              const count = stats.colCounts.get(key) || 1;
              stats.colMetrics.set(key, val / count);
          });
      }

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
      }

      // Remplissage de l'objet final (Sparse -> Dense pour l'affichage tableau)
      // On ne remplit que si nécessaire, sinon undefined (le composant affichera '-')
      headers.forEach(h => {
          let val = stats.colMetrics.get(h);
          if (val === undefined) {
              if (type === 'min' || type === 'max') val = undefined; // Reste vide
              else if (type === 'list') val = '-';
              else val = undefined; // 0 ou undefined selon préférence affichage. Ici undefined pour '-'
          } else if ((type === 'min' || type === 'max') && !isFinite(val)) {
              val = undefined;
          }
          finalMetrics[h] = val;
      });

      return { metrics: finalMetrics, rowTotal: finalTotal };
  };

  const displayRows: PivotRow[] = [];

  const processLevel = (levelRows: OptimizedRow[], level: number, parentKeys: string[]) => {
    // Groupement par clé du niveau actuel
    // Map est plus rapide que Object pour les clés dynamiques et évite le prototypage
    const groups = new Map<string, OptimizedRow[]>();
    
    for (const r of levelRows) {
        const key = r.rowKeys[level];
        const g = groups.get(key);
        if (g) g.push(r);
        else groups.set(key, [r]);
    }

    // Tri des clés
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (sortBy === 'label') {
        return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      } else {
        // Tri par valeur : nécessite un calcul anticipé (coûteux mais nécessaire)
        // On ne calcule les stats complètes que si nécessaire pour le tri
        const groupA = groups.get(a)!;
        const groupB = groups.get(b)!;
        
        // Approximation rapide : somme locale sans recalculer toute la structure si possible ?
        // Pour être exact, il faut computeStats.
        const statsA = computeGroupStats(groupA);
        const statsB = computeGroupStats(groupB);
        
        let valA: any = 0;
        let valB: any = 0;

        if (sortBy === 'value') { // Grand Total
          valA = statsA.rowTotal;
          valB = statsB.rowTotal;
        } else { // Specific Column
          valA = statsA.metrics[sortBy] ?? 0;
          valB = statsB.metrics[sortBy] ?? 0;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return sortOrder === 'asc' 
           ? String(valA).localeCompare(String(valB)) 
           : String(valB).localeCompare(String(valA));
      }
    });

    // Construction des lignes
    for (const key of sortedKeys) {
      const subgroupRows = groups.get(key)!;
      const currentKeys = [...parentKeys, key];

      if (level === rowFields.length - 1) {
        // Niveau Feuille
        const { metrics, rowTotal } = computeGroupStats(subgroupRows);
        displayRows.push({
          type: 'data',
          keys: currentKeys,
          level,
          metrics,
          rowTotal
        });
      } else {
        // Niveau Nœud
        processLevel(subgroupRows, level + 1, currentKeys);

        if (showSubtotals) {
          const { metrics, rowTotal } = computeGroupStats(subgroupRows);
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
    }
  };

  // Lancement récursif
  processLevel(optimizedRows, 0, []);

  // Total Général
  const { metrics: colTotals, rowTotal: grandTotal } = computeGroupStats(optimizedRows);

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

        // Si toujours rien, chercher dans le dataset secondaire via préfixe
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
