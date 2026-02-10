import { describe, it, expect } from 'vitest';
import { calculatePivotData } from '../pivotEngine';

describe('Moteur de Calcul TCD - Tests Métriques Vides (No Nombre)', () => {
  const testData = [
    { id: '1', Region: 'Nord', Produit: 'A', Ventes: '100' },
    { id: '2', Region: 'Nord', Produit: 'B', Ventes: '200' },
    { id: '3', Region: 'Sud', Produit: 'A', Ventes: '150' },
  ];

  it('ne devrait pas ajouter de métrique par défaut si aucune n\'est fournie', () => {
    const result = calculatePivotData({
      rows: testData,
      rowFields: ['Region'],
      colFields: [],
      colGrouping: 'none',
      valField: '',
      aggType: 'sum',
      metrics: [],
      filters: [],
      sortBy: 'label',
      sortOrder: 'asc',
      showSubtotals: false
    });

    expect(result).not.toBeNull();
    expect(result!.colHeaders).toEqual([]); // No metrics = no data columns
    expect(result!.displayRows).toHaveLength(2);

    const nord = result!.displayRows.find(r => r.keys[0] === 'Nord');
    expect(nord!.metrics).toEqual({}); // Empty metrics
  });

  it('devrait fonctionner avec rowFields vides mais colFields présents (no metrics)', () => {
    const result = calculatePivotData({
      rows: testData,
      rowFields: [],
      colFields: ['Region'],
      colGrouping: 'none',
      valField: '',
      aggType: 'sum',
      metrics: [],
      filters: [],
      sortBy: 'label',
      sortOrder: 'asc',
      showSubtotals: false
    });

    expect(result).not.toBeNull();
    expect(result!.colHeaders).toEqual([]); // No metrics = no data columns
    expect(result!.displayRows).toHaveLength(1); // One summary row
    expect(result!.displayRows[0].metrics).toEqual({});
  });
});
