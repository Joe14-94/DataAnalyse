/**
 * Account Templates for French PCG (Plan Comptable Général) and IFRS
 */

import { Account, ChartOfAccounts } from '../types';

// Helper to create properly typed account data
type AccountData = Omit<Account, 'id' | 'createdAt'>;

/**
 * PCG 2020 - Plan Comptable Général (French GAAP)
 * Complete structure with main account classes and common sub-accounts
 */
const PCG_ACCOUNTS: AccountData[] = [
    // CLASSE 1 - COMPTES DE CAPITAUX
    { code: '10', label: 'Capital et réserves', nature: 'equity', level: 1, isActive: true, canReceiveEntries: false },
    { code: '101', label: 'Capital', nature: 'equity', level: 2, parentCode: '10', isActive: true, canReceiveEntries: true },
    { code: '1011', label: 'Capital souscrit - non appelé', nature: 'equity', level: 3, parentCode: '101', isActive: true, canReceiveEntries: true },
    { code: '1012', label: 'Capital souscrit - appelé, non versé', nature: 'equity', level: 3, parentCode: '101', isActive: true, canReceiveEntries: true },
    { code: '1013', label: 'Capital souscrit - appelé, versé', nature: 'equity', level: 3, parentCode: '101', isActive: true, canReceiveEntries: true },
    { code: '106', label: 'Réserves', nature: 'equity', level: 2, parentCode: '10', isActive: true, canReceiveEntries: false },
    { code: '1061', label: 'Réserve légale', nature: 'equity', level: 3, parentCode: '106', isActive: true, canReceiveEntries: true },
    { code: '1063', label: 'Réserves statutaires ou contractuelles', nature: 'equity', level: 3, parentCode: '106', isActive: true, canReceiveEntries: true },
    { code: '1064', label: 'Réserves réglementées', nature: 'equity', level: 3, parentCode: '106', isActive: true, canReceiveEntries: true },
    { code: '1068', label: 'Autres réserves', nature: 'equity', level: 3, parentCode: '106', isActive: true, canReceiveEntries: true },
    { code: '11', label: 'Report à nouveau', nature: 'equity', level: 1, isActive: true, canReceiveEntries: false },
    { code: '110', label: 'Report à nouveau (solde créditeur)', nature: 'equity', level: 2, parentCode: '11', isActive: true, canReceiveEntries: true },
    { code: '119', label: 'Report à nouveau (solde débiteur)', nature: 'equity', level: 2, parentCode: '11', isActive: true, canReceiveEntries: true },
    { code: '12', label: 'Résultat de l\'exercice', nature: 'equity', level: 1, isActive: true, canReceiveEntries: false },
    { code: '120', label: 'Résultat de l\'exercice (bénéfice)', nature: 'equity', level: 2, parentCode: '12', isActive: true, canReceiveEntries: true },
    { code: '129', label: 'Résultat de l\'exercice (perte)', nature: 'equity', level: 2, parentCode: '12', isActive: true, canReceiveEntries: true },
    { code: '16', label: 'Emprunts et dettes assimilées', nature: 'liability', level: 1, isActive: true, canReceiveEntries: false },
    { code: '164', label: 'Emprunts auprès des établissements de crédit', nature: 'liability', level: 2, parentCode: '16', isActive: true, canReceiveEntries: true },
    { code: '1641', label: 'Emprunts auprès des établissements de crédit', nature: 'liability', level: 3, parentCode: '164', isActive: true, canReceiveEntries: true },

    // CLASSE 2 - COMPTES D'IMMOBILISATIONS
    { code: '20', label: 'Immobilisations incorporelles', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '201', label: 'Frais d\'établissement', nature: 'asset', level: 2, parentCode: '20', isActive: true, canReceiveEntries: true },
    { code: '205', label: 'Concessions et droits similaires, brevets, licences', nature: 'asset', level: 2, parentCode: '20', isActive: true, canReceiveEntries: true },
    { code: '206', label: 'Droit au bail', nature: 'asset', level: 2, parentCode: '20', isActive: true, canReceiveEntries: true },
    { code: '207', label: 'Fonds commercial', nature: 'asset', level: 2, parentCode: '20', isActive: true, canReceiveEntries: true },
    { code: '21', label: 'Immobilisations corporelles', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '211', label: 'Terrains', nature: 'asset', level: 2, parentCode: '21', isActive: true, canReceiveEntries: true },
    { code: '213', label: 'Constructions', nature: 'asset', level: 2, parentCode: '21', isActive: true, canReceiveEntries: true },
    { code: '2131', label: 'Bâtiments', nature: 'asset', level: 3, parentCode: '213', isActive: true, canReceiveEntries: true },
    { code: '215', label: 'Installations techniques, matériel et outillage industriels', nature: 'asset', level: 2, parentCode: '21', isActive: true, canReceiveEntries: true },
    { code: '218', label: 'Autres immobilisations corporelles', nature: 'asset', level: 2, parentCode: '21', isActive: true, canReceiveEntries: true },
    { code: '2181', label: 'Installations générales, agencements', nature: 'asset', level: 3, parentCode: '218', isActive: true, canReceiveEntries: true },
    { code: '2182', label: 'Matériel de transport', nature: 'asset', level: 3, parentCode: '218', isActive: true, canReceiveEntries: true },
    { code: '2183', label: 'Matériel de bureau et informatique', nature: 'asset', level: 3, parentCode: '218', isActive: true, canReceiveEntries: true },
    { code: '2184', label: 'Mobilier', nature: 'asset', level: 3, parentCode: '218', isActive: true, canReceiveEntries: true },
    { code: '28', label: 'Amortissements des immobilisations', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '280', label: 'Amortissements des immobilisations incorporelles', nature: 'asset', level: 2, parentCode: '28', isActive: true, canReceiveEntries: true },
    { code: '281', label: 'Amortissements des immobilisations corporelles', nature: 'asset', level: 2, parentCode: '28', isActive: true, canReceiveEntries: true },

    // CLASSE 3 - COMPTES DE STOCKS ET EN-COURS
    { code: '31', label: 'Matières premières (et fournitures)', nature: 'asset', level: 1, isActive: true, canReceiveEntries: true },
    { code: '32', label: 'Autres approvisionnements', nature: 'asset', level: 1, isActive: true, canReceiveEntries: true },
    { code: '321', label: 'Matières consommables', nature: 'asset', level: 2, parentCode: '32', isActive: true, canReceiveEntries: true },
    { code: '322', label: 'Fournitures consommables', nature: 'asset', level: 2, parentCode: '32', isActive: true, canReceiveEntries: true },
    { code: '33', label: 'En-cours de production de biens', nature: 'asset', level: 1, isActive: true, canReceiveEntries: true },
    { code: '34', label: 'En-cours de production de services', nature: 'asset', level: 1, isActive: true, canReceiveEntries: true },
    { code: '35', label: 'Stocks de produits', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '355', label: 'Produits finis', nature: 'asset', level: 2, parentCode: '35', isActive: true, canReceiveEntries: true },
    { code: '37', label: 'Stocks de marchandises', nature: 'asset', level: 1, isActive: true, canReceiveEntries: true },

    // CLASSE 4 - COMPTES DE TIERS
    { code: '40', label: 'Fournisseurs et comptes rattachés', nature: 'liability', level: 1, isActive: true, canReceiveEntries: false },
    { code: '401', label: 'Fournisseurs', nature: 'liability', level: 2, parentCode: '40', isActive: true, canReceiveEntries: true },
    { code: '4011', label: 'Fournisseurs - Achats de biens et prestations de services', nature: 'liability', level: 3, parentCode: '401', isActive: true, canReceiveEntries: true },
    { code: '404', label: 'Fournisseurs d\'immobilisations', nature: 'liability', level: 2, parentCode: '40', isActive: true, canReceiveEntries: true },
    { code: '408', label: 'Fournisseurs - Factures non parvenues', nature: 'liability', level: 2, parentCode: '40', isActive: true, canReceiveEntries: true },
    { code: '41', label: 'Clients et comptes rattachés', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '411', label: 'Clients', nature: 'asset', level: 2, parentCode: '41', isActive: true, canReceiveEntries: true },
    { code: '4111', label: 'Clients - Ventes de biens ou prestations de services', nature: 'asset', level: 3, parentCode: '411', isActive: true, canReceiveEntries: true },
    { code: '416', label: 'Clients douteux ou litigieux', nature: 'asset', level: 2, parentCode: '41', isActive: true, canReceiveEntries: true },
    { code: '418', label: 'Clients - Produits non encore facturés', nature: 'asset', level: 2, parentCode: '41', isActive: true, canReceiveEntries: true },
    { code: '42', label: 'Personnel et comptes rattachés', nature: 'liability', level: 1, isActive: true, canReceiveEntries: false },
    { code: '421', label: 'Personnel - Rémunérations dues', nature: 'liability', level: 2, parentCode: '42', isActive: true, canReceiveEntries: true },
    { code: '43', label: 'Sécurité sociale et autres organismes sociaux', nature: 'liability', level: 1, isActive: true, canReceiveEntries: false },
    { code: '431', label: 'Sécurité sociale', nature: 'liability', level: 2, parentCode: '43', isActive: true, canReceiveEntries: true },
    { code: '437', label: 'Autres organismes sociaux', nature: 'liability', level: 2, parentCode: '43', isActive: true, canReceiveEntries: true },
    { code: '44', label: 'État et autres collectivités publiques', nature: 'liability', level: 1, isActive: true, canReceiveEntries: false },
    { code: '445', label: 'État - Taxes sur le chiffre d\'affaires', nature: 'liability', level: 2, parentCode: '44', isActive: true, canReceiveEntries: false },
    { code: '4451', label: 'TVA à décaisser', nature: 'liability', level: 3, parentCode: '445', isActive: true, canReceiveEntries: true },
    { code: '4456', label: 'TVA déductible', nature: 'asset', level: 3, parentCode: '445', isActive: true, canReceiveEntries: true },
    { code: '4457', label: 'TVA collectée', nature: 'liability', level: 3, parentCode: '445', isActive: true, canReceiveEntries: true },
    { code: '447', label: 'Autres impôts, taxes et versements assimilés', nature: 'liability', level: 2, parentCode: '44', isActive: true, canReceiveEntries: true },

    // CLASSE 5 - COMPTES FINANCIERS
    { code: '51', label: 'Banques, établissements financiers et assimilés', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '512', label: 'Banques', nature: 'asset', level: 2, parentCode: '51', isActive: true, canReceiveEntries: true },
    { code: '5121', label: 'Compte bancaire 1', nature: 'asset', level: 3, parentCode: '512', isActive: true, canReceiveEntries: true },
    { code: '5122', label: 'Compte bancaire 2', nature: 'asset', level: 3, parentCode: '512', isActive: true, canReceiveEntries: true },
    { code: '53', label: 'Caisse', nature: 'asset', level: 1, isActive: true, canReceiveEntries: true },
    { code: '531', label: 'Caisse', nature: 'asset', level: 2, parentCode: '53', isActive: true, canReceiveEntries: true },

    // CLASSE 6 - COMPTES DE CHARGES
    { code: '60', label: 'Achats (sauf 603)', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'cogs' },
    { code: '601', label: 'Achats stockés - Matières premières (et fournitures)', nature: 'expense', level: 2, parentCode: '60', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '602', label: 'Achats stockés - Autres approvisionnements', nature: 'expense', level: 2, parentCode: '60', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '6021', label: 'Matières consommables', nature: 'expense', level: 3, parentCode: '602', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '6022', label: 'Fournitures consommables', nature: 'expense', level: 3, parentCode: '602', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '606', label: 'Achats non stockés de matières et fournitures', nature: 'expense', level: 2, parentCode: '60', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '607', label: 'Achats de marchandises', nature: 'expense', level: 2, parentCode: '60', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '6071', label: 'Achats de marchandises', nature: 'expense', level: 3, parentCode: '607', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '61', label: 'Services extérieurs', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'opex' },
    { code: '611', label: 'Sous-traitance générale', nature: 'expense', level: 2, parentCode: '61', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '613', label: 'Locations', nature: 'expense', level: 2, parentCode: '61', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6132', label: 'Locations immobilières', nature: 'expense', level: 3, parentCode: '613', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6135', label: 'Locations mobilières', nature: 'expense', level: 3, parentCode: '613', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '614', label: 'Charges locatives et de copropriété', nature: 'expense', level: 2, parentCode: '61', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '615', label: 'Entretien et réparations', nature: 'expense', level: 2, parentCode: '61', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '616', label: 'Primes d\'assurance', nature: 'expense', level: 2, parentCode: '61', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '618', label: 'Divers', nature: 'expense', level: 2, parentCode: '61', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '62', label: 'Autres services extérieurs', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'opex' },
    { code: '621', label: 'Personnel extérieur à l\'entreprise', nature: 'expense', level: 2, parentCode: '62', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '622', label: 'Rémunérations d\'intermédiaires et honoraires', nature: 'expense', level: 2, parentCode: '62', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6226', label: 'Honoraires', nature: 'expense', level: 3, parentCode: '622', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '623', label: 'Publicité, publications, relations publiques', nature: 'expense', level: 2, parentCode: '62', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6231', label: 'Annonces et insertions', nature: 'expense', level: 3, parentCode: '623', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6236', label: 'Catalogues et imprimés', nature: 'expense', level: 3, parentCode: '623', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '624', label: 'Transports de biens et transports collectifs du opex', nature: 'expense', level: 2, parentCode: '62', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '625', label: 'Déplacements, missions et réceptions', nature: 'expense', level: 2, parentCode: '62', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6251', label: 'Voyages et déplacements', nature: 'expense', level: 3, parentCode: '625', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6256', label: 'Missions', nature: 'expense', level: 3, parentCode: '625', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6257', label: 'Réceptions', nature: 'expense', level: 3, parentCode: '625', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '626', label: 'Frais postaux et de télécommunications', nature: 'expense', level: 2, parentCode: '62', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '627', label: 'Services bancaires et assimilés', nature: 'expense', level: 2, parentCode: '62', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '63', label: 'Impôts, taxes et versements assimilés', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'opex' },
    { code: '631', label: 'Impôts, taxes et versements assimilés sur rémunérations', nature: 'expense', level: 2, parentCode: '63', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '635', label: 'Autres impôts, taxes et versements assimilés', nature: 'expense', level: 2, parentCode: '63', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '64', label: 'Charges de opex', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'opex' },
    { code: '641', label: 'Rémunérations du opex', nature: 'expense', level: 2, parentCode: '64', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6411', label: 'Salaires, appointements', nature: 'expense', level: 3, parentCode: '641', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '645', label: 'Charges de sécurité sociale et de prévoyance', nature: 'expense', level: 2, parentCode: '64', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6451', label: 'Cotisations à l\'URSSAF', nature: 'expense', level: 3, parentCode: '645', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '6452', label: 'Cotisations aux mutuelles', nature: 'expense', level: 3, parentCode: '645', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '65', label: 'Autres charges de gestion courante', nature: 'expense', level: 1, isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '66', label: 'Charges financières', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'financial' },
    { code: '661', label: 'Charges d\'intérêts', nature: 'expense', level: 2, parentCode: '66', isActive: true, canReceiveEntries: true, plCategory: 'financial' },
    { code: '6611', label: 'Intérêts des emprunts et dettes', nature: 'expense', level: 3, parentCode: '661', isActive: true, canReceiveEntries: true, plCategory: 'financial' },
    { code: '68', label: 'Dotations aux amortissements et aux provisions', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'depreciation' },
    { code: '681', label: 'Dotations aux amortissements', nature: 'expense', level: 2, parentCode: '68', isActive: true, canReceiveEntries: true, plCategory: 'depreciation' },
    { code: '6811', label: 'Dotations aux amortissements sur immobilisations incorporelles et corporelles', nature: 'expense', level: 3, parentCode: '681', isActive: true, canReceiveEntries: true, plCategory: 'depreciation' },

    // CLASSE 7 - COMPTES DE PRODUITS
    { code: '70', label: 'Ventes de produits fabriqués, prestations de services, marchandises', nature: 'revenue', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'revenue' },
    { code: '701', label: 'Ventes de produits finis', nature: 'revenue', level: 2, parentCode: '70', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '7011', label: 'Ventes de produits finis en France', nature: 'revenue', level: 3, parentCode: '701', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '7012', label: 'Ventes de produits finis à l\'étranger', nature: 'revenue', level: 3, parentCode: '701', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '706', label: 'Prestations de services', nature: 'revenue', level: 2, parentCode: '70', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '7061', label: 'Prestations de services en France', nature: 'revenue', level: 3, parentCode: '706', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '7062', label: 'Prestations de services à l\'étranger', nature: 'revenue', level: 3, parentCode: '706', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '707', label: 'Ventes de marchandises', nature: 'revenue', level: 2, parentCode: '70', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '7071', label: 'Ventes de marchandises en France', nature: 'revenue', level: 3, parentCode: '707', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '7072', label: 'Ventes de marchandises à l\'étranger', nature: 'revenue', level: 3, parentCode: '707', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '708', label: 'Produits des activités annexes', nature: 'revenue', level: 2, parentCode: '70', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '75', label: 'Autres produits de gestion courante', nature: 'revenue', level: 1, isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '76', label: 'Produits financiers', nature: 'revenue', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'financial' },
    { code: '761', label: 'Produits de participations', nature: 'revenue', level: 2, parentCode: '76', isActive: true, canReceiveEntries: true, plCategory: 'financial' },
    { code: '764', label: 'Revenus des valeurs mobilières de placement', nature: 'revenue', level: 2, parentCode: '76', isActive: true, canReceiveEntries: true, plCategory: 'financial' },
    { code: '766', label: 'Gains de change', nature: 'revenue', level: 2, parentCode: '76', isActive: true, canReceiveEntries: true, plCategory: 'financial' },
    { code: '768', label: 'Autres produits financiers', nature: 'revenue', level: 2, parentCode: '76', isActive: true, canReceiveEntries: true, plCategory: 'financial' },
];

