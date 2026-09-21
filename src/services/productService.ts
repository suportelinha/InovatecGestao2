import { supabase, isTableMissingError } from '../lib/supabase';
import { Product, StockStatus, StockEntry, Sale } from '../types';
import { calculateStockStatus } from '../utils/formatters';

const MISSING_TABLES_MSG = 'As tabelas do banco de dados ainda não foram criadas no seu projeto Supabase. Por favor, acesse o SQL Editor do Supabase e execute o script de configuração.';

export interface CreateProductInput {
  name: string;
  image_url?: string | null;
  category_id?: string | null;
  description?: string | null;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  minimum_stock: number;
}

export interface UpdateProductInput {
  name?: string;
  image_url?: string | null;
  category_id?: string | null;
  description?: string | null;
  purchase_price?: number;
  sale_price?: number;
  stock_quantity?: number;
  minimum_stock?: number;
  average_cost?: number;
}

const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

const resolveCategoryId = async (rawId?: string | null, userId?: string): Promise<string | null> => {
  if (!rawId) return null;
  if (isValidUUID(rawId)) return rawId;

  // If it's a legacy or mock ID like 'cat-2' or a category name
  const mockMap: Record<string, string> = {
    'cat-1': 'Eletrônicos',
    'cat-2': 'Informática',
    'cat-3': 'Acessórios',
    'cat-4': 'Assistência Técnica',
    'cat-5': 'Geral',
  };
  const categoryName = mockMap[rawId] || rawId;

  try {
    // Try to find category by name
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .maybeSingle();

    if (existing?.id && isValidUUID(existing.id)) {
      return existing.id;
    }

    // If not found and we have userId, insert the category to get a valid UUID
    if (userId) {
      const { data: created } = await supabase
        .from('categories')
        .insert({ user_id: userId, name: categoryName })
        .select('id')
        .maybeSingle();

      if (created?.id && isValidUUID(created.id)) {
        return created.id;
      }
    }
  } catch {
    // Silent catch, fallback to null
  }

  return null;
};

export const productService = {
  async getProducts(options?: {
    search?: string;
    categoryId?: string;
    status?: StockStatus;
  }): Promise<Product[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (options?.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.status && options.status !== ('all' as any)) {
      query = query.eq('status', options.status);
    }

    if (options?.search && options.search.trim()) {
      query = query.ilike('name', `%${options.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissingError(error)) return [];
      throw error;
    }

    return (data || []).map((p: any) => ({
      ...p,
      category_name: p.category?.name || 'Sem categoria',
    })) as Product[];
  },

  async getProductById(id: string): Promise<Product | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (isTableMissingError(error)) return null;
      throw error;
    }
    if (!data) return null;

    return {
      ...data,
      category_name: data.category?.name || 'Sem categoria',
    } as Product;
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const cleanName = input.name.trim();
    if (!cleanName) throw new Error('O nome do produto é obrigatório');

    const purchasePrice = Number(input.purchase_price) || 0;
    const salePrice = Number(input.sale_price) || 0;
    const stockQuantity = Number(input.stock_quantity) || 0;
    const minimumStock = Number(input.minimum_stock) || 0;
    const averageCost = purchasePrice; // Initial average cost equals initial purchase price
    const status = calculateStockStatus(stockQuantity, minimumStock);

    const safeCategoryId = await resolveCategoryId(input.category_id, user.id);

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        name: cleanName,
        image_url: input.image_url || null,
        category_id: safeCategoryId,
        description: input.description?.trim() || null,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        stock_quantity: stockQuantity,
        minimum_stock: minimumStock,
        average_cost: averageCost,
        status,
      })
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) throw new Error(MISSING_TABLES_MSG);
      throw error;
    }

    // If initial stock was registered > 0, also record an initial stock entry for audit trail
    if (stockQuantity > 0) {
      const today = new Date().toISOString().split('T')[0];
      try {
        await supabase.from('stock_entries').insert({
          user_id: user.id,
          product_id: data.id,
          quantity: stockQuantity,
          unit_cost: purchasePrice,
          total_cost: stockQuantity * purchasePrice,
          entry_date: today,
          notes: 'Estoque inicial cadastrado na criação do produto',
        });
      } catch {
        // Continue even if stock_entries fails
      }
    }

    return data as Product;
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const current = await this.getProductById(id);
    if (!current) throw new Error('Produto não encontrado');

    const stockQuantity = input.stock_quantity !== undefined ? Number(input.stock_quantity) : current.stock_quantity;
    const minimumStock = input.minimum_stock !== undefined ? Number(input.minimum_stock) : current.minimum_stock;
    const status = calculateStockStatus(stockQuantity, minimumStock);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      status,
    };

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.image_url !== undefined) updatePayload.image_url = input.image_url;
    if (input.category_id !== undefined) {
      updatePayload.category_id = await resolveCategoryId(input.category_id, user.id);
    }
    if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
    if (input.purchase_price !== undefined) updatePayload.purchase_price = Number(input.purchase_price);
    if (input.sale_price !== undefined) updatePayload.sale_price = Number(input.sale_price);
    if (input.stock_quantity !== undefined) updatePayload.stock_quantity = stockQuantity;
    if (input.minimum_stock !== undefined) updatePayload.minimum_stock = minimumStock;
    if (input.average_cost !== undefined) updatePayload.average_cost = Number(input.average_cost);

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) throw new Error(MISSING_TABLES_MSG);
      throw error;
    }
    return data as Product;
  },

  async deleteProduct(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      if (isTableMissingError(error)) throw new Error(MISSING_TABLES_MSG);
      throw error;
    }
  },

  async uploadProductImage(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Falha no upload da imagem: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  },

  async deleteProductImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;
    try {
      const parts = imageUrl.split('/products/');
      if (parts.length > 1) {
        const filePath = parts[1];
        await supabase.storage.from('products').remove([filePath]);
      }
    } catch (err) {
      console.warn('Erro ao remover imagem do storage:', err);
    }
  },

  async getProductHistory(productId: string): Promise<{
    entries: StockEntry[];
    sales: Sale[];
    totalSoldQuantity: number;
    totalRevenue: number;
    totalProfit: number;
  }> {
    const [entriesRes, salesRes] = await Promise.all([
      supabase
        .from('stock_entries')
        .select('*')
        .eq('product_id', productId)
        .order('entry_date', { ascending: false }),
      supabase
        .from('sales')
        .select('*')
        .eq('product_id', productId)
        .order('sale_date', { ascending: false }),
    ]);

    if (entriesRes.error) {
      if (isTableMissingError(entriesRes.error)) {
        return { entries: [], sales: [], totalSoldQuantity: 0, totalRevenue: 0, totalProfit: 0 };
      }
      throw entriesRes.error;
    }
    if (salesRes.error) {
      if (isTableMissingError(salesRes.error)) {
        return { entries: [], sales: [], totalSoldQuantity: 0, totalRevenue: 0, totalProfit: 0 };
      }
      throw salesRes.error;
    }

    const entries = (entriesRes.data || []) as StockEntry[];
    const sales = (salesRes.data || []) as Sale[];

    const totalSoldQuantity = sales.reduce((acc, s) => acc + Number(s.quantity), 0);
    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_revenue), 0);
    const totalProfit = sales.reduce((acc, s) => acc + Number(s.gross_profit), 0);

    return {
      entries,
      sales,
      totalSoldQuantity,
      totalRevenue,
      totalProfit,
    };
  },
};
