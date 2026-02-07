import React from 'react';
import { Card } from '../ui/Card';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { ReconciliationReport } from '../../types';

interface ForecastReconciliationProps {
  reconciliationReports: ReconciliationReport[];
}

export const ForecastReconciliation: React.FC<ForecastReconciliationProps> = ({
  reconciliationReports
}) => {
  return (
    <Card
      title="Réconciliation & Variance"
      icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Comparez vos prévisions avec les données réelles (Actuals) et mesurez la précision.
        </p>

        {reconciliationReports.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase">Aucun rapport disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reconciliationReports.map((report) => (
              <div
                key={report.id}
                className="p-4 border rounded-lg hover:border-brand-300 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold">{report.name}</h4>
                  <span
                    className={`text-xs font-black px-2 py-1 rounded ${report.accuracyScore >= 90 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    Précision: {report.accuracyScore}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold">MAPE:</span> {report.mape.toFixed(2)}%{' '}
                  <ArrowRight className="w-3 h-3" /> <span className="font-bold">RMSE:</span>{' '}
                  {report.rmse.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
