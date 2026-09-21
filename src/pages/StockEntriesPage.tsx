import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Search,
  Package,
  Calendar,
  FileText,
  Clock,
} from 'lucide-react';
import { stockEntryService, CreateStockEntryInput } from '../services/stockEntryService';
import { productService } from '../services/productService';
import { StockEntry, Product } from '../types';
import { formatCurrency, formatQuantity, formatDate, getTodayDateString } from '../utils/formatters';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useToast } from '../contexts/ToastContext';

export const StockEntriesPage: React.FC = () => {
  const { success, error } = useToast();

  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [unitCost, setUnitCost] = useState<number | string>('');
  const [entryDate, setEntryDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, productsData] = await Promise.all([
        stockEntryService.getStockEntries(),
        productService.getProducts(),
      ]);
      setEntries(entriesData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      console.error('Erro ao carregar entradas:', err);
      error(err.message || 'Erro ao carregar dados de entradas.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When a product is selected in form, preload its purchase price as default unit cost
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.purchase_price) {
      setUnitCost(prod.purchase_price);
    }
  };

  // Calculate total automatically
  const numericQuantity = Number(quantity) || 0;
  const numericUnitCost = Number(unitCost) || 0;
  const calculatedTotalCost = numericQuantity * numericUnitCost;

  // Selected product preview for stock impact
  const currentSelectedProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = currentSelectedProduct ? Number(currentSelectedProduct.stock_quantity) || 0 : 0;
  const currentAvgCost = currentSelectedProduct ? Number(currentSelectedProduct.average_cost) || 0 : 0;
  const newProjectedStock = currentStock + numericQuantity;
  const newProjectedAvgCost =
    newProjectedStock > 0
      ? (currentStock * currentAvgCost + numericQuantity * numericUnitCost) / newProjectedStock
      : numericUnitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      error('Selecione o produto.');
      return;
    }
    if (numericQuantity <= 0) {
      error('A quantidade deve ser maior que zero.');
      return;
    }
    if (numericUnitCost < 0) {
      error('O custo unitário não pode ser negativo.');
      return;
    }

    setActionLoading(true);
    try {
      const input: CreateStockEntryInput = {
        productId: selectedProductId,
        quantity: numericQuantity,
        unitCost: numericUnitCost,
        entryDate,
        notes: notes.trim() || null,
      };

      await stockEntryService.createStockEntry(input);
      success('Entrada registrada e estoque atualizado.');

      // Reset form and reload
      setIsModalOpen(false);
      setSelectedProductId('');
      setQuantity('');
      setUnitCost('');
      setNotes('');
      setEntryDate(getTodayDateString());

      loadData();
    } catch (err: any) {
      console.error('Erro ao registrar entrada:', err);
      error(err.message || 'Não foi possível registrar a entrada.');
    } finally {
      setActionLoading(false);
    }
  };

  const safeEntries = Array.isArray(entries) ? entries : [];
  const filteredEntries = safeEntries.filter((e) =>
    e?.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="stock-entries-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Entradas de Estoque</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre compras e reposições de mercadorias com cálculo automático de custo médio
          </p>
        </div>

        <button
          id="open-create-entry-btn"
          type="button"
          onClick={() => {
            setSelectedProductId('');
            setQuantity('');
            setUnitCost('');
            setNotes('');
            setEntryDate(getTodayDateString());
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Entrada</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-entries-input"
            type="text"
            placeholder="Pesquisar por produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total de entradas: <strong>{safeEntries.length}</strong>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 animate-pulse h-60" />
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          id="entries-empty-state"
          icon={ArrowDownToLine}
          title="Você ainda não possui entradas."
          description="Registre a primeira reposição ou compra para aumentar as quantidades em estoque e atualizar os custos médios."
          actionText="Registrar Nova Entrada"
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
                  <th className="py-3 px-4 text-right">Custo Unitário</th>
                  <th className="py-3 px-4 text-right">Custo Total</th>
                  <th className="py-3 px-4">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {formatDate(e.entry_date)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {e.product_name}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                        +{formatQuantity(e.quantity)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatCurrency(e.unit_cost)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(e.total_cost)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {e.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Entrada */}
      <Modal
        id="register-stock-entry-modal"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Entrada de Estoque"
        subtitle="O estoque e o custo médio ponderado serão atualizados automaticamente"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Produto *
            </label>
            <select
              id="entry-form-product"
              required
              value={selectedProductId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
            >
              <option value="">Selecione o produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.stock_quantity} un | Custo: {formatCurrency(p.average_cost)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade da Entrada *
              </label>
              <input
                id="entry-form-quantity"
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="Ex: 20"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custo Unitário em MT *
              </label>
              <input
                id="entry-form-unit-cost"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Entrada *
              </label>
              <input
                id="entry-form-date"
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custo Total Calculado
              </label>
              <div className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-900 font-extrabold rounded-xl">
                {formatCurrency(calculatedTotalCost)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações / Fornecedor / Nota
            </label>
            <input
              id="entry-form-notes"
              type="text"
              placeholder="Ex: Lote A-12, compra no distribuidor"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Dynamic preview of stock impact */}
          {currentSelectedProduct && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 block">Projeção Pós-Entrada:</span>
              <div className="flex items-center justify-between text-slate-600">
                <span>Estoque:</span>
                <span className="font-semibold text-slate-900">
                  {currentStock} un &rarr;{' '}
                  <strong className="text-blue-700">{newProjectedStock} un</strong>
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Novo Custo Médio Ponderado:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(currentAvgCost)} &rarr;{' '}
                  <strong className="text-blue-700">{formatCurrency(newProjectedAvgCost)}</strong>
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
              id="submit-create-entry-btn"
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              {actionLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Confirmar Entrada</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
