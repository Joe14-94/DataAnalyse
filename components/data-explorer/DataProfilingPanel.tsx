import React from 'react';
import {
    BarChart3, AlertCircle, CheckCircle, Info,
    Layers, Hash, Type, Calendar, ToggleLeft,
    Trash2, Eraser, Sparkles
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts';
import { DatasetProfile, ColumnProfile } from '../../logic/dataProfiling';
import { Button } from '../ui/Button';

interface DataProfilingPanelProps {
    profile: DatasetProfile;
    onRemoveDuplicates?: () => void;
    onHandleMissingValues?: (columnName: string, strategy: 'mean' | 'zero' | 'remove') => void;
}

const QualityGauge: React.FC<{ score: number }> = ({ score }) => {
    const color = score > 80 ? '#10b981' : score > 50 ? '#f59e0b' : '#ef4444';
    const data = [
        { name: 'Score', value: score, fill: color },
        { name: 'Remaining', value: 100 - score, fill: '#e2e8f0' }
    ];

    return (
        <div className="relative w-32 h-32 mx-auto">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        startAngle={180}
                        endAngle={-180}
                        dataKey="value"
                        stroke="none"
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color }}>{Math.round(score)}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Qualité</span>
            </div>
        </div>
    );
};

const ColumnDetail: React.FC<{ column: ColumnProfile, onAction: (columnName: string, strategy: 'mean' | 'zero' | 'remove') => void }> = ({ column, onAction }) => {
    const typeIcon = {
        number: <Hash className="w-3.5 h-3.5" />,
        text: <Type className="w-3.5 h-3.5" />,
        date: <Calendar className="w-3.5 h-3.5" />,
        boolean: <ToggleLeft className="w-3.5 h-3.5" />,
        mixed: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
    }[column.type];

    const completenessColor = column.completeness > 0.95 ? 'bg-emerald-500' : column.completeness > 0.7 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-slate-400">{typeIcon}</span>
                    <h4 className="text-sm font-bold text-slate-800 truncate" title={column.name}>{column.name}</h4>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${completenessColor}`} style={{ width: `${column.completeness * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{Math.round(column.completeness * 100)}%</span>
                </div>
            </div>

            <div className="p-3 space-y-3">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-50 p-1.5 rounded">
                        <div className="text-slate-400 uppercase font-bold mb-0.5">Cardinalité</div>
                        <div className="text-slate-700 font-black">{column.cardinality} <span className="text-[8px] font-medium text-slate-400">({Math.round(column.uniqueRatio * 100)}% uniques)</span></div>
                    </div>
                    {column.type === 'number' && (
                        <div className="bg-slate-50 p-1.5 rounded">
                            <div className="text-slate-400 uppercase font-bold mb-0.5">Moyenne</div>
                            <div className="text-slate-700 font-black">{column.stats.mean?.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</div>
                        </div>
                    )}
                    {column.type === 'text' && (
                        <div className="bg-slate-50 p-1.5 rounded">
                            <div className="text-slate-400 uppercase font-bold mb-0.5">Long. Avg</div>
                            <div className="text-slate-700 font-black">{column.stats.avgLength?.toFixed(1)} car.</div>
                        </div>
                    )}
                </div>

                {/* Distribution Chart */}
                {column.distribution && column.distribution.length > 0 && (
                    <div className="h-20 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={column.distribution} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                                <XAxis dataKey="value" hide />
                                <YAxis hide />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl border border-slate-700">
                                                    <div className="font-bold">{payload[0].payload.value}</div>
                                                    <div>Occurrences: {payload[0].value}</div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                    {column.distribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={`rgba(99, 102, 241, ${1 - index * 0.08})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Actions */}
                {column.completeness < 1 && (
                    <div className="pt-2 border-t border-slate-100 flex gap-1">
                        <button
                            onClick={() => onAction(column.name, 'zero')}
                            className="flex-1 text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 py-1 rounded transition-colors"
                        >
                            Combler (0)
                        </button>
                        <button
                            onClick={() => onAction(column.name, 'remove')}
                            className="flex-1 text-[9px] font-bold bg-red-50 hover:bg-red-100 text-red-600 py-1 rounded transition-colors"
                        >
                            Suppr. lignes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DataProfilingPanel: React.FC<DataProfilingPanelProps> = ({
    profile,
    onRemoveDuplicates,
    onHandleMissingValues
}) => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header / Global Score */}
            <div className="p-6 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-indigo-500" /> Profilage des données
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Analyse automatique de la structure et qualité</p>
                    </div>
                    {profile.qualityScore > 90 ? (
                        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-black border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Données Saines
                        </div>
                    ) : (
                        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-black border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5" /> Améliorations suggérées
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8">
                    <QualityGauge score={profile.qualityScore} />

                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Lignes</div>
                            <div className="text-lg font-black text-slate-800">{profile.rowCount.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Colonnes</div>
                            <div className="text-lg font-black text-slate-800">{profile.columnCount}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Eraser className="w-3 h-3" /> Doublons</div>
                            <div className={`text-lg font-black ${profile.duplicatesCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{profile.duplicatesCount}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Info className="w-3 h-3" /> Score</div>
                            <div className="text-lg font-black text-slate-800">{Math.round(profile.qualityScore)}/100</div>
                        </div>
                    </div>
                </div>

                {profile.duplicatesCount > 0 && (
                    <div className="mt-6 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
                            <div>
                                <div className="text-sm font-black text-amber-900">{profile.duplicatesCount} lignes en double détectées</div>
                                <div className="text-[10px] text-amber-700 font-medium">Les doublons peuvent fausser vos agrégations dans le TCD.</div>
                            </div>
                        </div>
                        <Button
                            onClick={onRemoveDuplicates}
                            variant="outline"
                            size="sm"
                            className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100 font-black"
                            icon={<Trash2 className="w-4 h-4" />}
                        >
                            Nettoyer
                        </Button>
                    </div>
                )}
            </div>

            {/* Column Profiles */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Profils par colonne</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.columns.map(col => (
                        <ColumnDetail
                            key={col.name}
                            column={col}
                            onAction={onHandleMissingValues}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
