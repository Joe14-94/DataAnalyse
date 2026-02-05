
import { Dataset, ImportBatch, DashboardWidget, AppState, SavedAnalysis, PivotState, AnalyticsState, FinanceReferentials, BudgetModule, ForecastModule } from '../types';
import { generateSyntheticData, generateProjectsData, generateBudgetData, generateSalesData, generateId, APP_VERSION, compressBatch } from '../utils';

export const getDemoData = () => {
    // Dataset 1: RH
    const id1 = 'demo-rh';
    const ds1: Dataset = {
      id: id1,
      name: 'Effectifs RH',
      fields: ['Nom', 'Email', 'Organisation', 'DateModif', 'Commentaire', 'Budget', 'Quantité'],
      fieldConfigs: { 'Budget': { type: 'text' } },
      createdAt: Date.now()
    };
    const batches1 = generateSyntheticData(id1);

    // Dataset 2: Projets IT
    const id2 = 'demo-projets';
    const ds2: Dataset = {
      id: id2,
      name: 'Projets IT',
      fields: ['Projet', 'Organisation', 'Statut', 'DateDébut', 'Budget', 'Responsable', 'Priorité'],
      fieldConfigs: { 'Budget': { type: 'text' } },
      createdAt: Date.now()
    };
    const batches2 = generateProjectsData(id2);

    // Dataset 3: Budget Annuel
    const id3 = 'demo-budget';
    const ds3: Dataset = {
      id: id3,
      name: 'Budget Annuel',
      fields: ['Département', 'Organisation', 'Prévisionnel', 'Réalisé', 'Ecart', 'Trimestre'],
      fieldConfigs: { 'Prévisionnel': { type: 'text' }, 'Réalisé': { type: 'text' }, 'Ecart': { type: 'text' } },
      createdAt: Date.now()
    };
    const batches3 = generateBudgetData(id3);

    // Dataset 4: Ventes
    const id4 = 'demo-ventes';
    const ds4: Dataset = {
      id: id4,
      name: 'Ventes',
      fields: ['Produit', 'Organisation', 'Région', 'Quantité', 'Prix Unitaire', 'Montant Total', 'Date Vente', 'Commercial'],
      fieldConfigs: { 'Prix Unitaire': { type: 'text' }, 'Montant Total': { type: 'text' } },
      createdAt: Date.now()
    };
    const batches4 = generateSalesData(id4);

    const datasets = [ds1, ds2, ds3, ds4];
    const batches = [...batches1, ...batches2, ...batches3, ...batches4];
    const widgets: DashboardWidget[] = [
      { id: 'w1', title: 'Effectif Total', type: 'kpi', size: 'sm', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', showTrend: true } },
      { id: 'w2', title: 'Projets Actifs', type: 'kpi', size: 'sm', config: { source: { datasetId: id2, mode: 'latest' }, metric: 'count', showTrend: false } },
      { id: 'w3', title: 'Évolution Effectifs', type: 'chart', size: 'full', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', dimension: 'DateModif', chartType: 'line' } }
    ];

    return { datasets, batches, widgets, currentDatasetId: id1 };
};

export const createBackupJson = (state: AppState) => {
    // We compress batches for the backup as well to significantly reduce file size
    const compactState = {
        ...state,
        batches: (state.batches || []).map(b => compressBatch(b)),
        exportDate: new Date().toISOString()
    };

    // Use minimal spacing for large datasets to further reduce size
    const isLarge = compactState.batches.length > 5 ||
                    compactState.batches.some(b => b.d && b.d.length > 500);

    return JSON.stringify(compactState, null, isLarge ? 0 : 2);
};
