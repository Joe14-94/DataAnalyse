import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Import = React.lazy(() => import('./pages/Import').then(m => ({ default: m.Import })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Customization = React.lazy(() => import('./pages/Customization').then(m => ({ default: m.Customization })));
const AnalysisStudio = React.lazy(() => import('./pages/AnalysisStudio').then(m => ({ default: m.AnalysisStudio })));
const DataExplorer = React.lazy(() => import('./pages/DataExplorer').then(m => ({ default: m.DataExplorer })));
const PivotTable = React.lazy(() => import('./pages/PivotTable').then(m => ({ default: m.PivotTable })));
const Budget = React.lazy(() => import('./pages/Budget').then(m => ({ default: m.Budget })));
const Forecast = React.lazy(() => import('./pages/Forecast').then(m => ({ default: m.Forecast })));
const ETLPipeline = React.lazy(() => import('./pages/ETLPipeline').then(m => ({ default: m.ETLPipeline })));
const Help = React.lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));

const LoadingPage = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-canvas">
    <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
    <p className="text-txt-secondary animate-pulse font-medium">Chargement de la page...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <DataProvider>
      <HashRouter>
        <Toaster richColors position="top-right" />
        <Layout>
          <ErrorBoundary name="Application">
            <React.Suspense fallback={<LoadingPage />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/data" element={<DataExplorer />} />
                <Route path="/import" element={<Import />} />
                <Route path="/analytics" element={<AnalysisStudio />} />
                <Route path="/pivot" element={<PivotTable />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/forecast" element={<Forecast />} />
                <Route path="/etl" element={<ETLPipeline />} />
                <Route path="/customization" element={<Customization />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<Help />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </ErrorBoundary>
        </Layout>
      </HashRouter>
    </DataProvider>
  );
};

export default App;
