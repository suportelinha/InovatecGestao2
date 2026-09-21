import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Search,
  AlertTriangle,
  Package,
  TrendingDown,
  TrendingUp,
  Coins,
  History,
  ArrowDownToLine,
  ShoppingCart,
} from 'lucide-react';
import { productService } from '../services/productService';
import { stockEntryService } from '../services/stockEntryService';
import { saleService } from '../services/saleService';
import { Product, StockStatus, StockEntry, Sale } from '../types';
import {
  formatCurrency,
  formatQuantity,
  formatDate,
  formatDateTime,
} from '../utils/formatters';
import { StockBadge } from '../components/common/StockBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useToast } from '../contexts/ToastContext';

interface StockPageProps {
  initialStatusFilter?: string;
}

export const StockPage: React.FC<StockPageProps> = ({ initialStatusFilter = 'all' }) => {
  const { error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);

  // Movement history modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts();
      setProducts(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar estoque:', err);
      error(err.message || 'Erro ao carregar dados do estoque.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Load consolidated movements (entries and sales together)
  const handleOpenMovementHistory = async () => {
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const [entries, sales] = await Promise.all([
        stockEntryService.getStockEntries(),
        saleService.getSales(),
      ]);

      const formattedEntries = (entries || []).map((e) => ({
        id: `entry-${e.id}`,
        type: 'entry' as const,
        date: e.entry_date,
        createdAt: e.created_at,
        productName: e.product_name,
        quantity: e.quantity,
        unitValue: e.unit_cost,
        totalValue: e.total_cost,
        notes: e.notes,
      }));

      const formattedSales = (sales || []).map((s) => ({
        id: `sale-${s.id}`,
        type: 'sale' as const,
        date: s.sale_date,
        createdAt: s.created_at,
        productName: s.product_name,
        quantity: s.quantity,
        unitValue: s.unit_price,
        totalValue: s.total_revenue,
        notes: s.notes,
      }));

      const combined = [...formattedEntries, ...formattedSales].sort((a, b) => {
        return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
      });

      setHistoryItems(combined);
    } catch (err: any) {
      console.error('Erro ao buscar histórico de movimentações:', err);
      error('Não foi possível carregar o histórico de movimentações.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Calculations for Metrics Cards
  const safeProducts = Array.isArray(products) ? products : [];
  const totalInventoryValue = safeProducts.reduce((acc, p) => {
    const qty = Number(p.stock_quantity) || 0;
    const avg = Number(p.average_cost) || 0;
    return acc + (qty > 0 ? qty * avg : 0);
  }, 0);

  const totalUnits = safeProducts.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0);
  const lowStockCount = safeProducts.filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock').length;

  // Filter products by search and status
  const filteredProducts = safeProducts.filter((p) => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="stock-control-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Controle de Estoque</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento detalhado da situação, custo médio ponderado e valorização patrimonial
          </p>
        </div>

        <button
          id="open-movement-history-btn"
          type="button"
          onClick={handleOpenMovementHistory}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span>Histórico de Movimentações</span>
        </button>
      </div>

      {/* Stock Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Valor Total do Estoque
          </span>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {formatCurrency(totalInventoryValue)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Valorizado pelo custo médio ponderado
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Unidades Totais em Estoque
          </span>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {formatQuantity(totalUnits)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Somatório de todos os itens disponíveis
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Itens em Alerta
          </span>
          <p className="text-2xl font-extrabold text-amber-600 tracking-tight mt-1">
            {lowStockCount}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Abaixo do estoque mínimo ou zerados
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-stock-input"
            type="text"
            placeholder="Pesquisar produto no estoque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'normal', label: '🟢 Normal' },
            { id: 'low_stock', label: '🟡 Estoque baixo' },
            { id: 'out_of_stock', label: '🔴 Sem estoque' },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`filter-stock-btn-${tab.id}`}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 animate-pulse h-60" />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          id="stock-empty-state"
          icon={Boxes}
          title="Nenhum produto encontrado no estoque."
          description="Ajuste os filtros de status ou o termo de busca para visualizar os itens."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                  <th className="py-3 px-4 text-right">Custo Médio</th>
                  <th className="py-3 px-4 text-right">Preço de Venda</th>
                  <th className="py-3 px-4 text-right">Valor do Estoque</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const stockQty = Number(p.stock_quantity) || 0;
                  const avgCost = Number(p.average_cost) || 0;
                  const inventoryVal = stockQty > 0 ? stockQty * avgCost : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {p.category_name || 'Sem categoria'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                        {formatQuantity(p.stock_quantity)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500">
                        {formatQuantity(p.minimum_stock)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 font-medium">
                        {formatCurrency(p.average_cost)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-700 font-semibold">
                        {formatCurrency(p.sale_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {formatCurrency(inventoryVal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StockBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Histórico de Movimentações */}
      <Modal
        id="movements-history-modal"
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Histórico de Movimentações de Estoque"
        subtitle="Linha do tempo consolidada de todas as entradas e vendas realizadas"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">Carregando movimentações...</div>
          ) : historyItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhuma movimentação de estoque registrada até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {historyItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'entry'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {item.type === 'entry' ? (
                        <ArrowDownToLine className="w-4 h-4" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(item.date)} &bull; {item.type === 'entry' ? 'Entrada' : 'Venda'}
                        {item.notes ? ` (${item.notes})` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        item.type === 'entry' ? 'text-blue-700' : 'text-emerald-700'
                      }`}
                    >
                      {item.type === 'entry' ? '+' : '-'}
                      {formatQuantity(item.quantity)} un
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {formatCurrency(item.totalValue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
