
import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../logic/formulaEngine';
import { logger } from '../utils/common';

describe('Performance Optimization Benchmarks', () => {
    it('should evaluate 100,000 formulas efficiently', () => {
        const rows = Array.from({ length: 100000 }, (_, i) => ({
            id: i,
            val1: Math.random() * 100,
            val2: Math.random() * 100
        }));

        const formula = '[val1] * [val2] + 10';

        const start = performance.now();
        rows.forEach(row => {
            evaluateFormula(row, formula);
        });
        const end = performance.now();

        const duration = end - start;
        logger.log(`⏱️ Evaluation de 100,000 formules : ${duration.toFixed(2)}ms`);

        // On s'attend à ce que 100k évaluations simples prennent moins de 500ms sur une machine standard
        // (En réalité c'est souvent < 100ms grâce au cache de compilation)
        expect(duration).toBeLessThan(1000);
    });

    it('should simulate search optimization', () => {
        const rows = Array.from({ length: 100000 }, (_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            hiddenData: "Some large string that we should not search through ".repeat(10)
        }));

        const searchTerm = "user99999";
        const searchableKeys = ['id', 'name', 'email']; // Optimized list
        const allKeys = Object.keys(rows[0]); // Legacy behavior

        // Legacy search
        const startLegacy = performance.now();
        const resultsLegacy = rows.filter(row => {
            return allKeys.some(key => String(row[key as keyof typeof row]).toLowerCase().includes(searchTerm));
        });
        const endLegacy = performance.now();
        const durationLegacy = endLegacy - startLegacy;

        // Optimized search
        const startOptimized = performance.now();
        const resultsOptimized = rows.filter(row => {
            return searchableKeys.some(key => String(row[key as keyof typeof row]).toLowerCase().includes(searchTerm));
        });
        const endOptimized = performance.now();
        const durationOptimized = endOptimized - startOptimized;

        logger.log(`⏱️ Recherche Legacy (toutes colonnes) : ${durationLegacy.toFixed(2)}ms`);
        logger.log(`⏱️ Recherche Optimisée (colonnes visibles) : ${durationOptimized.toFixed(2)}ms`);

        expect(resultsOptimized.length).toBe(resultsLegacy.length);
        expect(durationOptimized).toBeLessThan(durationLegacy);
    });
});
