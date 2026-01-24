import { describe, it, expect } from 'vitest';
import { calculatePivotData, AggregationType } from '../pivotEngine';

describe('Moteur de Calcul TCD - Tests de Fiabilité', () => {
  // Dataset de test réaliste
  const testData = [
    { id: '1', Region: 'Nord', Produit: 'A', Ventes: '100', Date: '2024-01-15' },
    { id: '2', Region: 'Nord', Produit: 'B', Ventes: '200', Date: '2024-01-20' },
    { id: '3', Region: 'Sud', Produit: 'A', Ventes: '150', Date: '2024-02-10' },
    { id: '4', Region: 'Sud', Produit: 'B', Ventes: '250', Date: '2024-02-15' },
    { id: '5', Region: 'Nord', Produit: 'A', Ventes: '300', Date: '2024-03-05' },
  ];

  describe('Agrégations de Base', () => {
    it('COUNT: devrait compter correctement les lignes', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'count',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).not.toBeNull();
      expect(result!.grandTotal).toBe(5);
      expect(result!.displayRows).toHaveLength(2);

      const nord = result!.displayRows.find(r => r.keys[0] === 'Nord');
      expect(nord!.rowTotal).toBe(3);

      const sud = result!.displayRows.find(r => r.keys[0] === 'Sud');
      expect(sud!.rowTotal).toBe(2);
    });

    it('SUM: devrait sommer correctement les valeurs numériques', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).not.toBeNull();
      expect(result!.grandTotal).toBe(1000);

      const nord = result!.displayRows.find(r => r.keys[0] === 'Nord');
      expect(nord!.rowTotal).toBe(600);

      const sud = result!.displayRows.find(r => r.keys[0] === 'Sud');
      expect(sud!.rowTotal).toBe(400);
    });

    it('AVG: devrait calculer correctement la moyenne', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'avg',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).not.toBeNull();
      expect(result!.grandTotal).toBe(200);

      const nord = result!.displayRows.find(r => r.keys[0] === 'Nord');
      expect(nord!.rowTotal).toBe(200);
    });

    it('MIN/MAX: devrait trouver les valeurs extrêmes', () => {
      const minResult = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'min',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      const maxResult = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'max',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(minResult!.grandTotal).toBe(100);
      expect(maxResult!.grandTotal).toBe(300);
    });
  });

  describe('Pivot 2D (Lignes + Colonnes)', () => {
    it('devrait créer correctement les colonnes dynamiques', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: ['Produit'],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).not.toBeNull();
      expect(result!.colHeaders).toEqual(['A', 'B']);

      const nord = result!.displayRows.find(r => r.keys[0] === 'Nord');
      expect(nord!.metrics['A']).toBe(400);
      expect(nord!.metrics['B']).toBe(200);
    });
  });

  describe('Regroupement Temporel', () => {
    it('YEAR: devrait regrouper par année', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: ['Date'],
        colGrouping: 'year',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result!.colHeaders).toEqual(['2024']);
    });

    it('QUARTER: devrait regrouper par trimestre', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: ['Date'],
        colGrouping: 'quarter',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result!.colHeaders).toEqual(['2024-T1']);
    });

    it('MONTH: devrait regrouper par mois', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: ['Date'],
        colGrouping: 'month',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result!.colHeaders).toContain('2024-01');
      expect(result!.colHeaders).toContain('2024-02');
      expect(result!.colHeaders).toContain('2024-03');
    });
  });

  describe('Filtres', () => {
    it('IN: devrait filtrer avec opérateur IN', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Produit'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'count',
        filters: [{ field: 'Region', operator: 'in', value: ['Nord'] }],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result!.grandTotal).toBe(3);
    });

    it('GT/LT: devrait filtrer avec opérateurs numériques', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'count',
        filters: [{ field: 'Ventes', operator: 'gt', value: '150', preparedValue: 150 } as any],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result!.grandTotal).toBe(3);
    });
  });

  describe('Tri', () => {
    it('LABEL ASC: devrait trier par label croissant', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result!.displayRows[0].keys[0]).toBe('Nord');
      expect(result!.displayRows[1].keys[0]).toBe('Sud');
    });

    it('VALUE DESC: devrait trier par valeur décroissante', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'value',
        sortOrder: 'desc',
        showSubtotals: false
      });

      expect(result!.displayRows[0].keys[0]).toBe('Nord');
      expect(result!.displayRows[0].rowTotal).toBe(600);
    });
  });

  describe('Cas Limites', () => {
    it('devrait gérer les valeurs nulles/vides', () => {
      const dataWithNulls = [
        ...testData,
        { id: '6', Region: '', Produit: 'C', Ventes: '', Date: '2024-01-01' }
      ];

      const result = calculatePivotData({
        rows: dataWithNulls,
        rowFields: ['Region'],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      const vide = result!.displayRows.find(r => r.keys[0] === '(Vide)');
      expect(vide).toBeDefined();
      expect(vide!.rowTotal).toBe(0);
    });

    it('devrait gérer les datasets vides', () => {
      const result = calculatePivotData({
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
      });

      expect(result).toBeNull();
    });

    it('devrait gérer les rowFields vides', () => {
      const result = calculatePivotData({
        rows: testData,
        rowFields: [],
        colFields: [],
        colGrouping: 'none',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).toBeNull();
    });
  });

  describe('Performance', () => {
    it('devrait calculer rapidement sur 10k lignes', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `${i}`,
        Region: i % 2 === 0 ? 'Nord' : 'Sud',
        Produit: `P${i % 10}`,
        Ventes: `${Math.floor(Math.random() * 1000)}`,
        Date: `2024-0${(i % 9) + 1}-15`
      }));

      const start = performance.now();
      const result = calculatePivotData({
        rows: largeDataset,
        rowFields: ['Region', 'Produit'],
        colFields: ['Date'],
        colGrouping: 'month',
        valField: 'Ventes',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });
      const end = performance.now();

      expect(result).not.toBeNull();
      expect(end - start).toBeLessThan(1000); // < 1s pour 10k lignes
    });
  });

  describe('Formats de Dates Français (DD/MM/YYYY)', () => {
    const dataFrenchDates = [
      { id: '1', Compte: '411000', Montant: '1000', Date: '15/01/2025' },
      { id: '2', Compte: '411000', Montant: '500', Date: '20/01/2025' },
      { id: '3', Compte: '411000', Montant: '300', Date: '10/02/2025' },
      { id: '4', Compte: '411000', Montant: '200', Date: '05/03/2025' },
      { id: '5', Compte: '512000', Montant: '2000', Date: '15/01/2025' },
      { id: '6', Compte: '512000', Montant: '1500', Date: '10/02/2025' },
      { id: '7', Compte: '512000', Montant: '1800', Date: '15/03/2025' },
    ];

    it('devrait regrouper correctement par MOIS avec dates françaises', () => {
      const result = calculatePivotData({
        rows: dataFrenchDates,
        rowFields: ['Compte'],
        colFields: ['Date'],
        colGrouping: 'month',
        valField: 'Montant',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).not.toBeNull();
      expect(result!.colHeaders).toEqual(['2025-01', '2025-02', '2025-03']);
      expect(result!.grandTotal).toBe(7300);

      const compte411 = result!.displayRows.find(r => r.keys[0] === '411000');
      expect(compte411!.metrics['2025-01']).toBe(1500);
      expect(compte411!.metrics['2025-02']).toBe(300);
      expect(compte411!.metrics['2025-03']).toBe(200);
    });

    it('devrait regrouper correctement par TRIMESTRE avec dates françaises', () => {
      const result = calculatePivotData({
        rows: dataFrenchDates,
        rowFields: ['Compte'],
        colFields: ['Date'],
        colGrouping: 'quarter',
        valField: 'Montant',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).not.toBeNull();
      expect(result!.colHeaders).toEqual(['2025-T1']);
      expect(result!.grandTotal).toBe(7300);

      const compte411 = result!.displayRows.find(r => r.keys[0] === '411000');
      expect(compte411!.metrics['2025-T1']).toBe(2000);
    });

    it('devrait regrouper correctement par ANNÉE avec dates françaises', () => {
      const result = calculatePivotData({
        rows: dataFrenchDates,
        rowFields: ['Compte'],
        colFields: ['Date'],
        colGrouping: 'year',
        valField: 'Montant',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      expect(result).not.toBeNull();
      expect(result!.colHeaders).toEqual(['2025']);
      expect(result!.grandTotal).toBe(7300);

      const compte411 = result!.displayRows.find(r => r.keys[0] === '411000');
      expect(compte411!.metrics['2025']).toBe(2000);
    });

    it('les totaux doivent être identiques quel que soit le groupement', () => {
      const resultExact = calculatePivotData({
        rows: dataFrenchDates,
        rowFields: ['Compte'],
        colFields: ['Date'],
        colGrouping: 'none',
        valField: 'Montant',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      const resultMonth = calculatePivotData({
        rows: dataFrenchDates,
        rowFields: ['Compte'],
        colFields: ['Date'],
        colGrouping: 'month',
        valField: 'Montant',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      const resultQuarter = calculatePivotData({
        rows: dataFrenchDates,
        rowFields: ['Compte'],
        colFields: ['Date'],
        colGrouping: 'quarter',
        valField: 'Montant',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      const resultYear = calculatePivotData({
        rows: dataFrenchDates,
        rowFields: ['Compte'],
        colFields: ['Date'],
        colGrouping: 'year',
        valField: 'Montant',
        aggType: 'sum',
        filters: [],
        sortBy: 'label',
        sortOrder: 'asc',
        showSubtotals: false
      });

      // Tous les totaux doivent être identiques
      expect(resultExact!.grandTotal).toBe(7300);
      expect(resultMonth!.grandTotal).toBe(7300);
      expect(resultQuarter!.grandTotal).toBe(7300);
      expect(resultYear!.grandTotal).toBe(7300);

      // Les totaux de ligne doivent aussi être identiques
      const compte411Exact = resultExact!.displayRows.find(r => r.keys[0] === '411000');
      const compte411Month = resultMonth!.displayRows.find(r => r.keys[0] === '411000');
      const compte411Quarter = resultQuarter!.displayRows.find(r => r.keys[0] === '411000');
      const compte411Year = resultYear!.displayRows.find(r => r.keys[0] === '411000');

      expect(compte411Exact!.rowTotal).toBe(2000);
      expect(compte411Month!.rowTotal).toBe(2000);
      expect(compte411Quarter!.rowTotal).toBe(2000);
      expect(compte411Year!.rowTotal).toBe(2000);
    });
  });
});
