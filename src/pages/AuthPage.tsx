import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Lock, Mail, User, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Preencha seu e-mail e senha.');
        }
        await signIn(email.trim(), password);
        success('Login realizado com sucesso! Bem-vindo.');
      } else if (mode === 'register') {
        if (!email.trim() || !password) {
          throw new Error('Preencha todos os campos obrigatórios.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve conter no mínimo 6 caracteres.');
        }
        if (!fullName.trim()) {
          throw new Error('Informe seu nome completo.');
        }
        const data = await signUp(
          email.trim(),
          password,
          fullName.trim(),
          companyName.trim() || 'Minha Empresa'
        );
        if (data?.session) {
          success('Conta criada com sucesso! Acessando o sistema...');
        } else {
          success('Conta criada com sucesso! Você já pode entrar com seu e-mail e senha.');
          setMode('login');
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Informe seu e-mail para recuperação.');
        }
        await resetPassword(email.trim());
        success('Instruções de recuperação de senha enviadas para seu e-mail.');
        setMode('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Erro durante a autenticação. Verifique os dados.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (msg.includes('User already registered')) {
        msg = 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
      }
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-sky-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0284c7] text-white font-black text-2xl mb-4 shadow-xl shadow-sky-900/40 border border-sky-400/30">
          IN
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">INOVATEC</h1>
        <p className="text-sm text-slate-400 font-medium mt-1">
          Gestão Centralizada de Estoque e Vendas
        </p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4"
      >
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl shadow-black/50 rounded-3xl border border-slate-700/80 sm:px-10 text-white">
          {/* Tabs: Entrar / Cadastrar */}
          {mode !== 'forgot' ? (
            <div className="flex border-b border-slate-700/80 mb-6">
              <button
                id="auth-tab-login"
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-all ${
                  mode === 'login'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar no Sistema
              </button>
              <button
                id="auth-tab-register"
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-all ${
                  mode === 'register'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-base font-bold text-white">Recuperar Senha</h2>
              <p className="text-xs text-slate-400 mt-1">
                Informe o seu e-mail cadastrado para receber as instruções de recuperação.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        id="auth-register-name"
                        type="text"
                        required
                        placeholder="Ex: João Silva"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome da Empresa / Loja
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        id="auth-register-company"
                        type="text"
                        placeholder="Ex: Inovatec Comercial"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail Corporativo *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="seu-email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Senha de Acesso *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <motion.button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] active:bg-sky-700 transition-all shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'Acessar o Painel'
                        : mode === 'register'
                        ? 'Cadastrar e Entrar'
                        : 'Enviar Link de Recuperação'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {mode === 'forgot' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                Voltar para o Login
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div className="mt-6 pt-4 border-t border-slate-700/80 text-center">
              <p className="text-xs text-slate-400">
                Ainda não possui acesso?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-sky-400 hover:text-sky-300 font-semibold transition-colors ml-1"
                >
                  Cadastre sua empresa
                </button>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="mt-6 pt-4 border-t border-slate-700/80 text-center">
              <p className="text-xs text-slate-400">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sky-400 hover:text-sky-300 font-semibold transition-colors ml-1"
                >
                  Fazer Login
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Security badge footer */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Acesso seguro com criptografia e isolamento por empresa</span>
        </div>
      </motion.div>
    </div>
  );
};
