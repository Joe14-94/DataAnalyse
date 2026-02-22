import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, Hash, ChevronDown, ChevronUp, X } from 'lucide-react';
import { DataRow } from '../../types/common';
import { FieldConfig } from '../../types/dataset';
import { profileDataset, DatasetProfile, FieldProfile } from '../../logic/dataProfiling';
import { CHART_COLORS } from '../../utils/constants';

interface DataProfilingPanelProps {
  rows: DataRow[];
  fields: string[];
  fieldConfigs?: Record<string, FieldConfig>;
  onClose: () => void;
}

function completudeColor(value: number): string {
  if (value > 90) return 'bg-green-500';
  if (value > 70) return 'bg-yellow-400';
  return 'bg-red-500';
}

function completudeTextColor(value: number): string {
  if (value > 90) return 'text-green-600';
  if (value > 70) return 'text-yellow-600';
  return 'text-red-600';
}

function typeBadgeClass(type: FieldProfile['type']): string {
  switch (type) {
    case 'number': return 'bg-blue-100 text-blue-700';
    case 'date': return 'bg-purple-100 text-purple-700';
    case 'boolean': return 'bg-teal-100 text-teal-700';
    case 'mixed': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function fmt(n: number | undefined): string {
  if (n === undefined) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toFixed(2).replace(/\.?0+$/, '') || '0';
}

interface FieldCardProps {
  fp: FieldProfile;
}

const FieldCard: React.FC<FieldCardProps> = ({ fp }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Card header — always visible */}
      <div className="flex items-center justify-between px-4 py-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-800 text-sm truncate">{fp.field}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${typeBadgeClass(fp.type)}`}>
            {fp.type}
          </span>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-shrink-0 p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label={expanded ? 'Réduire' : 'Développer'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Completude bar — always visible */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Complétude</span>
          <span className={`text-xs font-bold ${completudeTextColor(fp.completude)}`}>
            {fp.completude.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${completudeColor(fp.completude)}`}
            style={{ width: `${fp.completude}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {fp.nullCount} valeur{fp.nullCount !== 1 ? 's' : ''} manquante{fp.nullCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {/* Cardinality */}
          <div className="text-xs text-slate-600">
            <Hash className="w-3 h-3 inline mr-1 text-slate-400" />
            <span className="font-semibold">{fp.uniqueCount}</span> valeurs uniques /{' '}
            <span className="font-semibold">{fp.totalCount}</span> total{' '}
            <span className="text-slate-400">({(fp.cardinalityRatio * 100).toFixed(1)}%)</span>
          </div>

          {/* Numeric stats */}
          {fp.type === 'number' && fp.min !== undefined && (
            <>
              <div className="grid grid-cols-5 gap-1 text-center">
                {[
                  { label: 'Min', value: fmt(fp.min) },
                  { label: 'Max', value: fmt(fp.max) },
                  { label: 'Moy.', value: fmt(fp.avg) },
                  { label: 'Méd.', value: fmt(fp.median) },
                  { label: 'σ', value: fmt(fp.stddev) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded p-1.5">
                    <div className="text-[10px] text-slate-400 font-medium">{label}</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>

              {/* Distribution chart */}
              {fp.distribution && fp.distribution.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-400 mb-1 font-medium uppercase tracking-wide">Distribution</div>
                  <ResponsiveContainer width="100%" height={60}>
                    <BarChart data={fp.distribution} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Bar dataKey="count" isAnimationActive={false}>
                        {fp.distribution.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                      <Tooltip
                        contentStyle={{ fontSize: 11, padding: '4px 8px' }}
                        formatter={(value: number) => [value, 'Occurrences']}
                        labelFormatter={(label: string) => `Bin: ${label}`}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Outliers */}
              {fp.outliers && fp.outliers.length > 0 && (
                <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    <span className="font-semibold">{fp.outliers.length} valeur{fp.outliers.length !== 1 ? 's' : ''} aberrante{fp.outliers.length !== 1 ? 's' : ''}</span>
                    {' '}(ex : {fp.outliers.slice(0, 3).map(fmt).join(', ')})
                  </div>
                </div>
              )}
            </>
          )}

          {/* Text top values */}
          {(fp.type === 'text' || fp.type === 'date' || fp.type === 'mixed') && fp.topValues && fp.topValues.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Valeurs les plus fréquentes</div>
              <div className="flex flex-wrap gap-1.5">
                {fp.topValues.map(({ value, count }) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full border border-slate-200"
                    title={value}
                  >
                    <span className="max-w-[120px] truncate">{value}</span>
                    <span className="text-slate-400 font-semibold">({count})</span>
                  </span>
                ))}
              </div>
              {fp.avgLength !== undefined && fp.avgLength > 0 && (
                <div className="mt-1.5 text-xs text-slate-400">
                  Longueur moyenne : <span className="font-semibold text-slate-600">{fp.avgLength.toFixed(1)}</span> caractères
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DataProfilingPanel: React.FC<DataProfilingPanelProps> = ({
  rows,
  fields,
  fieldConfigs,
  onClose,
}) => {
  const profile: DatasetProfile = useMemo(
    () => profileDataset(rows, fields, fieldConfigs),
    [rows, fields, fieldConfigs]
  );

  const globalCompletudeBg = profile.overallCompletude > 90
    ? 'text-green-600'
    : profile.overallCompletude > 70
    ? 'text-yellow-600'
    : 'text-red-600';

  const duplicateColor = profile.duplicateRowCount === 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-bold text-slate-800">Profil de qualité</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total rows */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Total lignes</div>
            <div className="text-2xl font-bold text-slate-800">{profile.totalRows.toLocaleString('fr-FR')}</div>
          </div>

          {/* Completude globale */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Complétude globale</div>
            <div className={`text-2xl font-bold ${globalCompletudeBg}`}>
              {profile.overallCompletude.toFixed(1)}%
            </div>
          </div>

          {/* Doublons */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Doublons</div>
            <div className={`text-2xl font-bold ${duplicateColor} flex items-center gap-1.5`}>
              {profile.duplicateRowCount === 0
                ? <CheckCircle2 className="w-5 h-5" />
                : <AlertTriangle className="w-5 h-5" />}
              {profile.duplicateRowCount.toLocaleString('fr-FR')}
            </div>
          </div>

          {/* Nb colonnes */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Nb colonnes</div>
            <div className="text-2xl font-bold text-slate-800">{profile.totalFields}</div>
          </div>
        </div>

        {/* Field profiles */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
            Profil par colonne
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {profile.fields.map(fp => (
              <FieldCard key={fp.field} fp={fp} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
