
import { describe, it, expect } from 'vitest';

describe('Auto-refresh logic simulation', () => {
  it('should identify recursive dependencies', () => {
    const datasets = [
      { id: 'A', name: 'Source' },
      { id: 'B', name: 'Derived 1', sourcePivotConfig: { isTemporal: false, config: { currentDataset: { id: 'A' } } } },
      { id: 'C', name: 'Derived 2', sourcePivotConfig: { isTemporal: false, config: { currentDataset: { id: 'B' } } } },
    ];

    // Simple logic to find all datasets affected by A
    const getAffected = (id: string, all: any[]): any[] => {
      const direct = all.filter(d =>
        d.sourcePivotConfig?.config?.currentDataset?.id === id ||
        d.sourcePivotConfig?.config?.sources?.some((s: any) => s.datasetId === id)
      );
      let affected = [...direct];
      direct.forEach(d => {
        affected = [...affected, ...getAffected(d.id, all)];
      });
      return affected;
    };

    const affected = getAffected('A', datasets);
    expect(affected.map(d => d.id)).toContain('B');
    expect(affected.map(d => d.id)).toContain('C');
  });
});
