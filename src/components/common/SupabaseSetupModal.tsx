import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, ShieldCheck, Terminal } from 'lucide-react';
import { Modal } from './Modal';
import { SUPABASE_SETUP_SQL } from '../../lib/sqlScript';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      id="supabase-setup-guide-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Configuração do Banco de Dados Supabase"
      subtitle="Guia de integração e script SQL oficial para o INOVATEC"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-sm text-slate-600">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-800">Variáveis de Ambiente Necessárias</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Conforme as regras de segurança corporativa, as credenciais do Supabase são lidas diretamente das variáveis de ambiente:
              </p>
              <div className="mt-2 font-mono text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 select-all space-y-1">
                <div>VITE_SUPABASE_URL=https://seu-projeto.supabase.co</div>
                <div>VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              <h4 className="font-semibold text-slate-900">Script SQL das Tabelas, RLS e Storage</h4>
            </div>
            <button
              id="copy-sql-script-btn"
              onClick={handleCopySql}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copiado com sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL para Supabase</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Acesse seu painel no Supabase, vá em <strong>SQL Editor</strong> &gt; <strong>New query</strong>, cole o código abaixo e clique em <strong>Run</strong>:
          </p>

          <div className="relative">
            <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono max-h-56 overflow-y-auto leading-relaxed select-all">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <p>
            <strong>Isolamento Garantido (RLS):</strong> Todas as tabelas contam com Row Level Security. Cada usuário autenticado acessa exclusivamente seus próprios produtos, entradas, vendas e categorias.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            id="close-supabase-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </Modal>
  );
};
