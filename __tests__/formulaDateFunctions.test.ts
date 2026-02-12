import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../logic/formulaEngine';
import { jsToExcelDate } from '../utils/common';

describe('Formula Engine Date Functions', () => {
  const row = {
    date1: '15/01/2025',
    date2: '15/01/2026',
    excelDate: 46057 // 04/02/2026
  };

  it('ANNEE should return correct year', () => {
    expect(evaluateFormula(row, 'ANNEE([date1])')).toBe(2025);
    expect(evaluateFormula(row, 'YEAR([date2])')).toBe(2026);
    expect(evaluateFormula(row, 'ANNEE([excelDate])')).toBe(2026);
  });

  it('MOIS should return correct month', () => {
    expect(evaluateFormula(row, 'MOIS([date1])')).toBe(1);
    expect(evaluateFormula(row, 'MONTH([date2])')).toBe(1);
    expect(evaluateFormula(row, 'MOIS([excelDate])')).toBe(2);
  });

  it('JOUR should return correct day', () => {
    expect(evaluateFormula(row, 'JOUR([date1])')).toBe(15);
    expect(evaluateFormula(row, 'DAY([date2])')).toBe(15);
    expect(evaluateFormula(row, 'JOUR([excelDate])')).toBe(4);
  });

  it('AUJOURDHUI should return today as excel serial (midnight UTC)', () => {
    const result = evaluateFormula(row, 'AUJOURDHUI()') as number;
    const now = new Date();
    const todaySerial = jsToExcelDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    expect(result).toBe(todaySerial);
    // Should be an integer
    expect(result % 1).toBe(0);
  });

  it('DATE should create correct excel serial (midnight UTC)', () => {
    const result = evaluateFormula(row, 'DATE(2026, 2, 4)') as number;
    expect(result).toBe(46057);
    expect(result % 1).toBe(0);
  });

  it('DATEDIF should return correct difference', () => {
    // Days
    expect(evaluateFormula(row, 'DATEDIF([date1], [date2], "d")')).toBe(365);
    // Months
    expect(evaluateFormula(row, 'DATEDIF([date1], [date2], "m")')).toBe(12);
    // Years
    expect(evaluateFormula(row, 'DATEDIF([date1], [date2], "y")')).toBe(1);

    // Partial year
    const row2 = { start: '15/01/2025', end: '14/01/2026' };
    expect(evaluateFormula(row2, 'DATEDIF([start], [end], "y")')).toBe(0);
  });

  it('evaluateFormula should handle outputType "date"', () => {
    const result = evaluateFormula(row, '[date1]', 'date');
    expect(Math.round(result as number)).toBe(Math.round(jsToExcelDate(new Date(2025, 0, 15))));
  });
});
