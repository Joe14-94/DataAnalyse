import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Copy, Plus, Edit2, Trash2 } from 'lucide-react';
import { BudgetTemplate } from '../../types';

interface BudgetTemplatesProps {
    templates: BudgetTemplate[];
    onShowCreate: () => void;
    onUseTemplate: (id: string) => void;
    onEditTemplate: (id: string) => void;
    onDeleteTemplate: (id: string, name: string) => void;
}

export const BudgetTemplates: React.FC<BudgetTemplatesProps> = ({
    templates,
    onShowCreate,
    onUseTemplate,
    onEditTemplate,
    onDeleteTemplate
}) => {
    return (
        <Card title="Modèles budgétaires" icon={<Copy className="w-5 h-5 text-brand-600" />}>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">Créez des modèles réutilisables pour accélérer la création de budgets</p>
                    <Button variant="outline" className="text-brand-600 border-brand-200" onClick={onShowCreate}>
                        <Plus className="w-4 h-4 mr-2" /> Nouveau modèle
                    </Button>
                </div>

                {templates.length === 0 ? (
                    <div className="text-center py-12">
                        <Copy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun modèle créé</h3>
                        <p className="text-sm text-slate-600">Les modèles permettent de standardiser vos processus budgétaires</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(template => (
                            <div key={template.id} className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                    <h4 className="font-bold text-slate-800">{template.name}</h4>
                                    <Copy className="w-4 h-4 text-brand-600" />
                                </div>
                                {template.description && <p className="text-sm text-slate-600 mb-3">{template.description}</p>}
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                    <span>{template.accountCodes.length} comptes</span>
                                    {template.category && <><span>•</span><span>{template.category}</span></>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 text-brand-600 border-brand-200" onClick={() => onUseTemplate(template.id)}>Utiliser ce modèle</Button>
                                    <Button variant="outline" size="sm" className="text-brand-600 border-brand-200" onClick={() => onEditTemplate(template.id)}><Edit2 className="w-4 h-4" /></Button>
                                    <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => onDeleteTemplate(template.id, template.name)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};
