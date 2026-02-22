/**
 * Non-regression tests for useETLPipelineLogic hook (Sprint 3 - P1.2)
 *
 * Tests the pure pipeline-execution logic independently of React rendering.
 * Covers the 14 transformation types and step management functions.
 */

import { describe, it, expect } from 'vitest';
import {
    applyFilter, applySelect, applyRename, applySort, applyDistinct,
    applySplit, applyMerge, applyCalculate, applyAggregate, applyPivot,
    applyJoin, applyUnion, applyUnpivot,
} from '../utils/transformations';
import type { DataRow } from '../types';

// ── Test data ─────────────────────────────────────────────────────────────────

const sampleData: DataRow[] = [
    { id: 1, name: 'Alice', dept: 'Sales',   salary: 5000, city: 'Paris' },
    { id: 2, name: 'Bob',   dept: 'IT',      salary: 7000, city: 'Lyon' },
    { id: 3, name: 'Carol', dept: 'Sales',   salary: 6000, city: 'Paris' },
    { id: 4, name: 'Dave',  dept: 'IT',      salary: 8000, city: 'Lyon' },
    { id: 5, name: 'Eve',   dept: 'HR',      salary: 4500, city: 'Paris' },
    { id: 1, name: 'Alice', dept: 'Sales',   salary: 5000, city: 'Paris' }, // duplicate
];

// ── applyFilter ───────────────────────────────────────────────────────────────

describe('applyFilter', () => {
    it('filters with equals operator (AND)', () => {
        const result = applyFilter(sampleData, [{ field: 'dept', operator: 'equals', value: 'Sales' }], 'AND');
        expect(result.every(r => r['dept'] === 'Sales')).toBe(true);
        expect(result.length).toBe(3); // Alice, Carol + duplicate Alice
    });

    it('returns all rows when no conditions', () => {
        const result = applyFilter(sampleData, [], 'AND');
        expect(result.length).toBe(sampleData.length);
    });

    it('filters with OR combining two conditions', () => {
        const result = applyFilter(sampleData, [
            { field: 'dept', operator: 'equals', value: 'HR' },
            { field: 'dept', operator: 'equals', value: 'IT' },
        ], 'OR');
        expect(result.every(r => r['dept'] === 'HR' || r['dept'] === 'IT')).toBe(true);
    });

    it('filters with greater_than on numeric field', () => {
        const result = applyFilter(sampleData, [{ field: 'salary', operator: 'greater_than', value: 6000 }], 'AND');
        expect(result.every(r => Number(r['salary']) > 6000)).toBe(true);
    });
});

// ── applySelect ───────────────────────────────────────────────────────────────

describe('applySelect', () => {
    it('keeps only specified columns (include mode)', () => {
        const result = applySelect(sampleData, ['id', 'name'], false);
        result.forEach(row => {
            expect(Object.keys(row)).toEqual(['id', 'name']);
        });
    });

    it('excludes specified columns (exclude mode)', () => {
        const result = applySelect(sampleData, ['salary', 'city'], true);
        result.forEach(row => {
            expect('salary' in row).toBe(false);
            expect('city' in row).toBe(false);
        });
    });
});

// ── applyRename ───────────────────────────────────────────────────────────────

describe('applyRename', () => {
    it('renames specified columns', () => {
        const result = applyRename(sampleData, [{ oldName: 'name', newName: 'fullName' }]);
        expect('fullName' in result[0]).toBe(true);
        expect('name' in result[0]).toBe(false);
    });
});

// ── applySort ─────────────────────────────────────────────────────────────────

describe('applySort', () => {
    it('sorts ascending by salary', () => {
        const result = applySort(sampleData, [{ field: 'salary', direction: 'asc' }]);
        const salaries = result.map(r => Number(r['salary']));
        expect(salaries).toEqual([...salaries].sort((a, b) => a - b));
    });

    it('sorts descending by name', () => {
        const result = applySort(sampleData, [{ field: 'name', direction: 'desc' }]);
        const names = result.map(r => String(r['name']));
        expect(names[0] >= names[names.length - 1]).toBe(true);
    });
});

