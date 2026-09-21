import { supabase, isTableMissingError } from '../lib/supabase';
import { StockExit, StockExitReason } from '../types';

export interface CreateStockExitInput {
  product_id: string;
  quantity: number;
  reason: StockExitReason;
  exit_date: string;
  notes?: string;
  unit_cost?: number;
}

export const stockExitService = {
  async getStockExits(): Promise<StockExit[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('stock_exits')
        .select(`
          *,
          product:products(name, purchase_price, average_cost)
        `)
        .eq('user_id', user.id)
        .order('exit_date', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return [];
        }
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product_name: item.product?.name || 'Produto',
        quantity: Number(item.quantity) || 0,
        unit_cost: Number(item.unit_cost || item.product?.average_cost || item.product?.purchase_price || 0),
        total_cost: Number(item.total_cost) || (Number(item.quantity) * Number(item.unit_cost || item.product?.purchase_price || 0)),
        reason: item.reason || 'ajuste',
        exit_date: item.exit_date,
        notes: item.notes,
        created_at: item.created_at,
      }));
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return [];
      }
      console.warn('Erro ao carregar saídas:', err);
      return [];
    }
  },

  async createStockExit(input: CreateStockExitInput): Promise<StockExit> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error('Usuário não autenticado.');
    }
    const userId = userData.user.id;

    // Fetch product to verify stock and price
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('name, stock_quantity, minimum_stock, purchase_price, average_cost')
      .eq('id', input.product_id)
      .single();

    if (prodErr) {
      throw new Error('Produto selecionado não encontrado.');
    }

    const currentStock = Number(product.stock_quantity) || 0;
    const requestedQty = Number(input.quantity) || 0;

    if (requestedQty <= 0) {
      throw new Error('A quantidade deve ser maior que zero.');
    }

    if (requestedQty > currentStock) {
      throw new Error(`Estoque insuficiente! Disponível: ${currentStock}, Solicitado: ${requestedQty}`);
    }

    const unitCost = input.unit_cost !== undefined ? Number(input.unit_cost) : Number(product.average_cost || product.purchase_price || 0);
    const totalCost = requestedQty * unitCost;

    const { data, error } = await supabase
      .from('stock_exits')
      .insert({
        user_id: userId,
        product_id: input.product_id,
        quantity: requestedQty,
        unit_cost: unitCost,
        total_cost: totalCost,
        reason: input.reason,
        exit_date: input.exit_date,
        notes: input.notes?.trim() || null,
      })
      .select(`
        *,
        product:products(name)
      `)
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        throw new Error('Tabela de saídas ainda não criada no banco de dados.');
      }
      throw error;
    }

    // Update product stock balance
    const newStock = Math.max(0, currentStock - requestedQty);
    const minStock = Number(product.minimum_stock) || 0;
    let newStatus: 'normal' | 'low_stock' | 'out_of_stock' = 'normal';
    if (newStock <= 0) {
      newStatus = 'out_of_stock';
    } else if (newStock <= minStock) {
      newStatus = 'low_stock';
    }

    await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.product_id);

    return {
      id: data.id,
      user_id: data.user_id,
      product_id: data.product_id,
      product_name: data.product?.name || product.name,
      quantity: Number(data.quantity),
      unit_cost: Number(data.unit_cost),
      total_cost: Number(data.total_cost),
      reason: data.reason,
      exit_date: data.exit_date,
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async deleteStockExit(id: string): Promise<void> {
    // Fetch exit to restore stock
    const { data: exitData, error: fetchErr } = await supabase
      .from('stock_exits')
      .select('product_id, quantity')
      .eq('id', id)
      .single();

    if (!fetchErr && exitData) {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_quantity, minimum_stock')
        .eq('id', exitData.product_id)
        .single();

      if (prod) {
        const restoredStock = (Number(prod.stock_quantity) || 0) + Number(exitData.quantity);
        const minStock = Number(prod.minimum_stock) || 0;
        let newStatus: 'normal' | 'low_stock' | 'out_of_stock' = 'normal';
        if (restoredStock <= 0) {
          newStatus = 'out_of_stock';
        } else if (restoredStock <= minStock) {
          newStatus = 'low_stock';
        }

        await supabase
          .from('products')
          .update({
            stock_quantity: restoredStock,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', exitData.product_id);
      }
    }

    const { error } = await supabase.from('stock_exits').delete().eq('id', id);
    if (error) throw error;
  }
};
