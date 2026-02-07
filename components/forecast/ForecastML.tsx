import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Brain, TrendingUp, Sparkles, BarChart2 } from 'lucide-react';
import { ForecastVersion } from '../../types';

interface ForecastMLProps {
  selectedVersion: ForecastVersion | null;
  handleGenerateMLPredictions: (id: string) => void;
}

export const ForecastML: React.FC<ForecastMLProps> = ({
  selectedVersion,
  handleGenerateMLPredictions
}) => {
  if (!selectedVersion) {
    return (
      <div className="text-center py-12 text-slate-500">
        Sélectionnez une version pour l'analyse ML
      </div>
    );
  }

  return (
    <Card
      title="Intelligence Artificielle & ML"
      icon={<Brain className="w-5 h-5 text-purple-600" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Prédictions automatiques
          </h4>
          <p className="text-sm text-slate-600">
            Générez des prévisions basées sur vos données historiques en utilisant des modèles
            statistiques avancés (Régression linéaire, Saisonalité).
          </p>
          <Button
            onClick={() => handleGenerateMLPredictions(selectedVersion.lines[0]?.id)}
            disabled={selectedVersion.lines.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Lancer l'entraînement
          </Button>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 border border-dashed border-slate-200">
          <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">
            Insights Détectés
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <TrendingUp className="w-4 h-4 text-green-500" /> Tendance de fond : +4.2% / mois
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <BarChart2 className="w-4 h-4 text-blue-500" /> Saisonnalité forte détectée (Q4)
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
