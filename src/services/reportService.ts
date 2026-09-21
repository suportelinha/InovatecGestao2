import { supabase, isTableMissingError } from '../lib/supabase';
import { Product, Sale, StockEntry, StockExit, StockExitReason } from '../types';
import { formatCurrency, formatQuantity, formatPercent, formatDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ReportType = 'sales' | 'stock' | 'entries' | 'exits';

export interface ReportPeriod {
  preset: 'today' | '7days' | '30days' | 'current_month' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  label: string; // DD/MM
  dayName: string; // Seg, Ter, etc.
  revenue: number;
  salesCount: number;
  grossProfit: number;
}

const padNumber = (n: number) => n.toString().padStart(2, '0');
const toYMDDate = (d: Date) => `${d.getFullYear()}-${padNumber(d.getMonth() + 1)}-${padNumber(d.getDate())}`;

export function getDateRangeFromPeriod(period: ReportPeriod): DateRange {
  const today = new Date();
  const toYMD = toYMDDate;

  if (period.preset === 'custom' && period.startDate && period.endDate) {
    return { startDate: period.startDate, endDate: period.endDate };
  }

  const todayStr = toYMD(today);

  switch (period.preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    case '7days': {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      return { startDate: toYMD(past), endDate: todayStr };
    }
    case '30days': {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      return { startDate: toYMD(past), endDate: todayStr };
    }
    case 'current_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: toYMD(firstDay), endDate: todayStr };
    }
    default:
      return { startDate: period.startDate || todayStr, endDate: period.endDate || todayStr };
  }
}

