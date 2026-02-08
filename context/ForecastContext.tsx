import React, { createContext, useContext, ReactNode } from 'react';
import {
  Forecast,
  ForecastVersion,
  ForecastLine,
  ForecastDriver,
  ForecastModule,
  ForecastReconciliationReport,
  ForecastVarianceAnalysis,
  RollingForecastSnapshot,
  ForecastType,
  ForecastMethod,
  ForecastStatus
} from '../types';
import { generateId } from '../utils';

interface ForecastContextType {
  // Forecasts
  forecasts: Forecast[];
  addForecast: (forecast: Omit<Forecast, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateForecast: (id: string, updates: Partial<Forecast>) => void;
  deleteForecast: (id: string) => void;
  getForecast: (id: string) => Forecast | undefined;
  getForecastsByYear: (year: number) => Forecast[];

  // Versions
  addVersion: (
    forecastId: string,
    version: Omit<ForecastVersion, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateVersion: (forecastId: string, versionId: string, updates: Partial<ForecastVersion>) => void;
  deleteVersion: (forecastId: string, versionId: string) => void;
  setActiveVersion: (forecastId: string, versionId: string) => void;
  duplicateVersion: (forecastId: string, versionId: string, newName: string) => void;

  // Lignes
  addLine: (
    forecastId: string,
    versionId: string,
    line: Omit<ForecastLine, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateLine: (
    forecastId: string,
    versionId: string,
    lineId: string,
    updates: Partial<ForecastLine>
  ) => void;
  deleteLine: (forecastId: string, versionId: string, lineId: string) => void;
  updateLineValue: (
    forecastId: string,
    versionId: string,
    lineId: string,
    periodId: string,
    value: number
  ) => void;

  // Copy actual values
  copyActualToForecast: (
    forecastId: string,
    versionId: string,
    actualData: { [accountCode: string]: { [period: string]: number } }
  ) => void;

  // Drivers
  addDriver: (forecastId: string, driver: Omit<ForecastDriver, 'id'>) => void;
  updateDriver: (forecastId: string, driverId: string, updates: Partial<ForecastDriver>) => void;
  deleteDriver: (forecastId: string, driverId: string) => void;
  updateDriverValue: (
    forecastId: string,
    driverId: string,
    periodId: string,
    value: number,
    isHistorical: boolean
  ) => void;

  // Rolling Forecast
  createRollingSnapshot: (forecastId: string, snapshotDate: string) => void;
  updateRollingForecast: (forecastId: string) => void;
  getRollingSnapshots: (forecastId: string) => RollingForecastSnapshot[];

  // ML Predictions
  generateMLPredictions: (
    forecastId: string,
    versionId: string,
    lineId: string,
    lookbackMonths: number
  ) => void;
  detectSeasonality: (values: number[]) => { hasSeason: boolean; period?: number };
  calculateTrend: (values: number[]) => {
    slope: number;
    intercept: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };

  // Reconciliation
  reconciliationReports: ForecastReconciliationReport[];
  createReconciliationReport: (
    forecastId: string,
    versionId: string,
    actualData: { [accountCode: string]: { [period: string]: number } }
  ) => void;
  getReconciliationReports: (forecastId: string) => ForecastReconciliationReport[];

  // Workflow
  submitVersion: (forecastId: string, versionId: string, submittedBy: string) => void;
  validateVersion: (forecastId: string, versionId: string, validatedBy: string) => void;
  lockForecast: (forecastId: string) => void;
  unlockForecast: (forecastId: string) => void;
}

const ForecastContext = createContext<ForecastContextType | undefined>(undefined);

interface ForecastProviderProps {
  children: ReactNode;
  forecastModule: ForecastModule;
  onUpdate: (forecastModule: ForecastModule) => void;
}

export const ForecastProvider: React.FC<ForecastProviderProps> = ({
  children,
  forecastModule,
  onUpdate
}) => {
  const forecasts = forecastModule.forecasts || [];
  const reconciliationReports = forecastModule.reconciliationReports || [];

  // --- FORECASTS ---
  const addForecast = (forecast: Omit<Forecast, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newForecast: Forecast = {
      ...forecast,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    onUpdate({
      ...forecastModule,
      forecasts: [...forecasts, newForecast]
    });
  };

  const updateForecast = (id: string, updates: Partial<Forecast>) => {
    onUpdate({
      ...forecastModule,
      forecasts: forecasts.map((forecast) =>
        forecast.id === id ? { ...forecast, ...updates, updatedAt: Date.now() } : forecast
      )
    });
  };

  const deleteForecast = (id: string) => {
    onUpdate({
      ...forecastModule,
      forecasts: forecasts.filter((f) => f.id !== id),
      reconciliationReports: reconciliationReports.filter((r) => r.forecastId !== id)
    });
  };

  const getForecast = (id: string): Forecast | undefined => {
    return forecasts.find((f) => f.id === id);
  };

  const getForecastsByYear = (year: number): Forecast[] => {
    return forecasts.filter((f) => f.fiscalYear === year);
  };

  // --- VERSIONS ---
  const addVersion = (
    forecastId: string,
    version: Omit<ForecastVersion, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const newVersion: ForecastVersion = {
      ...version,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    updateForecast(forecastId, {
      versions: [...forecast.versions, newVersion],
      activeVersionId: forecast.versions.length === 0 ? newVersion.id : forecast.activeVersionId
    });
  };

  const updateVersion = (
    forecastId: string,
    versionId: string,
    updates: Partial<ForecastVersion>
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    updateForecast(forecastId, {
      versions: forecast.versions.map((v) =>
        v.id === versionId ? { ...v, ...updates, updatedAt: Date.now() } : v
      )
    });
  };

  const deleteVersion = (forecastId: string, versionId: string) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const newVersions = forecast.versions.filter((v) => v.id !== versionId);
    updateForecast(forecastId, {
      versions: newVersions,
      activeVersionId:
        forecast.activeVersionId === versionId
          ? newVersions[0]?.id || undefined
          : forecast.activeVersionId
    });
  };

  const setActiveVersion = (forecastId: string, versionId: string) => {
    updateForecast(forecastId, { activeVersionId: versionId });
  };

  const duplicateVersion = (forecastId: string, versionId: string, newName: string) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const sourceVersion = forecast.versions.find((v) => v.id === versionId);
    if (!sourceVersion) return;

    const newVersion: ForecastVersion = {
      ...sourceVersion,
      id: generateId(),
      versionNumber: forecast.versions.length + 1,
      name: newName,
      status: 'draft',
      isActive: false,
      submittedBy: undefined,
      submittedAt: undefined,
      validatedBy: undefined,
      validatedAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lines: sourceVersion.lines.map((line) => ({
        ...line,
        id: generateId()
      }))
    };

    updateForecast(forecastId, {
      versions: [...forecast.versions, newVersion]
    });
  };

  // --- LIGNES ---
  const addLine = (
    forecastId: string,
    versionId: string,
    line: Omit<ForecastLine, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const newLine: ForecastLine = {
      ...line,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    updateVersion(forecastId, versionId, {
      lines: [...(forecast.versions.find((v) => v.id === versionId)?.lines || []), newLine]
    });
  };

  const updateLine = (
    forecastId: string,
    versionId: string,
    lineId: string,
    updates: Partial<ForecastLine>
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const version = forecast.versions.find((v) => v.id === versionId);
    if (!version) return;

    updateVersion(forecastId, versionId, {
      lines: version.lines.map((line) =>
        line.id === lineId ? { ...line, ...updates, updatedAt: Date.now() } : line
      )
    });
  };

  const deleteLine = (forecastId: string, versionId: string, lineId: string) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const version = forecast.versions.find((v) => v.id === versionId);
    if (!version) return;

    updateVersion(forecastId, versionId, {
      lines: version.lines.filter((line) => line.id !== lineId)
    });
  };

  const updateLineValue = (
    forecastId: string,
    versionId: string,
    lineId: string,
    periodId: string,
    value: number
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const version = forecast.versions.find((v) => v.id === versionId);
    if (!version) return;

    updateVersion(forecastId, versionId, {
      lines: version.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              forecastValues: {
                ...line.forecastValues,
                [periodId]: value
              },
              updatedAt: Date.now()
            }
          : line
      )
    });
  };

  // --- COPY ACTUAL TO FORECAST ---
  const copyActualToForecast = (
    forecastId: string,
    versionId: string,
    actualData: { [accountCode: string]: { [period: string]: number } }
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const version = forecast.versions.find((v) => v.id === versionId);
    if (!version) return;

    updateVersion(forecastId, versionId, {
      lines: version.lines.map((line) => {
        const actualValues = actualData[line.accountCode] || {};
        return {
          ...line,
          forecastValues: { ...actualValues }, // Copy actual as forecast
          actualValues: { ...actualValues }, // Keep actual reference
          updatedAt: Date.now()
        };
      })
    });
  };

  // --- DRIVERS ---
  const addDriver = (forecastId: string, driver: Omit<ForecastDriver, 'id'>) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const newDriver: ForecastDriver = {
      ...driver,
      id: generateId()
    };

    updateForecast(forecastId, {
      drivers: [...forecast.drivers, newDriver]
    });
  };

