import React from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface BudgetHeaderProps {
    onCreateBudget: () => void;
}

export const BudgetHeader: React.FC<BudgetHeaderProps> = ({ onCreateBudget }) => {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <DollarSign className="w-7 h-7 text-brand-600" />
                    Module Budgétaire
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                    Gérez vos budgets, versions, scénarios et workflow de validation
                </p>
            </div>
            <Button
                className="bg-brand-600 hover:bg-brand-700"
                onClick={onCreateBudget}
            >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau budget
            </Button>
        </div>
    );
};
