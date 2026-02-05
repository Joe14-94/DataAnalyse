import { describe, it, expect } from 'vitest';
import { parseSmartNumber, evaluateFormula, detectColumnType, getGroupedLabel, mapDataToSchema } from '../utils';

describe('Parser de Formules Sécurisé', () => {
  it('devrait calculer des formules arithmétiques simples', () => {
    expect(evaluateFormula({ A: 10, B: 5 }, '[A] + [B]')).toBe(15);
    expect(evaluateFormula({ A: 10, B: 5 }, '[A] - [B]')).toBe(5);
    expect(evaluateFormula({ A: 10, B: 5 }, '[A] * [B]')).toBe(50);
    expect(evaluateFormula({ A: 10, B: 5 }, '[A] / [B]')).toBe(2);
  });

  it('devrait respecter la priorité des opérateurs', () => {
    expect(evaluateFormula({}, '2 + 3 * 4')).toBe(14);
    expect(evaluateFormula({}, '(2 + 3) * 4')).toBe(20);
  });

  it('devrait gérer les fonctions SI/IF', () => {
    expect(evaluateFormula({ Age: 20 }, "SI([Age] > 18, 'Majeur', 'Mineur')")).toBe('Majeur');
    expect(evaluateFormula({ Age: 16 }, "SI([Age] > 18, 'Majeur', 'Mineur')")).toBe('Mineur');
  });

  it('devrait gérer les fonctions SOMME/SUM', () => {
    expect(evaluateFormula({ A: 10, B: 20, C: 30 }, 'SOMME([A], [B], [C])')).toBe(60);
  });

  it('devrait parser intelligemment les nombres avec unités', () => {
    expect(evaluateFormula({ Prix: '10 €', Qte: 5 }, '[Prix] * [Qte]')).toBe(50);
    expect(evaluateFormula({ Poids: '2.5 kg' }, '[Poids] * 2')).toBe(5);
  });

  it('devrait gérer les divisions par zéro', () => {
    expect(evaluateFormula({ A: 10 }, '[A] / 0')).toBe(0);
  });

  it('devrait gérer les erreurs de syntaxe', () => {
    expect(evaluateFormula({}, '[[invalid')).toBeNull();
  });

  it('devrait gérer les fonctions mathématiques', () => {
    expect(evaluateFormula({ A: -5 }, 'ABS([A])')).toBe(5);
    expect(evaluateFormula({ A: 1.234 }, 'ARRONDI([A], 2)')).toBe(1.23);
    expect(evaluateFormula({ A: 10, B: 20, C: 5 }, 'MAX([A], [B], [C])')).toBe(20);
    expect(evaluateFormula({ A: 10, B: 20, C: 5 }, 'MIN([A], [B], [C])')).toBe(5);
  });

  it('devrait gérer les fonctions texte', () => {
    expect(evaluateFormula({ Nom: 'dupont' }, 'MAJUSCULE([Nom])')).toBe('DUPONT');
    expect(evaluateFormula({ Nom: 'MARTIN' }, 'MINUSCULE([Nom])')).toBe('martin');
    expect(evaluateFormula({ Prenom: 'Jean', Nom: 'Dupont' }, 'CONCAT([Prenom], " ", [Nom])')).toBe('Jean Dupont');
  });
});

describe('Parsing Numérique Intelligent', () => {
  it('devrait parser les nombres simples', () => {
    expect(parseSmartNumber('123')).toBe(123);
    expect(parseSmartNumber('12.5')).toBe(12.5);
    expect(parseSmartNumber('-42')).toBe(-42);
  });

  it('devrait parser les formats français', () => {
    expect(parseSmartNumber('1 000')).toBe(1000);
    expect(parseSmartNumber('1 000,50')).toBe(1000.5);
    expect(parseSmartNumber('1.000,50')).toBe(1000.5);
  });

  it('devrait parser les formats avec unités', () => {
    expect(parseSmartNumber('10 k€', 'k€')).toBe(10);
    expect(parseSmartNumber('2.5 kg', 'kg')).toBe(2.5);
    expect(parseSmartNumber('95 %', '%')).toBe(95);
  });

  it('devrait parser les espaces insécables', () => {
    expect(parseSmartNumber('1\u00A0000')).toBe(1000);
    expect(parseSmartNumber('1\u00A0000,50')).toBe(1000.5);
  });

  it('devrait gérer les valeurs invalides', () => {
    expect(parseSmartNumber('abc')).toBe(0);
    expect(parseSmartNumber('')).toBe(0);
    expect(parseSmartNumber(null)).toBe(0);
    expect(parseSmartNumber(undefined)).toBe(0);
  });

  it('devrait gérer les nombres déjà numériques', () => {
    expect(parseSmartNumber(123)).toBe(123);
    expect(parseSmartNumber(12.5)).toBe(12.5);
  });
});

