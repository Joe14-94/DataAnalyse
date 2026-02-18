import { describe, it, expect } from 'vitest';
import {
  ChartType,
  detectBestChartType,
  generateChartMetadata,
  transformPivotToChartData,
  transformPivotToTreemapData,
  isMultiSeriesAppropriate,
  getChartColors,
  formatChartValue,
  getChartTypeConfig
} from '../pivotToChart';
import { PivotResult, PivotConfig } from '../pivotEngine';

describe('Transformation Pivot vers Graphiques - Tests de Fiabilité', () => {
  // Données de test pour TCD simple
  const simplePivotResult: PivotResult = {
    colHeaders: [],
    displayRows: [
      { type: 'data', keys: ['Nord'], level: 0, label: 'Nord', metrics: {}, rowTotal: 100 },
      { type: 'data', keys: ['Sud'], level: 0, label: 'Sud', metrics: {}, rowTotal: 150 },
      { type: 'data', keys: ['Est'], level: 0, label: 'Est', metrics: {}, rowTotal: 200 }
    ],
    colTotals: {},
    grandTotal: 450
  };

  const simplePivotConfig: PivotConfig = {
    rows: [],
    rowFields: ['Region'],
    colFields: [],
    colGrouping: 'none',
    valField: 'Ventes',
    aggType: 'sum',
    filters: [],
    sortBy: 'label',
    sortOrder: 'asc',
    showSubtotals: false
  };

  // Données de test pour TCD multi-séries (comparaison temporelle)
  const multiSeriesPivotResult: PivotResult = {
    colHeaders: ['2023', '2024'],
    displayRows: [
      {
        type: 'data',
        keys: ['Nord'],
        level: 0,
        label: 'Nord',
        metrics: { '2023': 100, '2024': 120 },
        rowTotal: 220
      },
      {
        type: 'data',
        keys: ['Sud'],
        level: 0,
        label: 'Sud',
        metrics: { '2023': 150, '2024': 180 },
        rowTotal: 330
      }
    ],
    colTotals: { '2023': 250, '2024': 300 },
    grandTotal: 550
  };

  const multiSeriesPivotConfig: PivotConfig = {
    ...simplePivotConfig,
    colFields: ['Annee'],
    colGrouping: 'year'
  };

  // Données de test pour TCD hiérarchique
  const hierarchicalPivotResult: PivotResult = {
    colHeaders: [],
    displayRows: [
      { type: 'data', keys: ['Nord', 'Produit A'], level: 1, label: 'Produit A', metrics: {}, rowTotal: 50 },
      { type: 'data', keys: ['Nord', 'Produit B'], level: 1, label: 'Produit B', metrics: {}, rowTotal: 50 },
      { type: 'subtotal', keys: ['Nord'], level: 0, label: 'Nord Total', metrics: {}, rowTotal: 100 },
      { type: 'data', keys: ['Sud', 'Produit A'], level: 1, label: 'Produit A', metrics: {}, rowTotal: 75 },
      { type: 'data', keys: ['Sud', 'Produit B'], level: 1, label: 'Produit B', metrics: {}, rowTotal: 75 },
      { type: 'subtotal', keys: ['Sud'], level: 0, label: 'Sud Total', metrics: {}, rowTotal: 150 }
    ],
    colTotals: {},
    grandTotal: 250
  };

  const hierarchicalPivotConfig: PivotConfig = {
    ...simplePivotConfig,
    rowFields: ['Region', 'Produit']
  };

  describe('Détection automatique du type de graphique', () => {
    it('devrait suggérer un PIE CHART pour peu de données (≤7)', () => {
      const result: PivotResult = {
        ...simplePivotResult,
        displayRows: simplePivotResult.displayRows.slice(0, 3)
      };
      const chartType = detectBestChartType(simplePivotConfig, result);
      expect(chartType).toBe('pie');
    });

    it('devrait suggérer un LINE CHART pour données temporelles multi-séries', () => {
      const chartType = detectBestChartType(multiSeriesPivotConfig, multiSeriesPivotResult);
      expect(chartType).toBe('line');
    });

    it('devrait suggérer un STACKED BAR pour multi-séries sans temporalité (≤20 lignes)', () => {
      const config: PivotConfig = {
        ...simplePivotConfig,
        colFields: ['Produit']
      };
      const result: PivotResult = {
        ...multiSeriesPivotResult,
        displayRows: multiSeriesPivotResult.displayRows.slice(0, 2)
      };
      const chartType = detectBestChartType(config, result);
      expect(chartType).toBe('stacked-bar');
    });

    it('devrait suggérer un TREEMAP pour données hiérarchiques nombreuses (>15)', () => {
      const result: PivotResult = {
        ...hierarchicalPivotResult,
        displayRows: Array.from({ length: 20 }, (_, i) => ({
          type: 'data',
          keys: [`Region${i}`, `Produit${i}`],
          level: 1,
          label: `Produit${i}`,
          metrics: {},
          rowTotal: i * 10
        }))
      };
      const chartType = detectBestChartType(hierarchicalPivotConfig, result);
      expect(chartType).toBe('treemap');
    });

    it('devrait suggérer un COLUMN CHART par défaut pour >7 éléments', () => {
      const result: PivotResult = {
        ...simplePivotResult,
        displayRows: Array.from({ length: 10 }, (_, i) => ({
          type: 'data',
          keys: [`Region${i}`],
          level: 0,
          label: `Region${i}`,
          metrics: {},
          rowTotal: i * 100
        }))
      };
      const chartType = detectBestChartType(simplePivotConfig, result);
      expect(chartType).toBe('column');
    });
  });

  describe('Génération des métadonnées du graphique', () => {
    it('devrait générer des métadonnées correctes pour TCD simple', () => {
      const metadata = generateChartMetadata(simplePivotConfig, simplePivotResult);

      expect(metadata.isMultiSeries).toBe(false);
      expect(metadata.hasTemporalData).toBe(false);
      expect(metadata.hasHierarchy).toBe(false);
      expect(metadata.totalDataPoints).toBe(3);
      expect(metadata.seriesNames).toEqual(['Somme de Ventes']);
      expect(metadata.suggestedType).toBe('pie');
    });

    it('devrait générer des métadonnées correctes pour TCD multi-séries', () => {
      const metadata = generateChartMetadata(multiSeriesPivotConfig, multiSeriesPivotResult);

      expect(metadata.isMultiSeries).toBe(true);
      expect(metadata.hasTemporalData).toBe(true);
      expect(metadata.hasHierarchy).toBe(false);
      expect(metadata.totalDataPoints).toBe(2);
      expect(metadata.seriesNames).toEqual(['2023', '2024']);
      expect(metadata.suggestedType).toBe('line');
    });

    it('devrait générer des métadonnées correctes pour TCD hiérarchique', () => {
      const metadata = generateChartMetadata(hierarchicalPivotConfig, hierarchicalPivotResult);

      expect(metadata.hasHierarchy).toBe(true);
    });
  });

  describe('Transformation des données TCD vers format Recharts', () => {
    it('devrait transformer correctement un TCD simple', () => {
      const chartData = transformPivotToChartData(simplePivotResult, simplePivotConfig, {
        chartType: 'column',
        excludeSubtotals: true,
        sortBy: 'none',
        sortOrder: 'desc'
      });

      expect(chartData).toHaveLength(3);
      expect(chartData[0]).toHaveProperty('name');
      expect(chartData[0]).toHaveProperty('value');
      expect(chartData[0].name).toBe('Nord');
      expect(chartData[0].value).toBe(100);
    });

    it('devrait transformer correctement un TCD multi-séries', () => {
      const chartData = transformPivotToChartData(multiSeriesPivotResult, multiSeriesPivotConfig, {
        chartType: 'line',
        excludeSubtotals: true,
        sortBy: 'none',
        sortOrder: 'desc'
      });

      expect(chartData).toHaveLength(2);
      expect(chartData[0]).toHaveProperty('name');
      expect(chartData[0]).toHaveProperty('2023');
      expect(chartData[0]).toHaveProperty('2024');
      expect(chartData[0].name).toBe('Nord');
      expect(chartData[0]['2023']).toBe(100);
      expect(chartData[0]['2024']).toBe(120);
    });

    it('devrait exclure les sous-totaux par défaut', () => {
      const chartData = transformPivotToChartData(hierarchicalPivotResult, hierarchicalPivotConfig, {
        chartType: 'column',
        excludeSubtotals: true,
        sortBy: 'none',
        sortOrder: 'desc'
      });

      // Ne devrait inclure que les lignes de type 'data', pas les 'subtotal'
      expect(chartData.every(d => !d.name.includes('Total'))).toBe(true);
      expect(chartData).toHaveLength(4);
    });

    it('devrait trier les données par valeur (décroissant)', () => {
      const chartData = transformPivotToChartData(simplePivotResult, simplePivotConfig, {
        chartType: 'column',
        excludeSubtotals: true,
        sortBy: 'value',
        sortOrder: 'desc'
      });

      expect(chartData[0].value).toBeGreaterThanOrEqual(chartData[1].value);
      expect(chartData[1].value).toBeGreaterThanOrEqual(chartData[2].value);
    });

    it('devrait trier les données par nom (croissant)', () => {
      const chartData = transformPivotToChartData(simplePivotResult, simplePivotConfig, {
        chartType: 'column',
        excludeSubtotals: true,
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(chartData[0].name.localeCompare(chartData[1].name)).toBeLessThanOrEqual(0);
      expect(chartData[1].name.localeCompare(chartData[2].name)).toBeLessThanOrEqual(0);
    });

    it('devrait limiter les résultats au Top N', () => {
      const chartData = transformPivotToChartData(simplePivotResult, simplePivotConfig, {
        chartType: 'column',
        excludeSubtotals: true,
        sortBy: 'value',
        sortOrder: 'desc',
        limit: 2
      });

      expect(chartData).toHaveLength(2);
    });

    it('devrait grouper les autres en "Autres" quand showOthers=true', () => {
      const chartData = transformPivotToChartData(simplePivotResult, simplePivotConfig, {
        chartType: 'column',
        excludeSubtotals: true,
        sortBy: 'value',
        sortOrder: 'desc',
        limit: 2,
        showOthers: true
      });

      expect(chartData).toHaveLength(3);
      expect(chartData[2].name).toBe('Autres');
      expect(chartData[2].value).toBe(100); // Nord (le plus petit)
    });
  });

  describe('Transformation vers Treemap', () => {
    it('devrait transformer correctement un TCD hiérarchique en Treemap', () => {
      const treemapData = transformPivotToTreemapData(hierarchicalPivotResult, hierarchicalPivotConfig);

      expect(treemapData).toBeDefined();
      expect(Array.isArray(treemapData)).toBe(true);
      expect(treemapData.length).toBeGreaterThan(0);
    });

    it('devrait inclure les propriétés name et size pour chaque noeud', () => {
      const treemapData = transformPivotToTreemapData(hierarchicalPivotResult, hierarchicalPivotConfig);

      treemapData.forEach(node => {
        expect(node).toHaveProperty('name');
        if (node.children) {
          node.children.forEach((child: any) => {
            expect(child).toHaveProperty('name');
            expect(child).toHaveProperty('size');
          });
        } else {
          expect(node).toHaveProperty('size');
        }
      });
    });
  });

  describe('Vérification des séries multiples', () => {
    it('devrait accepter les graphiques multi-séries avec 2-8 séries et ≤50 points', () => {
      const result: PivotResult = {
        colHeaders: ['2021', '2022', '2023'],
        displayRows: Array.from({ length: 20 }, (_, i) => ({
          type: 'data',
          keys: [`Region${i}`],
          level: 0,
          label: `Region${i}`,
          metrics: {},
          rowTotal: i * 10
        })),
        colTotals: {},
        grandTotal: 100
      };

      expect(isMultiSeriesAppropriate(multiSeriesPivotConfig, result)).toBe(true);
    });

    it('devrait rejeter les graphiques avec trop de séries (>8)', () => {
      const result: PivotResult = {
        colHeaders: Array.from({ length: 10 }, (_, i) => `Serie${i}`),
        displayRows: [
          { type: 'data', keys: ['A'], level: 0, label: 'A', metrics: {}, rowTotal: 100 }
        ],
        colTotals: {},
        grandTotal: 100
      };

      expect(isMultiSeriesAppropriate(multiSeriesPivotConfig, result)).toBe(false);
    });

    it('devrait rejeter les graphiques avec trop de points (>50)', () => {
      const result: PivotResult = {
        colHeaders: ['2023', '2024'],
        displayRows: Array.from({ length: 60 }, (_, i) => ({
          type: 'data',
          keys: [`Region${i}`],
          level: 0,
          label: `Region${i}`,
          metrics: {},
          rowTotal: i * 10
        })),
        colTotals: {},
        grandTotal: 100
      };

      expect(isMultiSeriesAppropriate(multiSeriesPivotConfig, result)).toBe(false);
    });
  });

  describe('Palette de couleurs', () => {
    it('devrait retourner le bon nombre de couleurs', () => {
      const colors3 = getChartColors(3);
      const colors9 = getChartColors(9);
      const colors15 = getChartColors(15);

      expect(colors3).toHaveLength(3);
      expect(colors9).toHaveLength(9);
      expect(colors15).toHaveLength(15);
    });

    it('devrait retourner des codes couleur hexadécimaux valides', () => {
      const colors = getChartColors(5);
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;

      colors.forEach(color => {
        expect(hexPattern.test(color)).toBe(true);
      });
    });

    it('devrait répéter les couleurs si plus de 9 sont nécessaires', () => {
      const colors = getChartColors(15);
      expect(colors[0]).toBe(colors[9]); // Répétition
    });
  });

  describe('Formatage des valeurs', () => {
    it('devrait formater les nombres avec séparateurs français', () => {
      const formatted = formatChartValue(1234567, simplePivotConfig);
      // Les espaces sont des espaces insécables Unicode (U+202F)
      expect(formatted).toBe('1\u202f234\u202f567');
    });

    it('devrait appliquer les décimales configurées', () => {
      const config: PivotConfig = {
        ...simplePivotConfig,
        valFormatting: {
          decimalPlaces: 2
        }
      };
      const formatted = formatChartValue(123.456, config);
      expect(formatted).toBe('123,46');
    });

    it('devrait appliquer l\'échelle d\'affichage (milliers)', () => {
      const config: PivotConfig = {
        ...simplePivotConfig,
        valFormatting: {
          displayScale: 'thousands',
          decimalPlaces: 1
        }
      };
      const formatted = formatChartValue(123456, config);
      expect(formatted).toBe('123,5');
    });

    it('devrait appliquer l\'échelle d\'affichage (millions)', () => {
      const config: PivotConfig = {
        ...simplePivotConfig,
        valFormatting: {
          displayScale: 'millions',
          decimalPlaces: 2
        }
      };
      const formatted = formatChartValue(12345678, config);
      expect(formatted).toBe('12,35');
    });

    it('devrait ajouter l\'unité configurée', () => {
      const config: PivotConfig = {
        ...simplePivotConfig,
        valFormatting: {
          unit: '€',
          decimalPlaces: 2
        }
      };
      const formatted = formatChartValue(1234, config);
      // Les espaces sont des espaces insécables Unicode (U+202F)
      expect(formatted).toBe('1\u202f234,00 €');
    });

    it('devrait retourner les valeurs string telles quelles', () => {
      const formatted = formatChartValue('Test', simplePivotConfig);
      expect(formatted).toBe('Test');
    });
  });

  describe('Configuration des types de graphiques', () => {
    it('devrait retourner les configurations pour tous les types de graphiques', () => {
      const chartTypes: ChartType[] = [
        'bar', 'column', 'line', 'area', 'pie', 'donut',
        'stacked-bar', 'stacked-area', 'radar', 'treemap'
      ];

      chartTypes.forEach(type => {
        const config = getChartTypeConfig(type);
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('bestFor');
      });
    });

    it('devrait retourner des descriptions pertinentes', () => {
      const pieConfig = getChartTypeConfig('pie');
      expect(pieConfig.bestFor).toContain('pourcentages');

      const lineConfig = getChartTypeConfig('line');
      expect(lineConfig.bestFor).toContain('temporelles');

      const treemapConfig = getChartTypeConfig('treemap');
      expect(treemapConfig.bestFor).toContain('Hiérarchies');
    });
  });

  describe('Cas limites et erreurs', () => {
    it('devrait gérer un TCD vide sans planter', () => {
      const emptyResult: PivotResult = {
        colHeaders: [],
        displayRows: [],
        colTotals: {},
        grandTotal: 0
      };

      const chartData = transformPivotToChartData(emptyResult, simplePivotConfig, {
        chartType: 'column'
      });

      expect(chartData).toEqual([]);
    });

    it('devrait gérer des valeurs nulles/undefined dans les métriques', () => {
      const resultWithNulls: PivotResult = {
        colHeaders: ['2023', '2024'],
        displayRows: [
          {
            type: 'data',
            keys: ['Nord'],
            level: 0,
            label: 'Nord',
            metrics: { '2023': null as any, '2024': 120 },
            rowTotal: 120
          }
        ],
        colTotals: {},
        grandTotal: 120
      };

      const chartData = transformPivotToChartData(resultWithNulls, multiSeriesPivotConfig, {
        chartType: 'line'
      });

      expect(chartData[0]['2023']).toBe(0); // null converti en 0
      expect(chartData[0]['2024']).toBe(120);
    });

    it('devrait gérer des rowTotal non numériques', () => {
      const resultWithInvalidTotal: PivotResult = {
        colHeaders: [],
        displayRows: [
          {
            type: 'data',
            keys: ['Nord'],
            level: 0,
            label: 'Nord',
            metrics: {},
            rowTotal: 'invalid' as any
          }
        ],
        colTotals: {},
        grandTotal: 0
      };

      const chartData = transformPivotToChartData(resultWithInvalidTotal, simplePivotConfig, {
        chartType: 'column'
      });

      expect(chartData[0].value).toBe(0); // Valeur invalide convertie en 0
    });

    it('devrait gérer un limit=0 (pas de limite)', () => {
      const chartData = transformPivotToChartData(simplePivotResult, simplePivotConfig, {
        chartType: 'column',
        limit: 0
      });

      expect(chartData).toHaveLength(3); // Toutes les lignes
    });

    it('devrait gérer un limit supérieur au nombre de lignes', () => {
      const chartData = transformPivotToChartData(simplePivotResult, simplePivotConfig, {
        chartType: 'column',
        limit: 100
      });

      expect(chartData).toHaveLength(3); // Toutes les lignes disponibles
    });
  });
});
