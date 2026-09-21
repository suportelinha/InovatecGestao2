import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Calendar,
} from 'lucide-react';
import { saleService, CreateSaleInput } from '../services/saleService';
import { productService } from '../services/productService';
import { Sale, Product } from '../types';
import {
  formatCurrency,
  formatQuantity,
  formatPercent,
  formatDate,
  getTodayDateString,
} from '../utils/formatters';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useToast } from '../contexts/ToastContext';

export const SalesPage: React.FC = () => {
  const { success, error } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number | string>('1');
  const [unitPrice, setUnitPrice] = useState<number | string>('');
  const [saleDate, setSaleDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesData, productsData] = await Promise.all([
        saleService.getSales(),
        productService.getProducts(),
      ]);
      setSales(salesData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      console.error('Erro ao carregar vendas:', err);
      error(err.message || 'Erro ao carregar dados de vendas.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When selecting product, auto-fill unitPrice from product.sale_price
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setUnitPrice(prod.sale_price);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const availableStock = selectedProduct ? Number(selectedProduct.stock_quantity) || 0 : 0;
  const unitCost = selectedProduct ? Number(selectedProduct.average_cost) || 0 : 0;

  const numericQuantity = Number(quantity) || 0;
  const numericUnitPrice = Number(unitPrice) || 0;

  const totalRevenue = numericQuantity * numericUnitPrice;
  const totalCost = numericQuantity * unitCost;
  const grossProfit = totalRevenue - totalCost;
  const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const stockAfterSale = availableStock - numericQuantity;
  const isStockInsufficient = numericQuantity > availableStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      error('Selecione o produto a ser vendido.');
      return;
    }
    if (numericQuantity <= 0) {
      error('A quantidade deve ser maior que zero.');
      return;
    }
    if (isStockInsufficient) {
      error(`Estoque insuficiente. Disponível: ${availableStock} unidades.`);
      return;
    }

    setActionLoading(true);
    try {
      const input: CreateSaleInput = {
        productId: selectedProductId,
        quantity: numericQuantity,
        unitPrice: numericUnitPrice,
        saleDate,
        notes: notes.trim() || null,
      };

      await saleService.createSale(input);
      success('Venda realizada com sucesso.');

      // Reset form and reload
      setIsModalOpen(false);
      setSelectedProductId('');
      setQuantity('1');
      setUnitPrice('');
      setNotes('');
      setSaleDate(getTodayDateString());

      loadData();
    } catch (err: any) {
      console.error('Erro ao registrar venda:', err);
      error(err.message || 'Não foi possível registrar a venda.');
    } finally {
      setActionLoading(false);
    }
  };

  const safeSales = Array.isArray(sales) ? sales : [];
  const filteredSales = safeSales.filter((s) =>
    s?.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="sales-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Vendas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre saídas de produtos com cálculo instantâneo de faturamento, custo e lucro
          </p>
        </div>

        <button
          id="open-create-sale-btn"
          type="button"
          onClick={() => {
            setSelectedProductId('');
            setQuantity('1');
            setUnitPrice('');
            setNotes('');
            setSaleDate(getTodayDateString());
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Venda</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-sales-input"
            type="text"
            placeholder="Pesquisar vendas por produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total de vendas: <strong>{safeSales.length}</strong>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 animate-pulse h-60" />
      ) : filteredSales.length === 0 ? (
        <EmptyState
          id="sales-empty-state"
          icon={ShoppingCart}
          title="Você ainda não possui vendas."
          description="Realize sua primeira venda para atualizar o estoque, faturar e acompanhar a margem de lucro em tempo real."
          actionText="Registrar Primeira Venda"
          onAction={() => setIsModalOpen(true)}
          actionIcon={Plus}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Quantidade</th>
                  <th className="py-3 px-4 text-right">Preço Unitário</th>
                  <th className="py-3 px-4 text-right">Faturamento</th>
                  <th className="py-3 px-4 text-right">Custo Histórico</th>
                  <th className="py-3 px-4 text-right">Lucro Bruto</th>
                  <th className="py-3 px-4 text-center">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {formatDate(s.sale_date)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {s.product_name}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-xs">
                        {formatQuantity(s.quantity)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700 font-medium">
                      {formatCurrency(s.unit_price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(s.total_revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {formatCurrency(s.total_cost)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      +{formatCurrency(s.gross_profit)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {formatPercent(s.margin_percentage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Nova Venda */}
      <Modal
        id="create-sale-modal"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Venda"
        subtitle="Selecione o produto e a quantidade vendida"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selecionar Produto *
            </label>
            <select
              id="sale-form-product"
              required
              value={selectedProductId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
            >
              <option value="">Selecione o produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                  {p.name} — Estoque: {p.stock_quantity} un {p.stock_quantity <= 0 ? '(Sem estoque)' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Estoque disponível:</span>
                <span className={`font-bold ${availableStock <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatQuantity(availableStock)} unidades
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Custo médio vigente do produto:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(unitCost)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade Vendida *
              </label>
              <input
                id="sale-form-quantity"
                type="number"
                step="any"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:outline-none ${
                  isStockInsufficient
                    ? 'border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-200 focus:ring-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço de Venda Unitário em MT *
              </label>
              <input
                id="sale-form-unit-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Insufficient Stock Warning */}
          {selectedProduct && isStockInsufficient && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                <strong>Estoque insuficiente.</strong> Disponível: {availableStock} unidades.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Venda *
              </label>
              <input
                id="sale-form-date"
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observação (opcional)
              </label>
              <input
                id="sale-form-notes"
                type="text"
                placeholder="Ex: Pagamento à vista"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Summary Calculation Card */}
          {selectedProduct && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Faturamento Total (Receita):</span>
                <span className="text-base font-black text-white">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Custo das Mercadorias Vendidas (CMV):</span>
                <span className="font-semibold text-slate-300">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="font-bold text-emerald-400">Lucro Bruto Estimado:</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  +{formatCurrency(grossProfit)} ({formatPercent(marginPercentage)})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                <span>Estoque após venda:</span>
                <span className={stockAfterSale < 0 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {stockAfterSale} unidades
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="submit-sale-btn"
              type="submit"
              disabled={actionLoading || isStockInsufficient || !selectedProductId || numericQuantity <= 0}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Confirmar Venda</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
