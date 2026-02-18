
import { describe, it, expect } from 'vitest';

interface DataRow {
  [key: string]: any;
}

const applyRenameCurrent = (
  data: DataRow[],
  mappings: { oldName: string; newName: string }[]
): DataRow[] => {
  return data.map(row => {
    const newRow: DataRow = { ...row };
    mappings.forEach(({ oldName, newName }) => {
      if (oldName in newRow) {
        newRow[newName] = newRow[oldName];
        delete newRow[oldName];
      }
    });
    return newRow;
  });
};

const applyRenameBolt = (
  data: DataRow[],
  mappings: { oldName: string; newName: string }[]
): DataRow[] => {
  if (mappings.length === 0) return data;

  // BOLT OPTIMIZATION: Hoist mappings and avoid 'delete'
  const renameMap = new Map<string, string>();
  const oldNames = new Set<string>();
  for (let i = 0; i < mappings.length; i++) {
    renameMap.set(mappings[i].oldName, mappings[i].newName);
    oldNames.add(mappings[i].oldName);
  }

  return data.map(row => {
    const newRow: DataRow = { id: row.id };
    for (const key in row) {
      if (key === 'id') continue;
      const targetKey = renameMap.get(key) || key;
      newRow[targetKey] = row[key];
    }
    return newRow;
  });
};

const generateData = (count: number, cols: number) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    const row: any = { id: `id-${i}` };
    for (let j = 0; j < cols; j++) {
        row[`col${j}`] = `value-${i % (j + 2)}`;
    }
    data.push(row);
  }
  return data;
};

describe('Rename Comparison', () => {
  it('compare applyRename', () => {
    const data = generateData(20000, 50);
    const mappings = [
        { oldName: 'col0', newName: 'Renamed0' },
        { oldName: 'col10', newName: 'Renamed10' },
        { oldName: 'col40', newName: 'Renamed40' },
    ];

    const start1 = performance.now();
    const res1 = applyRenameCurrent(data, mappings);
    const end1 = performance.now();

    const start2 = performance.now();
    const res2 = applyRenameBolt(data, mappings);
    const end2 = performance.now();

    console.log(`Current: ${end1 - start1}ms`);
    console.log(`Bolt: ${end2 - start2}ms`);
    console.log(`Improvement: ${((end1 - start1) - (end2 - start2)) / (end1 - start1) * 100}%`);

    expect(res1[0].Renamed0).toBe(res2[0].Renamed0);
    expect(res1[0].col0).toBeUndefined();
    expect(res2[0].col0).toBeUndefined();
  });
});
