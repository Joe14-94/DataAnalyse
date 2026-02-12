import { describe, it, expect } from 'vitest';
import { calculatePivotData } from '../pivotEngine';

describe('Moteur de Calcul TCD - Multi-Metrics and Columns', () => {
  const testData = [
    { id: '1', Region: 'Nord', Produit: 'A', Ventes: 100, Marge: 20 },
    { id: '2', Region: 'Nord', Produit: 'B', Ventes: 200, Marge: 50 },
    { id: '3', Region: 'Sud', Produit: 'A', Ventes: 150, Marge: 30 },
  ];

  it('devrait utiliser le même séparateur \x1F sans espaces pour les headers et les totaux', () => {
    const result = calculatePivotData({
      rows: testData,
      rowFields: ['Region'],
      colFields: ['Produit'],
      colGrouping: 'none',
      metrics: [
        { field: 'Ventes', aggType: 'sum' },
        { field: 'Marge', aggType: 'sum' }
      ],
      filters: [],
      sortBy: 'label',
      sortOrder: 'asc',
      showSubtotals: false
    });

    expect(result).not.toBeNull();

    // Vérifier les headers
    // Format attendu: "Produit\x1FMétrique (agg)"
    expect(result!.colHeaders).toContain('A\x1FVentes (sum)');
    expect(result!.colHeaders).toContain('A\x1FMarge (sum)');
    expect(result!.colHeaders).toContain('B\x1FVentes (sum)');
    expect(result!.colHeaders).toContain('B\x1FMarge (sum)');

    // Vérifier que les colTotals contiennent les mêmes clés EXACTES
    result!.colHeaders.forEach(header => {
      expect(result!.colTotals[header]).toBeDefined();
      expect(typeof result!.colTotals[header]).toBe('number');
    });

    // Vérifier les valeurs spécifiques
    expect(result!.colTotals['A\x1FVentes (sum)']).toBe(250); // 100 + 150
    expect(result!.colTotals['A\x1FMarge (sum)']).toBe(50);   // 20 + 30
    expect(result!.colTotals['B\x1FVentes (sum)']).toBe(200);
    expect(result!.colTotals['B\x1FMarge (sum)']).toBe(50);
  });
});
