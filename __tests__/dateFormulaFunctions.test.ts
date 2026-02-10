import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../utils/formulaEngine';

describe('Formula Engine Date Functions', () => {
    const row = {
        'DateDeb': '01/01/2024',
        'DateFin': '10/01/2024',
        'Birth': '15/05/1990'
    };

    it('should extract year correctly', () => {
        expect(evaluateFormula(row, 'ANNEE([DateDeb])')).toBe(2024);
    });

    it('should extract month correctly', () => {
        expect(evaluateFormula(row, 'MOIS([DateDeb])')).toBe(1);
    });

    it('should extract day correctly', () => {
        expect(evaluateFormula(row, 'JOUR([DateDeb])')).toBe(1);
    });

    it('should create date correctly', () => {
        const res = evaluateFormula(row, 'DATE(2025, 2, 14)') as Date;
        expect(res).toBeInstanceOf(Date);
        expect(res.getFullYear()).toBe(2025);
        expect(res.getMonth()).toBe(1); // February
        expect(res.getDate()).toBe(14);
    });

    it('should calculate date difference in days', () => {
        expect(evaluateFormula(row, 'DATEDIF([DateDeb], [DateFin], "j")')).toBe(9);
    });

    it('should calculate date difference in months', () => {
        expect(evaluateFormula(row, 'DATEDIF("01/01/2024", "01/03/2024", "m")')).toBe(2);
    });

    it('should calculate date difference in years', () => {
        // Birth is 1990, today is after 1990
        const age = evaluateFormula(row, 'DATEDIF([Birth], AUJOURDHUI(), "a")') as number;
        expect(age).toBeGreaterThanOrEqual(34);
    });

    it('should support date output type', () => {
        const res = evaluateFormula(row, '[DateDeb]', 'date') as Date;
        expect(res).toBeInstanceOf(Date);
        expect(res.getFullYear()).toBe(2024);
        expect(res.getMonth()).toBe(0);
        expect(res.getDate()).toBe(1);
    });
});