export const reportService = {
  // Sales Report
  async getSalesReport(period: ReportPeriod) {
    const range = getDateRangeFromPeriod(period);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        sales: [],
        salesCount: 0,
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        averageMargin: 0,
        dateRange: range,
      };
    }

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        product:products(name, category:categories(name))
      `)
      .eq('user_id', user.id)
      .gte('sale_date', range.startDate)
      .lte('sale_date', range.endDate)
      .order('sale_date', { ascending: false });

    if (error) throw error;

    const sales: Sale[] = (data || []).map((s: any) => ({
      ...s,
      product_name: s.product?.name || 'Produto',
      category_name: s.product?.category?.name || 'Sem categoria',
    }));

    const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.total_revenue) || 0), 0);
    const totalCost = sales.reduce((acc, s) => acc + (Number(s.total_cost) || 0), 0);
    const grossProfit = sales.reduce((acc, s) => acc + (Number(s.gross_profit) || 0), 0);
    const averageMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      sales,
      salesCount: sales.length,
      totalRevenue,
      totalCost,
      grossProfit,
      averageMargin,
      dateRange: range,
    };
  },

  // Daily Revenue for the last 7 days
  async getLast7DaysDailyRevenue(): Promise<DailyRevenuePoint[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 6);

    const startStr = toYMDDate(startDate);
    const endStr = toYMDDate(today);

    const { data, error } = await supabase
      .from('sales')
      .select('sale_date, total_revenue, gross_profit')
      .eq('user_id', user.id)
      .gte('sale_date', startStr)
      .lte('sale_date', endStr);

    if (error) {
      if (isTableMissingError(error)) return [];
      throw error;
    }

    const sales = data || [];
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const points: DailyRevenuePoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = toYMDDate(d);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const label = `${dd}/${mm}`;
      const dayName = weekdays[d.getDay()];

      const daySales = sales.filter((s: any) => s.sale_date === dateStr);
      const revenue = daySales.reduce((acc: number, s: any) => acc + (Number(s.total_revenue) || 0), 0);
      const grossProfit = daySales.reduce((acc: number, s: any) => acc + (Number(s.gross_profit) || 0), 0);

      points.push({
        date: dateStr,
        label,
        dayName,
        revenue,
        salesCount: daySales.length,
        grossProfit,
      });
    }

    return points;
  },

  // Stock Report
  async getStockReport() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        products: [],
        totalProducts: 0,
        totalUnits: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };
    }

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) throw error;

    const products: Product[] = (data || []).map((p: any) => {
      const stock = Number(p.stock_quantity) || 0;
      const min = Number(p.minimum_stock) || 0;
      let status: 'normal' | 'low_stock' | 'out_of_stock' = 'normal';
      if (stock <= 0) {
        status = 'out_of_stock';
      } else if (stock <= min) {
        status = 'low_stock';
      }

      return {
        ...p,
        category_name: p.category?.name || 'Sem categoria',
        status,
      };
    });

    const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0);
    const totalInventoryValue = products.reduce((acc, p) => {
      const qty = Number(p.stock_quantity) || 0;
      const avg = Number(p.average_cost) || 0;
      return acc + (qty > 0 ? qty * avg : 0);
    }, 0);

    const lowStockCount = products.filter((p) => p.status === 'low_stock').length;
    const outOfStockCount = products.filter((p) => p.status === 'out_of_stock').length;

    return {
      products,
      totalProducts: products.length,
      totalUnits,
      totalInventoryValue,
      lowStockCount,
      outOfStockCount,
    };
  },

  // Entries Report
  async getEntriesReport(period: ReportPeriod) {
    const range = getDateRangeFromPeriod(period);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        entries: [],
        entriesCount: 0,
        totalCost: 0,
        totalUnits: 0,
        dateRange: range,
      };
    }

    const { data, error } = await supabase
      .from('stock_entries')
      .select(`
        *,
        product:products(name)
      `)
      .eq('user_id', user.id)
      .gte('entry_date', range.startDate)
      .lte('entry_date', range.endDate)
      .order('entry_date', { ascending: false });

    if (error) throw error;

    const entries: StockEntry[] = (data || []).map((e: any) => ({
      ...e,
      product_name: e.product?.name || 'Produto',
    }));

    const totalCost = entries.reduce((acc, e) => acc + (Number(e.total_cost) || 0), 0);
    const totalUnits = entries.reduce((acc, e) => acc + (Number(e.quantity) || 0), 0);

    return {
      entries,
      entriesCount: entries.length,
      totalCost,
      totalUnits,
      dateRange: range,
    };
  },

  // Exits Report
  async getExitsReport(period: ReportPeriod) {
    const range = getDateRangeFromPeriod(period);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { exits: [], exitsCount: 0, totalUnits: 0, dateRange: range };
    }

    try {
      const { data, error } = await supabase
        .from('stock_exits')
        .select(`
          *,
          product:products(name)
        `)
        .eq('user_id', user.id)
        .gte('exit_date', range.startDate)
        .lte('exit_date', range.endDate)
        .order('exit_date', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return { exits: [], exitsCount: 0, totalUnits: 0, dateRange: range };
        }
        throw error;
      }

      const exits: StockExit[] = (data || []).map((e: any) => ({
        ...e,
        product_name: e.product?.name || 'Produto',
      }));

      const totalUnits = exits.reduce((acc, e) => acc + (Number(e.quantity) || 0), 0);

      return {
        exits,
        exitsCount: exits.length,
        totalUnits,
        dateRange: range,
      };
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return { exits: [], exitsCount: 0, totalUnits: 0, dateRange: range };
      }
      throw err;
    }
  },

  // Export to Excel (.xlsx)
  async exportToExcel(type: ReportType, period: ReportPeriod) {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let sheetName = 'Relatorio';
    let fileName = `INOVATEC_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}`;

    if (type === 'sales') {
      const data = await this.getSalesReport(period);
      sheetName = 'Vendas';
      headers = [
        'Data',
        'Produto',
        'Categoria',
        'Quantidade',
        'Preco Unitario (MT)',
        'Faturamento Total (MT)',
        'Custo Total (MT)',
        'Lucro Bruto (MT)',
        'Margem (%)',
        'Observacoes',
      ];
      rows = data.sales.map((s) => [
        formatDate(s.sale_date),
        s.product_name || 'Produto',
        s.category_name || '',
        s.quantity,
        s.unit_price,
        s.total_revenue,
        s.total_cost,
        s.gross_profit,
        Number(s.margin_percentage.toFixed(2)),
        s.notes || '',
      ]);
    } else if (type === 'stock') {
      const data = await this.getStockReport();
      sheetName = 'Estoque';
      headers = [
        'Produto',
        'Categoria',
        'Estoque Atual',
        'Estoque Minimo',
        'Custo Medio (MT)',
        'Preco Venda (MT)',
        'Valor Total do Estoque (MT)',
        'Status',
      ];
      rows = data.products.map((p) => [
        p.name,
        p.category_name || '',
        p.stock_quantity,
        p.minimum_stock,
        p.average_cost,
        p.sale_price,
        Number((p.stock_quantity * p.average_cost).toFixed(2)),
        p.status === 'normal' ? 'Normal' : p.status === 'low_stock' ? 'Estoque Baixo' : 'Sem Estoque',
      ]);
    } else if (type === 'entries') {
      const data = await this.getEntriesReport(period);
      sheetName = 'Entradas';
      headers = [
        'Data',
        'Produto',
        'Quantidade',
        'Custo Unitario (MT)',
        'Custo Total (MT)',
        'Observacoes',
      ];
      rows = data.entries.map((e) => [
        formatDate(e.entry_date),
        e.product_name || 'Produto',
        e.quantity,
        e.unit_cost,
        e.total_cost,
        e.notes || '',
      ]);
    } else if (type === 'exits') {
      const data = await this.getExitsReport(period);
      sheetName = 'Saidas';
      headers = [
        'Data',
        'Produto',
        'Quantidade',
        'Custo Unitario',
        'Custo Total',
        'Motivo',
        'Observacoes',
      ];
      const getReasonLabel = (reason: StockExitReason): string => {
        const map: Record<StockExitReason, string> = {
          venda: 'Venda',
          avaria: 'Avaria',
          perda: 'Perda',
          consumo_interno: 'Consumo Interno',
          descarte: 'Descarte',
          ajuste: 'Ajuste',
        };
        return map[reason] || String(reason || 'Outro');
      };
      rows = data.exits.map((e) => [
        formatDate(e.exit_date),
        e.product_name || 'Produto',
        e.quantity,
        formatCurrency(e.unit_cost),
        formatCurrency(e.total_cost),
        getReasonLabel(e.reason),
        e.notes || '',
      ]);
    }

    const tableData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(tableData);

    // Auto fit column widths
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      rows.forEach((r) => {
        const valStr = String(r[i] ?? '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  },

  // Export to PDF (.pdf)
  async exportToPdf(type: ReportType, period: ReportPeriod) {
    let title = 'Relatório';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let periodText = 'Geral';
    let fileName = `INOVATEC_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}`;

    if (type === 'sales') {
      const data = await this.getSalesReport(period);
      title = 'Relatório de Vendas & Faturamento';
      periodText = `${formatDate(data.dateRange.startDate)} até ${formatDate(data.dateRange.endDate)}`;
      headers = [
        'Data',
        'Produto',
        'Qtd',
        'Preço Unit.',
        'Faturamento',
        'Custo',
        'Lucro Bruto',
        'Margem',
      ];
      rows = data.sales.map((s) => [
        formatDate(s.sale_date),
        s.product_name || 'Produto',
        formatQuantity(s.quantity),
        formatCurrency(s.unit_price),
        formatCurrency(s.total_revenue),
        formatCurrency(s.total_cost),
        formatCurrency(s.gross_profit),
        formatPercent(s.margin_percentage),
      ]);
    } else if (type === 'stock') {
      const data = await this.getStockReport();
      title = 'Relatório de Posição de Estoque';
      periodText = `Posição Atual em ${new Date().toLocaleDateString('pt-MZ')}`;
      headers = [
        'Produto',
        'Categoria',
        'Estoque',
        'Mínimo',
        'Custo Médio',
        'Preço Venda',
        'Valor Total',
        'Status',
      ];
      rows = data.products.map((p) => [
        p.name,
        p.category_name || '-',
        formatQuantity(p.stock_quantity),
        formatQuantity(p.minimum_stock),
        formatCurrency(p.average_cost),
        formatCurrency(p.sale_price),
        formatCurrency(p.stock_quantity * p.average_cost),
        p.status === 'normal' ? 'Normal' : p.status === 'low_stock' ? 'Estoque Baixo' : 'Sem Estoque',
      ]);
    } else if (type === 'entries') {
      const data = await this.getEntriesReport(period);
      title = 'Relatório de Entradas de Mercadorias';
      periodText = `${formatDate(data.dateRange.startDate)} até ${formatDate(data.dateRange.endDate)}`;
      headers = [
        'Data',
        'Produto',
        'Quantidade',
        'Custo Unitário',
        'Custo Total',
        'Observações',
      ];
      rows = data.entries.map((e) => [
        formatDate(e.entry_date),
        e.product_name || 'Produto',
        `+${formatQuantity(e.quantity)}`,
        formatCurrency(e.unit_cost),
        formatCurrency(e.total_cost),
        e.notes || '-',
      ]);
    } else if (type === 'exits') {
      const data = await this.getExitsReport(period);
      title = 'Relatório de Saídas de Estoque';
      periodText = `${formatDate(data.dateRange.startDate)} até ${formatDate(data.dateRange.endDate)}`;
      headers = [
        'Data',
        'Produto',
        'Quantidade',
        'Custo Unit.',
        'Custo Total',
        'Motivo',
        'Observações',
      ];
      const getReasonLabel = (reason: StockExitReason): string => {
        const map: Record<StockExitReason, string> = {
          venda: 'Venda',
          avaria: 'Avaria',
          perda: 'Perda',
          consumo_interno: 'Consumo Interno',
          descarte: 'Descarte',
          ajuste: 'Ajuste',
        };
        return map[reason] || String(reason || 'Outro');
      };
      rows = data.exits.map((e) => [
        formatDate(e.exit_date),
        e.product_name || 'Produto',
        `-${formatQuantity(e.quantity)}`,
        formatCurrency(e.unit_cost),
        formatCurrency(e.total_cost),
        getReasonLabel(e.reason),
        e.notes || '-',
      ]);
    }

    const doc = new jsPDF({
      orientation: headers.length > 6 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Brand Header
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('INOVATEC - Gestão de Estoque e Vendas', 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(title, 14, 22);

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Período: ${periodText} | Moeda: MT | Gerado em: ${new Date().toLocaleDateString('pt-MZ')} às ${new Date().toLocaleTimeString('pt-MZ')}`,
      14,
      28
    );

    autoTable(doc, {
      startY: 32,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 32, left: 14, right: 14 },
    });

    doc.save(`${fileName}.pdf`);
  },
};
