import React from 'react';
import { FileText, Edit2, GitBranch, CheckCircle, Copy, Filter, Clock } from 'lucide-react';
import { BudgetTab } from '../../hooks/useBudgetLogic';

interface BudgetTabsProps {
    activeTab: BudgetTab;
    onTabChange: (tab: BudgetTab) => void;
}

export const BudgetTabs: React.FC<BudgetTabsProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'list' as const, label: 'Mes budgets', icon: FileText },
        { id: 'editor' as const, label: 'Éditeur', icon: Edit2 },
        { id: 'comparison' as const, label: 'Comparaison', icon: GitBranch },
        { id: 'workflow' as const, label: 'Workflow', icon: CheckCircle },
        { id: 'templates' as const, label: 'Modèles', icon: Copy },
        { id: 'referentials' as const, label: 'Référentiels', icon: Filter },
        { id: 'audit' as const, label: 'Audit Trail', icon: Clock }
    ];

    return (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${
                        activeTab === tab.id
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
