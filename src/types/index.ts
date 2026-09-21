export type StockStatus = 'normal' | 'low_stock' | 'out_of_stock';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  company_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  image_url: string | null;
  category_id: string | null;
  category_name?: string;
  description: string | null;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  minimum_stock: number;
  average_cost: number;
  status: StockStatus;
  created_at: string;
  updated_at: string;
}

export interface StockEntry {
  id: string;
  user_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  entry_date: string;
  notes: string | null;
  created_at: string;
}

export type StockExitReason = 
  | 'venda'
  | 'avaria'
  | 'perda'
  | 'consumo_interno'
  | 'descarte'
  | 'ajuste';

export interface StockExit {
  id: string;
  user_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reason: StockExitReason;
  exit_date: string;
  notes: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  product_id: string;
  product_name?: string;
  category_name?: string;
  quantity: number;
  unit_price: number;
  total_revenue: number;
  unit_cost: number;
  total_cost: number;
  gross_profit: number;
  margin_percentage: number;
  sale_date: string;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface CategorySalesBreakdown {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface DashboardExpenseItem {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  paymentMethod: string;
}

export interface DashboardMetrics {
  totalSales: number;
  todaySales: number;
  totalExpenses: number;
  todayEntries: number;
  netProfit: number;
  grossProfit: number;
  productsInStock: number;
  totalStockUnits: number;
  salesGrowthPct: number;
  expensesGrowthPct: number;
  profitGrowthPct: number;
  stockGrowthPct: number;
  stockBreakdown: {
    normal: number;
    normalPct: number;
    lowStock: number;
    lowStockPct: number;
    outOfStock: number;
    outOfStockPct: number;
    total: number;
  };
  salesVsEntries7Days: Array<{
    date: string;
    label: string;
    sales: number;
    entries: number;
  }>;
  categorySales: CategorySalesBreakdown[];
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    totalRevenue: number;
    imageUrl?: string | null;
  }>;
  latestSales: Array<Sale & { client_name?: string }>;
  latestExpenses: DashboardExpenseItem[];
  lowStockAlertsCount: number;
  isDatabaseSetupPending?: boolean;
}

export type ReportPeriod = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';
