import { describe, it, expect } from 'vitest';
import { generateFormulaFromActions } from '../utils/calculatedFields';
import { CalculatedFieldAction } from '../types';
import { evaluateFormula } from '../utils';

describe('Générateur de Formules (Actions Séquentielles)', () => {
  const fields = ['Nom', 'Prénom', 'Ville', 'Age'];

  it('devrait générer une formule simple pour une source seule', () => {
    const actions: CalculatedFieldAction[] = [{ id: '1', type: 'trim', params: { field: 'Nom' } }];
    const formula = generateFormulaFromActions(actions, fields);
    expect(formula).toBe('SUPPRESPACE([Nom])');
  });

  it('devrait empiler plusieurs transformations textuelles', () => {
    const actions: CalculatedFieldAction[] = [
      { id: '1', type: 'trim', params: { field: 'Nom' } },
      { id: '2', type: 'upper', params: {} },
      { id: '3', type: 'replace', params: { search: 'A', replacement: 'B' } }
    ];
    const formula = generateFormulaFromActions(actions, fields);
    // SUPPRESPACE([Nom]) -> MAJUSCULE(SUPPRESPACE([Nom])) -> SUBSTITUER(MAJUSCULE(SUPPRESPACE([Nom])), "A", "B")
    expect(formula).toBe('SUBSTITUER(MAJUSCULE(SUPPRESPACE([Nom])), "A", "B")');
  });

  it('devrait gérer les regex', () => {
    const actions: CalculatedFieldAction[] = [
      { id: '1', type: 'trim', params: { field: 'Nom' } },
      { id: '2', type: 'regex', params: { pattern: '[0-9]+', replacement: '' } }
    ];
    const formula = generateFormulaFromActions(actions, fields);
    expect(formula).toBe('REMPLACER(SUPPRESPACE([Nom]), "[0-9]+", "")');
  });

  it('devrait gérer les concaténations', () => {
    const actions: CalculatedFieldAction[] = [
      { id: '1', type: 'concat', params: { field: 'Prénom', otherFields: ['Nom'], separator: ' ' } }
    ];
    const formula = generateFormulaFromActions(actions, fields);
    expect(formula).toBe('CONCAT([Prénom], [Nom], " ")');
  });

  it('devrait gérer les calculs mathématiques', () => {
    const actions: CalculatedFieldAction[] = [
      { id: '1', type: 'trim', params: { field: 'Age' } }, // Source + Trim
      { id: '2', type: 'add', params: { value: 10 } },
      { id: '3', type: 'multiply', params: { value: 2 } }
    ];
    const formula = generateFormulaFromActions(actions, fields);
    expect(formula).toBe('((SUPPRESPACE([Age]) + 10) * 2)');
  });
});

describe('Robustesse REGEX dans evaluateFormula', () => {
  it('ne devrait pas planter avec un regex invalide', () => {
    const row = { Texte: 'Test' };
    const invalidRegexFormula = 'REMPLACER([Texte], "[", "X")'; // [ est un regex invalide seul

    // Avant amélioration, cela aurait pu jeter une erreur
    const result = evaluateFormula(row, invalidRegexFormula);
    expect(result).toBe('Test'); // Retourne l'original si regex invalide
  });

  it('devrait appliquer correctement un regex complexe', () => {
    const row = { Email: 'jean.dupont@gmail.com' };
    const regexFormula = 'REMPLACER([Email], "@.*", "@example.com")';
    const result = evaluateFormula(row, regexFormula);
    expect(result).toBe('jean.dupont@example.com');
  });
});
