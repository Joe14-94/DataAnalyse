import React, { createContext, useContext, ReactNode } from 'react';
import {
    ChartOfAccounts,
    Account,
    AnalyticalAxis,
    AxisValue,
    FiscalCalendar,
    FiscalPeriod,
    MasterDataItem,
    AccountReclassification,
    FinanceReferentials
} from '../types';
import { generateId } from '../utils';

interface ReferentialContextType {
    // Chart of Accounts
    chartsOfAccounts: ChartOfAccounts[];
    addChartOfAccounts: (chart: Omit<ChartOfAccounts, 'id' | 'createdAt'>) => void;
    updateChartOfAccounts: (id: string, updates: Partial<ChartOfAccounts>) => void;
    deleteChartOfAccounts: (id: string) => void;
    getDefaultChartOfAccounts: () => ChartOfAccounts | null;
    setDefaultChartOfAccounts: (id: string) => void;

    // Accounts
    addAccount: (chartId: string, account: Omit<Account, 'id' | 'createdAt'>) => void;
    updateAccount: (chartId: string, accountId: string, updates: Partial<Account>) => void;
    deleteAccount: (chartId: string, accountId: string) => void;
    getAccountByCode: (chartId: string, code: string) => Account | undefined;
    getAccountHierarchy: (chartId: string, accountCode: string) => Account[];

    // Analytical Axes
    analyticalAxes: AnalyticalAxis[];
    addAnalyticalAxis: (axis: Omit<AnalyticalAxis, 'id' | 'createdAt'>) => void;
    updateAnalyticalAxis: (id: string, updates: Partial<AnalyticalAxis>) => void;
    deleteAnalyticalAxis: (id: string) => void;

    // Axis Values
    axisValues: AxisValue[];
    addAxisValue: (value: Omit<AxisValue, 'id' | 'createdAt'>) => void;
    updateAxisValue: (id: string, updates: Partial<AxisValue>) => void;
    deleteAxisValue: (id: string) => void;
    getAxisValues: (axisId: string) => AxisValue[];

    // Fiscal Calendars
    fiscalCalendars: FiscalCalendar[];
    addFiscalCalendar: (calendar: Omit<FiscalCalendar, 'id' | 'createdAt'>) => void;
    updateFiscalCalendar: (id: string, updates: Partial<FiscalCalendar>) => void;
    deleteFiscalCalendar: (id: string) => void;
    getCurrentFiscalCalendar: () => FiscalCalendar | null;
    getActivePeriods: () => FiscalPeriod[];
    closePeriod: (calendarId: string, periodId: string) => void;

    // Master Data
    masterData: MasterDataItem[];
    addMasterDataItem: (item: Omit<MasterDataItem, 'id' | 'createdAt'>) => void;
    updateMasterDataItem: (id: string, updates: Partial<MasterDataItem>) => void;
    deleteMasterDataItem: (id: string) => void;
    getMasterDataByType: (type: string) => MasterDataItem[];
    getMasterDataByCode: (code: string) => MasterDataItem | undefined;

    // Reclassifications
    reclassifications: AccountReclassification[];
    addReclassification: (rule: Omit<AccountReclassification, 'id' | 'createdAt'>) => void;
    updateReclassification: (id: string, updates: Partial<AccountReclassification>) => void;
    deleteReclassification: (id: string) => void;

    // Utility
    importPCGTemplate: () => void;
    importIFRSTemplate: () => void;
}

const ReferentialContext = createContext<ReferentialContextType | undefined>(undefined);

interface ReferentialProviderProps {
    children: ReactNode;
    referentials: FinanceReferentials;
    onUpdate: (referentials: FinanceReferentials) => void;
}

