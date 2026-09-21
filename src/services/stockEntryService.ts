import { supabase, isTableMissingError } from '../lib/supabase';
import { StockEntry } from '../types';
import { calculateStockStatus } from '../utils/formatters';

export interface CreateStockEntryInput {
  productId: string;
  quantity: number;
  unitCost: number;
  entryDate: string;
  notes?: string | null;
}

export const stockEntryService = {
  async getStockEntries(): Promise<StockEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('stock_entries')
      .select(`
        *,
        product:products(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) return [];
      throw error;
    }

    return (data || []).map((item: any) => ({
      ...item,
      product_name: item.product?.name || 'Produto indisponível',
    })) as StockEntry[];
  },

  async createStockEntry(input: CreateStockEntryInput): Promise<StockEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const quantity = Number(input.quantity);
    const unitCost = Number(input.unitCost);

    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('A quantidade deve ser maior que zero.');
    }
    if (isNaN(unitCost) || unitCost < 0) {
      throw new Error('O custo unitário não pode ser negativo.');
    }

    // Fetch product to calculate weighted average cost and update stock
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('id', input.productId)
      .single();

    if (prodError || !product) {
      throw new Error('Produto não encontrado para registro de entrada.');
    }

    const oldStock = Number(product.stock_quantity) || 0;
    const oldAvgCost = Number(product.average_cost) || 0;
    const minStock = Number(product.minimum_stock) || 0;

    const newStock = oldStock + quantity;

    // Weighted average cost formula:
    // (oldStock * oldAvgCost + quantity * unitCost) / (oldStock + quantity)
    let newAverageCost: number;
    if (newStock > 0) {
      const totalInventoryValueBefore = oldStock > 0 ? oldStock * oldAvgCost : 0;
      const newEntryValue = quantity * unitCost;
      newAverageCost = (totalInventoryValueBefore + newEntryValue) / newStock;
    } else {
      newAverageCost = unitCost;
    }

    const totalCost = quantity * unitCost;
    const newStatus = calculateStockStatus(newStock, minStock);

    // Insert entry record
    const { data: entryData, error: entryError } = await supabase
      .from('stock_entries')
      .insert({
        user_id: user.id,
        product_id: input.productId,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        entry_date: input.entryDate,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (entryError) {
      throw new Error(`Erro ao registrar entrada de estoque: ${entryError.message}`);
    }

    // Update product stock and average cost
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        average_cost: newAverageCost,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.productId);

    if (updateError) {
      console.error('Falha ao atualizar produto após entrada:', updateError);
      throw new Error(`Entrada registrada, porém houve erro ao atualizar o estoque: ${updateError.message}`);
    }

    return {
      ...entryData,
      product_name: product.name,
    } as StockEntry;
  },
};
