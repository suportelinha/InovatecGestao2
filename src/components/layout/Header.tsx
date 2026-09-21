import React from 'react';
import { Menu, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, profile } = useAuth();

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Gestor';

  // Format date in Mozambican Portuguese: e.g. "Sexta-feira, 18 de Setembro de 2026"
  const formattedDate = new Intl.DateTimeFormat('pt-MZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <button
          id="open-mobile-sidebar-btn"
          onClick={onOpenMobileMenu}
          type="button"
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{getGreeting()}, {displayName}</span>
              <Sparkles className="w-4 h-4 text-emerald-600 hidden sm:inline" />
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium hidden sm:flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{capitalizedDate}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time sync badge */}
        <div
          id="header-sync-badge"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-medium text-slate-700"
          title="Conexão com servidor em nuvem ativa e operacional"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Sistema Conectado</span>
          <span className="sm:hidden">Online</span>
        </div>
      </div>
    </header>
  );
};
