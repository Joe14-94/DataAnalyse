import { DiagnosticSuite, DiagnosticResult } from '../types';
import { parseSmartNumber, getGroupedLabel } from './common';
import { evaluateFormula } from './formulaEngine';
import { calculateLinearRegression } from './mathUtils';

// --- AUDIT SYSTEM ---
export const runSelfDiagnostics = (): DiagnosticSuite[] => {
  const suites: DiagnosticSuite[] = [];

  // SUITE 1: Parsing Numérique
  const parsingTests: DiagnosticResult[] = [
    {
      id: '1',
      name: 'Nombre simple (123)',
      status: 'success',
      expected: 123,
      actual: parseSmartNumber('123')
    },
    {
      id: '2',
      name: 'Nombre décimal (12.5)',
      status: 'success',
      expected: 12.5,
      actual: parseSmartNumber('12.5')
    },
    {
      id: '3',
      name: 'Nombre avec unité (10 k€)',
      status: 'success',
      expected: 10,
      actual: parseSmartNumber('10 k€', 'k€')
    },
    {
      id: '4',
      name: 'Espace insécable (1 000)',
      status: 'success',
      expected: 1000,
      actual: parseSmartNumber('1 000')
    },
    {
      id: '5',
      name: 'Format FR (1.000,50)',
      status: 'success',
      expected: 1000.5,
      actual: parseSmartNumber('1.000,50')
    }
  ];
  parsingTests.forEach((t) => {
    if (t.actual !== t.expected) {
      t.status = 'failure';
      t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`;
    }
  });
  suites.push({ category: 'Moteur de Parsing Numérique', tests: parsingTests });

  // SUITE 2: Moteur de Formule (Tests du nouveau parser)
  const formulaTests: DiagnosticResult[] = [
    {
      id: 'f1',
      name: 'Opération simple',
      status: 'success',
      expected: 100,
      actual: evaluateFormula({ id: '1', A: 10, B: 10 }, '[A] * [B]')
    },
    {
      id: 'f2',
      name: 'Calcul avec unité',
      status: 'success',
      expected: 120,
      actual: evaluateFormula({ id: '1', Prix: '10 €', Qte: 12 }, '[Prix] * [Qte]')
    },
    {
      id: 'f3',
      name: 'Fonction SI',
      status: 'success',
      expected: 'Grand',
      actual: evaluateFormula({ id: '1', Age: 20 }, "SI([Age] > 18, 'Grand', 'Petit')")
    },
    {
      id: 'f4',
      name: 'Fonction SOMME',
      status: 'success',
      expected: 30,
      actual: evaluateFormula({ id: '1', A: 10, B: 20 }, 'SOMME([A], [B])')
    },
    {
      id: 'f5',
      name: 'Priorité opérateurs',
      status: 'success',
      expected: 14,
      actual: evaluateFormula({ id: '1' }, '2 + 3 * 4')
    },
    {
      id: 'f6',
      name: 'Parenthèses',
      status: 'success',
      expected: 20,
      actual: evaluateFormula({ id: '1' }, '(2 + 3) * 4')
    }
  ];
  formulaTests.forEach((t) => {
    if (t.actual !== t.expected) {
      t.status = 'failure';
      t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`;
    }
  });
  suites.push({ category: 'Calculateur de Champs (Parser Sécurisé)', tests: formulaTests });

  // SUITE 3: Regroupement TCD
  const groupingTests: DiagnosticResult[] = [
    {
      id: 'd1',
      name: 'Année (2025-01-15)',
      expected: '2025',
      actual: getGroupedLabel('2025-01-15', 'year'),
      status: 'success'
    },
    {
      id: 'd2',
      name: 'Mois (2025-01-15)',
      expected: '2025-01',
      actual: getGroupedLabel('2025-01-15', 'month'),
      status: 'success'
    }
  ];
  groupingTests.forEach((t) => {
    if (t.actual !== t.expected) {
      t.status = 'failure';
      t.message = `Attendu: ${t.expected}, Reçu: ${t.actual}`;
    }
  });
  suites.push({ category: 'Moteur de Regroupement Temporel', tests: groupingTests });

  // SUITE 4: Régression Linéaire
  const regResult = calculateLinearRegression([10, 20, 30, 40]);
  const regTest: DiagnosticResult = {
    id: 'r1',
    name: 'Régression Parfaite',
    status: regResult.r2 > 0.99 ? 'success' : 'failure',
    expected: '> 0.99',
    actual: regResult.r2.toFixed(2)
  };
  suites.push({ category: 'Moteur Statistique', tests: [regTest] });

  return suites;
};
