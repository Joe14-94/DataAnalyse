import React, { createContext, useContext, ReactNode } from 'react';
import {
    Budget,
    BudgetVersion,
    BudgetLine,
    BudgetTemplate,
    BudgetComment,
    BudgetNotification,
    BudgetModule,
    BudgetStatus,
    BudgetScenario,
    BudgetVersionComparison
} from '../types';
import { generateId } from '../utils';

interface BudgetContextType {
    // Budgets
    budgets: Budget[];
    addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateBudget: (id: string, updates: Partial<Budget>) => void;
    deleteBudget: (id: string) => void;
    getBudget: (id: string) => Budget | undefined;
    getBudgetsByFiscalYear: (year: number) => Budget[];

    // Versions
    addVersion: (budgetId: string, version: Omit<BudgetVersion, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateVersion: (budgetId: string, versionId: string, updates: Partial<BudgetVersion>) => void;
    deleteVersion: (budgetId: string, versionId: string) => void;
    setActiveVersion: (budgetId: string, versionId: string) => void;
    duplicateVersion: (budgetId: string, versionId: string, newName: string) => void;
    compareVersions: (budgetId: string, version1Id: string, version2Id: string) => BudgetVersionComparison | null;

    // Lignes budgétaires
    addLine: (budgetId: string, versionId: string, line: Omit<BudgetLine, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateLine: (budgetId: string, versionId: string, lineId: string, updates: Partial<BudgetLine>) => void;
    deleteLine: (budgetId: string, versionId: string, lineId: string) => void;
    updateLineValue: (budgetId: string, versionId: string, lineId: string, periodId: string, value: number) => void;

    // Workflow
    submitVersion: (budgetId: string, versionId: string, submittedBy: string) => void;
    validateVersion: (budgetId: string, versionId: string, validatedBy: string) => void;
    rejectVersion: (budgetId: string, versionId: string, rejectedBy: string, reason: string) => void;
    lockBudget: (budgetId: string) => void;
    unlockBudget: (budgetId: string) => void;

    // Templates
    templates: BudgetTemplate[];
    addTemplate: (template: Omit<BudgetTemplate, 'id' | 'createdAt'>) => void;
    updateTemplate: (id: string, updates: Partial<BudgetTemplate>) => void;
    deleteTemplate: (id: string) => void;
    createBudgetFromTemplate: (templateId: string, name: string, fiscalYear: number) => Budget | null;

    // Commentaires
    comments: BudgetComment[];
    addComment: (comment: Omit<BudgetComment, 'id' | 'createdAt'>) => void;
    resolveComment: (commentId: string) => void;
    getCommentsByBudget: (budgetId: string, versionId?: string) => BudgetComment[];

    // Notifications
    notifications: BudgetNotification[];
    addNotification: (notification: Omit<BudgetNotification, 'id' | 'sentAt'>) => void;
    markNotificationRead: (notificationId: string) => void;
    getUnreadNotifications: () => BudgetNotification[];

    // Import/Export
    exportBudgetToExcel: (budgetId: string, versionId: string) => void;
    importBudgetFromExcel: (budgetId: string, versionId: string, data: any) => void;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

interface BudgetProviderProps {
    children: ReactNode;
    budgetModule: BudgetModule;
    onUpdate: (budgetModule: BudgetModule) => void;
}

export const BudgetProvider: React.FC<BudgetProviderProps> = ({
    children,
    budgetModule,
    onUpdate
}) => {
    const budgets = budgetModule.budgets || [];
    const templates = budgetModule.templates || [];
    const comments = budgetModule.comments || [];
    const notifications = budgetModule.notifications || [];

    // --- BUDGETS ---
    const addBudget = (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newBudget: Budget = {
            ...budget,
            id: generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        onUpdate({
            ...budgetModule,
            budgets: [...budgets, newBudget]
        });
    };

    const updateBudget = (id: string, updates: Partial<Budget>) => {
        onUpdate({
            ...budgetModule,
            budgets: budgets.map(budget =>
                budget.id === id
                    ? { ...budget, ...updates, updatedAt: Date.now() }
                    : budget
            )
        });
    };

    const deleteBudget = (id: string) => {
        onUpdate({
            ...budgetModule,
            budgets: budgets.filter(budget => budget.id !== id),
            comments: comments.filter(c => c.budgetId !== id),
            notifications: notifications.filter(n => n.budgetId !== id)
        });
    };

    const getBudget = (id: string): Budget | undefined => {
        return budgets.find(b => b.id === id);
    };

    const getBudgetsByFiscalYear = (year: number): Budget[] => {
        return budgets.filter(b => b.fiscalYear === year);
    };

    // --- VERSIONS ---
    const addVersion = (budgetId: string, version: Omit<BudgetVersion, 'id' | 'createdAt' | 'updatedAt'>) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        const newVersion: BudgetVersion = {
            ...version,
            id: generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        updateBudget(budgetId, {
            versions: [...budget.versions, newVersion],
            activeVersionId: budget.versions.length === 0 ? newVersion.id : budget.activeVersionId
        });
    };

    const updateVersion = (budgetId: string, versionId: string, updates: Partial<BudgetVersion>) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        updateBudget(budgetId, {
            versions: budget.versions.map(v =>
                v.id === versionId
                    ? { ...v, ...updates, updatedAt: Date.now() }
                    : v
            )
        });
    };

    const deleteVersion = (budgetId: string, versionId: string) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        const newVersions = budget.versions.filter(v => v.id !== versionId);
        updateBudget(budgetId, {
            versions: newVersions,
            activeVersionId: budget.activeVersionId === versionId
                ? (newVersions[0]?.id || undefined)
                : budget.activeVersionId
        });
    };

    const setActiveVersion = (budgetId: string, versionId: string) => {
        updateBudget(budgetId, { activeVersionId: versionId });
    };

    const duplicateVersion = (budgetId: string, versionId: string, newName: string) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        const sourceVersion = budget.versions.find(v => v.id === versionId);
        if (!sourceVersion) return;

        const newVersion: BudgetVersion = {
            ...sourceVersion,
            id: generateId(),
            versionNumber: budget.versions.length + 1,
            name: newName,
            status: 'draft',
            isActive: false,
            submittedBy: undefined,
            submittedAt: undefined,
            validatedBy: undefined,
            validatedAt: undefined,
            rejectionReason: undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lines: sourceVersion.lines.map(line => ({
                ...line,
                id: generateId()
            }))
        };

        updateBudget(budgetId, {
            versions: [...budget.versions, newVersion]
        });
    };

    const compareVersions = (budgetId: string, version1Id: string, version2Id: string): BudgetVersionComparison | null => {
        const budget = getBudget(budgetId);
        if (!budget) return null;

        const v1 = budget.versions.find(v => v.id === version1Id);
        const v2 = budget.versions.find(v => v.id === version2Id);
        if (!v1 || !v2) return null;

        const differences: BudgetVersionComparison['differences'] = [];

        // Compare all lines and periods
        const allLineIds = new Set([...v1.lines.map(l => l.id), ...v2.lines.map(l => l.id)]);

        allLineIds.forEach(lineId => {
            const line1 = v1.lines.find(l => l.id === lineId);
            const line2 = v2.lines.find(l => l.id === lineId);

            if (!line1 || !line2) return;

            const allPeriods = new Set([
                ...Object.keys(line1.periodValues),
                ...Object.keys(line2.periodValues)
            ]);

            allPeriods.forEach(periodId => {
                const val1 = line1.periodValues[periodId] || 0;
                const val2 = line2.periodValues[periodId] || 0;

                if (val1 !== val2) {
                    differences.push({
                        lineId,
                        accountCode: line1.accountCode,
                        periodId,
                        value1: val1,
                        value2: val2,
                        variance: val2 - val1,
                        variancePercent: val1 !== 0 ? ((val2 - val1) / val1) * 100 : 0
                    });
                }
            });
        });

        return {
            version1: v1,
            version2: v2,
            differences
        };
    };

    // --- LIGNES ---
    const addLine = (budgetId: string, versionId: string, line: Omit<BudgetLine, 'id' | 'createdAt' | 'updatedAt'>) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        const newLine: BudgetLine = {
            ...line,
            id: generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        updateVersion(budgetId, versionId, {
            lines: [...(budget.versions.find(v => v.id === versionId)?.lines || []), newLine]
        });
    };

    const updateLine = (budgetId: string, versionId: string, lineId: string, updates: Partial<BudgetLine>) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        const version = budget.versions.find(v => v.id === versionId);
        if (!version) return;

        updateVersion(budgetId, versionId, {
            lines: version.lines.map(line =>
                line.id === lineId
                    ? { ...line, ...updates, updatedAt: Date.now() }
                    : line
            )
        });
    };

