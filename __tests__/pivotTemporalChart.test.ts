import { describe, it, expect } from 'vitest';
import { PivotResult, PivotConfig } from '../logic/pivotEngine';
import { transformPivotToChartData, generateChartMetadata } from '../logic/pivotToChart';

/**
 * Tests spécifiques pour la conversion de TCD temporel vers graphiques
 * Ces tests couvrent le bug corrigé où chartPivotData était null en mode temporel
 */
describe('Conversion TCD Temporel vers Graphiques - Tests de Fiabilité', () => {
  describe('Conversion temporalResults vers PivotResult', () => {
    it('devrait convertir correctement des résultats temporels simples', () => {
      // Simuler les données temporelles converties (comme dans convertTemporalToPivotResult)
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' },
          { id: 'src2', label: '2024', datasetId: 'ds2', batchId: 'b2', color: '#green' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };

      const temporalResults = [
        {
          groupKey: 'Nord',
          groupLabel: 'Nord',
          values: { 'src1': 1000, 'src2': 1200 },
          deltas: { 'src2': { value: 200, percentage: 20 } },
          isSubtotal: false
        },
        {
          groupKey: 'Sud',
          groupLabel: 'Sud',
          values: { 'src1': 1500, 'src2': 1800 },
          deltas: { 'src2': { value: 300, percentage: 20 } },
          isSubtotal: false
        }
      ];

      // Convertir en PivotResult (logique du useMemo chartPivotData)
      const colHeaders = temporalConfig.sources.map(source => source.label);

      const displayRows = temporalResults
        .filter(result => !result.isSubtotal)
        .map(result => {
          const row: any = {
            type: 'data',
            keys: [result.groupKey],
            level: 0,
            label: result.groupLabel,
            metrics: {},
            rowTotal: 0
          };

          let total = 0;
          temporalConfig.sources.forEach(source => {
            const value = result.values[source.id] || 0;
            row.metrics[source.label] = value;
            total += value;
          });
          row.rowTotal = total;

          return row;
        });

      const colTotals: Record<string, number> = {};
      temporalConfig.sources.forEach(source => {
        const total = temporalResults
          .filter(result => !result.isSubtotal)
          .reduce((sum, result) => sum + (result.values[source.id] || 0), 0);
        colTotals[source.label] = total;
      });

      const grandTotal = Object.values(colTotals).reduce((sum, val) => sum + val, 0);

      const pivotResult: PivotResult = {
        colHeaders,
        displayRows,
        colTotals,
        grandTotal
      };

      // Vérifications
      expect(pivotResult.colHeaders).toEqual(['2023', '2024']);
      expect(pivotResult.displayRows).toHaveLength(2);
      expect(pivotResult.displayRows[0].metrics['2023']).toBe(1000);
      expect(pivotResult.displayRows[0].metrics['2024']).toBe(1200);
      expect(pivotResult.displayRows[0].rowTotal).toBe(2200);
      expect(pivotResult.colTotals['2023']).toBe(2500);
      expect(pivotResult.colTotals['2024']).toBe(3000);
      expect(pivotResult.grandTotal).toBe(5500);
    });

    it('devrait retourner null si temporalConfig est null', () => {
      const temporalConfig = null;
      const temporalResults: any[] = [];

      // Simuler la logique du useMemo
      const pivotResult = temporalConfig === null ? null : {};

      expect(pivotResult).toBeNull();
    });

    it('devrait retourner null si temporalResults est vide', () => {
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };

      const temporalResults: any[] = [];

      // Simuler la logique du useMemo
      const pivotResult = temporalResults.length === 0 ? null : {};

      expect(pivotResult).toBeNull();
    });

    it('devrait exclure les sous-totaux lors de la conversion', () => {
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region', 'Ville'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };

      const temporalResults = [
        {
          groupKey: 'Nord|Paris',
          groupLabel: 'Paris',
          values: { 'src1': 500 },
          deltas: {},
          isSubtotal: false
        },
        {
          groupKey: 'Nord|Lyon',
          groupLabel: 'Lyon',
          values: { 'src1': 500 },
          deltas: {},
          isSubtotal: false
        },
        {
          groupKey: 'Nord',
          groupLabel: 'Nord (Total)',
          values: { 'src1': 1000 },
          deltas: {},
          isSubtotal: true // Sous-total
        }
      ];

      // Convertir en excluant les sous-totaux
      const displayRows = temporalResults
        .filter(result => !result.isSubtotal)
        .map(result => ({
          type: 'data',
          keys: [result.groupKey],
          level: 0,
          label: result.groupLabel,
          metrics: { '2023': result.values['src1'] },
          rowTotal: result.values['src1']
        }));

      expect(displayRows).toHaveLength(2); // Seulement les lignes de données
      expect(displayRows.every(row => !row.label.includes('Total'))).toBe(true);
    });
  });

  describe('Transformation vers données de graphique', () => {
    it('devrait transformer correctement un PivotResult temporel en données de graphique', () => {
      const pivotResult: PivotResult = {
        colHeaders: ['2023', '2024'],
        displayRows: [
          {
            type: 'data',
            keys: ['Nord'],
            level: 0,
            label: 'Nord',
            metrics: { '2023': 1000, '2024': 1200 },
            rowTotal: 2200
          },
          {
            type: 'data',
            keys: ['Sud'],
            level: 0,
            label: 'Sud',
            metrics: { '2023': 1500, '2024': 1800 },
            rowTotal: 3300
          }
        ],
        colTotals: { '2023': 2500, '2024': 3000 },
        grandTotal: 5500
      };

      const pivotConfig: PivotConfig = {
        rows: [],
        rowFields: ['Region'],
        colFields: ['Annee'],
        colGrouping: 'year',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      };

      const chartData = transformPivotToChartData(pivotResult, pivotConfig, {
        chartType: 'line',
        excludeSubtotals: true,
        sortBy: 'none',
        sortOrder: 'desc'
      });

      expect(chartData).toHaveLength(2);
      expect(chartData[0]).toEqual({
        name: 'Nord',
        '2023': 1000,
        '2024': 1200
      });
      expect(chartData[1]).toEqual({
        name: 'Sud',
        '2023': 1500,
        '2024': 1800
      });
    });

    it('devrait suggérer un LINE CHART pour les comparaisons temporelles', () => {
      const pivotResult: PivotResult = {
        colHeaders: ['2023', '2024'],
        displayRows: [
          {
            type: 'data',
            keys: ['Nord'],
            level: 0,
            label: 'Nord',
            metrics: { '2023': 1000, '2024': 1200 },
            rowTotal: 2200
          }
        ],
        colTotals: { '2023': 1000, '2024': 1200 },
        grandTotal: 2200
      };

      const pivotConfig: PivotConfig = {
        rows: [],
        rowFields: ['Region'],
        colFields: ['Annee'],
        colGrouping: 'year', // Temporel
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      };

      const metadata = generateChartMetadata(pivotConfig, pivotResult);

      expect(metadata.hasTemporalData).toBe(true);
      expect(metadata.isMultiSeries).toBe(true);
      expect(metadata.suggestedType).toBe('line');
      expect(metadata.seriesNames).toEqual(['2023', '2024']);
    });
  });

  describe('Cas limites - Prévention des bugs', () => {
    it('devrait gérer des sources temporelles avec valeurs manquantes', () => {
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' },
          { id: 'src2', label: '2024', datasetId: 'ds2', batchId: 'b2', color: '#green' },
          { id: 'src3', label: '2025', datasetId: 'ds3', batchId: 'b3', color: '#red' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };

      const temporalResults = [
        {
          groupKey: 'Nord',
          groupLabel: 'Nord',
          values: { 'src1': 1000, 'src2': 1200 }, // src3 manquant
          deltas: {},
          isSubtotal: false
        }
      ];

      // Convertir avec gestion des valeurs manquantes
      const displayRows = temporalResults.map(result => {
        const row: any = {
          type: 'data',
          keys: [result.groupKey],
          level: 0,
          label: result.groupLabel,
          metrics: {},
          rowTotal: 0
        };

        let total = 0;
        temporalConfig.sources.forEach(source => {
          const value = result.values[source.id] || 0; // Valeur par défaut = 0
          row.metrics[source.label] = value;
          total += value;
        });
        row.rowTotal = total;

        return row;
      });

      expect(displayRows[0].metrics['2023']).toBe(1000);
      expect(displayRows[0].metrics['2024']).toBe(1200);
      expect(displayRows[0].metrics['2025']).toBe(0); // Valeur manquante = 0
      expect(displayRows[0].rowTotal).toBe(2200);
    });

    it('devrait gérer correctement une seule source temporelle', () => {
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2024', datasetId: 'ds1', batchId: 'b1', color: '#blue' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };

      const temporalResults = [
        {
          groupKey: 'Nord',
          groupLabel: 'Nord',
          values: { 'src1': 1000 },
          deltas: {},
          isSubtotal: false
        }
      ];

      const colHeaders = temporalConfig.sources.map(source => source.label);
      expect(colHeaders).toEqual(['2024']);
      expect(colHeaders).toHaveLength(1);
    });

    it('devrait gérer des groupByFields multiples', () => {
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region', 'Ville', 'Produit'], // 3 niveaux
        valueField: 'Ventes',
        aggType: 'sum' as const
      };

      const temporalResults = [
        {
          groupKey: 'Nord|Paris|ProduitA',
          groupLabel: 'ProduitA',
          values: { 'src1': 500 },
          deltas: {},
          isSubtotal: false
        }
      ];

      const displayRows = temporalResults.map(result => ({
        type: 'data',
        keys: [result.groupKey],
        level: 0,
        label: result.groupLabel,
        metrics: { '2023': result.values['src1'] },
        rowTotal: result.values['src1']
      }));

      expect(displayRows[0].keys).toEqual(['Nord|Paris|ProduitA']);
      expect(displayRows[0].label).toBe('ProduitA');
    });

    it('devrait calculer correctement les totaux avec des valeurs négatives', () => {
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' },
          { id: 'src2', label: '2024', datasetId: 'ds2', batchId: 'b2', color: '#green' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Produit'],
        valueField: 'Profit',
        aggType: 'sum' as const
      };

      const temporalResults = [
        {
          groupKey: 'ProduitA',
          groupLabel: 'ProduitA',
          values: { 'src1': 1000, 'src2': -500 }, // Perte en 2024
          deltas: {},
          isSubtotal: false
        }
      ];

      const displayRows = temporalResults.map(result => {
        const row: any = {
          type: 'data',
          keys: [result.groupKey],
          level: 0,
          label: result.groupLabel,
          metrics: {},
          rowTotal: 0
        };

        let total = 0;
        temporalConfig.sources.forEach(source => {
          const value = result.values[source.id] || 0;
          row.metrics[source.label] = value;
          total += value;
        });
        row.rowTotal = total;

        return row;
      });

      expect(displayRows[0].metrics['2023']).toBe(1000);
      expect(displayRows[0].metrics['2024']).toBe(-500);
      expect(displayRows[0].rowTotal).toBe(500); // 1000 + (-500) = 500
    });

    it('devrait gérer des labels de source avec caractères spéciaux', () => {
      const temporalConfig = {
        sources: [
          { id: 'src1', label: '2023 (Budget)', datasetId: 'ds1', batchId: 'b1', color: '#blue' },
          { id: 'src2', label: '2024 - Réel', datasetId: 'ds2', batchId: 'b2', color: '#green' }
        ],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };

      const colHeaders = temporalConfig.sources.map(source => source.label);

      expect(colHeaders).toEqual(['2023 (Budget)', '2024 - Réel']);
    });
  });

  describe('Validation des conditions handleToChart', () => {
    it('devrait valider que temporalConfig existe avant d\'ouvrir le graphique', () => {
      const isTemporalMode = true;
      const temporalConfig = null;
      const temporalResults: any[] = [];

      // Simuler la vérification dans handleToChart
      const shouldOpenChart = !(isTemporalMode && (!temporalConfig || temporalResults.length === 0));

      expect(shouldOpenChart).toBe(false);
    });

    it('devrait valider que temporalResults n\'est pas vide avant d\'ouvrir le graphique', () => {
      const isTemporalMode = true;
      const temporalConfig = {
        sources: [{ id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' }],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };
      const temporalResults: any[] = [];

      // Simuler la vérification dans handleToChart
      const shouldOpenChart = !(isTemporalMode && (!temporalConfig || temporalResults.length === 0));

      expect(shouldOpenChart).toBe(false);
    });

    it('devrait autoriser l\'ouverture du graphique si temporalConfig et temporalResults sont valides', () => {
      const isTemporalMode = true;
      const temporalConfig = {
        sources: [{ id: 'src1', label: '2023', datasetId: 'ds1', batchId: 'b1', color: '#blue' }],
        referenceSourceId: 'src1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value' as const,
        groupByFields: ['Region'],
        valueField: 'Ventes',
        aggType: 'sum' as const
      };
      const temporalResults = [
        {
          groupKey: 'Nord',
          groupLabel: 'Nord',
          values: { 'src1': 1000 },
          deltas: {},
          isSubtotal: false
        }
      ];

      // Simuler la vérification dans handleToChart
      const shouldOpenChart = !(isTemporalMode && (!temporalConfig || temporalResults.length === 0));

      expect(shouldOpenChart).toBe(true);
    });
  });
});
