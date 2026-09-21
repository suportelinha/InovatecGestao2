import React from 'react';
import {
  LayoutDashboard,
  LayoutGrid,
  Package,
  ArrowUpFromLine,
  ShoppingCart,
  Boxes,
  BarChart3,
  Settings,
  LogOut,
  X,
  Building2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

export type NavigationTab = 
  | 'dashboard'
  | 'products'
  | 'entries'
  | 'exits'
  | 'sales'
  | 'stock'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSupabaseModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, profile, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavigationTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as NavigationTab, label: 'Produtos', icon: LayoutGrid },
    { id: 'entries' as NavigationTab, label: 'Entradas', icon: Package },
    { id: 'exits' as NavigationTab, label: 'Saídas', icon: ArrowUpFromLine },
    { id: 'sales' as NavigationTab, label: 'Vendas', icon: ShoppingCart },
    { id: 'stock' as NavigationTab, label: 'Estoque', icon: Boxes },
    { id: 'reports' as NavigationTab, label: 'Relatórios', icon: BarChart3 },
    { id: 'settings' as NavigationTab, label: 'Configurações', icon: Settings },
  ];

  const handleItemClick = (tab: NavigationTab) => {
    onNavigate(tab);
    onCloseMobile();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Wilson José';
  const companyName = profile?.company_name || user?.user_metadata?.company_name || 'Empresa';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-45 w-64 bg-[#0f172a] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0284c7] text-white font-black flex items-center justify-center text-sm shadow-md shadow-sky-900/30">
              IN
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">INOVATEC</h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-tight">
                Gestão de Estoque e Vendas
              </p>
            </div>
          </div>

          <button
            id="close-mobile-sidebar-btn"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-5 px-3 overflow-y-auto">
          <div className="px-3 mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Menu
            </span>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => handleItemClick(item.id)}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold border border-slate-700/50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* System Online Status Indicator */}
        <div className="px-3 pb-2">
          <div
            id="system-status-indicator"
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs bg-slate-800/40 border border-slate-800/80 text-slate-400"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium text-slate-300">Banco em Nuvem Ativo</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">ONLINE</span>
          </div>
        </div>

        {/* Footer / User Profile & Sign Out */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-800/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white font-semibold flex items-center justify-center text-xs shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>{companyName}</span>
                </p>
              </div>
            </div>

            <button
              id="sidebar-signout-btn"
              onClick={handleSignOut}
              title="Sair do sistema"
              type="button"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

