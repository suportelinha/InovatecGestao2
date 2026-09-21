import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Eye,
  Upload,
  X,
  TrendingUp,
  ArrowDownToLine,
  Building2,
  Image as ImageIcon,
  Tag,
  Coins,
} from 'lucide-react';
import { productService, CreateProductInput, UpdateProductInput } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { Product, Category, StockStatus } from '../types';
import { formatCurrency, formatQuantity, formatDate } from '../utils/formatters';
import { StockBadge } from '../components/common/StockBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

export const ProductsPage: React.FC = () => {
  const { success, error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Selected item state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState<number | string>('');
  const [formSalePrice, setFormSalePrice] = useState<number | string>('');
  const [formInitialStock, setFormInitialStock] = useState<number | string>('0');
  const [formMinimumStock, setFormMinimumStock] = useState<number | string>('0');
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        productService.getProducts({
          search: searchTerm,
          categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          status: selectedStatus === 'all' ? undefined : (selectedStatus as StockStatus),
        }),
        categoryService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      console.error('Erro ao carregar produtos:', err);
      error(err.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedStatus, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error('A imagem deve ter tamanho máximo de 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const url = await productService.uploadProductImage(file);
      setFormImageUrl(url);
      success('Imagem enviada para o Supabase Storage!');
    } catch (err: any) {
      console.error('Upload falhou:', err);
      error(err.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategoryId('');
    setFormDescription('');
    setFormPurchasePrice('');
    setFormSalePrice('');
    setFormInitialStock('0');
    setFormMinimumStock('0');
    setFormImageUrl(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setSelectedProduct(p);
    setFormName(p.name);
    setFormCategoryId(p.category_id || '');
    setFormDescription(p.description || '');
    setFormPurchasePrice(p.purchase_price);
    setFormSalePrice(p.sale_price);
    setFormInitialStock(p.stock_quantity);
    setFormMinimumStock(p.minimum_stock);
    setFormImageUrl(p.image_url);
    setIsEditModalOpen(true);
  };

  const handleOpenDetails = async (p: Product) => {
    setSelectedProduct(p);
    setIsDetailsModalOpen(true);
    setLoadingHistory(true);
    try {
      const hist = await productService.getProductHistory(p.id);
      setProductHistory(hist);
    } catch (err) {
      console.error('Erro ao carregar histórico do produto:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Submit Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      error('O nome do produto é obrigatório.');
      return;
    }
    setActionLoading(true);
    try {
      const input: CreateProductInput = {
        name: formName.trim(),
        category_id: formCategoryId || null,
        description: formDescription || null,
        purchase_price: Number(formPurchasePrice) || 0,
        sale_price: Number(formSalePrice) || 0,
        stock_quantity: Number(formInitialStock) || 0,
        minimum_stock: Number(formMinimumStock) || 0,
        image_url: formImageUrl,
      };

      await productService.createProduct(input);
      success('Produto cadastrado com sucesso.');
      setIsCreateModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      error(err.message || 'Não foi possível cadastrar o produto.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!formName.trim()) {
      error('O nome do produto é obrigatório.');
      return;
    }
    setActionLoading(true);
    try {
      const input: UpdateProductInput = {
        name: formName.trim(),
        category_id: formCategoryId || null,
        description: formDescription || null,
        purchase_price: Number(formPurchasePrice) || 0,
        sale_price: Number(formSalePrice) || 0,
        stock_quantity: Number(formInitialStock) || 0,
        minimum_stock: Number(formMinimumStock) || 0,
        image_url: formImageUrl,
      };

      await productService.updateProduct(selectedProduct.id, input);
      success('Produto atualizado com sucesso.');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      loadData();
    } catch (err: any) {
      error(err.message || 'Não foi possível atualizar o produto.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!deletingProductId) return;
    setActionLoading(true);
    try {
      await productService.deleteProduct(deletingProductId);
      success('Produto excluído com sucesso.');
      setIsDeleteConfirmOpen(false);
      setDeletingProductId(null);
      loadData();
    } catch (err: any) {
      error(err.message || 'Não foi possível excluir o produto.');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await categoryService.createCategory(newCategoryName);
      setCategories((prev) => [...prev, newCat]);
      setFormCategoryId(newCat.id);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      success('Categoria criada com sucesso.');
    } catch (err: any) {
      error(err.message || 'Erro ao criar categoria.');
    }
  };

  return (
    <div id="products-page" className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Produtos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre produtos, controle estoque, preços e imagens no Supabase Storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="open-create-category-btn"
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span>Categorias</span>
          </button>

          <button
            id="open-create-product-btn"
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="search-product-input"
              type="text"
              placeholder="Pesquisar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            id="filter-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="filter-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">Todos os status</option>
            <option value="normal">🟢 Normal</option>
            <option value="low_stock">🟡 Estoque baixo</option>
            <option value="out_of_stock">🔴 Sem estoque</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50 self-end md:self-auto">
          <button
            id="view-list-mode-btn"
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Visualização em Lista"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            id="view-grid-mode-btn"
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl p-4 border border-slate-200/80 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          id="products-empty-state"
          icon={Package}
          title="Você ainda não possui produtos cadastrados."
          description="Comece cadastrando seu primeiro produto para controlar o estoque, registrar entradas e realizar vendas."
          actionText="Cadastrar Primeiro Produto"
          onAction={handleOpenCreateModal}
          actionIcon={Plus}
        />
      ) : viewMode === 'list' ? (
        /* List Mode Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Preço de Venda</th>
                  <th className="py-3 px-4 text-center">Estoque</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-xs">{p.name}</p>
                          {p.description && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {p.category_name || 'Sem categoria'}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(p.sale_price)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-slate-800">
                        {formatQuantity(p.stock_quantity)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        (mín: {formatQuantity(p.minimum_stock)})
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <StockBadge status={p.status} />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`view-details-${p.id}`}
                          onClick={() => handleOpenDetails(p)}
                          title="Detalhes do Produto"
                          type="button"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          id={`edit-product-${p.id}`}
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar Produto"
                          type="button"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`delete-product-${p.id}`}
                          onClick={() => {
                            setDeletingProductId(p.id);
                            setIsDeleteConfirmOpen(true);
                          }}
                          title="Excluir Produto"
                          type="button"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Mode Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col hover:border-slate-300 transition-colors group"
            >
              {/* Product Image */}
              <div className="relative h-44 bg-slate-100 overflow-hidden flex items-center justify-center">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package className="w-12 h-12 text-slate-300" />
                )}
                <div className="absolute top-2.5 right-2.5">
                  <StockBadge status={p.status} size="sm" />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {p.category_name || 'Sem categoria'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5" title={p.name}>
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Preço de Venda</span>
                    <span className="text-base font-black text-slate-900">{formatCurrency(p.sale_price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Estoque</span>
                    <span className="text-xs font-bold text-slate-700">{formatQuantity(p.stock_quantity)} un</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenDetails(p)}
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar produto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingProductId(p.id);
                      setIsDeleteConfirmOpen(true);
                    }}
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Cadastrar Produto */}
      <Modal
        id="create-product-modal"
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar Novo Produto"
        subtitle="Preencha os dados do produto para iniciar o controle de estoque"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Produto *
            </label>
            <input
              id="product-form-name"
              type="text"
              required
              placeholder="Ex: Cimento Portland 50kg"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                id="product-form-category"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Imagem do Produto (Supabase Storage)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex-1 px-3 py-2 border border-slate-200 border-dashed rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? 'Enviando...' : formImageUrl ? 'Trocar Imagem' : 'Selecionar Foto'}</span>
                </button>
                {formImageUrl && (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={formImageUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl(null)}
                      className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
            <textarea
              id="product-form-description"
              rows={2}
              placeholder="Informações adicionais do produto..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço de Compra (Custo) em MT *
              </label>
              <input
                id="product-form-purchase-price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formPurchasePrice}
                onChange={(e) => setFormPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço de Venda em MT *
              </label>
              <input
                id="product-form-sale-price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Inicial (Quantidade)
              </label>
              <input
                id="product-form-initial-stock"
                type="number"
                step="any"
                min="0"
                value={formInitialStock}
                onChange={(e) => setFormInitialStock(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Mínimo para Alerta
              </label>
              <input
                id="product-form-min-stock"
                type="number"
                step="any"
                min="0"
                value={formMinimumStock}
                onChange={(e) => setFormMinimumStock(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="submit-create-product-btn"
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Cadastrar Produto</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Editar Produto */}
      <Modal
        id="edit-product-modal"
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Produto"
        subtitle="Atualize as informações cadastrais do produto"
        maxWidth="xl"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Imagem (Supabase Storage)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex-1 px-3 py-2 border border-slate-200 border-dashed rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? 'Enviando...' : formImageUrl ? 'Trocar Imagem' : 'Selecionar Foto'}</span>
                </button>
                {formImageUrl && (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={formImageUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl(null)}
                      className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço de Compra (Custo) em MT *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formPurchasePrice}
                onChange={(e) => setFormPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço de Venda em MT *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Atual
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formInitialStock}
                onChange={(e) => setFormInitialStock(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Mínimo
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formMinimumStock}
                onChange={(e) => setFormMinimumStock(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Detalhes do Produto & Histórico */}
      <Modal
        id="product-details-modal"
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedProduct?.name || 'Detalhes do Produto'}
        subtitle="Informações cadastrais, custo médio ponderado e movimentações"
        maxWidth="2xl"
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* Top Cards: Metrics */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Package className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <StockBadge status={selectedProduct.status} />
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedProduct.category_name}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1 truncate">
                  {selectedProduct.name}
                </h3>
                {selectedProduct.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedProduct.description}</p>
                )}
              </div>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Estoque Atual</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {formatQuantity(selectedProduct.stock_quantity)} un
                </span>
                <span className="text-[10px] text-slate-400 block">Mínimo: {selectedProduct.minimum_stock}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Custo Médio</span>
                <span className="text-sm font-extrabold text-blue-700">
                  {formatCurrency(selectedProduct.average_cost)}
                </span>
                <span className="text-[10px] text-slate-400 block">Ponderado</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Preço de Venda</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatCurrency(selectedProduct.sale_price)}
                </span>
                <span className="text-[10px] text-slate-400 block">Vigente</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lucro Gerado</span>
                <span className="text-sm font-extrabold text-purple-700">
                  {formatCurrency(productHistory?.totalProfit || 0)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {formatQuantity(productHistory?.totalSoldQuantity || 0)} un vendidas
                </span>
              </div>
            </div>

            {/* History Tabs / Tables */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Movimentações Recentes deste Produto
              </h4>

              {loadingHistory ? (
                <div className="py-6 text-center text-xs text-slate-400">Carregando histórico...</div>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                  {/* Entries */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
                      <ArrowDownToLine className="w-3.5 h-3.5 text-blue-600" />
                      <span>Entradas de Estoque</span>
                    </span>
                    {productHistory?.entries?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhuma entrada registrada.</p>
                    ) : (
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400">
                            <tr>
                              <th className="py-2 px-3">Data</th>
                              <th className="py-2 px-3 text-center">Quantidade</th>
                              <th className="py-2 px-3 text-right">Custo Unitário</th>
                              <th className="py-2 px-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {productHistory?.entries?.map((e: any) => (
                              <tr key={e.id}>
                                <td className="py-2 px-3 text-slate-600">{formatDate(e.entry_date)}</td>
                                <td className="py-2 px-3 text-center font-semibold text-slate-800">
                                  +{formatQuantity(e.quantity)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(e.unit_cost)}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(e.total_cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Sales */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vendas Realizadas</span>
                    </span>
                    {productHistory?.sales?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhuma venda registrada.</p>
                    ) : (
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400">
                            <tr>
                              <th className="py-2 px-3">Data</th>
                              <th className="py-2 px-3 text-center">Quantidade</th>
                              <th className="py-2 px-3 text-right">Valor Venda</th>
                              <th className="py-2 px-3 text-right">Lucro Bruto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {productHistory?.sales?.map((s: any) => (
                              <tr key={s.id}>
                                <td className="py-2 px-3 text-slate-600">{formatDate(s.sale_date)}</td>
                                <td className="py-2 px-3 text-center font-semibold text-slate-800">
                                  -{formatQuantity(s.quantity)}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(s.total_revenue)}</td>
                                <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                                  +{formatCurrency(s.gross_profit)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Gerenciar Categorias */}
      <Modal
        id="categories-modal"
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Categorias de Produtos"
        subtitle="Organize seu catálogo por linhas e categorias"
        maxWidth="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Nova categoria..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all"
            >
              Adicionar
            </button>
          </form>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-100 rounded-xl">
            {categories.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">Nenhuma categoria cadastrada.</p>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <button
                    onClick={async () => {
                      try {
                        await categoryService.deleteCategory(c.id);
                        setCategories((prev) => prev.filter((cat) => cat.id !== c.id));
                        success('Categoria removida.');
                      } catch (err: any) {
                        error(err.message || 'Erro ao remover categoria.');
                      }
                    }}
                    type="button"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Excluir Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProduct}
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto? Todas as informações de estoque relacionadas serão removidas permanentemente."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        isLoading={actionLoading}
      />
    </div>
  );
};