export const PCG_TEMPLATE: Omit<ChartOfAccounts, 'id' | 'createdAt'> = {
  name: 'PCG 2020 - Plan Comptable Général',
  standard: 'PCG',
  isDefault: true,
  accounts: PCG_ACCOUNTS.map((acc, idx) => ({
    ...acc,
    id: `pcg_${idx}`,
    createdAt: Date.now()
  }))
};

/**
 * IFRS - International Financial Reporting Standards
 * Simplified structure focusing on main financial statement categories
 */
const IFRS_ACCOUNTS: AccountData[] = [
    // ASSETS
    { code: '1000', label: 'Non-current Assets', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '1100', label: 'Property, Plant and Equipment', nature: 'asset', level: 2, parentCode: '1000', isActive: true, canReceiveEntries: false },
    { code: '1110', label: 'Land and Buildings', nature: 'asset', level: 3, parentCode: '1100', isActive: true, canReceiveEntries: true },
    { code: '1120', label: 'Machinery and Equipment', nature: 'asset', level: 3, parentCode: '1100', isActive: true, canReceiveEntries: true },
    { code: '1130', label: 'Fixtures and Fittings', nature: 'asset', level: 3, parentCode: '1100', isActive: true, canReceiveEntries: true },
    { code: '1200', label: 'Intangible Assets', nature: 'asset', level: 2, parentCode: '1000', isActive: true, canReceiveEntries: false },
    { code: '1210', label: 'Goodwill', nature: 'asset', level: 3, parentCode: '1200', isActive: true, canReceiveEntries: true },
    { code: '1220', label: 'Patents and Licenses', nature: 'asset', level: 3, parentCode: '1200', isActive: true, canReceiveEntries: true },
    { code: '1230', label: 'Software', nature: 'asset', level: 3, parentCode: '1200', isActive: true, canReceiveEntries: true },
    { code: '1300', label: 'Financial Assets', nature: 'asset', level: 2, parentCode: '1000', isActive: true, canReceiveEntries: true },

    { code: '2000', label: 'Current Assets', nature: 'asset', level: 1, isActive: true, canReceiveEntries: false },
    { code: '2100', label: 'Inventories', nature: 'asset', level: 2, parentCode: '2000', isActive: true, canReceiveEntries: false },
    { code: '2110', label: 'Raw Materials', nature: 'asset', level: 3, parentCode: '2100', isActive: true, canReceiveEntries: true },
    { code: '2120', label: 'Work in Progress', nature: 'asset', level: 3, parentCode: '2100', isActive: true, canReceiveEntries: true },
    { code: '2130', label: 'Finished Goods', nature: 'asset', level: 3, parentCode: '2100', isActive: true, canReceiveEntries: true },
    { code: '2200', label: 'Trade and Other Receivables', nature: 'asset', level: 2, parentCode: '2000', isActive: true, canReceiveEntries: false },
    { code: '2210', label: 'Trade Receivables', nature: 'asset', level: 3, parentCode: '2200', isActive: true, canReceiveEntries: true },
    { code: '2220', label: 'Other Receivables', nature: 'asset', level: 3, parentCode: '2200', isActive: true, canReceiveEntries: true },
    { code: '2300', label: 'Cash and Cash Equivalents', nature: 'asset', level: 2, parentCode: '2000', isActive: true, canReceiveEntries: false },
    { code: '2310', label: 'Cash at Bank', nature: 'asset', level: 3, parentCode: '2300', isActive: true, canReceiveEntries: true },
    { code: '2320', label: 'Cash on Hand', nature: 'asset', level: 3, parentCode: '2300', isActive: true, canReceiveEntries: true },

    // EQUITY
    { code: '3000', label: 'Equity', nature: 'equity', level: 1, isActive: true, canReceiveEntries: false },
    { code: '3100', label: 'Share Capital', nature: 'equity', level: 2, parentCode: '3000', isActive: true, canReceiveEntries: true },
    { code: '3200', label: 'Retained Earnings', nature: 'equity', level: 2, parentCode: '3000', isActive: true, canReceiveEntries: true },
    { code: '3300', label: 'Other Reserves', nature: 'equity', level: 2, parentCode: '3000', isActive: true, canReceiveEntries: true },
    { code: '3900', label: 'Profit/Loss for the Year', nature: 'equity', level: 2, parentCode: '3000', isActive: true, canReceiveEntries: true },

    // LIABILITIES
    { code: '4000', label: 'Non-current Liabilities', nature: 'liability', level: 1, isActive: true, canReceiveEntries: false },
    { code: '4100', label: 'Long-term Borrowings', nature: 'liability', level: 2, parentCode: '4000', isActive: true, canReceiveEntries: true },
    { code: '4200', label: 'Deferred Tax Liabilities', nature: 'liability', level: 2, parentCode: '4000', isActive: true, canReceiveEntries: true },
    { code: '4300', label: 'Provisions', nature: 'liability', level: 2, parentCode: '4000', isActive: true, canReceiveEntries: true },

    { code: '5000', label: 'Current Liabilities', nature: 'liability', level: 1, isActive: true, canReceiveEntries: false },
    { code: '5100', label: 'Trade and Other Payables', nature: 'liability', level: 2, parentCode: '5000', isActive: true, canReceiveEntries: false },
    { code: '5110', label: 'Trade Payables', nature: 'liability', level: 3, parentCode: '5100', isActive: true, canReceiveEntries: true },
    { code: '5120', label: 'Other Payables', nature: 'liability', level: 3, parentCode: '5100', isActive: true, canReceiveEntries: true },
    { code: '5200', label: 'Short-term Borrowings', nature: 'liability', level: 2, parentCode: '5000', isActive: true, canReceiveEntries: true },
    { code: '5300', label: 'Current Tax Liabilities', nature: 'liability', level: 2, parentCode: '5000', isActive: true, canReceiveEntries: true },

    // INCOME
    { code: '6000', label: 'Revenue', nature: 'revenue', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'revenue' },
    { code: '6100', label: 'Sales Revenue', nature: 'revenue', level: 2, parentCode: '6000', isActive: true, canReceiveEntries: false, plCategory: 'revenue' },
    { code: '6110', label: 'Product Sales', nature: 'revenue', level: 3, parentCode: '6100', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '6120', label: 'Service Revenue', nature: 'revenue', level: 3, parentCode: '6100', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '6200', label: 'Other Operating Income', nature: 'revenue', level: 2, parentCode: '6000', isActive: true, canReceiveEntries: true, plCategory: 'revenue' },
    { code: '6900', label: 'Finance Income', nature: 'revenue', level: 2, parentCode: '6000', isActive: true, canReceiveEntries: true, plCategory: 'financial' },

    // EXPENSES
    { code: '7000', label: 'Cost of Sales', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'cogs' },
    { code: '7100', label: 'Direct Materials', nature: 'expense', level: 2, parentCode: '7000', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '7200', label: 'Direct Labor', nature: 'expense', level: 2, parentCode: '7000', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },
    { code: '7300', label: 'Manufacturing Overheads', nature: 'expense', level: 2, parentCode: '7000', isActive: true, canReceiveEntries: true, plCategory: 'cogs' },

    { code: '8000', label: 'Operating Expenses', nature: 'expense', level: 1, isActive: true, canReceiveEntries: false, plCategory: 'opex' },
    { code: '8100', label: 'Selling Expenses', nature: 'expense', level: 2, parentCode: '8000', isActive: true, canReceiveEntries: false, plCategory: 'opex' },
    { code: '8110', label: 'Marketing and Advertising', nature: 'expense', level: 3, parentCode: '8100', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '8120', label: 'Sales Commissions', nature: 'expense', level: 3, parentCode: '8100', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '8200', label: 'General and Administrative Expenses', nature: 'expense', level: 2, parentCode: '8000', isActive: true, canReceiveEntries: false, plCategory: 'opex' },
    { code: '8210', label: 'Salaries and Wages', nature: 'expense', level: 3, parentCode: '8200', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '8220', label: 'Rent and Utilities', nature: 'expense', level: 3, parentCode: '8200', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '8230', label: 'Professional Fees', nature: 'expense', level: 3, parentCode: '8200', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '8240', label: 'Insurance', nature: 'expense', level: 3, parentCode: '8200', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '8250', label: 'Office Supplies', nature: 'expense', level: 3, parentCode: '8200', isActive: true, canReceiveEntries: true, plCategory: 'opex' },
    { code: '8300', label: 'Depreciation and Amortization', nature: 'expense', level: 2, parentCode: '8000', isActive: true, canReceiveEntries: true, plCategory: 'depreciation' },

    { code: '8900', label: 'Finance Costs', nature: 'expense', level: 2, parentCode: '8000', isActive: true, canReceiveEntries: false, plCategory: 'financial' },
    { code: '8910', label: 'Interest Expense', nature: 'expense', level: 3, parentCode: '8900', isActive: true, canReceiveEntries: true, plCategory: 'financial' },
    { code: '8920', label: 'Bank Charges', nature: 'expense', level: 3, parentCode: '8900', isActive: true, canReceiveEntries: true, plCategory: 'financial' },

    { code: '9000', label: 'Income Tax Expense', nature: 'expense', level: 1, isActive: true, canReceiveEntries: true, plCategory: 'tax' },
];

export const IFRS_TEMPLATE: Omit<ChartOfAccounts, 'id' | 'createdAt'> = {
  name: 'IFRS - International Standards',
  standard: 'IFRS',
  isDefault: false,
  accounts: IFRS_ACCOUNTS.map((acc, idx) => ({
    ...acc,
    id: `ifrs_${idx}`,
    createdAt: Date.now()
  }))
};
