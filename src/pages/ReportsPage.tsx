import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  TrendingUp,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  Coins,
  Percent,
} from 'lucide-react';
import { motion } from 'motion/react';
import { reportService, ReportPeriod, ReportType, DailyRevenuePoint } from '../services/reportService';
import { formatCurrency, formatQuantity, formatPercent, formatDate } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import { StockBadge } from '../components/common/StockBadge';
import { DailyRevenueChart } from '../components/reports/DailyRevenueChart';

export const ReportsPage: React.FC = () => {
  const { success, error } = useToast();

  const [activeReportType, setActiveReportType] = useState<ReportType>('sales');
  const [periodPreset, setPeriodPreset] = useState<'today' | '7days' | '30days' | 'current_month' | 'custom'>('current_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState<any>(null);
  const [dailyRevenueData, setDailyRevenueData] = useState<DailyRevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  // Set initial dates based on preset
  useEffect(() => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (periodPreset === 'today') {
      const d = toYMD(today);
      setStartDate(d);
      setEndDate(d);
    } else if (periodPreset === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setStartDate(toYMD(past));
      setEndDate(toYMD(today));
    } else if (periodPreset === '30days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setStartDate(toYMD(past));
      setEndDate(toYMD(today));
    } else if (periodPreset === 'current_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(today));
    }
  }, [periodPreset]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const period: ReportPeriod = {
        preset: periodPreset,
        startDate: periodPreset === 'custom' ? startDate : undefined,
        endDate: periodPreset === 'custom' ? endDate : undefined,
      };

      if (activeReportType === 'sales') {
        const [salesData, revenue7d] = await Promise.all([
          reportService.getSalesReport(period),
          reportService.getLast7DaysDailyRevenue(),
        ]);
        setReportData(salesData);
        setDailyRevenueData(revenue7d);
      } else if (activeReportType === 'stock') {
        const data = await reportService.getStockReport();
        setReportData(data);
      } else if (activeReportType === 'entries') {
        const data = await reportService.getEntriesReport(period);
        setReportData(data);
      } else if (activeReportType === 'exits') {
        const data = await reportService.getExitsReport(period);
        setReportData(data);
      }
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      error(err.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [activeReportType, periodPreset, startDate, endDate, error]);

  useEffect(() => {
    if (startDate && endDate) {
      loadReport();
    }
  }, [loadReport, startDate, endDate]);

  // Export Handlers
  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const period: ReportPeriod = {
        preset: periodPreset,
        startDate: periodPreset === 'custom' ? startDate : undefined,
        endDate: periodPreset === 'custom' ? endDate : undefined,
      };
      await reportService.exportToExcel(activeReportType, period);
      success('Relatório Excel exportado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao exportar Excel:', err);
      error(err.message || 'Erro ao exportar arquivo Excel');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const period: ReportPeriod = {
        preset: periodPreset,
        startDate: periodPreset === 'custom' ? startDate : undefined,
        endDate: periodPreset === 'custom' ? endDate : undefined,
      };
      await reportService.exportToPdf(activeReportType, period);
      success('Relatório PDF exportado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao exportar PDF:', err);
      error(err.message || 'Erro ao exportar arquivo PDF');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div id="reports-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Relatórios Gerenciais</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrativos de vendas, estoque e compras com exportação em tempo real para Excel e PDF
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="export-excel-btn"
            type="button"
            onClick={handleExportExcel}
            disabled={exporting !== null || loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{exporting === 'excel' ? 'Gerando...' : 'Exportar Excel (.xlsx)'}</span>
          </button>

          <button
            id="export-pdf-btn"
            type="button"
            onClick={handleExportPDF}
            disabled={exporting !== null || loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>{exporting === 'pdf' ? 'Gerando...' : 'Exportar PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* Report Selection & Period Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Report Types Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            id="report-type-sales-btn"
            type="button"
            onClick={() => {
              if (activeReportType !== 'sales') {
                setActiveReportType('sales');
                setReportData(null);
              }
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeReportType === 'sales'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Relatório de Vendas</span>
          </button>

          <button
            id="report-type-stock-btn"
            type="button"
            onClick={() => {
              if (activeReportType !== 'stock') {
                setActiveReportType('stock');
                setReportData(null);
              }
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeReportType === 'stock'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Relatório de Estoque</span>
          </button>

          <button
            id="report-type-entries-btn"
            type="button"
            onClick={() => {
              if (activeReportType !== 'entries') {
                setActiveReportType('entries');
                setReportData(null);
              }
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeReportType === 'entries'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Relatório de Entradas</span>
          </button>

          <button
            id="report-type-exits-btn"
            type="button"
            onClick={() => {
              if (activeReportType !== 'exits') {
                setActiveReportType('exits');
                setReportData(null);
              }
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeReportType === 'exits'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Relatório de Saídas</span>
          </button>
        </div>

        {/* Date Filters (Only if report supports period, i.e. sales & entries) */}
        {activeReportType !== 'stock' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'today', label: 'Hoje' },
                { id: '7days', label: 'Últimos 7 dias' },
                { id: '30days', label: 'Últimos 30 dias' },
                { id: 'current_month', label: 'Mês atual' },
                { id: 'custom', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  id={`period-preset-${p.id}`}
                  type="button"
                  onClick={() => setPeriodPreset(p.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    periodPreset === p.id
                      ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {periodPreset === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={loadReport}
                  className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Filtrar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 animate-pulse h-72" />
      ) : activeReportType === 'sales' && Array.isArray(reportData?.sales) ? (
        /* Vendas Report */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Faturamento Total</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(reportData.totalRevenue)}
              </p>
              <p className="text-[10px] text-slate-400">{reportData.salesCount || 0} vendas no período</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Custo Total (CMV)</span>
              <p className="text-xl font-extrabold text-slate-700 mt-1">
                {formatCurrency(reportData.totalCost)}
              </p>
              <p className="text-[10px] text-slate-400">Custo histórico das mercadorias</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Lucro Bruto</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-1">
                +{formatCurrency(reportData.grossProfit)}
              </p>
              <p className="text-[10px] text-slate-400">Receita menos custos</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Margem Média</span>
              <p className="text-xl font-extrabold text-purple-600 mt-1">
                {formatPercent(reportData.averageMargin)}
              </p>
              <p className="text-[10px] text-slate-400">Margem percentual consolidada</p>
            </div>
          </div>

          {/* Recharts Daily Revenue Chart (Últimos 7 Dias) */}
          <DailyRevenueChart data={dailyRevenueData || []} loading={loading} />

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Detalhamento das Vendas do Período</h3>
              <span className="text-xs text-slate-500">{reportData.sales?.length ?? 0} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Quantidade</th>
                    <th className="py-3 px-4 text-right">Preço Unit.</th>
                    <th className="py-3 px-4 text-right">Faturamento</th>
                    <th className="py-3 px-4 text-right">Custo Total</th>
                    <th className="py-3 px-4 text-right">Lucro Bruto</th>
                    <th className="py-3 px-4 text-center">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.sales || []).map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(s.sale_date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.product_name}</td>
                      <td className="py-3 px-4 text-center font-semibold">{formatQuantity(s.quantity)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(s.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(s.total_revenue)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(s.total_cost)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">+{formatCurrency(s.gross_profit)}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">{formatPercent(s.margin_percentage)}</td>
                    </tr>
                  ))}
                  {(!reportData.sales || reportData.sales.length === 0) && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhuma venda registrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeReportType === 'stock' && Array.isArray(reportData?.products) ? (
        /* Estoque Report */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Total de Produtos</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {reportData.totalProducts || 0} itens
              </p>
              <p className="text-[10px] text-slate-400">{formatQuantity(reportData.totalUnits || 0)} unidades físicas</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Valor do Estoque (MT)</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(reportData.totalInventoryValue || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Pelo custo médio ponderado</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Estoque Baixo</span>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                {reportData.lowStockCount || 0} produtos
              </p>
              <p className="text-[10px] text-slate-400">Abaixo do mínimo configurado</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Sem Estoque</span>
              <p className="text-xl font-extrabold text-rose-600 mt-1">
                {reportData.outOfStockCount || 0} produtos
              </p>
              <p className="text-[10px] text-slate-400">Totalmente esgotados</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Posição Atual de Todos os Produtos</h3>
              <span className="text-xs text-slate-500">{reportData.products?.length ?? 0} itens</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Estoque Atual</th>
                    <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                    <th className="py-3 px-4 text-right">Custo Médio</th>
                    <th className="py-3 px-4 text-right">Preço Venda</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.products || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category_name || '-'}</td>
                      <td className="py-3 px-4 text-center font-bold">{formatQuantity(p.stock_quantity)}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{formatQuantity(p.minimum_stock)}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(p.average_cost)}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(p.sale_price)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(p.stock_quantity * p.average_cost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StockBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                  {(!reportData.products || reportData.products.length === 0) && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhum produto cadastrado no sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeReportType === 'entries' && Array.isArray(reportData?.entries) ? (
        /* Entradas Report */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Total de Entradas</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {reportData.entriesCount || 0} registros
              </p>
              <p className="text-[10px] text-slate-400">Total de compras ou reposições</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Custo Total de Compras</span>
              <p className="text-xl font-extrabold text-blue-700 mt-1">
                {formatCurrency(reportData.totalCost || 0)}
              </p>
              <p className="text-[10px] text-slate-400">Investimento financeiro em mercadorias</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Detalhamento das Entradas do Período</h3>
              <span className="text-xs text-slate-500">{reportData.entries?.length ?? 0} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Quantidade</th>
                    <th className="py-3 px-4 text-right">Custo Unitário</th>
                    <th className="py-3 px-4 text-right">Custo Total</th>
                    <th className="py-3 px-4">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.entries || []).map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(e.entry_date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{e.product_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">+{formatQuantity(e.quantity)}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(e.unit_cost)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(e.total_cost)}</td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{e.notes || '-'}</td>
                    </tr>
                  ))}
                  {(!reportData.entries || reportData.entries.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma entrada de estoque registrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeReportType === 'exits' && Array.isArray(reportData?.exits) ? (
        /* Saídas Report */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Total de Saídas</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {reportData.exitsCount || 0} registros
              </p>
              <p className="text-[10px] text-slate-400">Total de baixas ou saídas de mercadorias</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Unidades Retiradas</span>
              <p className="text-xl font-extrabold text-amber-700 mt-1">
                {formatQuantity(reportData.totalUnits || 0)} un
              </p>
              <p className="text-[10px] text-slate-400">Total de itens baixados do estoque</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Detalhamento das Saídas do Período</h3>
              <span className="text-xs text-slate-500">{reportData.exits?.length ?? 0} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Quantidade</th>
                    <th className="py-3 px-4 text-right">Custo Unitário</th>
                    <th className="py-3 px-4 text-right">Custo Total</th>
                    <th className="py-3 px-4 text-center">Motivo</th>
                    <th className="py-3 px-4">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.exits || []).map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(e.exit_date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{e.product_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600">-{formatQuantity(e.quantity)}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(e.unit_cost)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(e.total_cost)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {e.reason === 'venda' ? 'Venda' : e.reason === 'avaria' ? 'Avaria' : e.reason === 'perda' ? 'Perda' : e.reason === 'consumo_interno' ? 'Consumo Interno' : e.reason === 'descarte' ? 'Descarte' : e.reason === 'ajuste' ? 'Ajuste' : 'Outro'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{e.notes || '-'}</td>
                    </tr>
                  ))}
                  {(!reportData.exits || reportData.exits.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma saída de estoque registrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
