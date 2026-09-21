import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Package,
  Calendar,
  FileText,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  Boxes,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { dashboardService } from '../services/dashboardService';
import { DashboardMetrics } from '../types';
import { formatCurrency, formatDate, formatQuantity } from '../utils/formatters';
import { NavigationTab } from '../components/layout/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface DashboardPageProps {
  onNavigate: (tab: NavigationTab, filter?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const { success, error } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lineChartPeriod, setLineChartPeriod] = useState<'7days' | '30days'>('7days');
  const [categoryPeriod, setCategoryPeriod] = useState<'month' | 'all'>('month');
  const [stockFilter, setStockFilter] = useState<'all' | 'normal' | 'low'>('all');

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Erro ao carregar métricas do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await dashboardService.resetAllData();
      await loadMetrics();
      success('Dados operacionais zerados com sucesso! O painel agora está limpo e zerado.');
      setIsResetModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao zerar dados:', err);
      error(err.message || 'Erro ao zerar dados do painel.');
    } finally {
      setIsResetting(false);
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200/80 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl p-5 border border-slate-200/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 h-72 bg-white rounded-2xl p-5 border border-slate-200/70" />
          <div className="lg:col-span-3 h-72 bg-white rounded-2xl p-5 border border-slate-200/70" />
          <div className="lg:col-span-3 h-72 bg-white rounded-2xl p-5 border border-slate-200/70" />
        </div>
      </div>
    );
  }

  const {
    totalSales = 0,
    totalExpenses = 0,
    netProfit = 0,
    totalStockUnits = 0,
    salesGrowthPct = 0,
    expensesGrowthPct = 0,
    profitGrowthPct = 0,
    stockGrowthPct = 0,
    stockBreakdown = { normal: 0, normalPct: 0, lowStock: 0, lowStockPct: 0, outOfStock: 0, outOfStockPct: 0, total: 0 },
    salesVsEntries7Days = [],
    categorySales = [],
    latestSales = [],
    latestExpenses = [],
    lowStockAlertsCount = 0,
  } = metrics || {};

  // Compute points for the Line Chart (Vendas e Gastos)
  const chartPoints = Array.isArray(salesVsEntries7Days) ? salesVsEntries7Days : [];
  const safeCategorySales = Array.isArray(categorySales) ? categorySales : [];
  const safeLatestSales = Array.isArray(latestSales) ? latestSales : [];
  const safeLatestExpenses = Array.isArray(latestExpenses) ? latestExpenses : [];

  const hasChartData = (chartPoints?.length ?? 0) > 0 && chartPoints.some((p) => (p?.sales ?? 0) > 0 || (p?.entries ?? 0) > 0);

  const maxSales = hasChartData ? Math.max(...chartPoints.map((p) => Math.max(p?.sales ?? 0, p?.entries ?? 0, 1000))) : 1000;
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  const getCoordinates = (val: number, index: number, total: number) => {
    const x = paddingX + (index / Math.max(total - 1, 1)) * (chartWidth - paddingX * 2);
    const normalizedY = (val / maxSales);
    const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const salesPoints = chartPoints.map((p, i) => getCoordinates(p?.sales ?? 0, i, chartPoints.length));
  const entriesPoints = chartPoints.map((p, i) => getCoordinates(p?.entries ?? 0, i, chartPoints.length));

  const salesPolyline = salesPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const entriesPolyline = entriesPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');

  // Current date formatted for the top right date badge
  const todayDateFormatted = new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  // Donut circumference constants
  const donutRadius = 38;
  const circumference = 2 * Math.PI * donutRadius;

  // Category Donut calculations
  let accumulatedCategoryOffset = 0;

  // Stock Donut calculations
  const stockSlices = [
    { label: 'Estoque Normal', count: stockBreakdown.normal, pct: stockBreakdown.normalPct, color: '#10b981' },
    { label: 'Estoque Baixo', count: stockBreakdown.lowStock, pct: stockBreakdown.lowStockPct, color: '#f59e0b' },
    { label: 'Sem Estoque', count: stockBreakdown.outOfStock, pct: stockBreakdown.outOfStockPct, color: '#ef4444' },
  ];
  let accumulatedStockOffset = 0;

  return (
    <motion.div
      id="dashboard-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-6"
    >
      {/* 1. Header / Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Bem-vindo, {displayName}!</span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 font-normal">
            Painel operacional e financeiro da sua empresa em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-zerar-dados-painel"
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            title="Zerar todos os dados de vendas, compras e saídas para manter o painel zerado"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 shadow-xs text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
            <span>Zerar Painel</span>
          </button>

          <div
            id="dashboard-date-badge"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-xs font-medium text-slate-700"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayDateFormatted}</span>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Vendas Totais */}
        <motion.div
          id="kpi-vendas-totais"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                VENDAS TOTAIS
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0284c7] mt-1.5 tracking-tight">
                {formatCurrency(totalSales)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-slate-500">
            <span>{totalSales > 0 ? `${salesGrowthPct}% de crescimento` : 'Aguardando primeiras vendas'}</span>
          </div>
        </motion.div>

        {/* Card 2: Total de Gastos */}
        <motion.div
          id="kpi-total-gastos"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                TOTAL DE GASTOS
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#f43f5e] mt-1.5 tracking-tight">
                {formatCurrency(totalExpenses)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-slate-500">
            <span>{totalExpenses > 0 ? `${expensesGrowthPct}% de variação` : 'Aguardando registros de compras'}</span>
          </div>
        </motion.div>

        {/* Card 3: Lucro Líquido */}
        <motion.div
          id="kpi-lucro-liquido"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                LUCRO LÍQUIDO
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#10b981] mt-1.5 tracking-tight">
                {formatCurrency(netProfit)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-slate-500">
            <span>{netProfit !== 0 ? `${profitGrowthPct}% de margem líquida` : 'Receitas menos custos'}</span>
          </div>
        </motion.div>

        {/* Card 4: Produtos em Estoque */}
        <motion.div
          id="kpi-produtos-estoque"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                PRODUTOS EM ESTOQUE
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#8b5cf6] mt-1.5 tracking-tight">
                {formatQuantity(totalStockUnits)} un
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm shadow-purple-600/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-slate-500">
            <span>{totalStockUnits > 0 ? `${totalStockUnits} itens cadastrados` : 'Nenhum item em estoque'}</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Middle Section: 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Resumo de Vendas e Gastos (Line Chart) */}
        <div
          id="chart-vendas-gastos"
          className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Resumo de Vendas e Gastos</h2>
            <div className="flex items-center gap-2">
              <select
                id="select-period-linechart"
                value={lineChartPeriod}
                onChange={(e) => setLineChartPeriod(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-slate-700">Vendas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-700">Gastos</span>
            </div>
          </div>

          {/* SVG Line Chart or Clean Empty State */}
          <div className="relative w-full h-48 sm:h-52 flex items-center justify-center">
            {hasChartData ? (
              <svg
                className="w-full h-full overflow-visible"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                {/* Horizontal Grid lines */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((lvl, idx) => {
                  const y = chartHeight - paddingY - lvl * (chartHeight - paddingY * 2);
                  return (
                    <line
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Red Line (Gastos) */}
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={entriesPolyline}
                />
                {entriesPoints.map((pt, i) => (
                  <circle
                    key={`entry-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                ))}

                {/* Blue Line (Vendas) */}
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={salesPolyline}
                />
                {salesPoints.map((pt, i) => (
                  <circle
                    key={`sale-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                ))}

                {/* X Axis Labels */}
                {chartPoints.map((pt, i) => {
                  const x = paddingX + (i / Math.max(chartPoints.length - 1, 1)) * (chartWidth - paddingX * 2);
                  return (
                    <text
                      key={`label-${i}`}
                      x={x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#64748b"
                      className="font-medium"
                    >
                      {pt.label}
                    </text>
                  );
                })}
              </svg>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Nenhuma movimentação registrada</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                  Conforme registrar entradas e vendas no sistema, este gráfico exibirá a evolução diária em tempo real.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Vendas por Categoria (Donut Chart) */}
        <div
          id="chart-vendas-categoria"
          className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">Vendas por Categoria</h2>
            <select
              id="select-period-categoria"
              value={categoryPeriod}
              onChange={(e) => setCategoryPeriod(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="month">Este mês</option>
              <option value="all">Geral</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4 my-auto">
            {safeCategorySales.length > 0 ? (
              <>
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="14"
                    />
                    {safeCategorySales.map((cat, i) => {
                      const strokeLength = (cat.percentage / 100) * circumference;
                      const currentOffset = accumulatedCategoryOffset;
                      accumulatedCategoryOffset += strokeLength;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r={donutRadius}
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth="14"
                          strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                          strokeDashoffset={-currentOffset}
                          className="transition-all duration-500"
                        />
                      );
                    })}
                  </svg>
                </div>
                <div className="space-y-1.5 w-full text-xs">
                  {safeCategorySales.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-slate-700 font-medium truncate">{cat.name}</span>
                      </div>
                      <span className="text-slate-500 shrink-0 font-medium text-[11px]">
                        {Math.round(cat.value / 1000)}k ({cat.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Sem vendas categorizadas</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cadastre categorias e realize vendas para visualizar a distribuição.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Situação do Estoque (Donut with center total) */}
        <div
          id="chart-situacao-estoque"
          className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">Situação do Estoque</h2>
            <select
              id="select-filter-estoque"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="all">Todos</option>
              <option value="normal">Normal</option>
              <option value="low">Alerta</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4 my-auto">
            {stockBreakdown.total > 0 ? (
              <>
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="14"
                    />
                    {stockSlices.map((slice, i) => {
                      const strokeLength = (slice.pct / 100) * circumference;
                      const currentOffset = accumulatedStockOffset;
                      accumulatedStockOffset += strokeLength;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r={donutRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="14"
                          strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                          strokeDashoffset={-currentOffset}
                          className="transition-all duration-500"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-base font-black text-slate-900 leading-none">
                      {stockBreakdown.total}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                      Total
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 w-full text-xs">
                  {stockSlices.map((slice, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="text-slate-700 font-medium">{slice.label}</span>
                      </div>
                      <span className="text-slate-500 font-medium text-[11px]">
                        {slice.count} ({slice.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Boxes className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Estoque Vazio</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cadastre produtos e registre entradas para monitorar níveis de estoque.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Lower Section 1: 2 Tables (Últimas Vendas & Últimos Gastos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Table 1: Últimas Vendas */}
        <div
          id="table-ultimas-vendas"
          className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col"
        >
          <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Últimas Vendas</h2>
            <button
              id="btn-ver-todas-vendas"
              onClick={() => onNavigate('sales')}
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition-colors"
            >
              Ver todas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-tight">
                <tr>
                  <th className="py-2.5 px-4">ID Venda</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3 text-center">Quantidade</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {safeLatestSales.length > 0 ? (
                  safeLatestSales.map((sale, idx) => {
                    const saleIdStr = sale.id ? `#VND-${sale.id.slice(0, 5).toUpperCase()}` : `#VND-${String(idx + 1).padStart(5, '0')}`;
                    return (
                      <tr key={sale.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {saleIdStr}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {sale.client_name || 'Cliente'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 truncate max-w-[130px]">
                          {sale.product_name}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700">
                          {sale.quantity}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(sale.total_revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {formatDate(sale.sale_date)}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                            Concluída
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Nenhuma venda registrada ainda no sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Últimos Gastos / Entradas */}
        <div
          id="table-ultimos-gastos"
          className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col"
        >
          <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Últimos Gastos e Compras</h2>
            <button
              id="btn-ver-todos-gastos"
              onClick={() => onNavigate('entries')}
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition-colors"
            >
              Ver todas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-tight">
                <tr>
                  <th className="py-2.5 px-4">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-4 text-right">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {safeLatestExpenses.length > 0 ? (
                  safeLatestExpenses.map((exp, idx) => (
                    <tr key={exp.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-800 truncate max-w-[150px]">
                        {exp.description}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {exp.category}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(exp.value)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">
                        {exp.paymentMethod}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Nenhuma entrada ou despesa registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Lower Section 2: Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Action Card 1: Nova Venda */}
        <motion.div
          id="action-card-nova-venda"
          whileHover={{ y: -2 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">Novo Registro de Venda</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Registre uma nova venda rapidamente.
              </p>
            </div>
          </div>
          <button
            id="btn-quick-nova-venda"
            onClick={() => onNavigate('sales')}
            type="button"
            className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Nova Venda
          </button>
        </motion.div>

        {/* Action Card 2: Entrada Estoque */}
        <motion.div
          id="action-card-entrada-estoque"
          whileHover={{ y: -2 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ArrowDownToLine className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">Entrada no Estoque</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Adicione compras e reposições.
              </p>
            </div>
          </div>
          <button
            id="btn-quick-entrada-estoque"
            onClick={() => onNavigate('entries')}
            type="button"
            className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Nova Entrada
          </button>
        </motion.div>

        {/* Action Card 3: Saída de Estoque */}
        <motion.div
          id="action-card-saida-estoque"
          whileHover={{ y: -2 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <ArrowUpFromLine className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">Saída de Estoque</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Registre baixas, avarias ou usos.
              </p>
            </div>
          </div>
          <button
            id="btn-quick-saida-estoque"
            onClick={() => onNavigate('exits')}
            type="button"
            className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Nova Saída
          </button>
        </motion.div>

        {/* Action Card 4: Relatórios */}
        <motion.div
          id="action-card-relatorios"
          whileHover={{ y: -2 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">Relatórios Completos</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Demonstrativos para Excel e PDF.
              </p>
            </div>
          </div>
          <button
            id="btn-quick-ver-relatorios"
            onClick={() => onNavigate('reports')}
            type="button"
            className="w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Ver Relatórios
          </button>
        </motion.div>

        {/* Action Card 5: Alertas */}
        <motion.div
          id="action-card-alertas"
          whileHover={{ y: -2 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">Nível do Estoque</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {lowStockAlertsCount > 0 ? `${lowStockAlertsCount} itens em alerta` : 'Nenhum alerta crítico'}
              </p>
            </div>
          </div>
          <button
            id="btn-quick-ver-alertas"
            onClick={() => onNavigate('stock', 'low_stock')}
            type="button"
            className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Ver Estoque
          </button>
        </motion.div>
      </div>

      {/* 6. Footer */}
      <footer className="text-center pt-3 text-xs text-slate-400">
        <p>© 2025 INOVATEC. Todos os direitos reservados.</p>
      </footer>

      {/* Modal de Confirmação: Zerar Dados do Painel */}
      {isResetModalOpen && (
        <div
          id="reset-confirm-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Zerar Dados do Painel?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tem certeza que deseja zerar todos os registros de vendas, compras, saídas e movimentações da sua conta?
                </p>
                <div className="mt-3 p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xs text-rose-800 space-y-1">
                  <p className="font-semibold">O que acontecerá:</p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-700">
                    <li>Vendas totais serão redefinidas para <strong>0,00 MT</strong></li>
                    <li>Gastos totais serão redefinidos para <strong>0,00 MT</strong></li>
                    <li>Lucro líquido e relatórios ficarão <strong>zerados</strong></li>
                    <li>Produtos e registros de teste serão removidos</li>
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="cancel-reset-btn"
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-reset-btn"
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Zerando dados...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sim, Zerar Tudo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
