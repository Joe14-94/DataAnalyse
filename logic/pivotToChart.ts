import { PivotResult, PivotConfig, PivotRow, DateGrouping, AggregationType } from './pivotEngine';

// ============================================================================
// TYPES
// ============================================================================

export type ChartType = 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut' | 'stacked-bar' | 'stacked-area' | 'radar' | 'treemap';

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
  const hasMultipleCols = colFields.length > 0;
  const isTemporal = colGrouping !== 'none';
  const dataRowsCount = result.displayRows.filter(r => r.type === 'data').length;
  const hasHierarchy = rowFields.length > 1;

  // Cas 1 : Données temporelles avec colonnes multiples → Line Chart
  if (isTemporal && hasMultipleCols) {
    return 'line';
  }

  // Cas 2 : Colonnes multiples sans temporalité → Stacked Bar
  if (hasMultipleCols && dataRowsCount <= 20) {
    return 'stacked-bar';
  }

  // Cas 3 : Beaucoup de données hiérarchiques → Treemap
  if (hasHierarchy && dataRowsCount > 15) {
    return 'treemap';
  }

  // Cas 4 : Peu de données (≤ 7) → Pie Chart
  if (dataRowsCount <= 7 && !hasMultipleCols && !hasHierarchy) {
    return 'pie';
  }

  // Cas 5 : Données temporelles simples → Line ou Area
  if (isTemporal) {
    return aggType === 'sum' ? 'area' : 'line';
  }

  // Cas 6 : Défaut → Column Chart (barres verticales)
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
  const seriesHeaders = result.colHeaders.filter(h => !h.endsWith('_DIFF') && !h.endsWith('_PCT'));
  const isMultiSeries = seriesHeaders.length > 1;
  const hasTemporalData = colGrouping !== 'none';
  const hasHierarchy = rowFields.length > 1;
  const dataRows = result.displayRows.filter(r => r.type === 'data');

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
    showOthers = false
  } = options;

  // Filtrer les lignes de données (exclure sous-totaux et grand total)
  let dataRows = result.displayRows.filter(row => {
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
  config: PivotConfig
): any[] => {
  const dataRows = result.displayRows.filter(r => r.type === 'data');

  console.log('🌳 transformPivotToTreemapData - dataRows:', dataRows.length);

  // Convertir en format plat pour Recharts Treemap
  const flatData = dataRows.map(row => {
    const keys = row.keys;
    const value = typeof row.rowTotal === 'number' ? row.rowTotal : 0;

    // Créer un label hiérarchique si plusieurs niveaux
    const label = keys.length > 1 ? keys.join(' > ') : keys[0];

    return {
      name: label,
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
// UTILITAIRES
// ============================================================================

/**
 * Formate le label d'une ligne TCD pour le graphique
 */
const formatRowLabel = (row: PivotRow, config: PivotConfig): string => {
  if (row.label) return row.label;

  if (row.keys.length === 1) {
    return row.keys[0];
  }

  // Pour hiérarchie, concaténer avec séparateur
  return row.keys.join(' > ');
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
 * Obtient une palette de couleurs pour les graphiques
 */
export const getChartColors = (count: number = 9): string[] => {
  const baseColors = [
    '#64748b', // Slate
    '#60a5fa', // Blue
    '#34d399', // Green
    '#f87171', // Red
    '#a78bfa', // Violet
    '#fbbf24', // Amber
    '#22d3ee', // Cyan
    '#f472b6', // Pink
    '#a3e635'  // Lime
  ];

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
      bestFor: 'Évolution cumulée dans le temps'
    },
    'pie': {
      label: 'Camembert',
      description: 'Graphique circulaire',
      bestFor: 'Répartition en pourcentages (≤ 7 éléments)'
    },
    'donut': {
      label: 'Anneau',
      description: 'Graphique en anneau',
      bestFor: 'Répartition avec focus sur le total'
    },
    'stacked-bar': {
      label: 'Barres empilées',
      description: 'Barres empilées verticales',
      bestFor: 'Comparaison multi-séries'
    },
    'stacked-area': {
      label: 'Aires empilées',
      description: 'Aires empilées',
      bestFor: 'Évolution de composition dans le temps'
    },
    'radar': {
      label: 'Radar',
      description: 'Graphique radar/toile',
      bestFor: 'Comparaison multi-dimensionnelle'
    },
    'treemap': {
      label: 'Treemap',
      description: 'Carte arborescente',
      bestFor: 'Hiérarchies et proportions'
    }
  };

  return configs[chartType];
};
