import { supabase, isTableMissingError } from '../lib/supabase';
import { DashboardMetrics, Sale, CategorySalesBreakdown, DashboardExpenseItem } from '../types';
import { getTodayDateString } from '../utils/formatters';

const CATEGORY_COLORS = ['#2563eb', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

export function getDefaultDashboardMetrics(isDatabaseSetupPending: boolean = false): DashboardMetrics {
  return {
    totalSales: 0,
    todaySales: 0,
    totalExpenses: 0,
    todayEntries: 0,
    netProfit: 0,
    grossProfit: 0,
    productsInStock: 0,
    totalStockUnits: 0,
    salesGrowthPct: 0,
    expensesGrowthPct: 0,
    profitGrowthPct: 0,
    stockGrowthPct: 0,
    stockBreakdown: {
      normal: 0,
      normalPct: 0,
      lowStock: 0,
      lowStockPct: 0,
      outOfStock: 0,
      outOfStockPct: 0,
      total: 0,
    },
    salesVsEntries7Days: [],
    categorySales: [],
    topSellingProducts: [],
    latestSales: [],
    latestExpenses: [],
    lowStockAlertsCount: 0,
    isDatabaseSetupPending,
  };
}

export const dashboardService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return getDefaultDashboardMetrics(false);
      }

      const todayStr = getTodayDateString();

      // 1. Fetch Products for Stock counts and Breakdown
      const { data: productsData, error: prodErr } = await supabase
        .from('products')
        .select('id, name, stock_quantity, minimum_stock, status, image_url, category_id, category:categories(name)')
        .eq('user_id', user.id);

      if (prodErr) {
        if (isTableMissingError(prodErr)) {
          return getDefaultDashboardMetrics(true);
        }
        throw prodErr;
      }
      const products = productsData || [];

      let normalCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalStockUnits = 0;

      products.forEach((p) => {
        const stock = Number(p.stock_quantity) || 0;
        const minStock = Number(p.minimum_stock) || 0;
        totalStockUnits += stock;

        if (stock <= 0) {
          outOfStockCount++;
        } else if (stock <= minStock) {
          lowStockCount++;
        } else {
          normalCount++;
        }
      });

      const totalProductsCount = products.length;
      const normalPct = totalProductsCount > 0 ? Math.round((normalCount / totalProductsCount) * 100) : 0;
      const lowStockPct = totalProductsCount > 0 ? Math.round((lowStockCount / totalProductsCount) * 100) : 0;
      const outOfStockPct = totalProductsCount > 0 ? Math.round((outOfStockCount / totalProductsCount) * 100) : 0;

      // 2. Fetch Sales
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select(`
          *,
          product:products(name, image_url, category:categories(name))
        `)
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (salesErr) {
        if (isTableMissingError(salesErr)) {
          return getDefaultDashboardMetrics(true);
        }
        throw salesErr;
      }
      const allSales = (salesData || []).map((s: any) => ({
        ...s,
        product_name: s.product?.name || 'Produto',
        category_name: s.product?.category?.name || 'Geral',
        product_image: s.product?.image_url,
      })) as (Sale & { product_image?: string | null; category_name?: string })[];

      // 3. Fetch Stock Entries
      const { data: entriesData, error: entriesErr } = await supabase
        .from('stock_entries')
        .select(`
          *,
          product:products(name)
        `)
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (entriesErr) {
        if (isTableMissingError(entriesErr)) {
          return getDefaultDashboardMetrics(true);
        }
        throw entriesErr;
      }
      const allEntries = entriesData || [];

      // Totals
      const totalSales = allSales.reduce((acc, s) => acc + Number(s.total_revenue || 0), 0);
      const todaySales = allSales
        .filter((s) => s.sale_date === todayStr)
        .reduce((acc, s) => acc + Number(s.total_revenue || 0), 0);

      const totalExpenses = allEntries.reduce((acc, e) => acc + Number(e.total_cost || 0), 0);
      const todayEntries = allEntries
        .filter((e) => e.entry_date === todayStr)
        .reduce((acc, e) => acc + Number(e.total_cost || 0), 0);

      const grossProfit = allSales.reduce((acc, s) => acc + Number(s.gross_profit || 0), 0);

      // 4. Last 7 Days chart points
      const last7Days: Array<{ date: string; label: string; sales: number; entries: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;
        const label = `${dd}/${mm}`;

        const daySales = allSales
          .filter((s) => s.sale_date === dateString)
          .reduce((acc, s) => acc + Number(s.total_revenue || 0), 0);

        const dayEntries = allEntries
          .filter((e) => e.entry_date === dateString)
          .reduce((acc, e) => acc + Number(e.total_cost || 0), 0);

        last7Days.push({
          date: dateString,
          label,
          sales: daySales,
          entries: dayEntries,
        });
      }

      // 5. Category Breakdown for Sales
      const categoryMap = new Map<string, number>();
      allSales.forEach((s) => {
        const cat = s.category_name || 'Outros';
        const cur = categoryMap.get(cat) || 0;
        categoryMap.set(cat, cur + Number(s.total_revenue || 0));
      });

      const categorySales: CategorySalesBreakdown[] = Array.from(categoryMap.entries()).map(([name, val], idx) => ({
        name,
        value: val,
        percentage: totalSales > 0 ? Math.round((val / totalSales) * 100) : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }));

      // 6. Top Selling Products
      const productSalesMap = new Map<string, { name: string; qty: number; revenue: number; img?: string | null }>();
      allSales.forEach((s) => {
        const cur = productSalesMap.get(s.product_id) || {
          name: s.product_name || 'Produto',
          qty: 0,
          revenue: 0,
          img: s.product_image,
        };
        cur.qty += Number(s.quantity || 0);
        cur.revenue += Number(s.total_revenue || 0);
        productSalesMap.set(s.product_id, cur);
      });

      const topSellingProducts = Array.from(productSalesMap.entries())
        .map(([id, data]) => ({
          productId: id,
          productName: data.name,
          quantitySold: data.qty,
          totalRevenue: data.revenue,
          imageUrl: data.img,
        }))
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5);

      // 7. Latest Sales with parsed client names
      const latestSales: Array<Sale & { client_name?: string }> = allSales.slice(0, 5).map((s) => {
        let client = 'Consumidor Final';
        if (s.notes) {
          const match = s.notes.match(/Cliente:\s*([^;,\n]+)/i);
          if (match && match[1]) client = match[1].trim();
        }
        return {
          ...s,
          client_name: client,
          status: s.status || 'Concluída',
        };
      });

      // 8. Latest Expenses (from real stock_entries)
      const latestExpenses: DashboardExpenseItem[] = allEntries.slice(0, 5).map((e: any) => ({
        id: e.id,
        description: e.product?.name ? `Compra: ${e.product.name}` : (e.notes || 'Entrada de Mercadorias'),
        category: 'Estoque',
        value: Number(e.total_cost || 0),
        date: e.entry_date,
        paymentMethod: 'À Vista',
      }));

      return {
        totalSales,
        todaySales,
        totalExpenses,
        todayEntries,
        netProfit: totalSales - totalExpenses,
        grossProfit,
        productsInStock: totalProductsCount,
        totalStockUnits: totalStockUnits,
        salesGrowthPct: 0,
        expensesGrowthPct: 0,
        profitGrowthPct: 0,
        stockGrowthPct: 0,
        stockBreakdown: {
          normal: normalCount,
          normalPct,
          lowStock: lowStockCount,
          lowStockPct,
          outOfStock: outOfStockCount,
          outOfStockPct,
          total: totalProductsCount,
        },
        salesVsEntries7Days: last7Days,
        categorySales,
        topSellingProducts,
        latestSales,
        latestExpenses,
        lowStockAlertsCount: lowStockCount + outOfStockCount,
        isDatabaseSetupPending: false,
      };
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return getDefaultDashboardMetrics(true);
      }
      console.warn('Aviso ao carregar métricas do dashboard:', err);
      return getDefaultDashboardMetrics(false);
    }
  },

  async resetAllData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Delete operational records in sequence respecting foreign keys
    await supabase.from('sales').delete().eq('user_id', user.id);
    await supabase.from('stock_exits').delete().eq('user_id', user.id);
    await supabase.from('stock_entries').delete().eq('user_id', user.id);
    await supabase.from('products').delete().eq('user_id', user.id);
  },
};
