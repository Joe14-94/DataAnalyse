import { PivotResult, PivotConfig, PivotRow, DateGrouping, AggregationType, ChartType, ColorPalette, ColorMode } from '../types';

export type { ChartType, ColorPalette, ColorMode };

// ============================================================================
// TYPES POUR SUNBURST ET TREEMAP HIERARCHIQUE
// ============================================================================

export interface HierarchicalNode {
  name: string;
  value?: number;
  children?: HierarchicalNode[];
  path?: string[];
}

export interface SunburstRingItem {
  name: string;
  value: number;
  fill: string;
  path: string[];
  parentName: string;
  parentTotal: number;
  grandTotal: number;
}

export interface SunburstData {
  tree: HierarchicalNode[];
  rings: SunburstRingItem[][];
  totalValue: number;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: any; // Pour les séries multiples
}

export interface ChartTransformOptions {
  chartType: ChartType;
  limit?: number; // Limiter au Top N
  excludeSubtotals?: boolean; // Exclure les sous-totaux (défaut: true)
  sortBy?: 'name' | 'value' | 'none'; // Tri des données
  sortOrder?: 'asc' | 'desc';
  showOthers?: boolean; // Regrouper le reste en "Autres"
  hierarchyLevel?: number; // Filtrer par niveau de hiérarchie (0, 1, 2...)
  colorPalette?: ColorPalette; // Palette de couleurs (défaut: 'default')
  colorMode?: ColorMode; // Mode de coloration (défaut: 'multi')
  singleColor?: string; // Couleur unique pour le mode 'single'
  gradientStart?: string; // Couleur de début pour le mode 'gradient'
  gradientEnd?: string; // Couleur de fin pour le mode 'gradient'
}

export interface ChartMetadata {
  suggestedType: ChartType;
  isMultiSeries: boolean;
  seriesNames: string[]; // Noms des séries (pour graphiques multi-séries)
  hasTemporalData: boolean;
  hasHierarchy: boolean;
  totalDataPoints: number;
  valueFieldLabel: string;
}

/**
 * Convertit le tree Sunburst (array de nodes) en un seul node root pour D3
 */
export const sunburstDataToD3Hierarchy = (sunburstData: SunburstData): HierarchicalNode => {
  return {
    name: 'root',
    children: sunburstData.tree,
    value: undefined // La valeur sera calculée par d3.hierarchy().sum()
  };
};

// ============================================================================
// DETECTION AUTOMATIQUE DU TYPE DE GRAPHIQUE
// ============================================================================

/**
 * Détecte automatiquement le meilleur type de graphique selon la configuration TCD
 */
export const detectBestChartType = (
  config: PivotConfig,
  result: PivotResult
): ChartType => {
  const { rowFields, colFields, colGrouping, aggType } = config;
  const hasMultipleCols = (colFields || []).length > 0;
  const isTemporal = colGrouping !== 'none';
  const dataRowsCount = (result?.displayRows || []).filter(r => r.type === 'data').length;
  const hasHierarchy = (rowFields || []).length > 1;

  // Cas 1 : Données temporelles avec colonnes multiples → Line Chart
  if (isTemporal && hasMultipleCols) {
    return 'line';
  }

  // Cas 2 : Hiérarchie + colonnes multiples → Sunburst (répartition hiérarchique)
  if (hasHierarchy && hasMultipleCols && !isTemporal) {
    return 'sunburst';
  }

  // Cas 3 : Colonnes multiples sans temporalité → Stacked Bar
  if (hasMultipleCols && dataRowsCount <= 20) {
    return 'stacked-bar';
  }

  // Cas 4 : Beaucoup de données hiérarchiques → Treemap
  if (hasHierarchy && dataRowsCount > 15) {
    return 'treemap';
  }

  // Cas 5 : Peu de données (≤ 7) → Pie Chart
  if (dataRowsCount <= 7 && !hasMultipleCols && !hasHierarchy) {
    return 'pie';
  }

  // Cas 6 : Données temporelles simples → Line ou Area
  if (isTemporal) {
    return aggType === 'sum' ? 'area' : 'line';
  }

  // Cas 7 : Défaut → Column Chart (barres verticales)
  return 'column';
};

