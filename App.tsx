import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Import } from './pages/Import';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Customization } from './pages/Customization';
import { CustomAnalytics } from './pages/CustomAnalytics';
import { DataExplorer } from './pages/DataExplorer';
import { PivotTable } from './pages/PivotTable';
import { Budget } from './pages/Budget';
import { Forecast } from './pages/Forecast';
import { ETLPipeline } from './pages/ETLPipeline';
import { Help } from './pages/Help';

const App: React.FC = () => {
  return (
    <DataProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data" element={<DataExplorer />} />
            <Route path="/import" element={<Import />} />
            <Route path="/history" element={<History />} />
            <Route path="/analytics" element={<CustomAnalytics />} />
            <Route path="/pivot" element={<PivotTable />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/etl" element={<ETLPipeline />} />
            <Route path="/customization" element={<Customization />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes >
        </Layout >
      </HashRouter >
    </DataProvider >
  );
};

export default App;