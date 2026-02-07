import React, { useEffect, useContext } from 'react';
import { ShepherdTour, ShepherdTourContext } from 'react-shepherd';
import 'shepherd.js/dist/css/shepherd.css';
import { usePersistence } from '../context/PersistenceContext';

const tourOptions = {
  defaultStepOptions: {
    cancelIcon: {
      enabled: true
    },
    scrollTo: { behavior: 'smooth', block: 'center' }
  },
  useModalOverlay: true
};

interface ShepherdStep {
  id: string;
  attachTo?: { element: string; on: string };
  buttons: { classes?: string; text: string; type: string }[];
  title: string;
  text: string[];
}

const steps: ShepherdStep[] = [
  {
    id: 'intro',
    attachTo: { element: '#tour-nav-dashboard', on: 'right' },
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Passer',
        type: 'cancel'
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Suivant',
        type: 'next'
      }
    ],
    title: 'Bienvenue sur DataScope !',
    text: ['Ceci est votre tableau de bord principal. Vous y retrouverez vos KPIs et graphiques favoris.']
  },
  {
    id: 'data',
    attachTo: { element: '#tour-nav-data', on: 'right' },
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Précédent',
        type: 'back'
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Suivant',
        type: 'next'
      }
    ],
    title: 'Explorateur de données',
    text: ['Consultez et modifiez vos données brutes, ajoutez des colonnes calculées ou faites des recherches croisées.']
  },
  {
    id: 'import',
    attachTo: { element: '#tour-nav-import', on: 'right' },
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Précédent',
        type: 'back'
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Suivant',
        type: 'next'
      }
    ],
    title: 'Importation',
    text: ['Importez vos fichiers Excel, CSV ou faites un copier-coller pour commencer votre analyse.']
  },
  {
    id: 'pivot',
    attachTo: { element: '#tour-nav-pivot', on: 'right' },
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Précédent',
        type: 'back'
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Suivant',
        type: 'next'
      }
    ],
    title: 'Tableaux Croisés Dynamiques',
    text: ['Le cœur de DataScope. Créez des analyses multidimensionnelles et des comparaisons temporelles en quelques clics.']
  },
  {
    id: 'analytics',
    attachTo: { element: '#tour-nav-analytics', on: 'right' },
    buttons: [
      {
        classes: 'shepherd-button-secondary',
        text: 'Précédent',
        type: 'back'
      },
      {
        classes: 'shepherd-button-primary',
        text: 'Suivant',
        type: 'next'
      }
    ],
    title: 'Studio d\'Analyse',
    text: ['Visualisez vos tendances et snapshots avec des graphiques avancés et des détections automatiques.']
  },
  {
    id: 'finish',
    attachTo: { element: '#tour-nav-settings', on: 'right' },
    buttons: [
      {
        classes: 'shepherd-button-primary',
        text: 'Terminer',
        type: 'next'
      }
    ],
    title: 'C\'est parti !',
    text: ['Configurez vos préférences dans les paramètres et commencez à explorer vos données.']
  }
];

const TourTrigger: React.FC = () => {
  const tour = useContext(ShepherdTourContext);
  const { hasSeenOnboarding, completeOnboarding } = usePersistence();

  useEffect(() => {
    if (!hasSeenOnboarding && tour) {
      // @ts-ignore
      tour.start();

      const onComplete = () => {
        completeOnboarding();
      };

      // @ts-ignore
      tour.on('complete', onComplete);
      // @ts-ignore
      tour.on('cancel', onComplete);

      return () => {
        // @ts-ignore
        tour.off('complete', onComplete);
        // @ts-ignore
        tour.off('cancel', onComplete);
      };
    }
  }, [hasSeenOnboarding, tour, completeOnboarding]);

  return null;
};

export const OnboardingTour: React.FC = () => {
  return (
    <ShepherdTour steps={steps} tourOptions={tourOptions}>
      <TourTrigger />
    </ShepherdTour>
  );
};