    const deleteLine = (budgetId: string, versionId: string, lineId: string) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        const version = budget.versions.find(v => v.id === versionId);
        if (!version) return;

        updateVersion(budgetId, versionId, {
            lines: version.lines.filter(line => line.id !== lineId)
        });
    };

    const updateLineValue = (budgetId: string, versionId: string, lineId: string, periodId: string, value: number) => {
        const budget = getBudget(budgetId);
        if (!budget) return;

        const version = budget.versions.find(v => v.id === versionId);
        if (!version) return;

        updateVersion(budgetId, versionId, {
            lines: version.lines.map(line =>
                line.id === lineId
                    ? {
                        ...line,
                        periodValues: {
                            ...line.periodValues,
                            [periodId]: value
                        },
                        updatedAt: Date.now()
                    }
                    : line
            )
        });
    };

    // --- WORKFLOW ---
    const submitVersion = (budgetId: string, versionId: string, submittedBy: string) => {
        updateVersion(budgetId, versionId, {
            status: 'submitted',
            submittedBy,
            submittedAt: Date.now()
        });
    };

    const validateVersion = (budgetId: string, versionId: string, validatedBy: string) => {
        updateVersion(budgetId, versionId, {
            status: 'validated',
            validatedBy,
            validatedAt: Date.now()
        });
    };

    const rejectVersion = (budgetId: string, versionId: string, rejectedBy: string, reason: string) => {
        updateVersion(budgetId, versionId, {
            status: 'rejected',
            rejectionReason: reason,
            validatedBy: rejectedBy,
            validatedAt: Date.now()
        });
    };

    const lockBudget = (budgetId: string) => {
        updateBudget(budgetId, { isLocked: true });
    };

    const unlockBudget = (budgetId: string) => {
        updateBudget(budgetId, { isLocked: false });
    };

    // --- TEMPLATES ---
    const addTemplate = (template: Omit<BudgetTemplate, 'id' | 'createdAt'>) => {
        const newTemplate: BudgetTemplate = {
            ...template,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...budgetModule,
            templates: [...templates, newTemplate]
        });
    };

    const updateTemplate = (id: string, updates: Partial<BudgetTemplate>) => {
        onUpdate({
            ...budgetModule,
            templates: templates.map(t =>
                t.id === id ? { ...t, ...updates } : t
            )
        });
    };

    const deleteTemplate = (id: string) => {
        onUpdate({
            ...budgetModule,
            templates: templates.filter(t => t.id !== id)
        });
    };

    const createBudgetFromTemplate = (templateId: string, name: string, fiscalYear: number): Budget | null => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return null;

        // This would be implemented by the caller
        return null;
    };

    // --- COMMENTAIRES ---
    const addComment = (comment: Omit<BudgetComment, 'id' | 'createdAt'>) => {
        const newComment: BudgetComment = {
            ...comment,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...budgetModule,
            comments: [...comments, newComment]
        });
    };

    const resolveComment = (commentId: string) => {
        onUpdate({
            ...budgetModule,
            comments: comments.map(c =>
                c.id === commentId ? { ...c, isResolved: true } : c
            )
        });
    };

    const getCommentsByBudget = (budgetId: string, versionId?: string): BudgetComment[] => {
        return comments.filter(c =>
            c.budgetId === budgetId &&
            (!versionId || c.versionId === versionId)
        );
    };

    // --- NOTIFICATIONS ---
    const addNotification = (notification: Omit<BudgetNotification, 'id' | 'sentAt'>) => {
        const newNotification: BudgetNotification = {
            ...notification,
            id: generateId(),
            sentAt: Date.now()
        };
        onUpdate({
            ...budgetModule,
            notifications: [...notifications, newNotification]
        });
    };

    const markNotificationRead = (notificationId: string) => {
        onUpdate({
            ...budgetModule,
            notifications: notifications.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            )
        });
    };

    const getUnreadNotifications = (): BudgetNotification[] => {
        return notifications.filter(n => !n.isRead);
    };

    // --- IMPORT/EXPORT ---
    const exportBudgetToExcel = (budgetId: string, versionId: string) => {
        // To be implemented
        console.log('Export budget to Excel:', budgetId, versionId);
    };

    const importBudgetFromExcel = (budgetId: string, versionId: string, data: any) => {
        // To be implemented
        console.log('Import budget from Excel:', budgetId, versionId, data);
    };

    const value: BudgetContextType = {
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
        getBudget,
        getBudgetsByFiscalYear,

        addVersion,
        updateVersion,
        deleteVersion,
        setActiveVersion,
        duplicateVersion,
        compareVersions,

        addLine,
        updateLine,
        deleteLine,
        updateLineValue,

        submitVersion,
        validateVersion,
        rejectVersion,
        lockBudget,
        unlockBudget,

        templates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        createBudgetFromTemplate,

        comments,
        addComment,
        resolveComment,
        getCommentsByBudget,

        notifications,
        addNotification,
        markNotificationRead,
        getUnreadNotifications,

        exportBudgetToExcel,
        importBudgetFromExcel
    };

    return (
        <BudgetContext.Provider value={value}>
            {children}
        </BudgetContext.Provider>
    );
};

export const useBudget = () => {
    const context = useContext(BudgetContext);
    if (!context) {
        throw new Error('useBudget must be used within BudgetProvider');
    }
    return context;
};
