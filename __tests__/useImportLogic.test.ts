/**
 * Non-regression tests for Import logic (Sprint 4 - P1.3)
 *
 * Tests the pure data processing utilities used by useImportLogic:
 * - parseRawData: parses TSV/CSV text
 * - mapDataToSchema: applies column mapping to raw data
 * - detectColumnType: infers field types from sample values
 * - areHeadersSimilar: matches imported headers to known datasets
 */

import { describe, it, expect } from 'vitest';
import { parseRawData, mapDataToSchema, detectColumnType, areHeadersSimilar } from '../utils';
import type { RawImportData } from '../types';

// ── parseRawData ──────────────────────────────────────────────────────────────

describe('parseRawData', () => {
    it('parses tab-separated data', () => {
        const text = 'Name\tAge\tCity\nAlice\t30\tParis\nBob\t25\tLyon';
        const result = parseRawData(text);
        expect(result.headers).toEqual(['Name', 'Age', 'City']);
        expect(result.rows.length).toBe(2);
        expect(result.rows[0][0]).toBe('Alice');
        expect(result.totalRows).toBe(2);
    });

    it('parses semicolon-separated data', () => {
        const text = 'Produit;Prix;Stock\nChaise;45.5;100\nTable;120;50';
        const result = parseRawData(text);
        expect(result.headers).toEqual(['Produit', 'Prix', 'Stock']);
        expect(result.rows.length).toBe(2);
    });

    it('parses comma-separated data', () => {
        const text = 'id,name\n1,Alice\n2,Bob';
        const result = parseRawData(text);
        expect(result.headers).toEqual(['id', 'name']);
        expect(result.rows.length).toBe(2);
    });

    it('handles empty input', () => {
        const result = parseRawData('');
        expect(result.totalRows).toBe(0);
    });

    it('trims whitespace from headers', () => {
        const text = '  Name  \t  Age  \nAlice\t30';
        const result = parseRawData(text);
        expect(result.headers[0]).toBe('Name');
        expect(result.headers[1]).toBe('Age');
    });
});

// ── mapDataToSchema ───────────────────────────────────────────────────────────

describe('mapDataToSchema', () => {
    const rawData: RawImportData = {
        headers: ['Nom', 'Valeur', 'Catégorie'],
        rows: [
            ['Alice', '5000', 'Sales'],
            ['Bob',   '7000', 'IT'],
        ],
        totalRows: 2,
    };

    it('maps columns to schema using mapping', () => {
        const mapping: Record<number, string | 'ignore'> = {
            0: 'name',
            1: 'amount',
            2: 'ignore',
        };
        const result = mapDataToSchema(rawData, mapping);
        expect(result.length).toBe(2);
        expect(result[0]['name']).toBe('Alice');
        expect(result[0]['amount']).toBe('5000');
        expect('Catégorie' in result[0]).toBe(false);
        expect('ignore' in result[0]).toBe(false);
    });

    it('ignores columns mapped to "ignore"', () => {
        const mapping: Record<number, string | 'ignore'> = {
            0: 'ignore',
            1: 'value',
            2: 'category',
        };
        const result = mapDataToSchema(rawData, mapping);
        result.forEach(row => {
            expect('ignore' in row).toBe(false);
            expect('Nom' in row).toBe(false);
        });
    });
});

// ── detectColumnType ──────────────────────────────────────────────────────────

describe('detectColumnType', () => {
    it('detects number type for numeric values', () => {
        const values = ['100', '200.5', '300', '150'];
        expect(detectColumnType(values)).toBe('number');
    });

    it('detects date type for date strings', () => {
        const values = ['2024-01-15', '2024-02-20', '2024-03-10'];
        expect(detectColumnType(values)).toBe('date');
    });

    it('detects text for purely textual values', () => {
        const values = ['Alice', 'Bob', 'Carol', 'Dave'];
        expect(detectColumnType(values)).toBe('text');
    });

    it('detects text for empty values', () => {
        expect(detectColumnType([])).toBe('text');
    });
});

// ── areHeadersSimilar ─────────────────────────────────────────────────────────

describe('areHeadersSimilar', () => {
    it('matches identical header sets', () => {
        const fields = ['Name', 'Age', 'City'];
        const headers = ['Name', 'Age', 'City'];
        expect(areHeadersSimilar(fields, headers)).toBe(true);
    });

    it('matches when >75% of target fields are present in candidate', () => {
        // 4/5 = 80% > 75% threshold → should match
        const fields = ['Name', 'Age', 'City', 'Country', 'Dept'];
        const headers = ['Name', 'Age', 'City', 'Country', 'Manager'];
        expect(areHeadersSimilar(fields, headers)).toBe(true);
    });

    it('does not match when overlap is too low', () => {
        const fields = ['Alpha', 'Beta', 'Gamma', 'Delta'];
        const headers = ['Name', 'Age', 'City', 'Salary'];
        expect(areHeadersSimilar(fields, headers)).toBe(false);
    });

    it('returns false for empty arrays', () => {
        expect(areHeadersSimilar([], [])).toBe(false);
    });
});
