import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Filter, Download, Trash2, RefreshCw,
  CheckCircle, XCircle, PlusCircle, Edit3, Lock, Upload, FileDown
} from 'lucide-react';
import {
  AuditEntry, AuditModule, AuditAction,
  getAuditEntries, clearAuditEntries, exportAuditToCSV
} from '../../services/auditService';

interface AuditTrailPanelProps {
  filterEntityId?: string;
  filterModule?: AuditModule;
}

// ─── French labels for actions ───────────────────────────────────────────────
const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Créé',
  update: 'Modifié',
  delete: 'Supprimé',
  submit: 'Soumis',
  validate: 'Validé',
  reject: 'Rejeté',
  lock: 'Verrouillé',
  import: 'Importé',
  export: 'Exporté',
  add_line: 'Ligne ajoutée',
  delete_line: 'Ligne supprimée',
  add_version: 'Version ajoutée',
  use_template: 'Modèle appliqué',
};

// ─── Module badge colors ──────────────────────────────────────────────────────
const MODULE_BADGE: Record<AuditModule, string> = {
  budget: 'bg-blue-100 text-blue-700',
  forecast: 'bg-teal-100 text-teal-700',
  referential: 'bg-purple-100 text-purple-700',
  dataset: 'bg-green-100 text-green-700',
  dashboard: 'bg-orange-100 text-orange-700',
};

// ─── Timeline dot color per action ───────────────────────────────────────────
function getDotColor(action: AuditAction): string {
  if (['create', 'validate'].includes(action)) return 'bg-green-500';
  if (['delete', 'reject'].includes(action)) return 'bg-red-500';
  if (['update', 'submit'].includes(action)) return 'bg-blue-500';
  if (['import', 'export'].includes(action)) return 'bg-orange-500';
  return 'bg-gray-400';
}

// ─── Action icon ─────────────────────────────────────────────────────────────
function ActionIcon({ action }: { action: AuditAction }) {
  const cls = 'w-4 h-4 flex-shrink-0';
  switch (action) {
    case 'validate': return <CheckCircle className={cls} />;
    case 'reject': return <XCircle className={cls} />;
    case 'create':
    case 'add_line': return <PlusCircle className={cls} />;
    case 'update': return <Edit3 className={cls} />;
    case 'lock': return <Lock className={cls} />;
    case 'import': return <Upload className={cls} />;
    case 'export': return <FileDown className={cls} />;
    default: return <Clock className={cls} />;
  }
}

// ─── Format timestamp ─────────────────────────────────────────────────────────
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AuditTrailPanel: React.FC<AuditTrailPanelProps> = ({
  filterEntityId,
  filterModule,
}) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<AuditModule | ''>('');
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('');
  const [searchText, setSearchText] = useState('');
  const [clearPending, setClearPending] = useState(false);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAuditEntries({
        module: filterModule,
        entityId: filterEntityId,
        limit: 200,
      });
      setEntries(data);
    } finally {
      setIsLoading(false);
    }
  }, [filterModule, filterEntityId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Apply local filters on top of fetched entries
  const filtered = entries.filter(entry => {
    if (selectedModule && entry.module !== selectedModule) return false;
    if (selectedAction && entry.action !== selectedAction) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const matchName = entry.entityName?.toLowerCase().includes(q);
      const matchDetails = entry.details?.toLowerCase().includes(q);
      if (!matchName && !matchDetails) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const csv = exportAuditToCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearOld = async () => {
    if (!clearPending) {
      setClearPending(true);
      return;
    }
    // Second click = confirmed
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    await clearAuditEntries(thirtyDaysMs);
    setClearPending(false);
    loadEntries();
  };

  const allModules: AuditModule[] = ['budget', 'forecast', 'referential', 'dataset', 'dashboard'];
  const allActions: AuditAction[] = [
    'create', 'update', 'delete', 'submit', 'validate', 'reject',
    'lock', 'import', 'export', 'add_line', 'delete_line', 'add_version', 'use_template',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-800">Audit Trail</h2>
          {!isLoading && (
            <span className="text-sm text-slate-500">({filtered.length} entrée{filtered.length !== 1 ? 's' : ''})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => { setClearPending(false); loadEntries(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exporter en CSV"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>

          {/* Clear old entries */}
          <button
            onClick={handleClearOld}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              clearPending
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
            title="Supprimer les entrées de plus de 30 jours"
          >
            <Trash2 className="w-4 h-4" />
            {clearPending ? 'Confirmer la suppression' : 'Supprimer > 30 j'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filtres :</span>
        </div>

        {/* Module dropdown — only show if no fixed filterModule prop */}
        {!filterModule && (
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value as AuditModule | '')}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les modules</option>
            {allModules.map(m => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        )}

        {/* Action dropdown */}
        <select
          value={selectedAction}
          onChange={e => setSelectedAction(e.target.value as AuditAction | '')}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes les actions</option>
          {allActions.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>

        {/* Text search */}
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Rechercher (nom, détails)..."
          className="text-sm border border-slate-300 rounded-lg px-3 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-40"
        />

        {(selectedModule || selectedAction || searchText) && (
          <button
            onClick={() => { setSelectedModule(''); setSelectedAction(''); setSearchText(''); }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Chargement de l'historique...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Clock className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base font-medium">Aucune entrée d'audit</p>
          <p className="text-sm mt-1">Les actions sur les budgets apparaitront ici.</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-200" aria-hidden="true" />

          {filtered.map((entry, idx) => (
            <div key={entry.id} className={`relative flex gap-4 pb-4 ${idx === filtered.length - 1 ? '' : ''}`}>
              {/* Dot */}
              <div className="relative z-10 mt-1 flex-shrink-0">
                <span className={`flex items-center justify-center w-9 h-9 rounded-full ${getDotColor(entry.action)} shadow-sm`}>
                  <span className="text-white">
                    <ActionIcon action={entry.action} />
                  </span>
                </span>
              </div>

              {/* Card */}
              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Module badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${MODULE_BADGE[entry.module]}`}>
                      {entry.module}
                    </span>

                    {/* Entity name + action */}
                    <span className="text-sm font-semibold text-slate-800">
                      {entry.entityName}
                    </span>
                    <span className="text-sm text-slate-500">
                      — {ACTION_LABELS[entry.action]}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>

                {/* Details */}
                {entry.details && (
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    {entry.details}
                  </p>
                )}

                {/* UserId if present */}
                {entry.userId && (
                  <p className="mt-1 text-xs text-slate-400">Par : {entry.userId}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