export const ReferentialProvider: React.FC<ReferentialProviderProps> = ({
    children,
    referentials,
    onUpdate
}) => {
    const chartsOfAccounts = referentials.chartOfAccounts || [];
    const analyticalAxes = referentials.analyticalAxes || [];
    const axisValues = referentials.axisValues || [];
    const fiscalCalendars = referentials.fiscalCalendars || [];
    const masterData = referentials.masterData || [];
    const reclassifications = referentials.reclassifications || [];

    // --- CHART OF ACCOUNTS ---
    const addChartOfAccounts = (chart: Omit<ChartOfAccounts, 'id' | 'createdAt'>) => {
        const newChart: ChartOfAccounts = {
            ...chart,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...referentials,
            chartOfAccounts: [...chartsOfAccounts, newChart]
        });
    };

    const updateChartOfAccounts = (id: string, updates: Partial<ChartOfAccounts>) => {
        onUpdate({
            ...referentials,
            chartOfAccounts: chartsOfAccounts.map(chart =>
                chart.id === id ? { ...chart, ...updates } : chart
            )
        });
    };

    const deleteChartOfAccounts = (id: string) => {
        onUpdate({
            ...referentials,
            chartOfAccounts: chartsOfAccounts.filter(chart => chart.id !== id)
        });
    };

    const getDefaultChartOfAccounts = () => {
        return chartsOfAccounts.find(chart => chart.isDefault) || null;
    };

    const setDefaultChartOfAccounts = (id: string) => {
        onUpdate({
            ...referentials,
            chartOfAccounts: chartsOfAccounts.map(chart => ({
                ...chart,
                isDefault: chart.id === id
            }))
        });
    };

    // --- ACCOUNTS ---
    const addAccount = (chartId: string, account: Omit<Account, 'id' | 'createdAt'>) => {
        const newAccount: Account = {
            ...account,
            id: generateId(),
            createdAt: Date.now()
        };

        onUpdate({
            ...referentials,
            chartOfAccounts: chartsOfAccounts.map(chart =>
                chart.id === chartId
                    ? { ...chart, accounts: [...chart.accounts, newAccount] }
                    : chart
            )
        });
    };

    const updateAccount = (chartId: string, accountId: string, updates: Partial<Account>) => {
        onUpdate({
            ...referentials,
            chartOfAccounts: chartsOfAccounts.map(chart =>
                chart.id === chartId
                    ? {
                        ...chart,
                        accounts: chart.accounts.map(acc =>
                            acc.id === accountId ? { ...acc, ...updates } : acc
                        )
                    }
                    : chart
            )
        });
    };

    const deleteAccount = (chartId: string, accountId: string) => {
        onUpdate({
            ...referentials,
            chartOfAccounts: chartsOfAccounts.map(chart =>
                chart.id === chartId
                    ? { ...chart, accounts: chart.accounts.filter(acc => acc.id !== accountId) }
                    : chart
            )
        });
    };

    const getAccountByCode = (chartId: string, code: string): Account | undefined => {
        const chart = chartsOfAccounts.find(c => c.id === chartId);
        return chart?.accounts.find(acc => acc.code === code);
    };

    const getAccountHierarchy = (chartId: string, accountCode: string): Account[] => {
        const chart = chartsOfAccounts.find(c => c.id === chartId);
        if (!chart) return [];

        const hierarchy: Account[] = [];
        let current = chart.accounts.find(acc => acc.code === accountCode);

        while (current) {
            hierarchy.unshift(current);
            if (!current.parentCode) break;
            current = chart.accounts.find(acc => acc.code === current!.parentCode);
        }

        return hierarchy;
    };

    // --- ANALYTICAL AXES ---
    const addAnalyticalAxis = (axis: Omit<AnalyticalAxis, 'id' | 'createdAt'>) => {
        const newAxis: AnalyticalAxis = {
            ...axis,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...referentials,
            analyticalAxes: [...analyticalAxes, newAxis]
        });
    };

    const updateAnalyticalAxis = (id: string, updates: Partial<AnalyticalAxis>) => {
        onUpdate({
            ...referentials,
            analyticalAxes: analyticalAxes.map(axis =>
                axis.id === id ? { ...axis, ...updates } : axis
            )
        });
    };

    const deleteAnalyticalAxis = (id: string) => {
        // Also delete all axis values
        onUpdate({
            ...referentials,
            analyticalAxes: analyticalAxes.filter(axis => axis.id !== id),
            axisValues: axisValues.filter(val => val.axisId !== id)
        });
    };

    // --- AXIS VALUES ---
    const addAxisValue = (value: Omit<AxisValue, 'id' | 'createdAt'>) => {
        const newValue: AxisValue = {
            ...value,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...referentials,
            axisValues: [...axisValues, newValue]
        });
    };

    const updateAxisValue = (id: string, updates: Partial<AxisValue>) => {
        onUpdate({
            ...referentials,
            axisValues: axisValues.map(val =>
                val.id === id ? { ...val, ...updates } : val
            )
        });
    };

    const deleteAxisValue = (id: string) => {
        onUpdate({
            ...referentials,
            axisValues: axisValues.filter(val => val.id !== id)
        });
    };

    const getAxisValues = (axisId: string): AxisValue[] => {
        return axisValues.filter(val => val.axisId === axisId && val.isActive);
    };

    // --- FISCAL CALENDARS ---
    const addFiscalCalendar = (calendar: Omit<FiscalCalendar, 'id' | 'createdAt'>) => {
        const newCalendar: FiscalCalendar = {
            ...calendar,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...referentials,
            fiscalCalendars: [...fiscalCalendars, newCalendar]
        });
    };

    const updateFiscalCalendar = (id: string, updates: Partial<FiscalCalendar>) => {
        onUpdate({
            ...referentials,
            fiscalCalendars: fiscalCalendars.map(cal =>
                cal.id === id ? { ...cal, ...updates } : cal
            )
        });
    };

    const deleteFiscalCalendar = (id: string) => {
        onUpdate({
            ...referentials,
            fiscalCalendars: fiscalCalendars.filter(cal => cal.id !== id)
        });
    };

    const getCurrentFiscalCalendar = (): FiscalCalendar | null => {
        const currentYear = new Date().getFullYear();
        return fiscalCalendars.find(cal => cal.fiscalYear === currentYear) || fiscalCalendars[0] || null;
    };

    const getActivePeriods = (): FiscalPeriod[] => {
        const current = getCurrentFiscalCalendar();
        return current?.periods.filter(p => !p.isClosed) || [];
    };

    const closePeriod = (calendarId: string, periodId: string) => {
        onUpdate({
            ...referentials,
            fiscalCalendars: fiscalCalendars.map(cal =>
                cal.id === calendarId
                    ? {
                        ...cal,
                        periods: cal.periods.map(p =>
                            p.id === periodId
                                ? { ...p, isClosed: true, closeDate: new Date().toISOString().split('T')[0] }
                                : p
                        )
                    }
                    : cal
            )
        });
    };

    // --- MASTER DATA ---
    const addMasterDataItem = (item: Omit<MasterDataItem, 'id' | 'createdAt'>) => {
        const newItem: MasterDataItem = {
            ...item,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...referentials,
            masterData: [...masterData, newItem]
        });
    };

    const updateMasterDataItem = (id: string, updates: Partial<MasterDataItem>) => {
        onUpdate({
            ...referentials,
            masterData: masterData.map(item =>
                item.id === id ? { ...item, ...updates } : item
            )
        });
    };

    const deleteMasterDataItem = (id: string) => {
        onUpdate({
            ...referentials,
            masterData: masterData.filter(item => item.id !== id)
        });
    };

    const getMasterDataByType = (type: string): MasterDataItem[] => {
        return masterData.filter(item => item.type === type && item.isActive);
    };

    const getMasterDataByCode = (code: string): MasterDataItem | undefined => {
        return masterData.find(item => item.code === code);
    };

    // --- RECLASSIFICATIONS ---
    const addReclassification = (rule: Omit<AccountReclassification, 'id' | 'createdAt'>) => {
        const newRule: AccountReclassification = {
            ...rule,
            id: generateId(),
            createdAt: Date.now()
        };
        onUpdate({
            ...referentials,
            reclassifications: [...reclassifications, newRule]
        });
    };

    const updateReclassification = (id: string, updates: Partial<AccountReclassification>) => {
        onUpdate({
            ...referentials,
            reclassifications: reclassifications.map(rule =>
                rule.id === id ? { ...rule, ...updates } : rule
            )
        });
    };

    const deleteReclassification = (id: string) => {
        onUpdate({
            ...referentials,
            reclassifications: reclassifications.filter(rule => rule.id !== id)
        });
    };

    // --- TEMPLATES ---
    const importPCGTemplate = () => {
        // TODO: Implement PCG template import
        console.log('Importing PCG template...');
    };

    const importIFRSTemplate = () => {
        // TODO: Implement IFRS template import
        console.log('Importing IFRS template...');
    };

    const value: ReferentialContextType = {
        chartsOfAccounts,
        addChartOfAccounts,
        updateChartOfAccounts,
        deleteChartOfAccounts,
        getDefaultChartOfAccounts,
        setDefaultChartOfAccounts,
        addAccount,
        updateAccount,
        deleteAccount,
        getAccountByCode,
        getAccountHierarchy,
        analyticalAxes,
        addAnalyticalAxis,
        updateAnalyticalAxis,
        deleteAnalyticalAxis,
        axisValues,
        addAxisValue,
        updateAxisValue,
        deleteAxisValue,
        getAxisValues,
        fiscalCalendars,
        addFiscalCalendar,
        updateFiscalCalendar,
        deleteFiscalCalendar,
        getCurrentFiscalCalendar,
        getActivePeriods,
        closePeriod,
        masterData,
        addMasterDataItem,
        updateMasterDataItem,
        deleteMasterDataItem,
        getMasterDataByType,
        getMasterDataByCode,
        reclassifications,
        addReclassification,
        updateReclassification,
        deleteReclassification,
        importPCGTemplate,
        importIFRSTemplate
    };

    return (
        <ReferentialContext.Provider value={value}>
            {children}
        </ReferentialContext.Provider>
    );
};

export const useReferentials = () => {
    const context = useContext(ReferentialContext);
    if (!context) {
        throw new Error('useReferentials must be used within ReferentialProvider');
    }
    return context;
};
