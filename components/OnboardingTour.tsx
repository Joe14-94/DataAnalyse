
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { Button } from './ui/Button';
import { ArrowRight, Check, Database, PieChart, Upload } from 'lucide-react';

interface Step {
  targetId?: string;
  title: string;
  content: string;
  position?: 'right' | 'bottom' | 'top' | 'left' | 'center';
  icon?: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Bienvenue sur DataScope !",
    content: "Une solution 100% locale pour analyser et visualiser vos données Excel et CSV sans serveur.",
    position: 'center',
    icon: <Database className="w-8 h-8 text-brand-500" />
  },
  {
    targetId: 'tour-dataset-selector',
    title: "Vos Typologies",
    content: "Commencez ici ! Sélectionnez un tableau existant ou créez-en un nouveau (Ex: Ventes, RH).",
    position: 'right'
  },
  {
    targetId: 'tour-nav-import',
    title: "Importation",
    content: "Alimentez vos tableaux en important vos fichiers Excel/CSV via glisser-déposer.",
    position: 'right',
    icon: <Upload className="w-5 h-5 text-brand-500" />
  },
  {
    targetId: 'tour-nav-dashboard',
    title: "Tableau de Bord",
    content: "Visualisez vos indicateurs clés. Vous pouvez créer, redimensionner et déplacer vos widgets.",
    position: 'right'
  },
  {
    targetId: 'tour-nav-analytics',
    title: "Analyses Avancées",
    content: "Créez des graphiques sur mesure et sauvegardez vos vues pour plus tard.",
    position: 'right',
    icon: <PieChart className="w-5 h-5 text-brand-500" />
  }
];

export const OnboardingTour: React.FC = () => {
  const { hasSeenOnboarding, completeOnboarding, isLoading } = useData();
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const stepData = STEPS[currentStep];

  useEffect(() => {
    // Condition logic inside the effect
    if (isLoading || hasSeenOnboarding) return;

    const updatePosition = () => {
      if (stepData.targetId) {
        const el = document.getElementById(stepData.targetId);
        if (el) {
          setRect(el.getBoundingClientRect());
        } else {
          // If element not found, default to center fallback or skip
          setRect(null); 
        }
      } else {
        setRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    // Petit delai pour laisser le DOM se rendre
    const timer = setTimeout(updatePosition, 100);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timer);
    };
  }, [currentStep, stepData?.targetId, isLoading, hasSeenOnboarding]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 9999,
    width: '320px',
  };

  // Safe early return ONLY after all hooks
  if (isLoading || hasSeenOnboarding) return null;

  if (rect && stepData.targetId) {
    // Position logic
    const padding = 12;
    if (stepData.position === 'right') {
        popoverStyle.left = rect.right + padding;
        popoverStyle.top = rect.top;
    } else if (stepData.position === 'bottom') {
        popoverStyle.left = rect.left;
        popoverStyle.top = rect.bottom + padding;
    } else {
        // Fallback centerish
        popoverStyle.left = rect.right + padding;
        popoverStyle.top = rect.top;
    }
  } else {
    // Center modal style
    popoverStyle.top = '50%';
    popoverStyle.left = '50%';
    popoverStyle.transform = 'translate(-50%, -50%)';
  }

  // --- RENDER ---
  return createPortal(
    <div className="fixed inset-0 z-[9998] overflow-hidden pointer-events-auto">
      
      {/* 1. BACKDROP WITH CUTOUT (SPOTLIGHT) */}
      <div className="absolute inset-0 bg-slate-900/60 transition-colors duration-500">
         {rect && (
            <div 
               className="absolute bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] rounded transition-all duration-300 ease-in-out border-2 border-white/50"
               style={{
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8
               }}
            />
         )}
      </div>

      {/* 2. POPOVER CARD */}
      <div 
        className="bg-white rounded-xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-300"
        style={popoverStyle}
      >
         <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
               {stepData.icon && <div className="p-2 bg-brand-50 rounded-full">{stepData.icon}</div>}
               <h3 className="font-bold text-slate-800 text-lg">{stepData.title}</h3>
            </div>
            <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
               {currentStep + 1} / {STEPS.length}
            </div>
         </div>
         
         <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {stepData.content}
         </p>

         <div className="flex justify-between items-center pt-2">
            <button 
               onClick={handleSkip}
               className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 hover:bg-slate-50 rounded transition-colors"
            >
               Passer le tour
            </button>
            <Button onClick={handleNext} size="sm" className="shadow-lg">
               {currentStep === STEPS.length - 1 ? (
                  <>C'est parti ! <Check className="w-4 h-4 ml-2" /></>
               ) : (
                  <>Suivant <ArrowRight className="w-4 h-4 ml-2" /></>
               )}
            </Button>
         </div>
      </div>

    </div>,
    document.body
  );
};