/**
 * Génère les métadonnées du graphique
 */
export const generateChartMetadata = (
  config: PivotConfig,
  result: PivotResult
): ChartMetadata => {
  const { rowFields, colFields, colGrouping, valField, aggType } = config;

  // Utiliser result.colHeaders pour détecter multi-séries (fonctionne en mode temporel)
  const seriesHeaders = (result?.colHeaders || []).filter(h => !h.endsWith('_DIFF') && !h.endsWith('_PCT'));
  const isMultiSeries = seriesHeaders.length > 1;
  const hasTemporalData = colGrouping !== 'none';
  const hasHierarchy = (rowFields || []).length > 1;
  const dataRows = (result?.displayRows || []).filter(r => r.type === 'data');

  // Noms des séries pour graphiques multi-séries
  const seriesNames = isMultiSeries
    ? seriesHeaders
    : [getAggregationLabel(aggType, valField)];

  return {
    suggestedType: detectBestChartType(config, result),
    isMultiSeries,
    seriesNames,
    hasTemporalData,
    hasHierarchy,
    totalDataPoints: dataRows.length,
    valueFieldLabel: valField || 'Valeur'
  };
};

/**
 * Détecte les niveaux de hiérarchie disponibles dans les données
 */
export const getAvailableHierarchyLevels = (result: PivotResult): number => {
  const dataRows = (result.displayRows || []).filter(row => row.type === 'data');
  if (dataRows.length === 0) return 0;

  // Trouver le niveau maximum
  const maxLevel = Math.max(...dataRows.map(row => row.level || 0), -1);
  return maxLevel + 1; // Retourner le nombre de niveaux (0-indexed)
};

// ============================================================================
// TRANSFORMATION DES DONNEES
// ============================================================================

/**
 * Transforme les données du TCD en format compatible Recharts
 */