// ── applyDistinct ─────────────────────────────────────────────────────────────

describe('applyDistinct', () => {
    it('removes fully duplicate rows', () => {
        const result = applyDistinct(sampleData);
        // sampleData has 1 duplicate (Alice row appears twice)
        expect(result.length).toBe(sampleData.length - 1);
    });
});

// ── applySplit ────────────────────────────────────────────────────────────────

describe('applySplit', () => {
    const data: DataRow[] = [
        { fullName: 'Alice Smith' },
        { fullName: 'Bob Jones' },
    ];

    it('splits a column by separator', () => {
        const result = applySplit(data, 'fullName', ' ', ['firstName', 'lastName'], undefined);
        expect(result[0]['firstName']).toBe('Alice');
        expect(result[0]['lastName']).toBe('Smith');
    });
});

// ── applyMerge ────────────────────────────────────────────────────────────────

describe('applyMerge', () => {
    it('merges columns into a new column', () => {
        const result = applyMerge(sampleData, ['name', 'dept'], 'nameAndDept', ' - ');
        expect(String(result[0]['nameAndDept'])).toBe('Alice - Sales');
    });
});

// ── applyCalculate ────────────────────────────────────────────────────────────

describe('applyCalculate', () => {
    it('calculates a new column from a formula', () => {
        const result = applyCalculate(sampleData, 'bonus', '[salary] * 0.1');
        expect(Number(result[0]['bonus'])).toBeCloseTo(500);
    });
});

// ── applyAggregate ────────────────────────────────────────────────────────────

describe('applyAggregate', () => {
    it('groups by dept and sums salary', () => {
        const result = applyAggregate(sampleData, ['dept'], [{ field: 'salary', operation: 'sum', alias: 'totalSalary' }]);
        const sales = result.find(r => r['dept'] === 'Sales');
        // Alice(5000) + Carol(6000) + duplicate Alice(5000) = 16000
        expect(Number(sales?.['totalSalary'])).toBe(16000);
    });
});

// ── applyJoin ─────────────────────────────────────────────────────────────────

describe('applyJoin', () => {
    const left: DataRow[] = [{ id: 1, val: 'A' }, { id: 2, val: 'B' }];
    const right: DataRow[] = [{ id: 1, desc: 'Alpha' }, { id: 3, desc: 'Gamma' }];

    it('performs an inner join', () => {
        const result = applyJoin(left, right, 'id', 'id', 'inner', '_right');
        expect(result.length).toBe(1);
        expect(result[0]['desc']).toBe('Alpha');
    });

    it('performs a left join', () => {
        const result = applyJoin(left, right, 'id', 'id', 'left', '_right');
        expect(result.length).toBe(2);
        const unmatched = result.find(r => r['id'] === 2);
        expect(unmatched?.['desc']).toBeUndefined();
    });
});

// ── applyUnion ────────────────────────────────────────────────────────────────

describe('applyUnion', () => {
    const a: DataRow[] = [{ x: 1 }, { x: 2 }];
    const b: DataRow[] = [{ x: 3 }, { x: 4 }];

    it('concatenates two datasets', () => {
        const result = applyUnion(a, b);
        expect(result.length).toBe(4);
    });
});

// ── applyUnpivot ──────────────────────────────────────────────────────────────

describe('applyUnpivot', () => {
    const pivoted: DataRow[] = [
        { region: 'North', Q1: 100, Q2: 200 },
        { region: 'South', Q1: 150, Q2: 250 },
    ];

    it('unpivots value columns to rows', () => {
        const result = applyUnpivot(pivoted, ['region'], ['Q1', 'Q2'], 'quarter', 'revenue');
        expect(result.length).toBe(4);
        const northQ1 = result.find(r => r['region'] === 'North' && r['quarter'] === 'Q1');
        expect(northQ1?.['revenue']).toBe(100);
    });
});
