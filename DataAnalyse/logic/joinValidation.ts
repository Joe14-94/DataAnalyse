import { DataRow, PivotJoin } from '../types';
import { detectColumnType } from '../utils';

export interface JoinValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats?: {
    primaryKeyCount: number;
    secondaryKeyCount: number;
    matchCount: number;
    matchRate: number;
    duplicatesInPrimary: number;
    duplicatesInSecondary: number;
    unmatchedPrimary: string[];
    unmatchedSecondary: string[];
  };
}

/**
 * Valide une jointure entre deux datasets et retourne un diagnostic complet
 */
export const validateJoin = (
  primaryRows: DataRow[],
  secondaryRows: DataRow[],
  join: PivotJoin,
  primaryFields: string[],
  secondaryFields: string[]
): JoinValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Vérifier que les clés existent
  if (!primaryFields.includes(join.joinKeyPrimary)) {
    errors.push(`Clé primaire "${join.joinKeyPrimary}" introuvable dans la source principale`);
  }

  if (!secondaryFields.includes(join.joinKeySecondary)) {
    errors.push(`Clé secondaire "${join.joinKeySecondary}" introuvable dans la source liée`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // 2. Analyser les valeurs de clés
  const primaryKeys = new Set<string>();
  const primaryKeyCount = new Map<string, number>();

  primaryRows.forEach(row => {
    const key = String(row[join.joinKeyPrimary] || '').trim();
    if (key) {
      primaryKeys.add(key);
      primaryKeyCount.set(key, (primaryKeyCount.get(key) || 0) + 1);
    }
  });

  const secondaryKeys = new Set<string>();
  const secondaryKeyCount = new Map<string, number>();

  secondaryRows.forEach(row => {
    const key = String(row[join.joinKeySecondary] || '').trim();
    if (key) {
      secondaryKeys.add(key);
      secondaryKeyCount.set(key, (secondaryKeyCount.get(key) || 0) + 1);
    }
  });

  // 3. Calculer les correspondances
  let matchCount = 0;
  const unmatchedPrimary: string[] = [];
  const unmatchedSecondary: string[] = [];

  primaryKeys.forEach(key => {
    if (secondaryKeys.has(key)) {
      matchCount++;
    } else {
      if (unmatchedPrimary.length < 5) { // Garder max 5 exemples
        unmatchedPrimary.push(key);
      }
    }
  });

  secondaryKeys.forEach(key => {
    if (!primaryKeys.has(key)) {
      if (unmatchedSecondary.length < 5) {
        unmatchedSecondary.push(key);
      }
    }
  });

  const matchRate = primaryKeys.size > 0 ? matchCount / primaryKeys.size : 0;

  // 4. Vérifier le taux de correspondance
  if (matchCount === 0) {
    errors.push(`Aucune correspondance trouvée entre les clés - Vérifiez que les valeurs correspondent`);
  } else if (matchRate < 0.1) {
    errors.push(`Taux de correspondance très faible (${(matchRate * 100).toFixed(1)}%) - Les clés semblent incompatibles`);
  } else if (matchRate < 0.5) {
    warnings.push(`Taux de correspondance modéré (${(matchRate * 100).toFixed(1)}%) - ${primaryKeys.size - matchCount} clés principales sans correspondance`);
  }

  // 5. Détecter les doublons
  const duplicatesInPrimary = Array.from(primaryKeyCount.values()).filter(count => count > 1).length;
  const duplicatesInSecondary = Array.from(secondaryKeyCount.values()).filter(count => count > 1).length;

  if (duplicatesInPrimary > 0) {
    warnings.push(`${duplicatesInPrimary} clés en double dans la source principale - Risque de duplication de lignes (relation 1:N)`);
  }

  if (duplicatesInSecondary > 0) {
    warnings.push(`${duplicatesInSecondary} clés en double dans la source liée - Seule la première correspondance sera utilisée`);
  }

  // 6. Vérifier les types (basique)
  const samplePrimary = primaryRows.slice(0, 10).map(r => String(r[join.joinKeyPrimary] || ''));
  const sampleSecondary = secondaryRows.slice(0, 10).map(r => String(r[join.joinKeySecondary] || ''));

  const typePrimary = detectColumnType(samplePrimary);
  const typeSecondary = detectColumnType(sampleSecondary);

  if (typePrimary !== typeSecondary && typePrimary !== 'text' && typeSecondary !== 'text') {
    warnings.push(`Types de clés différents (${typePrimary} vs ${typeSecondary}) - Conversion automatique appliquée`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      primaryKeyCount: primaryKeys.size,
      secondaryKeyCount: secondaryKeys.size,
      matchCount,
      matchRate,
      duplicatesInPrimary,
      duplicatesInSecondary,
      unmatchedPrimary,
      unmatchedSecondary
    }
  };
};
