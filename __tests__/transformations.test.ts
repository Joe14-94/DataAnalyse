import { describe, it, expect } from 'vitest';
import { applyJoin } from '../utils/transformations';
import { DataRow } from '../types';

describe('Transformation ETL - applyJoin', () => {
  const leftData: DataRow[] = [
    { id: 'l1', name: 'Alice', cityId: '1' },
    { id: 'l2', name: 'Bob', cityId: '2' },
    { id: 'l3', name: 'Charlie', cityId: '4' }, // No match
  ];

  const rightData: DataRow[] = [
    { id: 'r1', cityId: '1', cityName: 'Paris' },
    { id: 'r2', cityId: '2', cityName: 'Lyon' },
    { id: 'r3', cityId: '3', cityName: 'Marseille' }, // No match
  ];

  it('devrait effectuer un INNER JOIN correctement', () => {
    const result = applyJoin(leftData, rightData, 'cityId', 'cityId', 'inner');
    expect(result).toHaveLength(2);
    expect(result.find(r => r.name === 'Alice')?.cityName).toBe('Paris');
    expect(result.find(r => r.name === 'Bob')?.cityName).toBe('Lyon');
    expect(result.find(r => r.name === 'Charlie')).toBeUndefined();
  });

  it('devrait effectuer un LEFT JOIN correctement', () => {
    const result = applyJoin(leftData, rightData, 'cityId', 'cityId', 'left');
    expect(result).toHaveLength(3);
    expect(result.find(r => r.name === 'Alice')?.cityName).toBe('Paris');
    expect(result.find(r => r.name === 'Bob')?.cityName).toBe('Lyon');
    expect(result.find(r => r.name === 'Charlie')?.cityName).toBeUndefined();
  });

  it('devrait effectuer un RIGHT JOIN correctement', () => {
    const result = applyJoin(leftData, rightData, 'cityId', 'cityId', 'right');
    // Alice (matched), Bob (matched), Marseille (unmatched right)
    expect(result).toHaveLength(3);
    expect(result.find(r => r.name === 'Alice')?.cityName).toBe('Paris');
    expect(result.find(r => r.name === 'Bob')?.cityName).toBe('Lyon');
    expect(result.find(r => r.cityName === 'Marseille')?.name).toBeUndefined();
  });

  it('devrait effectuer un FULL JOIN correctement', () => {
    const result = applyJoin(leftData, rightData, 'cityId', 'cityId', 'full');
    // Alice (matched), Bob (matched), Charlie (unmatched left), Marseille (unmatched right)
    expect(result).toHaveLength(4);
    expect(result.find(r => r.name === 'Alice')?.cityName).toBe('Paris');
    expect(result.find(r => r.name === 'Bob')?.cityName).toBe('Lyon');
    expect(result.find(r => r.name === 'Charlie')?.cityName).toBeUndefined();
    expect(result.find(r => r.cityName === 'Marseille')?.name).toBeUndefined();
  });

  it('devrait gérer les clés en double (One-to-Many)', () => {
    const left: DataRow[] = [{ id: 'l1', key: 'A', val: 10 }];
    const right: DataRow[] = [
      { id: 'r1', key: 'A', info: 'X' },
      { id: 'r2', key: 'A', info: 'Y' }
    ];
    const result = applyJoin(left, right, 'key', 'key', 'inner');
    expect(result).toHaveLength(2);
    expect(result.find(r => r.info === 'X')).toBeDefined();
    expect(result.find(r => r.info === 'Y')).toBeDefined();
  });

  it('devrait appliquer le suffixe en cas de conflit de colonnes', () => {
    const left: DataRow[] = [{ id: 'l1', key: 'A', common: 'LEFT' }];
    const right: DataRow[] = [{ id: 'r1', key: 'A', common: 'RIGHT' }];
    const result = applyJoin(left, right, 'key', 'key', 'inner', '_suffix');
    expect(result[0].common).toBe('LEFT');
    expect(result[0].common_suffix).toBe('RIGHT');
  });
});
