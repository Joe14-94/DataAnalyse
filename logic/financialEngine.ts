
import { DataRow, FinancialCategory } from '../types';
import { parseSmartNumber } from '../utils';

export interface FinancialLine {
    code: string;
    name: string;
    value: number;
    prevValue?: number;
    budget?: number;
    isTotal?: boolean;
    level: number;
    children?: FinancialLine[];
}

// Référentiel standard (simplifié) du Plan Comptable Général (PCG)
export const DEFAULT_COA: FinancialCategory[] = [
    // P&L
    { id: 'p1', code: '7', name: 'Produits (Chiffre d\'affaires)', type: 'income' },
    { id: 'p11', code: '70', name: 'Ventes de marchandises/produits', type: 'income', parentCode: '7' },
    { id: 'p2', code: '6', name: 'Charges', type: 'expense' },
    { id: 'p21', code: '60', name: 'Achats consommés', type: 'expense', parentCode: '6' },
    { id: 'p22', code: '61', name: 'Services extérieurs', type: 'expense', parentCode: '6' },
    { id: 'p23', code: '64', name: 'Charges de personnel', type: 'expense', parentCode: '6' },

    // BILAN
    { id: 'b1', code: '2', name: 'Immobilisations', type: 'asset' },
    { id: 'b2', code: '4', name: 'Tiers (Clients/Fournisseurs)', type: 'asset' }, // Simplifié
    { id: 'b3', code: '5', name: 'Trésorerie', type: 'asset' },
    { id: 'b4', code: '1', name: 'Capitaux Propres', type: 'liability' },
];

/**
 * Calcule le Compte de Résultat (P&L) enrichi avec comparatif
 */
export const calculatePL = (
    rows: DataRow[],
    prevRows: DataRow[] | null,
    accountField: string,
    amountField: string,
    coa: FinancialCategory[] = DEFAULT_COA
): FinancialLine[] => {
    const categories = coa.filter(c => c.type === 'income' || c.type === 'expense');
    const results: FinancialLine[] = [];

    const getVal = (data: DataRow[], code: string, type: string) => {
        return data.filter(r => String(r[accountField]).startsWith(code)).reduce((sum, r) => {
            let val = parseSmartNumber(r[amountField]);
            if (type === 'expense') return sum - val;
            return sum + val;
        }, 0);
    };

    // 1. Calcul des catégories de base
    categories.forEach(cat => {
        const val = getVal(rows, cat.code, cat.type);
        const prevVal = prevRows ? getVal(prevRows, cat.code, cat.type) : undefined;

        results.push({
            code: cat.code,
            name: cat.name,
            value: val,
            prevValue: prevVal,
            level: cat.parentCode ? 1 : 0
        });
    });

    // 2. Ajout des agrégats calculés (Marges)
    const calcAgg = (lines: FinancialLine[], isPrev: boolean = false) => {
        const field = isPrev ? 'prevValue' : 'value';
        const income = lines.filter(r => r.code.startsWith('7')).reduce((s, r) => s + (Number(r[field]) || 0), 0);
        const costOfGoods = lines.filter(r => r.code === '60').reduce((s, r) => s + (Number(r[field]) || 0), 0);
        const personnel = lines.filter(r => r.code === '64').reduce((s, r) => s + (Number(r[field]) || 0), 0);
        const otherExpenses = lines.filter(r => r.code.startsWith('6') && r.code !== '60' && r.code !== '64').reduce((s, r) => s + (Number(r[field]) || 0), 0);

        return {
            mb: income + costOfGoods,
            ebitda: income + costOfGoods + personnel + otherExpenses,
            rn: income + costOfGoods + personnel + otherExpenses // Simplifié
        };
    };

    const aggs = calcAgg(results);
    const prevAggs = prevRows ? calcAgg(results, true) : null;

    const aggregates: FinancialLine[] = [
        { code: 'MB', name: 'MARGE BRUTE', value: aggs.mb, prevValue: prevAggs?.mb, level: 0, isTotal: true },
        { code: 'EBITDA', name: 'EBITDA (EBE)', value: aggs.ebitda, prevValue: prevAggs?.ebitda, level: 0, isTotal: true },
        { code: 'RN', name: 'RÉSULTAT NET (ESTIMÉ)', value: aggs.rn, prevValue: prevAggs?.rn, level: 0, isTotal: true },
    ];

    return [...results, ...aggregates].sort((a, b) => {
        const order = ['7', 'MB', '6', 'EBITDA', 'RN'];
        const getIdx = (code: string) => order.findIndex(o => code.startsWith(o));
        return getIdx(a.code) - getIdx(b.code);
    });
};

/**
 * Calcule le Bilan (Balance Sheet)
 */
export const calculateBalanceSheet = (
    rows: DataRow[],
    accountField: string,
    amountField: string,
    coa: FinancialCategory[] = DEFAULT_COA
): { assets: FinancialLine[], liabilities: FinancialLine[] } => {
    // Logique simplifiée : Actif (Comptes 2, 3, 4, 5) / Passif (Comptes 1, 4)
    // À affiner selon les soldes débiteurs/créditeurs
    return { assets: [], liabilities: [] };
};
