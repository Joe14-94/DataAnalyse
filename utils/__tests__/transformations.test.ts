import { describe, it, expect } from 'vitest';
import { applyDistinct, applySelect } from '../transformations';
import { DataRow } from '../../types';

describe('ETL Transformations Optimizations', () => {
    describe('applyDistinct', () => {
        it('should remove duplicate rows based on values (excluding ID)', () => {
            const data: DataRow[] = [
                { id: '1', name: 'John', age: 30 },
                { id: '2', name: 'John', age: 30 }, // Duplicate of 1
                { id: '3', name: 'Jane', age: 25 },
                { id: '4', name: 'John', age: 31 }, // Different age
            ];

            const result = applyDistinct(data);

            expect(result).toHaveLength(3);
            expect(result.map(r => r.id)).toContain('1');
            expect(result.map(r => r.id)).toContain('3');
            expect(result.map(r => r.id)).toContain('4');
            // '2' should be removed as it's a duplicate of '1' in terms of name/age
        });

        it('should handle empty datasets', () => {
            expect(applyDistinct([])).toEqual([]);
        });

        it('should handle rows with different keys but same values for common keys', () => {
             const data: DataRow[] = [
                { id: '1', name: 'John', city: 'Paris' },
                { id: '2', name: 'John', country: 'France' },
            ];
            // These are NOT duplicates because one has city and the other has country
            const result = applyDistinct(data);
            expect(result).toHaveLength(2);
        });

        it('should be fast on large datasets', () => {
            const largeData: DataRow[] = [];
            for (let i = 0; i < 10000; i++) {
                largeData.push({ id: String(i), val: i % 100 });
            }

            const start = performance.now();
            const result = applyDistinct(largeData);
            const end = performance.now();

            expect(result).toHaveLength(100);
            expect(end - start).toBeLessThan(100); // Should be very fast
        });
    });

    describe('applySelect', () => {
        it('should maintain stable IDs', () => {
            const data: DataRow[] = [{ id: 'fixed-id', name: 'John' }];
            const result = applySelect(data, ['name']);
            expect(result[0].id).toBe('fixed-id');
        });

        it('should exclude specified columns', () => {
             const data: DataRow[] = [{ id: '1', name: 'John', secret: '123' }];
             const result = applySelect(data, ['secret'], true);
             expect(result[0]).toHaveProperty('name');
             expect(result[0]).not.toHaveProperty('secret');
             expect(result[0]).toHaveProperty('id');
        });
    });
});
