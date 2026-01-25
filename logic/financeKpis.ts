import { WidgetType, ChartType } from '../types';

export interface KpiRequirement {
    id: string;
    label: string;
    description: string;
    type: 'number' | 'date';
}

export interface KpiTemplate {
    id: string;
    name: string;
    category: 'Performance' | 'Trésorerie' | 'Rentabilité' | 'Coûts' | 'Ratios';
    description: string;
    formula: string; // Formule utilisant les IDs des requirements entre crochets
    requirements: KpiRequirement[];
    outputType: 'number' | 'percentage' | 'currency';
    defaultWidget: {
        type: WidgetType;
        chartType?: ChartType;
        title: string;
    };
}

export const FINANCE_KPI_LIBRARY: KpiTemplate[] = [
    // --- PERFORMANCE ---
    {
        id: 'kpi-revenue',
        name: 'Chiffre d\'Affaires (CA)',
        category: 'Performance',
        description: 'Total des ventes pour la période donnée.',
        formula: '[CA]',
        requirements: [
            { id: 'CA', label: 'Chiffre d\'Affaires', description: 'Total des ventes HT', type: 'number' }
        ],
        outputType: 'currency',
        defaultWidget: { type: 'kpi', title: 'CA Total' }
    },
    {
        id: 'kpi-net-income',
        name: 'Résultat Net',
        category: 'Performance',
        description: 'Bénéfice ou Pertes final de l\'entreprise.',
        formula: '[RESULTAT_NET]',
        requirements: [
            { id: 'RESULTAT_NET', label: 'Résultat Net', description: 'Compte de résultat final', type: 'number' }
        ],
        outputType: 'currency',
        defaultWidget: { type: 'kpi', title: 'Résultat Net' }
    },
    {
        id: 'kpi-ebitda',
        name: 'EBITDA (Excédent Brut d\'Exploitation)',
        category: 'Performance',
        description: 'Mesure la performance opérationnelle brute de l\'entreprise.',
        formula: '[CA] - [ACHATS] - [CHARGES_EXT] - [PERSO]',
        requirements: [
            { id: 'CA', label: 'Chiffre d\'Affaires', description: 'Total des ventes HT', type: 'number' },
            { id: 'ACHATS', label: 'Achats', description: 'Coût des marchandises/matières premières', type: 'number' },
            { id: 'CHARGES_EXT', label: 'Charges Externes', description: 'Loisirs, loyers, honoraires, etc.', type: 'number' },
            { id: 'PERSO', label: 'Charges de Personnel', description: 'Salaires et cotisations', type: 'number' },
        ],
        outputType: 'currency',
        defaultWidget: { type: 'kpi', title: 'EBITDA Annuel' }
    },
    {
        id: 'kpi-gross-margin-pct',
        name: 'Taux de Marge Brute',
        category: 'Performance',
        description: 'Pourcentage de marge par rapport au chiffre d\'affaires.',
        formula: '([CA] - [ACHATS]) / [CA]',
        requirements: [
            { id: 'CA', label: 'Chiffre d\'Affaires', description: 'Total des ventes HT', type: 'number' },
            { id: 'ACHATS', label: 'Achats', description: 'Coût des ventes', type: 'number' },
        ],
        outputType: 'percentage',
        defaultWidget: { type: 'kpi', title: 'Taux de Marge' }
    },
    // --- TRÉSORERIE ---
    {
        id: 'kpi-dso',
        name: 'DSO (Délai de Paiement Client)',
        category: 'Trésorerie',
        description: 'Nombre moyen de jours pour encaisser les créances clients.',
        formula: '([ENCOURS_CLIENT] / [CA_TTC_PERIODE]) * 365',
        requirements: [
            { id: 'ENCOURS_CLIENT', label: 'Encours Client', description: 'Solde actuel du compte client (ex: 411)', type: 'number' },
            { id: 'CA_TTC_PERIODE', label: 'CA TTC sur la période', description: 'Chiffre d\'affaires total TTC', type: 'number' },
        ],
        outputType: 'number',
        defaultWidget: { type: 'kpi', title: 'DSO (Jours)' }
    },
    {
        id: 'kpi-cash-runway',
        name: 'Cash Runway (Mois)',
        category: 'Trésorerie',
        description: 'Nombre de mois de survie avec la trésorerie actuelle.',
        formula: '[CASH_ACTUEL] / ABS([BURN_RATE_MOYEN])',
        requirements: [
            { id: 'CASH_ACTUEL', label: 'Trésorerie Actuelle', description: 'Disponibilités banque + caisse', type: 'number' },
            { id: 'BURN_RATE_MOYEN', label: 'Burn Rate Moyen', description: 'Consommation mensuelle moyenne de cash', type: 'number' },
        ],
        outputType: 'number',
        defaultWidget: { type: 'kpi', title: 'Autonomie (Mois)' }
    },
    // --- RENTABILITÉ ---
    {
        id: 'kpi-roe',
        name: 'ROE (Return on Equity)',
        category: 'Rentabilité',
        description: 'Rentabilité des capitaux propres.',
        formula: '[RESULTAT_NET] / [CAPITAUX_PROPRES]',
        requirements: [
            { id: 'RESULTAT_NET', label: 'Résultat Net', description: 'Bénéfice ou perte de l\'exercice', type: 'number' },
            { id: 'CAPITAUX_PROPRES', label: 'Capitaux Propres', description: 'Total des fonds propres (classe 1)', type: 'number' },
        ],
        outputType: 'percentage',
        defaultWidget: { type: 'kpi', title: 'ROE' }
    },
    // --- TRÉSORERIE (Suite) ---
    {
        id: 'kpi-bfr',
        name: 'BFR (Besoin en Fonds de Roulement)',
        category: 'Trésorerie',
        description: 'Besoin de financement à court terme.',
        formula: '[STOCKS] + [CLIENTS] - [FOURNISSEURS]',
        requirements: [
            { id: 'STOCKS', label: 'Stocks', description: 'Valeur brute des stocks', type: 'number' },
            { id: 'CLIENTS', label: 'Créances Clients', description: 'Total encours clients', type: 'number' },
            { id: 'FOURNISSEURS', label: 'Dettes Fournisseurs', description: 'Total dettes fournisseurs', type: 'number' },
        ],
        outputType: 'currency',
        defaultWidget: { type: 'kpi', title: 'BFR' }
    },
    {
        id: 'kpi-dpo',
        name: 'DPO (Délai Crédit Fournisseur)',
        category: 'Trésorerie',
        description: 'Délai moyen de paiement des fournisseurs.',
        formula: '([DETTES_FOURN] / [ACHATS_TTC]) * 365',
        requirements: [
            { id: 'DETTES_FOURN', label: 'Dettes Fournisseurs', description: 'Solde compte 401', type: 'number' },
            { id: 'ACHATS_TTC', label: 'Achats TTC', description: 'Achats totaux TTC sur période', type: 'number' },
        ],
        outputType: 'number',
        defaultWidget: { type: 'kpi', title: 'DPO (Jours)' }
    },
    {
        id: 'kpi-dio',
        name: 'DIO (Rotation des Stocks)',
        category: 'Trésorerie',
        description: 'Temps d\'écoulement moyen des stocks.',
        formula: '([STOCKS_MOY] / [COUT_VENTES]) * 365',
        requirements: [
            { id: 'STOCKS_MOY', label: 'Stock Moyen', description: 'Moyenne stock début/fin', type: 'number' },
            { id: 'COUT_VENTES', label: 'Coût des Ventes', description: 'Achats consommés', type: 'number' },
        ],
        outputType: 'number',
        defaultWidget: { type: 'kpi', title: 'DIO (Jours)' }
    },
    {
        id: 'kpi-ccc',
        name: 'Cash Conversion Cycle',
        category: 'Trésorerie',
        description: 'Cycle complet de conversion du cash (DSO + DIO - DPO).',
        formula: '(([CLIENTS]/[CA])*365) + (([STOCKS]/[ACHATS])*365) - (([FOURN]/[ACHATS])*365)',
        requirements: [
            { id: 'CLIENTS', label: 'Créances Clients', description: 'Solde 411', type: 'number' },
            { id: 'CA', label: 'Chiffre d\'Affaires', description: 'CA TTC', type: 'number' },
            { id: 'STOCKS', label: 'Stocks', description: 'Valeur stocks', type: 'number' },
            { id: 'FOURN', label: 'Dettes Fournisseurs', description: 'Solde 401', type: 'number' },
            { id: 'ACHATS', label: 'Achats', description: 'Achats TTC', type: 'number' },
        ],
        outputType: 'number',
        defaultWidget: { type: 'kpi', title: 'CCC (Jours)' }
    },

    // --- RENTABILITÉ (Suite) ---
    {
        id: 'kpi-roa',
        name: 'ROA (Return on Assets)',
        category: 'Rentabilité',
        description: 'Rentabilité économique des actifs.',
        formula: '[RES_NET] / [TOTAL_ACTIF]',
        requirements: [
            { id: 'RES_NET', label: 'Résultat Net', description: 'Bénéfice net', type: 'number' },
            { id: 'TOTAL_ACTIF', label: 'Total Actif', description: 'Total du bilan', type: 'number' },
        ],
        outputType: 'percentage',
        defaultWidget: { type: 'kpi', title: 'ROA' }
    },
    {
        id: 'kpi-net-margin',
        name: 'Taux de Marge Nette',
        category: 'Rentabilité',
        description: 'Part du CA restant après toutes charges.',
        formula: '[RES_NET] / [CA]',
        requirements: [
            { id: 'RES_NET', label: 'Résultat Net', description: 'Bénéfice net', type: 'number' },
            { id: 'CA', label: 'Chiffre d\'Affaires', description: 'Total ventes', type: 'number' },
        ],
        outputType: 'percentage',
        defaultWidget: { type: 'kpi', title: 'Marge Nette' }
    },

    // --- COÛTS ---
    {
        id: 'kpi-opex-ratio',
        name: 'Ratio OPEX / CA',
        category: 'Coûts',
        description: 'Poids des charges opérationnelles sur le CA.',
        formula: '[OPEX] / [CA]',
        requirements: [
            { id: 'OPEX', label: 'OPEX', description: 'Total charges exploitation (hors achats)', type: 'number' },
            { id: 'CA', label: 'Chiffre d\'Affaires', description: 'Total ventes', type: 'number' },
        ],
        outputType: 'percentage',
        defaultWidget: { type: 'kpi', title: 'Poids OPEX' }
    },
    {
        id: 'kpi-payroll-ratio',
        name: 'Ratio Masse Salariale / CA',
        category: 'Coûts',
        description: 'Part des frais de personnel dans le CA.',
        formula: '[MASSE_SAL] / [CA]',
        requirements: [
            { id: 'MASSE_SAL', label: 'Masse Salariale', description: 'Salaires + Charges (64)', type: 'number' },
            { id: 'CA', label: 'Chiffre d\'Affaires', description: 'Total ventes', type: 'number' },
        ],
        outputType: 'percentage',
        defaultWidget: { type: 'kpi', title: 'Ratio RH' }
    },
    {
        id: 'kpi-cac',
        name: 'CAC (Coût d\'Acquisition Client)',
        category: 'Coûts',
        description: 'Coût marketing moyen pour acquérir un client.',
        formula: '[BUDGET_MKT] / [NB_NOUV_CLIENTS]',
        requirements: [
            { id: 'BUDGET_MKT', label: 'Budget Marketing', description: 'Total dépenses acquisition', type: 'number' },
            { id: 'NB_NOUV_CLIENTS', label: 'Nouveaux Clients', description: 'Nombre de clients signés', type: 'number' },
        ],
        outputType: 'currency',
        defaultWidget: { type: 'kpi', title: 'CAC' }
    },

    // --- RATIOS ---
    {
        id: 'kpi-current-ratio',
        name: 'Liquidité Générale',
        category: 'Ratios',
        description: 'Capacité à payer les dettes court terme (Actif CT / Passif CT).',
        formula: '[ACTIF_CT] / [PASSIF_CT]',
        requirements: [
            { id: 'ACTIF_CT', label: 'Actif Court Terme', description: 'Stocks + Créances + Cash', type: 'number' },
            { id: 'PASSIF_CT', label: 'Passif Court Terme', description: 'Dettes < 1 an', type: 'number' },
        ],
        outputType: 'number',
        defaultWidget: { type: 'kpi', title: 'Liquidité Générale' }
    },
    {
        id: 'kpi-debt-ratio',
        name: 'Taux d\'Endettement',
        category: 'Ratios',
        description: 'Part de la dette dans les capitaux propres.',
        formula: '[DETTE_NETTE] / [CAPITAUX_PROPRES]',
        requirements: [
            { id: 'DETTE_NETTE', label: 'Dette Nette', description: 'Dettes bancaires - Cash', type: 'number' },
            { id: 'CAPITAUX_PROPRES', label: 'Capitaux Propres', description: 'Fonds propres', type: 'number' },
        ],
        outputType: 'percentage',
        defaultWidget: { type: 'kpi', title: 'Levier Financier' }
    },
    {
        id: 'kpi-coverage',
        name: 'Debt Coverage Ratio',
        category: 'Ratios',
        description: 'Capacité à rembourser la dette via l\'EBITDA.',
        formula: '[DETTE_TOTALE] / [EBITDA]',
        requirements: [
            { id: 'DETTE_TOTALE', label: 'Dette Totale', description: 'Total dettes financières', type: 'number' },
            { id: 'EBITDA', label: 'EBITDA', description: 'Résultat d\'exploitation', type: 'number' },
        ],
        outputType: 'number',
        defaultWidget: { type: 'kpi', title: 'Couverture Dette' }
    }
];
