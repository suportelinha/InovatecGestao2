import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, BarChart3, LineChart as LineChartIcon, Info } from 'lucide-react';
import { DailyRevenuePoint } from '../../services/reportService';
import { formatCurrency, formatQuantity } from '../../utils/formatters';

interface DailyRevenueChartProps {
  data: DailyRevenuePoint[];
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const point: DailyRevenuePoint = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[190px] z-50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
          <span className="font-bold text-slate-200">
            {point.label} ({point.dayName})
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
            {point.date}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Faturamento:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {formatCurrency(point.revenue)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Lucro Bruto:</span>
            <span className="font-medium text-purple-300">
              +{formatCurrency(point.grossProfit)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">Vendas realizadas:</span>
            <span className="font-semibold text-slate-200">
              {formatQuantity(point.salesCount)} {point.salesCount === 1 ? 'venda' : 'vendas'}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DailyRevenueChart: React.FC<DailyRevenueChartProps> = ({ data, loading }) => {
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  const total7Days = data.reduce((acc, p) => acc + p.revenue, 0);
  const totalSalesCount = data.reduce((acc, p) => acc + p.salesCount, 0);
  const averageDaily = total7Days / 7;
  const bestDay = [...data].sort((a, b) => b.revenue - a.revenue)[0];
  const hasAnyRevenue = total7Days > 0;

  // Find max value to give YAxis headroom
  const maxRevenue = Math.max(...data.map((p) => p.revenue), 100);
  const yAxisMax = Math.ceil(maxRevenue * 1.15);

  const formatYAxis = (val: number) => {
    if (val === 0) return '0 MT';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M MT`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k MT`;
    return `${val} MT`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 animate-pulse">
        <div className="h-6 bg-slate-100 rounded-md w-1/3 mb-4" />
        <div className="h-64 bg-slate-50 rounded-xl" />
      </div>
    );
  }

  return (
    <div
      id="daily-revenue-chart-card"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Faturamento Diário (Últimos 7 Dias)
              </h3>
              <p className="text-[11px] text-slate-400">
                Evolução diária das vendas e receitas no período
              </p>
            </div>
          </div>
        </div>

        {/* Toggle & Highlight stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 text-xs">
            <button
              id="chart-type-bar-btn"
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                chartType === 'bar'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>
            <button
              id="chart-type-area-btn"
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                chartType === 'area'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Área</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI quick counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Faturamento (7d)
          </span>
          <p className="text-sm font-extrabold text-slate-900 mt-0.5">
            {formatCurrency(total7Days)}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Média Diária
          </span>
          <p className="text-sm font-extrabold text-blue-600 mt-0.5">
            {formatCurrency(averageDaily)}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Vendas Totais (7d)
          </span>
          <p className="text-sm font-extrabold text-slate-700 mt-0.5">
            {formatQuantity(totalSalesCount)} pedidos
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Melhor Dia
          </span>
          <p className="text-sm font-extrabold text-emerald-600 mt-0.5 truncate">
            {bestDay && bestDay.revenue > 0 ? `${bestDay.label} (${formatCurrency(bestDay.revenue)})` : '-'}
          </p>
        </div>
      </div>

      {/* Zero State Alert */}
      {!hasAnyRevenue && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-800 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Nenhuma venda registrada nos últimos 7 dias. O gráfico exibirá os valores assim que novas vendas forem cadastradas.
          </span>
        </div>
      )}

      {/* Recharts Container */}
      <div className="w-full h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(val, idx) => {
                  const pt = data[idx];
                  return pt ? `${val} (${pt.dayName})` : val;
                }}
              />
              <YAxis
                domain={[0, yAxisMax]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={formatYAxis}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar
                dataKey="revenue"
                name="Faturamento"
                fill="url(#revenueBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(val, idx) => {
                  const pt = data[idx];
                  return pt ? `${val} (${pt.dayName})` : val;
                }}
              />
              <YAxis
                domain={[0, yAxisMax]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={formatYAxis}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Faturamento"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueAreaGradient)"
                activeDot={{ r: 5, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
