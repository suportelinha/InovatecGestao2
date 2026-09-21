import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Mail,
  ShieldCheck,
  Database,
  Coins,
  CheckCircle2,
  LogOut,
  Save,
  Key,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { dashboardService } from '../services/dashboardService';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, signOut, isConfigured } = useAuth();
  const { success, error } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [loading, setLoading] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCompanyName(profile.company_name || '');
    }
  }, [profile]);

  const handleResetData = async () => {
    setIsResettingData(true);
    try {
      await dashboardService.resetAllData();
      success('Todos os registros foram zerados! Seu painel agora está limpo e com dados zerados.');
      setShowResetConfirm(false);
    } catch (err: any) {
      console.error('Erro ao zerar dados operacionais:', err);
      error(err.message || 'Erro ao zerar dados.');
    } finally {
      setIsResettingData(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
      });
      success('Perfil atualizado com sucesso.');
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      error(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const maskedUrl = supabaseUrl ? supabaseUrl.replace(/^https:\/\/(.{4}).*(\..*)$/, 'https://$1***$2') : 'Não configurado';

  return (
    <motion.div
      id="settings-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-4xl"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configurações do Sistema</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerenciamento do perfil empresarial, dados de acesso e infraestrutura de dados em nuvem
        </p>
      </div>

      {/* Profile Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Dados da Empresa & Perfil</h3>
        <p className="text-xs text-slate-500 mb-6">
          Estas informações aparecem nos cabeçalhos e nos relatórios exportados em PDF e Excel
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Administrador / Responsável *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="settings-fullname-input"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Empresa / Loja *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="settings-company-input"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail de Acesso (Login)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              O e-mail é gerenciado pelo Supabase Authentication e não pode ser alterado diretamente aqui.
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="save-settings-btn"
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>

      {/* System Settings & Currency */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Moeda e Parâmetros Financeiros</h3>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">
              MT
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Metical de Moçambique (MT)</p>
              <p className="text-[11px] text-slate-500">
                Padrão monetário fixo do sistema com duas casas decimais e separador padrão
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800">
            Ativo
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Row Level Security (RLS)</p>
              <p className="text-[11px] text-slate-500">
                Isolamento estrito dos dados por conta corporativa diretamente no banco PostgreSQL
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800">
            Habilitado
          </span>
        </div>
      </div>

      {/* Database Connection Details Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-0.5">Infraestrutura e Banco de Dados</h3>
            <p className="text-xs text-slate-500">Conexão em nuvem corporativa de alta disponibilidade</p>
          </div>
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-emerald-100 text-emerald-800"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Conectado e Operacional</span>
          </span>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Ambiente de Nuvem:</span>
            <span className="font-mono text-slate-800">{maskedUrl}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Banco de Dados:</span>
            <span className="font-semibold text-slate-800">PostgreSQL Cloud Enterprise</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Armazenamento de Fotos:</span>
            <span className="font-semibold text-slate-800">Storage Corporativo de Mídia</span>
          </div>
        </div>
      </div>

      {/* Reset Data Card */}
      <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Zerar Dados do Painel & Movimentações</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Redefine todas as métricas do painel para zero (0,00 MT, 0 unidades em estoque, sem movimentações).
              </p>
            </div>
          </div>

          {!showResetConfirm ? (
            <button
              id="start-reset-data-btn"
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors shrink-0 flex items-center gap-2 cursor-pointer self-start sm:self-center"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Zerar Dados</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isResettingData}
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-reset-data-btn"
                type="button"
                disabled={isResettingData}
                onClick={handleResetData}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isResettingData ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Zerando...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Confirmar Zerar</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {showResetConfirm && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            Atenção: Todos os registros de vendas, compras, saídas e produtos cadastrados na sua conta serão excluídos para deixar o painel completamente zerado.
          </div>
        )}
      </div>

      {/* Logout Card */}
      <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Encerrar Sessão</h3>
          <p className="text-xs text-slate-500">Desconectar sua conta com segurança deste dispositivo</p>
        </div>
        <button
          id="logout-btn"
          type="button"
          onClick={async () => {
            await signOut();
            success('Você saiu do sistema com segurança.');
          }}
          className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </motion.div>
  );
};
