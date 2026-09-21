import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpFromLine,
  Plus,
  Search,
  Package,
  Calendar,
  FileText,
  AlertTriangle,
  Trash2,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { stockExitService, CreateStockExitInput } from '../services/stockExitService';
import { productService } from '../services/productService';
import { StockExit, Product, StockExitReason } from '../types';
import { formatCurrency, formatQuantity, formatDate, getTodayDateString } from '../utils/formatters';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useToast } from '../contexts/ToastContext';

const REASON_LABELS: Record<StockExitReason, { label: string; color: string }> = {
  venda: { label: 'Venda', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  avaria: { label: 'Avaria / Danificado', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  perda: { label: 'Perda / Extravio', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  consumo_interno: { label: 'Consumo Interno', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  descarte: { label: 'Descarte / Validade', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  ajuste: { label: 'Ajuste de Estoque', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export const StockExitsPage: React.FC = () => {
  const { success, error } = useToast();

  const [exits, setExits] = useState<StockExit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [reason, setReason] = useState<StockExitReason>('avaria');
  const [exitDate, setExitDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [exitsData, productsData] = await Promise.all([
        stockExitService.getStockExits(),
        productService.getProducts(),
      ]);
      setExits(exitsData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      console.error('Erro ao carregar saídas:', err);
      error(err.message || 'Erro ao carregar dados de saídas.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = selectedProduct ? Number(selectedProduct.stock_quantity) || 0 : 0;
  const numericQuantity = Number(quantity) || 0;
  const unitCost = selectedProduct ? Number(selectedProduct.average_cost || selectedProduct.purchase_price || 0) : 0;
  const totalCost = numericQuantity * unitCost;

  const handleOpenModal = () => {
    setSelectedProductId(products.length > 0 ? products[0].id : '');
    setQuantity('');
    setReason('avaria');
    setExitDate(getTodayDateString());
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSaveExit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      error('Selecione um produto.');
      return;
    }

    if (numericQuantity <= 0) {
      error('Informe uma quantidade válida superior a zero.');
      return;
    }

    if (numericQuantity > currentStock) {
      error(`Quantidade excede o estoque disponível (${currentStock} unidades).`);
      return;
    }

    setActionLoading(true);

    try {
      const input: CreateStockExitInput = {
        product_id: selectedProductId,
        quantity: numericQuantity,
        reason,
        exit_date: exitDate,
        notes: notes.trim() || undefined,
        unit_cost: unitCost,
      };

      await stockExitService.createStockExit(input);
      success('Saída de estoque registrada com sucesso!');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao registrar saída:', err);
      error(err.message || 'Erro ao registrar saída de estoque.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExit = async (exit: StockExit) => {
    if (!window.confirm(`Deseja cancelar esta saída de ${exit.quantity} unidades de "${exit.product_name}" e restaurar o estoque?`)) {
      return;
    }

    try {
      await stockExitService.deleteStockExit(exit.id);
      success('Saída cancelada e estoque restaurado.');
      await loadData();
    } catch (err: any) {
      console.error('Erro ao excluir saída:', err);
      error(err.message || 'Erro ao excluir saída.');
    }
  };

  // Filtering
  const safeExits = Array.isArray(exits) ? exits : [];
  const filteredExits = safeExits.filter((e) => {
    const matchesSearch =
      (e.product_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (e.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesReason = reasonFilter === 'all' || e.reason === reasonFilter;
    return matchesSearch && matchesReason;
  });

  const totalExitsCount = filteredExits.length;
  const totalUnitsExited = filteredExits.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalCostExited = filteredExits.reduce((acc, curr) => acc + curr.total_cost, 0);

  return (
    <motion.div
      id="stock-exits-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Saídas de Estoque</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro e controle de baixas, avarias, perdas, consumo interno e descartes de estoque
          </p>
        </div>

        <button
          id="btn-new-stock-exit"
          onClick={handleOpenModal}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Saída</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total de Registros</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalExitsCount}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Unidades Baixadas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{formatQuantity(totalUnitsExited)}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Custo Total das Baixas</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{formatCurrency(totalCostExited)}</p>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="search-exits-input"
            type="text"
            placeholder="Buscar por produto ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            id="reason-filter-select"
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">Todos os Motivos</option>
            <option value="avaria">Avaria / Danificado</option>
            <option value="perda">Perda / Extravio</option>
            <option value="consumo_interno">Consumo Interno</option>
            <option value="descarte">Descarte / Validade</option>
            <option value="ajuste">Ajuste de Estoque</option>
            <option value="venda">Venda</option>
          </select>
        </div>
      </div>

      {/* Exits Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-2" />
            Carregando histórico de saídas...
          </div>
        ) : filteredExits.length === 0 ? (
          <EmptyState
            title="Nenhuma saída de estoque registrada"
            description="Não há saídas cadastradas no sistema. Utilize o botão 'Nova Saída' para registrar baixas de estoque por avaria, perda ou descarte."
            actionText="Registrar Nova Saída"
            onAction={handleOpenModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Motivo da Saída</th>
                  <th className="py-3 px-4 text-right">Qtd</th>
                  <th className="py-3 px-4 text-right">Custo Unitário</th>
                  <th className="py-3 px-4 text-right">Custo Total</th>
                  <th className="py-3 px-4">Observação</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExits.map((item) => {
                  const reasonInfo = REASON_LABELS[item.reason] || {
                    label: item.reason,
                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(item.exit_date)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.product_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium border ${reasonInfo.color}`}
                        >
                          {reasonInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        -{formatQuantity(item.quantity)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600">
                        {formatCurrency(item.unit_cost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                        {formatCurrency(item.total_cost)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {item.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteExit(item)}
                          title="Cancelar saída e restaurar estoque"
                          type="button"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Nova Saída */}
      <Modal
        id="modal-new-stock-exit"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Saída de Estoque"
        subtitle="Dê baixa em produtos por avaria, descarte, perda ou consumo interno"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveExit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Produto *
            </label>
            <select
              id="exit-product-select"
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="">Selecione o produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Estoque atual: {p.stock_quantity})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Estoque disponível: <strong className="text-slate-800">{currentStock} un</strong></span>
                <span>Custo médio: <strong className="text-slate-800">{formatCurrency(unitCost)}</strong></span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade de Saída *
              </label>
              <input
                id="exit-quantity-input"
                type="number"
                min="1"
                max={currentStock || undefined}
                required
                placeholder="Ex: 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo da Saída *
              </label>
              <select
                id="exit-reason-select"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value as StockExitReason)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                <option value="avaria">Avaria / Danificado</option>
                <option value="perda">Perda / Extravio</option>
                <option value="consumo_interno">Consumo Interno</option>
                <option value="descarte">Descarte / Validade</option>
                <option value="ajuste">Ajuste de Inventário</option>
                <option value="venda">Venda Externa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Data da Saída *
            </label>
            <input
              id="exit-date-input"
              type="date"
              required
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Cost preview */}
          {numericQuantity > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Impacto em Custo:</span>
              <span className="font-bold text-rose-600">{formatCurrency(totalCost)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações / Justificativa
            </label>
            <textarea
              id="exit-notes-input"
              rows={2}
              placeholder="Ex: Produto danificado no transporte ou lote vencido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-stock-exit"
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              {actionLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUpFromLine className="w-3.5 h-3.5" />
              )}
              <span>Registrar Saída</span>
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
