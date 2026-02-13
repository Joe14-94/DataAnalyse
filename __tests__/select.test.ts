
import { describe, it, expect } from 'vitest';
import { applySelect } from '../utils/transformations';

describe('applySelect', () => {
  it('should keep columns', () => {
    const data = [{ a: 1, b: 2, c: 3, id: '1' }];
    const result = applySelect(data, ['a', 'c']);
    expect(result[0]).toEqual({ a: 1, c: 3, id: '1' });
  });

  it('should exclude columns', () => {
    const data = [{ a: 1, b: 2, c: 3, id: '1' }];
    const result = applySelect(data, ['b'], true);
    expect(result[0]).toEqual({ a: 1, c: 3, id: '1' });
  });

  it('should generate ID if missing', () => {
    const data = [{ a: 1 }];
    const result = applySelect(data, ['a']);
    expect(result[0].id).toBeDefined();
    expect(result[0].a).toBe(1);
  });
});
