import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Copy, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { Budget } from '../../types';

interface BudgetTemplatesProps {
  templates: any[];
  budgets: Budget[];
  onShowTemplateModal: () => void;
  onUseTemplate: (id: string) => void;
  onEditTemplate: (id: string) => void;
  onDeleteTemplate: (id: string, name: string) => void;
  showTemplateModal: boolean;
  onCloseTemplateModal: () => void;
  templateName: string;
  onSetTemplateName: (name: string) => void;
  templateDescription: string;
  onSetTemplateDescription: (desc: string) => void;
  templateCategory: string;
  onSetTemplateCategory: (cat: string) => void;
  templateSourceBudgetId: string;
  onSetTemplateSourceBudgetId: (id: string) => void;
  onCreateTemplate: () => void;
  showEditTemplateModal: boolean;
  onCloseEditTemplateModal: () => void;
  onUpdateTemplate: () => void;
  editingTemplateId: string | null;
}

export const BudgetTemplates: React.FC<BudgetTemplatesProps> = ({
  templates,
  budgets,
  onShowTemplateModal,
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
  showTemplateModal,
  onCloseTemplateModal,
  templateName,
  onSetTemplateName,
  templateDescription,
  onSetTemplateDescription,
  templateCategory,
  onSetTemplateCategory,
  templateSourceBudgetId,
  onSetTemplateSourceBudgetId,
  onCreateTemplate,
  showEditTemplateModal,
  onCloseEditTemplateModal,
  onUpdateTemplate,
  editingTemplateId
}) => {
  return (
    <Card title="Modèles budgétaires" icon={<Copy className="w-5 h-5 text-brand-600" />}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Créez des modèles réutilisables pour accélérer la création de budgets
          </p>
          <Button
            variant="outline"
            className="text-brand-600 border-brand-200"
            onClick={onShowTemplateModal}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <Copy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun modèle créé</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-slate-800">{template.name}</h4>
                  <Copy className="w-4 h-4 text-brand-600" />
                </div>
                <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-brand-600 border-brand-200"
                    onClick={() => onUseTemplate(template.id)}
                  >
                    Utiliser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-brand-600 border-brand-200"
                    onClick={() => onEditTemplate(template.id)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200"
                    onClick={() => onDeleteTemplate(template.id, template.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Creation Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Créer un modèle budgétaire</h3>
              <button
                onClick={onCloseTemplateModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => onSetTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => onSetTemplateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Budget source</label>
                <select
                  value={templateSourceBudgetId}
                  onChange={(e) => onSetTemplateSourceBudgetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- Modèle vide --</option>
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button className="w-full bg-brand-600 hover:bg-brand-700" onClick={onCreateTemplate}>
                <Plus className="w-4 h-4 mr-2" />
                Créer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Edit Modal */}
      {showEditTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Modifier le modèle</h3>
              <button
                onClick={onCloseEditTemplateModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => onSetTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => onSetTemplateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <Button className="w-full bg-brand-600 hover:bg-brand-700" onClick={onUpdateTemplate}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
