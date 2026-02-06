import { ImportBatch, DataRow } from '../types';
import { generateId } from './common';

// Données partagées pour les jointures
const ORGS_LIST = ['TechCorp', 'Innovate SA', 'Global Services', 'Alpha Solutions', 'Mairie de Paris', 'Ministère Intérieur', 'CyberDefense Ltd', 'Green Energy', 'Transport Express', 'Banque Populaire'];

/**
 * Génère des données synthétiques (RH)
 */
export const generateSyntheticData = (datasetId: string = 'demo'): ImportBatch[] => {
  const firstNames = ['Pierre', 'Paul', 'Jacques', 'Marie', 'Sophie', 'Isabelle', 'Thomas', 'Lucas', 'Nicolas', 'Julien', 'Camille', 'Antoine', 'Sarah', 'Alexandre', 'Manon', 'Emma', 'Chloé', 'Inès'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand'];
  const domains = ['gmail.com', 'outlook.com', 'techcorp.com', 'innovate.fr', 'gouv.fr', 'cyber-defense.eu', 'energy.com'];

  const batches: ImportBatch[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(15);

    const dateStr = date.toISOString().split('T')[0];
    const baseCount = 65 + (5 - i) * 6 + (Math.random() * 15);
    const rowCount = Math.floor(baseCount);
    const rows: DataRow[] = [];

    for (let j = 0; j < rowCount; j++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

      let orgIndex = Math.floor(Math.random() * 6);
      if (i === 0) orgIndex = Math.floor(Math.random() * ORGS_LIST.length);

      let domain = domains[0];
      if (orgIndex === 0) domain = 'techcorp.com';
      else if (orgIndex === 1) domain = 'innovate.fr';
      else if (orgIndex > 3) domain = 'gouv.fr';

      const hasComment = Math.random() > 0.3;
      const lastChangeDate = new Date(date);
      lastChangeDate.setDate(lastChangeDate.getDate() - Math.floor(Math.random() * 60));
      const amount = Math.floor(Math.random() * 1400) + 150;

      rows.push({
        id: `REF-${(10 - i)}-${j.toString().padStart(4, '0')}`,
        'Nom': `${firstName} ${lastName}`,
        'Email': `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        'Organisation': ORGS_LIST[orgIndex],
        'DateModif': lastChangeDate.toISOString().split('T')[0],
        'Commentaire': hasComment,
        'Budget': `${amount} k€`,
        'Quantité': Math.floor(Math.random() * 25) + 1
      });
    }

    batches.push({
      id: generateId(),
      datasetId: datasetId,
      date: dateStr,
      createdAt: Date.now() - (i * 30 * 24 * 60 * 60 * 1000),
      rows
    });
  }
  return batches;
};

/**
 * Génère des données de projets IT avec des clés communes (Organisation)
 */
export const generateProjectsData = (datasetId: string): ImportBatch[] => {
  const projectNames = [
    'Migration Cloud', 'Refonte CRM', 'Cybersécurité', 'Dashboard Analytics',
    'Formation DevOps', 'API Gateway', 'Application Mobile', 'Infrastructure Azure',
    'Data Lake', 'Automatisation RH', 'Plateforme E-commerce', 'Business Intelligence'
  ];
  const statuses = ['Planifié', 'En cours', 'En pause', 'Terminé', 'Annulé'];
  const responsables = ['Pierre Martin', 'Sophie Bernard', 'Thomas Dubois', 'Marie Laurent', 'Lucas Moreau', 'Antoine Simon', 'Sarah Michel'];

  const batches: ImportBatch[] = [];

  for (let i = 2; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i * 2);
    const dateStr = date.toISOString().split('T')[0];

    const rows: DataRow[] = [];
    const projectCount = 8 + Math.floor(Math.random() * 5);

    for (let j = 0; j < projectCount; j++) {
      const org = ORGS_LIST[Math.floor(Math.random() * ORGS_LIST.length)];
      const projectName = projectNames[j % projectNames.length];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const budget = (50 + Math.floor(Math.random() * 450)) + ' k€';
      const responsable = responsables[Math.floor(Math.random() * responsables.length)];

      const startDate = new Date(date);
      startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12));

      rows.push({
        id: generateId(),
        'Projet': projectName,
        'Organisation': org,
        'Statut': status,
        'DateDébut': startDate.toISOString().split('T')[0],
        'Budget': budget,
        'Responsable': responsable,
        'Priorité': ['Haute', 'Moyenne', 'Basse'][Math.floor(Math.random() * 3)]
      });
    }

    batches.push({
      id: generateId(),
      datasetId,
      date: dateStr,
      createdAt: Date.now() - (i * 60 * 24 * 60 * 60 * 1000),
      rows
    });
  }

  return batches;
};

/**
 * Génère des données budgétaires avec clés communes (Organisation)
 */
export const generateBudgetData = (datasetId: string): ImportBatch[] => {
  const departments = ['IT', 'RH', 'Marketing', 'Commercial', 'Finance', 'Juridique', 'R&D'];
  const batches: ImportBatch[] = [];

  for (let quarter = 0; quarter < 4; quarter++) {
    const date = new Date(2024, quarter * 3, 1);
    const dateStr = date.toISOString().split('T')[0];
    const quarterLabel = `Q${quarter + 1} 2024`;

    const rows: DataRow[] = [];

    for (let i = 0; i < 6; i++) {
      const org = ORGS_LIST[i];
      const deptsCount = 3 + Math.floor(Math.random() * 3);

      for (let j = 0; j < deptsCount; j++) {
        const dept = departments[j % departments.length];
        const previsionnel = 100 + Math.floor(Math.random() * 500);
        const realise = previsionnel + Math.floor((Math.random() - 0.5) * 60);
        const ecart = realise - previsionnel;

        rows.push({
          id: generateId(),
          'Département': dept,
          'Organisation': org,
          'Prévisionnel': `${previsionnel} k€`,
          'Réalisé': `${realise} k€`,
          'Ecart': `${ecart >= 0 ? '+' : ''}${ecart} k€`,
          'Trimestre': quarterLabel
        });
      }
    }

    batches.push({
      id: generateId(),
      datasetId,
      date: dateStr,
      createdAt: Date.now() - ((3 - quarter) * 90 * 24 * 60 * 60 * 1000),
      rows
    });
  }

  return batches;
};

/**
 * Génère des données de ventes avec produits et organisations
 */
export const generateSalesData = (datasetId: string): ImportBatch[] => {
  const products = ['Licence Pro', 'Licence Standard', 'Support Premium', 'Support Basic', 'Formation', 'Consulting'];
  const regions = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];

  const batches: ImportBatch[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const dateStr = date.toISOString().split('T')[0];

    const rows: DataRow[] = [];
    const salesCount = 20 + Math.floor(Math.random() * 30);

    for (let j = 0; j < salesCount; j++) {
      const org = ORGS_LIST[Math.floor(Math.random() * ORGS_LIST.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = 1 + Math.floor(Math.random() * 50);
      const unitPrice = product.includes('Premium') ? 500 : (product.includes('Licence') ? 200 : 150);
      const total = quantity * unitPrice;
      const region = regions[Math.floor(Math.random() * regions.length)];

      const saleDate = new Date(date);
      saleDate.setDate(Math.floor(Math.random() * 28) + 1);

      rows.push({
        id: generateId(),
        'Produit': product,
        'Organisation': org,
        'Région': region,
        'Quantité': quantity,
        'Prix Unitaire': `${unitPrice} €`,
        'Montant Total': `${total} €`,
        'Date Vente': saleDate.toISOString().split('T')[0],
        'Commercial': ['Alice Dupont', 'Bob Martin', 'Claire Durand', 'David Leroy'][Math.floor(Math.random() * 4)]
      });
    }

    batches.push({
      id: generateId(),
      datasetId,
      date: dateStr,
      createdAt: Date.now() - (i * 30 * 24 * 60 * 60 * 1000),
      rows
    });
  }

  return batches;
};