  const updateDriver = (forecastId: string, driverId: string, updates: Partial<ForecastDriver>) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    updateForecast(forecastId, {
      drivers: forecast.drivers.map((d) => (d.id === driverId ? { ...d, ...updates } : d))
    });
  };

  const deleteDriver = (forecastId: string, driverId: string) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    updateForecast(forecastId, {
      drivers: forecast.drivers.filter((d) => d.id !== driverId)
    });
  };

  const updateDriverValue = (
    forecastId: string,
    driverId: string,
    periodId: string,
    value: number,
    isHistorical: boolean
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    updateForecast(forecastId, {
      drivers: forecast.drivers.map((d) =>
        d.id === driverId
          ? {
              ...d,
              [isHistorical ? 'historicalValues' : 'forecastValues']: {
                ...(isHistorical ? d.historicalValues : d.forecastValues),
                [periodId]: value
              }
            }
          : d
      )
    });
  };

  // --- ROLLING FORECAST ---
  const createRollingSnapshot = (forecastId: string, snapshotDate: string) => {
    const forecast = getForecast(forecastId);
    if (!forecast || !forecast.isRolling) return;

    const activeVersion = forecast.versions.find((v) => v.id === forecast.activeVersionId);
    if (!activeVersion) return;

    const horizonMonths = forecast.rollingHorizonMonths || 12;
    const startDate = new Date(snapshotDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + horizonMonths);

    const snapshot: RollingForecastSnapshot = {
      id: generateId(),
      forecastId: forecast.id,
      snapshotDate,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
      data: activeVersion.lines.map((line) => ({ ...line })),
      createdAt: Date.now()
    };

    updateForecast(forecastId, {
      rollingSnapshots: [...(forecast.rollingSnapshots || []), snapshot],
      lastUpdateDate: snapshotDate
    });
  };

  const updateRollingForecast = (forecastId: string) => {
    const today = new Date().toISOString().split('T')[0];
    createRollingSnapshot(forecastId, today);
  };

  const getRollingSnapshots = (forecastId: string): RollingForecastSnapshot[] => {
    const forecast = getForecast(forecastId);
    return forecast?.rollingSnapshots || [];
  };

  // --- ML PREDICTIONS ---
  const detectSeasonality = (values: number[]): { hasSeason: boolean; period?: number } => {
    if (values.length < 24) return { hasSeason: false };

    // Simple autocorrelation for 12-month seasonality
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    if (variance === 0) return { hasSeason: false };

    // Check autocorrelation at lag 12
    let autocorr = 0;
    for (let i = 0; i < values.length - 12; i++) {
      autocorr += (values[i] - mean) * (values[i + 12] - mean);
    }
    autocorr = autocorr / ((values.length - 12) * variance);

    return {
      hasSeason: autocorr > 0.5,
      period: autocorr > 0.5 ? 12 : undefined
    };
  };

  const calculateTrend = (
    values: number[]
  ): { slope: number; intercept: number; trend: 'increasing' | 'decreasing' | 'stable' } => {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < yMean * 0.01) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return { slope, intercept, trend };
  };

  const generateMLPredictions = (
    forecastId: string,
    versionId: string,
    lineId: string,
    lookbackMonths: number
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const version = forecast.versions.find((v) => v.id === versionId);
    if (!version) return;

    const line = version.lines.find((l) => l.id === lineId);
    if (!line || !line.actualValues) return;

    // Get historical values
    const periods = Object.keys(line.actualValues).sort();
    const values = periods.slice(-lookbackMonths).map((p) => line.actualValues![p] || 0);

    if (values.length < 3) return;

    // Detect seasonality
    const seasonality = detectSeasonality(values);

    // Calculate trend
    const trendInfo = calculateTrend(values);

    // Calculate standard deviation for confidence intervals
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    // Generate predictions
    const forecastPeriods = 12; // Predict next 12 months
    const lastPeriod = new Date(periods[periods.length - 1] + '-01');
    const forecastValues: { [period: string]: number } = {};
    const lowerBound: { [period: string]: number } = {};
    const upperBound: { [period: string]: number } = {};

    for (let i = 1; i <= forecastPeriods; i++) {
      const nextPeriod = new Date(lastPeriod);
      nextPeriod.setMonth(nextPeriod.getMonth() + i);
      const periodKey = nextPeriod.toISOString().substring(0, 7);

      // Simple prediction: trend + seasonality
      let prediction = trendInfo.intercept + trendInfo.slope * (values.length + i);

      // Add seasonal component if detected
      if (seasonality.hasSeason && seasonality.period) {
        const seasonalIndex = (values.length + i - 1) % seasonality.period;
        const seasonalValue = values[seasonalIndex] || mean;
        const seasonalFactor = seasonalValue / mean;
        prediction *= seasonalFactor;
      }

      forecastValues[periodKey] = prediction;
      lowerBound[periodKey] = prediction - 1.96 * stdDev; // 95% confidence
      upperBound[periodKey] = prediction + 1.96 * stdDev;
    }

    // Update line with ML predictions
    updateLine(forecastId, versionId, lineId, {
      forecastValues: { ...line.forecastValues, ...forecastValues },
      method: 'ml_prediction',
      mlPrediction: {
        confidence: seasonality.hasSeason ? 75 : 60,
        lowerBound,
        upperBound,
        seasonalityDetected: seasonality.hasSeason,
        trend: trendInfo.trend
      }
    });
  };

  // --- RECONCILIATION ---
  const createReconciliationReport = (
    forecastId: string,
    versionId: string,
    actualData: { [accountCode: string]: { [period: string]: number } }
  ) => {
    const forecast = getForecast(forecastId);
    if (!forecast) return;

    const version = forecast.versions.find((v) => v.id === versionId);
    if (!version) return;

    const variances: ForecastVarianceAnalysis[] = [];
    let totalForecast = 0;
    let totalActual = 0;

    // Calculate variances for each line and period
    version.lines.forEach((line) => {
      const actualValues = actualData[line.accountCode] || {};
      const periods = new Set([...Object.keys(line.forecastValues), ...Object.keys(actualValues)]);

      periods.forEach((period) => {
        const forecastValue = line.forecastValues[period] || 0;
        const actualValue = actualValues[period] || 0;
        const variance = actualValue - forecastValue;
        const variancePercent = forecastValue !== 0 ? (variance / forecastValue) * 100 : 0;

        totalForecast += forecastValue;
        totalActual += actualValue;

        if (Math.abs(variance) > 0.01) {
          variances.push({
            accountCode: line.accountCode,
            accountLabel: line.accountLabel,
            period,
            forecastValue,
            actualValue,
            variance,
            variancePercent
          });
        }
      });
    });

    // Calculate MAPE (Mean Absolute Percentage Error)
    const mape =
      variances.length > 0
        ? variances.reduce((sum, v) => sum + Math.abs(v.variancePercent), 0) / variances.length
        : 0;

    // Calculate RMSE (Root Mean Square Error)
    const rmse =
      variances.length > 0
        ? Math.sqrt(
            variances.reduce((sum, v) => sum + Math.pow(v.variance, 2), 0) / variances.length
          )
        : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (mape > 20) {
      recommendations.push('Précision des prévisions à améliorer (MAPE > 20%)');
    }
    if (variances.some((v) => Math.abs(v.variancePercent) > 50)) {
      recommendations.push('Certains comptes présentent des écarts importants (> 50%)');
    }
    if (totalForecast !== 0 && Math.abs((totalActual - totalForecast) / totalForecast) > 0.15) {
      recommendations.push('Écart global significatif (> 15%) - revoir les hypothèses');
    }

    const report: ForecastReconciliationReport = {
      id: generateId(),
      name: `Rapport ${version.name} - ${new Date().toLocaleDateString()}`,
      accuracyScore: Math.max(0, 100 - mape),
      forecastId: forecast.id,
      forecastVersionId: versionId,
      periodStart: version.referenceDate,
      periodEnd: new Date(
        new Date(version.referenceDate).setMonth(new Date(version.referenceDate).getMonth() + 12)
      )
        .toISOString()
        .split('T')[0],
      variances,
      totalForecast,
      totalActual,
      totalVariance: totalActual - totalForecast,
      totalVariancePercent:
        totalForecast !== 0 ? ((totalActual - totalForecast) / totalForecast) * 100 : 0,
      mape,
      rmse,
      recommendations,
      createdAt: Date.now()
    };

    onUpdate({
      ...forecastModule,
      reconciliationReports: [...reconciliationReports, report]
    });
  };

  const getReconciliationReports = (forecastId: string): ForecastReconciliationReport[] => {
    return reconciliationReports.filter((r) => r.forecastId === forecastId);
  };

  // --- WORKFLOW ---
  const submitVersion = (forecastId: string, versionId: string, submittedBy: string) => {
    updateVersion(forecastId, versionId, {
      status: 'submitted',
      submittedBy,
      submittedAt: Date.now()
    });
  };

  const validateVersion = (forecastId: string, versionId: string, validatedBy: string) => {
    updateVersion(forecastId, versionId, {
      status: 'validated',
      validatedBy,
      validatedAt: Date.now()
    });
  };

  const lockForecast = (forecastId: string) => {
    updateForecast(forecastId, { isLocked: true });
  };

  const unlockForecast = (forecastId: string) => {
    updateForecast(forecastId, { isLocked: false });
  };

  const value: ForecastContextType = {
    forecasts,
    addForecast,
    updateForecast,
    deleteForecast,
    getForecast,
    getForecastsByYear,

    addVersion,
    updateVersion,
    deleteVersion,
    setActiveVersion,
    duplicateVersion,

    addLine,
    updateLine,
    deleteLine,
    updateLineValue,

    copyActualToForecast,

    addDriver,
    updateDriver,
    deleteDriver,
    updateDriverValue,

    createRollingSnapshot,
    updateRollingForecast,
    getRollingSnapshots,

    generateMLPredictions,
    detectSeasonality,
    calculateTrend,

    reconciliationReports,
    createReconciliationReport,
    getReconciliationReports,

    submitVersion,
    validateVersion,
    lockForecast,
    unlockForecast
  };

  return <ForecastContext.Provider value={value}>{children}</ForecastContext.Provider>;
};

export const useForecast = () => {
  const context = useContext(ForecastContext);
  if (!context) {
    throw new Error('useForecast must be used within ForecastProvider');
  }
  return context;
};
