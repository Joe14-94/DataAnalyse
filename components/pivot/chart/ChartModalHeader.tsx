import React from 'react';
import { BarChart3, ExternalLink, X } from 'lucide-react';

interface ChartModalHeaderProps {
    metadata: any;
    selectedChartType: string;
    sunburstData: any;
    onOpenInAnalytics: () => void;
    onClose: () => void;
}

export const ChartModalHeader: React.FC<ChartModalHeaderProps> = ({
    metadata,
    selectedChartType,
    sunburstData,
    onOpenInAnalytics,
    onClose
}) => {
    return (
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-purple-50">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800">Visualisation graphique</h2>
                    <p className="text-xs text-slate-500">
                        {metadata.totalDataPoints} point{metadata.totalDataPoints > 1 ? 's' : ''} de données
                        {metadata.isMultiSeries && ` | ${metadata.seriesNames.length} séries`}
                        {sunburstData && selectedChartType === 'sunburst' && ` | ${sunburstData.rings.length} niveaux`}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onOpenInAnalytics}
                    className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-brand-600 text-white rounded-lg hover:from-purple-700 hover:to-brand-700 transition-all flex items-center gap-2 shadow-sm"
                >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir dans Analytics
                </button>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>
            </div>
        </div>
    );
};
