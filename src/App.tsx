import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/layout/Layout';
import { NavigationTab } from './components/layout/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { StockEntriesPage } from './pages/StockEntriesPage';
import { StockExitsPage } from './pages/StockExitsPage';
import { SalesPage } from './pages/SalesPage';
import { StockPage } from './pages/StockPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { session, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [stockFilter, setStockFilter] = useState<string>('all');

  const handleNavigate = (tab: NavigationTab, filter?: string) => {
    setCurrentTab(tab);
    if (tab === 'stock' && filter) {
      setStockFilter(filter);
    } else if (tab === 'stock' && !filter) {
      setStockFilter('all');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-black text-xl mb-4 shadow-xl shadow-slate-950/40">
          IN
        </div>
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Carregando INOVATEC...
        </p>
      </div>
    );
  }

  // Not logged in -> Show Auth Page
  if (!session) {
    return <AuthPage />;
  }

  return (
    <Layout currentTab={currentTab} onNavigate={handleNavigate}>
      {currentTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
      {currentTab === 'products' && <ProductsPage />}
      {currentTab === 'entries' && <StockEntriesPage />}
      {currentTab === 'exits' && <StockExitsPage />}
      {currentTab === 'sales' && <SalesPage />}
      {currentTab === 'stock' && <StockPage initialStatusFilter={stockFilter} />}
      {currentTab === 'reports' && <ReportsPage />}
      {currentTab === 'settings' && <SettingsPage />}
    </Layout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