describe('Détection de Type de Colonne', () => {
  it('devrait détecter les nombres', () => {
    expect(detectColumnType(['123', '456', '789', '100'])).toBe('number');
    expect(detectColumnType(['12.5', '34.7', '89.2'])).toBe('number');
    expect(detectColumnType(['10 €', '20 €', '30 €'])).toBe('number');
  });

  it('devrait détecter les booléens', () => {
    expect(detectColumnType(['oui', 'non', 'oui', 'non'])).toBe('boolean');
    expect(detectColumnType(['true', 'false', 'true', 'false'])).toBe('boolean');
    // Note: '1' et '0' sont détectés comme 'number' car ce sont des valeurs numériques
    expect(detectColumnType(['1', '0', '1', '0'])).toBe('number');
  });

  it('devrait détecter les dates', () => {
    expect(detectColumnType(['2024-01-15', '2024-02-20', '2024-03-10'])).toBe('date');
    expect(detectColumnType(['15/01/2024', '20/02/2024', '10/03/2024'])).toBe('date');
  });

  it('devrait détecter le texte par défaut', () => {
    expect(detectColumnType(['Paris', 'Lyon', 'Marseille'])).toBe('text');
    expect(detectColumnType(['ABC123', 'DEF456', 'GHI789'])).toBe('text');
  });

  it('devrait gérer les valeurs vides', () => {
    expect(detectColumnType([])).toBe('text');
    expect(detectColumnType(['', '', ''])).toBe('text');
  });
});

describe('Regroupement Temporel', () => {
  it('devrait regrouper par année', () => {
    expect(getGroupedLabel('2024-01-15', 'year')).toBe('2024');
    expect(getGroupedLabel('2023-12-31', 'year')).toBe('2023');
  });

  it('devrait regrouper par trimestre', () => {
    expect(getGroupedLabel('2024-01-15', 'quarter')).toBe('2024-T1');
    expect(getGroupedLabel('2024-04-15', 'quarter')).toBe('2024-T2');
    expect(getGroupedLabel('2024-07-15', 'quarter')).toBe('2024-T3');
    expect(getGroupedLabel('2024-10-15', 'quarter')).toBe('2024-T4');
  });

  it('devrait regrouper par mois', () => {
    expect(getGroupedLabel('2024-01-15', 'month')).toBe('2024-01');
    expect(getGroupedLabel('2024-12-31', 'month')).toBe('2024-12');
  });

  it('devrait retourner la valeur originale si aucun regroupement', () => {
    expect(getGroupedLabel('2024-01-15', 'none')).toBe('2024-01-15');
    expect(getGroupedLabel('Texte', 'year')).toBe('Texte');
  });

  it('devrait gérer les valeurs vides', () => {
    expect(getGroupedLabel('', 'year')).toBe('');
    expect(getGroupedLabel('(Vide)', 'month')).toBe('(Vide)');
  });
});

describe('Mapping de Données (mapDataToSchema)', () => {
  it('devrait mapper correctement les données avec types booléens', () => {
    const rawData = {
      headers: ['Nom', 'Actif', 'Score'],
      rows: [
        ['Jean', 'oui', '100'],
        ['Marie', 'non', '200'],
        ['Pierre', 'true', '300'],
        ['Sophie', 'false', '400']
      ],
      totalRows: 4
    };
    const mapping = { 0: 'name', 1: 'isActive', 2: 'score' };
    const result = mapDataToSchema(rawData, mapping);

    expect(result).toHaveLength(4);
    expect(result[0].isActive).toBe(true);
    expect(result[1].isActive).toBe(false);
    expect(result[2].isActive).toBe(true);
    expect(result[3].isActive).toBe(false);
    expect(result[0].name).toBe('Jean');
    expect(result[0].score).toBe('100');
  });

  it('devrait ignorer les colonnes marquées "ignore"', () => {
    const rawData = {
      headers: ['X', 'B', 'C'],
      rows: [['valX', '2', '3']],
      totalRows: 1
    };
    const mapping = { 0: 'colX', 1: 'ignore', 2: 'colC' };
    const result = mapDataToSchema(rawData, mapping);

    expect(result[0].colX).toBe('valX');
    expect(result[0].colC).toBe('3');
    expect(result[0].colB).toBeUndefined();
  });

  it('devrait gérer des milliers de lignes efficacement', () => {
    const rowCount = 1000;
    const colCount = 10;
    const rows = Array.from({ length: rowCount }, (_, i) =>
      Array.from({ length: colCount }, (_, j) => (j % 2 === 0 ? 'oui' : `val-${i}-${j}`))
    );
    const rawData = { headers: [], rows, totalRows: rowCount };
    const mapping: any = {};
    for (let j = 0; j < colCount; j++) mapping[j] = `field-${j}`;

    const start = performance.now();
    const result = mapDataToSchema(rawData, mapping);
    const end = performance.now();

    expect(result).toHaveLength(rowCount);
    expect(result[0]['field-0']).toBe(true);
    console.log(`⏱️ mapDataToSchema (1000 rows, 10 cols): ${(end - start).toFixed(2)}ms`);
  });
});

describe('Précision et Arrondis', () => {
  it('devrait éviter les erreurs de virgule flottante', () => {
    // Problème classique : 0.1 + 0.2 = 0.30000000000000004
    const result = evaluateFormula({}, '0.1 + 0.2');
    expect(result).toBeCloseTo(0.3, 4); // 4 décimales de précision
  });

  it('devrait arrondir à 4 décimales par défaut', () => {
    const result = evaluateFormula({}, '1 / 3');
    expect(result).toBe(0.3333);
  });

  it('devrait gérer les grands nombres', () => {
    const large = 999999999.123456789;
    const result = parseSmartNumber(String(large));
    expect(result).toBeCloseTo(large, 2);
  });
});
