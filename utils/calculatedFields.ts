
import { CalculatedFieldAction } from '../types';

/**
 * Sécurise une chaîne pour l'insertion dans une formule (échappe les guillemets)
 */
const escapeString = (val: string): string => {
    if (!val) return "";
    return val.replace(/"/g, '""');
};

/**
 * Génère une formule imbriquée à partir d'une liste d'actions séquentielles
 */
export const generateFormulaFromActions = (actions: CalculatedFieldAction[], availableFields: string[]): string => {
    if (actions.length === 0) return '';

    let currentFormula = '';

    // Identifier la source. Nouveau format: action de type 'source'.
    // Vieux format: on prend le champ dans la première action.
    const sourceAction = actions.find(a => a.type === 'source') || actions[0];
    const sourceField = sourceAction.params.field || (availableFields.length > 0 ? availableFields[0] : '');

    if (!sourceField) return '';

    currentFormula = `[${sourceField}]`;

    // Appliquer chaque action séquentiellement
    actions.forEach((action, idx) => {
        // Ignorer l'action source si elle est présente (déjà initialisée)
        if (action.type === 'source') return;

        // Vieux format migration : si c'était l'action 0 et qu'elle portait le champ,
        // on l'appliquait aussi comme transformation si ce n'était pas JUSTE une sélection.
        // Mais avec le nouveau format, on sépare.

        switch (action.type) {
            case 'trim':
                currentFormula = `SUPPRESPACE(${currentFormula})`;
                break;
            case 'upper':
                currentFormula = `MAJUSCULE(${currentFormula})`;
                break;
            case 'lower':
                currentFormula = `MINUSCULE(${currentFormula})`;
                break;
            case 'proper':
                currentFormula = `CAPITALISEMOTS(${currentFormula})`;
                break;
            case 'replace':
                const search = escapeString(action.params.search || '');
                const replacement = escapeString(action.params.replacement || '');
                currentFormula = `SUBSTITUER(${currentFormula}, "${search}", "${replacement}")`;
                break;
            case 'regex':
                const pattern = escapeString(action.params.pattern || '');
                const regexRepl = escapeString(action.params.replacement || '');
                currentFormula = `REMPLACER(${currentFormula}, "${pattern}", "${regexRepl}")`;
                break;
            case 'concat':
                const others = action.params.otherFields || [];
                const sep = escapeString(action.params.separator || '');
                if (others.length > 0) {
                    currentFormula = `CONCAT(${currentFormula}, ${others.map((f: string) => `[${f}]`).join(', ')}, "${sep}")`;
                }
                break;
            case 'left':
                currentFormula = `GAUCHE(${currentFormula}, ${action.params.count || 1})`;
                break;
            case 'right':
                currentFormula = `DROITE(${currentFormula}, ${action.params.count || 1})`;
                break;
            case 'substring':
                currentFormula = `EXTRAIRE(${currentFormula}, ${action.params.start || 0}, ${action.params.length || 1})`;
                break;
            case 'add':
                currentFormula = `(${currentFormula} + ${action.params.value || 0})`;
                break;
            case 'subtract':
                currentFormula = `(${currentFormula} - ${action.params.value || 0})`;
                break;
            case 'multiply':
                currentFormula = `(${currentFormula} * ${action.params.value || 1})`;
                break;
            case 'divide':
                currentFormula = `(${currentFormula} / ${action.params.value || 1})`;
                break;
        }
    });

    return currentFormula;
};
