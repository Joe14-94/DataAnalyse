import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../logic/formulaEngine';

describe('Formula Engine Remediation', () => {
    describe('REMPLACER', () => {
        const row = { text: 'Hello (World)' };

        it('should handle invalid regex search strings without crashing', () => {
            // ( is an incomplete regex group
            const result = evaluateFormula(row, 'REMPLACER([text], "(", "X")');
            expect(result).toBe('Hello XWorld)');
        });

        it('should still support valid regex when intended', () => {
            const result = evaluateFormula(row, 'REMPLACER([text], "H.l+", "Hi")');
            expect(result).toBe('Hio (World)');
        });

        it('should handle literal replacements via SUBSTITUER', () => {
            const result = evaluateFormula(row, 'SUBSTITUER([text], "(World)", "Everyone")');
            expect(result).toBe('Hello Everyone');
        });

        it('should handle literal fallback in REMPLACER if regex is invalid', () => {
            // [ is invalid regex
            const result = evaluateFormula(row, 'REMPLACER([text], "[", "X")');
            expect(result).toBe('Hello (World)'); // [ is not in "Hello (World)"

            const row2 = { text: 'Hello [World]' };
            const result2 = evaluateFormula(row2, 'REMPLACER([text], "[", "X")');
            expect(result2).toBe('Hello XWorld]');
        });
    });

    describe('DATEDIF', () => {
        const row = {
            start: '01/01/2023',
            end: '15/02/2024'
        };

        it('should calculate "md" (days ignoring months/years)', () => {
            const result = evaluateFormula(row, 'DATEDIF([start], [end], "md")');
            expect(result).toBe(14); // 15 - 1
        });

        it('should calculate "ym" (months ignoring years)', () => {
            const result = evaluateFormula(row, 'DATEDIF([start], [end], "ym")');
            expect(result).toBe(1); // Jan to Feb
        });

        it('should calculate "yd" (days ignoring years)', () => {
            // Jan 1 to Feb 15 in same year is 31 (Jan) + 14 = 45 days
            const result = evaluateFormula(row, 'DATEDIF([start], [end], "yd")');
            expect(result).toBe(45);
        });
    });
});
