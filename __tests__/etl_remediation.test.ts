
import { describe, it, expect } from 'vitest';
import { applyCalculate } from '../utils/transformations';
import { DataRow } from '../types';

describe('ETL Remediation - applyCalculate with safe evaluateFormula', () => {
  const sampleData: DataRow[] = [
    { id: '1', field1: 10, field2: 20, text: 'Hello' },
    { id: '2', field1: 5, field2: 15, text: 'World' },
    { id: '3', field1: null, field2: 5, text: '' },
  ];

  it('should correctly calculate simple addition using FormulaParser', () => {
    const result = applyCalculate(sampleData, 'total', '[field1] + [field2]');
    expect(result[0].total).toBe(30);
    expect(result[1].total).toBe(20);
    expect(result[2].total).toBe(5); // null treated as 0 in parseSmartNumber
  });

  it('should handle complex formulas with functions', () => {
    const result = applyCalculate(sampleData, 'calc', 'SI([field1] > 7, [field2] * 2, [field2] + 100)');
    expect(result[0].calc).toBe(40); // 10 > 7 -> 20 * 2
    expect(result[1].calc).toBe(115); // 5 <= 7 -> 15 + 100
  });

  it('should handle string operations', () => {
    const result = applyCalculate(sampleData, 'upperText', 'MAJUSCULE([text])');
    expect(result[0].upperText).toBe('HELLO');
    expect(result[1].upperText).toBe('WORLD');
    expect(result[2].upperText).toBe('');
  });

  it('should not throw error on invalid formula and return null', () => {
    // Formula with syntax error (missing operand)
    const result = applyCalculate(sampleData, 'err', '[field1] + ');
    expect(result[0].err).toBeNull();
  });

  it('should handle division by zero safely', () => {
    const dataWithZero: DataRow[] = [{ id: '1', val: 10, zero: 0 }];
    const result = applyCalculate(dataWithZero, 'div', '[val] / [zero]');
    expect(result[0].div).toBe(0); // FormulaParser returns 0 for division by zero
  });
});