export const transformPivotToChartData = (
  result: PivotResult,
  config: PivotConfig,
  options: ChartTransformOptions
): ChartDataPoint[] => {
  const {
    chartType,
    limit = 0,
    excludeSubtotals = true,
    sortBy = 'value',
    sortOrder = 'desc',
    showOthers = false,
    hierarchyLevel = undefined
  } = options;

  // Filtrer les lignes de données (exclure sous-totaux et grand total)
  let dataRows = (result.displayRows || []).filter(row => {
    // Si on filtre par niveau de hiérarchie, inclure aussi les sous-totals du niveau demandé
    if (hierarchyLevel !== undefined && hierarchyLevel >= 0) {
      return row.type !== 'grandTotal' && row.level === hierarchyLevel;
    }

    // Sinon, appliquer la logique normale
    if (excludeSubtotals) {
      return row.type === 'data';
    }
    return row.type !== 'grandTotal';
  });

  // Détecter si multi-séries en utilisant result.colHeaders (fonctionne en mode temporel)
  const seriesHeaders = result.colHeaders.filter(h => !h.endsWith('_DIFF') && !h.endsWith('_PCT'));
  const isMultiSeries = seriesHeaders.length > 1;

  // DEBUG: Log pour vérifier la détection
  if (dataRows.length > 0) {
    console.log('📊 transformPivotToChartData:', {
      colHeadersCount: result.colHeaders.length,
      seriesHeadersCount: seriesHeaders.length,
      seriesHeaders: seriesHeaders,
      isMultiSeries,
      firstRowMetrics: dataRows[0]?.metrics,
      firstRowTotal: dataRows[0]?.rowTotal
    });
  }

  // Transformer en ChartDataPoint
  let chartData: ChartDataPoint[] = dataRows.map(row => {
    const dataPoint: ChartDataPoint = {
      name: formatRowLabel(row, config)
    };

    // Pour graphiques multi-séries : ajouter toutes les métriques
    if (isMultiSeries && row.metrics && Object.keys(row.metrics).length > 0) {
      // Exclure les colonnes de variation (_DIFF, _PCT)
      const metricKeys = Object.keys(row.metrics).filter(
        key => !key.endsWith('_DIFF') && !key.endsWith('_PCT')
      );

      metricKeys.forEach(key => {
        const value = row.metrics[key];
        dataPoint[key] = typeof value === 'number' ? value : 0;
      });
    } else {
      // Pour graphiques simples : utiliser rowTotal
      dataPoint.value = typeof row.rowTotal === 'number' ? row.rowTotal : 0;
    }

    return dataPoint;
  });


  // Tri des données
  if (sortBy === 'name') {
    chartData.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  } else if (sortBy === 'value') {
    chartData.sort((a, b) => {
      // Pour multi-séries, trier par la somme de toutes les séries
      const aValue = isMultiSeries
        ? Object.keys(a).filter(k => k !== 'name').reduce((sum, k) => sum + (a[k] || 0), 0)
        : (a.value || 0);
      const bValue = isMultiSeries
        ? Object.keys(b).filter(k => k !== 'name').reduce((sum, k) => sum + (b[k] || 0), 0)
        : (b.value || 0);

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }

  // Limitation au Top N
  if (limit > 0 && chartData.length > limit) {
    if (showOthers) {
      const topN = chartData.slice(0, limit);
      const others = chartData.slice(limit);

      // Agréger les "Autres"
      const othersPoint: ChartDataPoint = { name: 'Autres' };

      if (isMultiSeries) {
        const metricKeys = Object.keys(topN[0]).filter(k => k !== 'name');
        metricKeys.forEach(key => {
          othersPoint[key] = others.reduce((sum, item) => sum + (item[key] || 0), 0);
        });
      } else {
        othersPoint.value = others.reduce((sum, item) => sum + (item.value || 0), 0);
      }

      chartData = [...topN, othersPoint];
    } else {
      chartData = chartData.slice(0, limit);
    }
  }

  return chartData;
};

/**
 * Transforme les données pour un Treemap (hiérarchie)
 * Retourne un tableau PLAT de données pour Recharts Treemap
 */
export const transformPivotToTreemapData = (
  result: PivotResult,
  config: PivotConfig,
  hierarchyLevel?: number
): any[] => {
  // Si on filtre par niveau de hiérarchie, inclure aussi les sous-totals du niveau demandé
  let dataRows: PivotRow[];
  if (hierarchyLevel !== undefined && hierarchyLevel >= 0) {
    dataRows = (result.displayRows || []).filter(r => r.type !== 'grandTotal' && r.level === hierarchyLevel);
  } else {
    dataRows = (result.displayRows || []).filter(r => r.type === 'data');
  }

  console.log('🌳 transformPivotToTreemapData - dataRows:', dataRows.length);

  // Convertir en format plat pour Recharts Treemap
  const flatData = dataRows.map(row => {
    const keys = row.keys;
    const value = typeof row.rowTotal === 'number' ? row.rowTotal : 0;

    // Créer un label hiérarchique si plusieurs niveaux
    const label = keys.length > 1 ? keys.join(' > ') : (keys[0] || '(Vide)');

    return {
      name: String(label),
      size: value,
      value: value // Pour compatibilité avec le tooltip
    };
  });

  // Trier par taille décroissante
  flatData.sort((a, b) => b.size - a.size);

  // Limiter aux top 10 pour la lisibilité
  const topData = flatData.slice(0, 10);

  console.log('🌳 Données treemap (top 10):', topData);
  console.log('🌳 Premier élément:', topData[0]);
  console.log('🌳 Format correct pour Recharts:', topData.every(d => d.name && typeof d.size === 'number'));

  return topData;
};

// ============================================================================
// TRANSFORMATION HIERARCHIQUE (SUNBURST + TREEMAP)
// ============================================================================

/**
 * Eclaircit une couleur hex d'un facteur donné (0-1)
 */
export const lightenColor = (hex: string, factor: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const newR = Math.min(255, Math.round(r + (255 - r) * factor));
  const newG = Math.min(255, Math.round(g + (255 - g) * factor));
  const newB = Math.min(255, Math.round(b + (255 - b) * factor));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

/**
 * Calcule la valeur totale d'un noeud (récursif)
 * Additionne sa propre valeur et celle de tous ses descendants
 */
const getNodeValue = (node: HierarchicalNode): number => {
  let val = typeof node.value === 'number' ? node.value : 0;
  if (node.children && node.children.length > 0) {
    val += node.children.reduce((sum, c) => sum + getNodeValue(c), 0);
  }
  return val;
};

/**
 * Construit l'arbre hiérarchique à partir des données pivot
 * Utilisé pour le sunburst (multi-Pie) et le treemap hiérarchique
 */
export const buildHierarchicalTree = (
  result: PivotResult,
  config: PivotConfig,
  options?: { limit?: number; showOthers?: boolean }
): HierarchicalNode[] => {
  const dataRows = (result.displayRows || []).filter(r => r.type === 'data');
  const seriesHeaders = result.colHeaders.filter(h => !h.endsWith('_DIFF') && !h.endsWith('_PCT'));
  const hasMultiCols = seriesHeaders.length > 1;

  console.log('🌞🌞🌞 buildHierarchicalTree START:', {
    dataRowsCount: dataRows.length,
    seriesHeadersCount: seriesHeaders.length,
    seriesHeaders,
    hasMultiCols,
    firstRow: dataRows[0],
    firstRowKeys: dataRows[0]?.keys,
    firstRowMetrics: dataRows[0]?.metrics,
    firstRowTotal: dataRows[0]?.rowTotal
  });

  // Map pour construire l'arbre incrementalement
  const nodeMap = new Map<string, HierarchicalNode>();
  const tree: HierarchicalNode[] = [];

  for (const row of dataRows) {
    // Naviguer/creer chaque niveau de la hierarchie
    for (let depth = 0; depth < row.keys.length; depth++) {
      const pathKey = row.keys.slice(0, depth + 1).join('\x1F');
      const parentKey = depth > 0 ? row.keys.slice(0, depth).join('\x1F') : null;

      if (!nodeMap.has(pathKey)) {
        const node: HierarchicalNode = {
          name: row.keys[depth] || '(Vide)',
          children: [],
          path: row.keys.slice(0, depth + 1)
        };
        nodeMap.set(pathKey, node);

        if (parentKey && nodeMap.has(parentKey)) {
          nodeMap.get(parentKey)!.children!.push(node);
        } else if (depth === 0) {
          tree.push(node);
        }
      }
    }

    // Au niveau feuille, ajouter les valeurs
    const leafKey = row.keys.join('\x1F');
    const leafNode = nodeMap.get(leafKey)!;

    if (hasMultiCols && row.metrics && Object.keys(row.metrics).length > 0) {
      // Ajouter les colonnes comme niveau feuille
      const childrenWithValues = seriesHeaders.map(header => ({
        name: header,
        value: typeof row.metrics[header] === 'number' ? (row.metrics[header] as number) : 0,
        path: [...row.keys, header]
      })).filter(item => item.value! > 0);

      if (dataRows.indexOf(row) < 2) {
        console.log(`🌞 LEAF row ${dataRows.indexOf(row)}:`, {
          keys: row.keys,
          hasMultiCols,
          metricsKeys: Object.keys(row.metrics || {}),
          childrenWithValues: childrenWithValues.length,
          rowTotal: row.rowTotal
        });
      }

      // Si après filtrage il reste des enfants, les utiliser
      // Sinon, fallback sur rowTotal
      if (childrenWithValues.length > 0) {
        // Accumuler les enfants si le noeud en a déjà (ragged hierarchy)
        leafNode.children = [...(leafNode.children || []), ...childrenWithValues];
      } else {
        // Pas de métriques valides, utiliser rowTotal
        leafNode.value = (leafNode.value || 0) + (typeof row.rowTotal === 'number' ? row.rowTotal : 0);
        if (dataRows.indexOf(row) < 2) {
          console.log(`🌞 Using rowTotal fallback: ${leafNode.value}`);
        }
      }
    } else {
      // Pas de colonnes multiples ou pas de métriques : utiliser rowTotal comme valeur
      leafNode.value = (leafNode.value || 0) + (typeof row.rowTotal === 'number' ? row.rowTotal : 0);
      // IMPORTANT: Dans une hiérarchie ragged, on ne vide pas les enfants
      if (dataRows.indexOf(row) < 2) {
        console.log(`🌞 No multiCols, adding to rowTotal: ${leafNode.value}`);
      }
    }
  }

  // Appliquer le limit/Others sur le premier niveau
  if (options?.limit && options.limit > 0 && tree.length > options.limit) {
    tree.sort((a, b) => getNodeValue(b) - getNodeValue(a));
    if (options.showOthers) {
      const topN = tree.slice(0, options.limit);
      const rest = tree.slice(options.limit);
      const othersNode: HierarchicalNode = {
        name: 'Autres',
        value: rest.reduce((sum, n) => sum + getNodeValue(n), 0),
        path: ['Autres']
      };
      tree.length = 0;
      tree.push(...topN, othersNode);
    } else {
      tree.length = options.limit;
    }
  }

  console.log('🌞🌞🌞 buildHierarchicalTree END:', {
    treeLength: tree.length,
    tree: tree.slice(0, 3),
    firstNodeChildren: tree[0]?.children?.length,
    firstNodeValue: tree[0]?.value
  });

  return tree;
};

/**
 * Transforme l'arbre hiérarchique en anneaux concentriques pour le sunburst
 * Chaque anneau est un tableau de SunburstRingItem ordonnés pour aligner avec les parents
 */
export const treeToSunburstRings = (
  tree: HierarchicalNode[],
  baseColors: string[]
): SunburstRingItem[][] => {
  const rings: SunburstRingItem[][] = [];
  const grandTotal = tree.reduce((sum, n) => sum + getNodeValue(n), 0);

  console.log('🌞🌞🌞 treeToSunburstRings START:', {
    treeLength: tree.length,
    grandTotal,
    baseColorsLength: baseColors.length,
    baseColors
  });

  // Map pour stocker la couleur de chaque noeud (pour propagation aux enfants)
  const colorMap = new Map<string, string>();

  function traverse(
    nodes: HierarchicalNode[],
    level: number,
    parentPath: string[],
    parentColor: string,
    parentTotal: number
  ) {
    if (!rings[level]) rings[level] = [];

    console.log(`🌞 Traversing level ${level}, nodes count: ${nodes.length}`);

    nodes.forEach((node, idx) => {
      const path = [...parentPath, node.name];
      const pathKey = path.join('\x1F');
      const nodeValue = getNodeValue(node);

      // Attribuer une couleur
      let fill: string;
      if (level === 0) {
        // Niveau 1 : couleurs distinctes de la palette
        fill = baseColors[idx % baseColors.length];
      } else {
        // Niveaux plus profonds : nuances du parent
        const siblingCount = nodes.length;
        const lightenFactor = 0.15 + (idx / Math.max(siblingCount - 1, 1)) * 0.35;
        fill = lightenColor(parentColor, lightenFactor);
      }
      colorMap.set(pathKey, fill);

      // N'ajouter que si la valeur est significative (> 0)
      if (nodeValue > 0) {
        rings[level].push({
          name: node.name,
          value: nodeValue,
          fill,
          path,
          parentName: parentPath[parentPath.length - 1] || 'Total',
          parentTotal: parentTotal,
          grandTotal
        });

        if (level === 0 && idx < 2) {
          console.log(`🌞 ITEM level=${level} idx=${idx}: name="${node.name}", value=${nodeValue}, fill="${fill}", path=${JSON.stringify(path)}, nodeValue=${node.value}, hasChildren=${!!node.children}, childrenCount=${node.children?.length}`);
        }
      }

      // Recurser dans les enfants
      if (node.children && node.children.length > 0) {
        traverse(node.children, level + 1, path, fill, nodeValue);
      }
    });
  }

  traverse(tree, 0, [], baseColors[0], grandTotal);

  console.log('🌞🌞🌞 treeToSunburstRings END:', {
    ringsLength: rings.length,
    ringsItemCounts: rings.map(r => r.length),
    firstRing: rings[0]?.slice(0, 3)
  });

  return rings;
};

/**
 * Transforme les données pivot en SunburstData complet
 */
export const transformPivotToSunburstData = (
  result: PivotResult,
  config: PivotConfig,
  baseColors: string[],
  options?: { limit?: number; showOthers?: boolean }
): SunburstData => {
  console.log('🌞🌞🌞 transformPivotToSunburstData START');

  const tree = buildHierarchicalTree(result, config, options);
  const rings = treeToSunburstRings(tree, baseColors);
  const totalValue = tree.reduce((sum, n) => sum + getNodeValue(n), 0);

  console.log('🌞🌞🌞 transformPivotToSunburstData END:', {
    treeLength: tree.length,
    ringsLength: rings.length,
    totalValue,
    result: { tree, rings, totalValue }
  });

  return { tree, rings, totalValue };
};

/**
 * Transforme les données pivot en treemap hiérarchique (nested)
 */
export const transformPivotToHierarchicalTreemap = (
  result: PivotResult,
  config: PivotConfig,
  baseColors: string[],
  options?: { limit?: number; showOthers?: boolean }
): any[] => {
  const tree = buildHierarchicalTree(result, config, options);

  // Assigner des couleurs et la propriété 'size' pour Recharts Treemap
  let colorIdx = 0;
  function assignColorsAndSize(nodes: HierarchicalNode[], parentColor?: string, depth: number = 0): any[] {
    return nodes.map((node, idx) => {
      const color = depth === 0
        ? baseColors[colorIdx++ % baseColors.length]
        : lightenColor(parentColor || baseColors[0], 0.15 + (idx / Math.max(nodes.length - 1, 1)) * 0.3);

      if (node.children && node.children.length > 0) {
        return {
          name: node.name,
          fill: color,
          path: node.path,
          children: assignColorsAndSize(node.children, color, depth + 1)
        };
      }
      return {
        name: node.name,
        size: node.value || 0,
        value: node.value || 0,
        fill: color,
        path: node.path
      };
    });
  }

  return assignColorsAndSize(tree);
};

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Formate le label d'une ligne TCD pour le graphique
 */
const formatRowLabel = (row: PivotRow, config: PivotConfig): string => {
  if (row.label) return row.label;

  if (row.keys.length === 1) {
    return row.keys[0] || '(Vide)';
  }

  // Pour hiérarchie, concaténer avec séparateur
  return row.keys.length > 0 ? row.keys.join(' > ') : '(Vide)';
};

/**
 * Retourne le label d'agrégation selon le type
 */
const getAggregationLabel = (aggType: AggregationType, valField: string): string => {
  const fieldLabel = valField || 'Valeur';

  switch (aggType) {
    case 'count': return 'Nombre';
    case 'sum': return `Somme de ${fieldLabel}`;
    case 'avg': return `Moyenne de ${fieldLabel}`;
    case 'min': return `Min de ${fieldLabel}`;
    case 'max': return `Max de ${fieldLabel}`;
    case 'list': return fieldLabel;
    default: return fieldLabel;
  }
};

/**
 * Détermine si un graphique multi-séries est approprié
 */
export const isMultiSeriesAppropriate = (
  config: PivotConfig,
  result: PivotResult
): boolean => {
  const seriesCount = result.colHeaders.filter(h => !h.endsWith('_DIFF') && !h.endsWith('_PCT')).length;
  const dataPointsCount = result.displayRows.filter(r => r.type === 'data').length;

  // Limites raisonnables pour éviter les graphiques illisibles
  return seriesCount >= 2 && seriesCount <= 8 && dataPointsCount <= 50;
};

/**
 * Palettes de couleurs disponibles
 */
const PALETTES = {
  default: [
    '#64748b', // Slate
    '#60a5fa', // Blue
    '#34d399', // Green
    '#f87171', // Red
    '#a78bfa', // Violet
    '#fbbf24', // Amber
    '#22d3ee', // Cyan
    '#f472b6', // Pink
    '#a3e635'  // Lime
  ],
  pastel: [
    '#d4a5a5', // Rose pastel
    '#a8d5ba', // Mint pastel
    '#ffeaa7', // Yellow pastel
    '#dfe6e9', // Gray pastel
    '#fab1a0', // Coral pastel
    '#fd79a8', // Pink pastel
    '#a29bfe', // Purple pastel
    '#74b9ff', // Blue pastel
    '#81ecec'  // Cyan pastel
  ],
  vibrant: [
    '#ff006e', // Vivid Pink
    '#00d4ff', // Vivid Cyan
    '#ffbe0b', // Vivid Yellow
    '#fb5607', // Vivid Orange
    '#8338ec', // Vivid Purple
    '#3a86ff', // Vivid Blue
    '#06ffa5', // Vivid Green
    '#ff006e', // Vivid Red
    '#ffbe0b'  // Vivid Yellow (repeat for variety)
  ]
};

/**
 * Palettes de couleurs uniques pour le mode 'single'
 */
const SINGLE_COLOR_PALETTES = {
  blues: ['#0066cc', '#0052a3', '#003d7a', '#0066cc', '#0052a3'],
  reds: ['#e63946', '#d62828', '#a4161a', '#e63946', '#d62828'],
  greens: ['#06a77d', '#047857', '#065f46', '#06a77d', '#047857'],
  purples: ['#7c3aed', '#6d28d9', '#5b21b6', '#7c3aed', '#6d28d9'],
  oranges: ['#f97316', '#ea580c', '#d97706', '#f97316', '#ea580c'],
  teals: ['#0891b2', '#0e7490', '#155e75', '#0891b2', '#0e7490'],
  pinks: ['#ec4899', '#db2777', '#be185d', '#ec4899', '#db2777'],
  grays: ['#6b7280', '#4b5563', '#374151', '#6b7280', '#4b5563'],
  ambers: ['#f59e0b', '#d97706', '#b45309', '#f59e0b', '#d97706']
};

/**
 * Obtient une palette de couleurs uniques
 */
export const getSingleColors = (): Record<string, string> => {
  const colors: Record<string, string> = {};
  Object.entries(SINGLE_COLOR_PALETTES).forEach(([name, palette]) => {
    colors[name] = palette[0]; // Prendre la première couleur comme représentant
  });
  return colors;
};

/**
 * Génère un gradient de couleurs entre deux couleurs
 */
export const generateGradient = (startColor: string, endColor: string, count: number): string[] => {
  const colors: string[] = [];

  // Convertir les couleurs hex en RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  // Convertir RGB en hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const [r1, g1, b1] = hexToRgb(startColor);
  const [r2, g2, b2] = hexToRgb(endColor);

  for (let i = 0; i < count; i++) {
    const ratio = count > 1 ? i / (count - 1) : 0;
    const r = r1 + (r2 - r1) * ratio;
    const g = g1 + (g2 - g1) * ratio;
    const b = b1 + (b2 - b1) * ratio;
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
};

/**
 * Obtient une palette de couleurs pour les graphiques
 */
export const getChartColors = (count: number = 9, palette: ColorPalette = 'default'): string[] => {
  const baseColors = PALETTES[palette] || PALETTES.default;

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Si plus de couleurs nécessaires, répéter avec variations
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
};

/**
 * Formate une valeur pour l'affichage dans un tooltip
 */
export const formatChartValue = (
  value: number | string,
  config: PivotConfig
): string => {
  if (typeof value === 'string') return value;

  const valFormatting = config.valFormatting;

  if (!valFormatting) {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  let formatted = value;

  // Appliquer l'échelle d'affichage
  if (valFormatting.displayScale) {
    switch (valFormatting.displayScale) {
      case 'thousands':
        formatted = value / 1000;
        break;
      case 'millions':
        formatted = value / 1000000;
        break;
      case 'billions':
        formatted = value / 1000000000;
        break;
    }
  }

  // Appliquer les décimales
  const decimals = valFormatting.decimalPlaces ?? 2;
  let result = formatted.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  // Ajouter l'unité
  if (valFormatting.unit) {
    result += ` ${valFormatting.unit}`;
  }

  return result;
};

/**
 * Génère les configurations recommandées pour chaque type de graphique
 */
export const getChartTypeConfig = (chartType: ChartType) => {
  const configs: Record<ChartType, { label: string; description: string; bestFor: string }> = {
    'bar': {
      label: 'Barres horizontales',
      description: 'Barres horizontales',
      bestFor: 'Comparaisons simples, longs labels'
    },
    'column': {
      label: 'Barres verticales',
      description: 'Barres verticales',
      bestFor: 'Comparaisons de valeurs'
    },
    'line': {
      label: 'Courbes',
      description: 'Graphique en courbes',
      bestFor: 'Tendances temporelles'
    },
    'area': {
      label: 'Aires',
      description: 'Graphique en aires',
      bestFor: 'Evolution cumulee dans le temps'
    },
    'pie': {
      label: 'Camembert',
      description: 'Graphique circulaire',
      bestFor: 'Repartition en pourcentages (<= 7 elements)'
    },
    'donut': {
      label: 'Anneau',
      description: 'Graphique en anneau',
      bestFor: 'Repartition avec focus sur le total'
    },
    'stacked-bar': {
      label: 'Barres empilees',
      description: 'Barres empilees horizontales',
      bestFor: 'Comparaison multi-series, longs labels'
    },
    'stacked-column': {
      label: 'Colonnes empilees',
      description: 'Colonnes empilees verticales',
      bestFor: 'Comparaison multi-series'
    },
    'stacked-area': {
      label: 'Aires empilees',
      description: 'Aires empilees',
      bestFor: 'Evolution de composition dans le temps'
    },
    'percent-bar': {
      label: 'Barres 100%',
      description: 'Barres empilees 100% horizontales',
      bestFor: 'Proportions relatives entre series'
    },
    'percent-column': {
      label: 'Colonnes 100%',
      description: 'Colonnes empilees 100% verticales',
      bestFor: 'Proportions relatives entre series'
    },
    'radar': {
      label: 'Radar',
      description: 'Graphique radar/toile',
      bestFor: 'Comparaison multi-dimensionnelle'
    },
    'treemap': {
      label: 'Treemap',
      description: 'Carte arborescente hiérarchique',
      bestFor: 'Hiérarchies et proportions avec drill-down'
    },
    'sunburst': {
      label: 'Rayon de soleil',
      description: 'Anneaux concentriques hierarchiques',
      bestFor: 'Repartition hierarchique multi-niveaux'
    },
    'radial': {
      label: 'Jauge radiale',
      description: 'Graphique en barres radiales',
      bestFor: 'KPI et indicateurs circulaires'
    },
    'funnel': {
      label: 'Entonnoir',
      description: 'Graphique en entonnoir',
      bestFor: 'Etapes de conversion et processus'
    }
  };

  return configs[chartType];
};
