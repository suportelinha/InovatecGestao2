import { supabase, isTableMissingError } from '../lib/supabase';
import { Sale } from '../types';
import { calculateStockStatus } from '../utils/formatters';

export interface CreateSaleInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  saleDate: string;
  notes?: string | null;
}

export const saleService = {
  async getSales(): Promise<Sale[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('sales')
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
    })) as Sale[];
  },

  async createSale(input: CreateSaleInput): Promise<Sale> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const quantity = Number(input.quantity);
    const unitPrice = Number(input.unitPrice);

    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('A quantidade deve ser maior que zero.');
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('O preço de venda não pode ser negativo.');
    }

    // Fetch product to verify stock and fetch current average cost
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('id', input.productId)
      .single();

    if (prodError || !product) {
      throw new Error('Produto não encontrado para registro de venda.');
    }

    const currentStock = Number(product.stock_quantity) || 0;
    const minStock = Number(product.minimum_stock) || 0;

    // Strict Rule: Never allow sale greater than available stock
    if (quantity > currentStock) {
      throw new Error(`Estoque insuficiente. Disponível: ${currentStock} unidades.`);
    }

    const unitCost = Number(product.average_cost) || 0;
    const totalRevenue = quantity * unitPrice;
    const totalCost = quantity * unitCost;
    const grossProfit = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const newStock = currentStock - quantity;
    const newStatus = calculateStockStatus(newStock, minStock);

    // Insert sale record
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: user.id,
        product_id: input.productId,
        quantity,
        unit_price: unitPrice,
        total_revenue: totalRevenue,
        unit_cost: unitCost,
        total_cost: totalCost,
        gross_profit: grossProfit,
        margin_percentage: marginPercentage,
        sale_date: input.saleDate,
        notes: input.notes?.trim() || null,
        status: 'completed',
      })
      .select()
      .single();

    if (saleError) {
      throw new Error(`Erro ao registrar venda: ${saleError.message}`);
    }

    // Update product stock and status
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.productId);

    if (updateError) {
      console.error('Falha ao atualizar produto após venda:', updateError);
      throw new Error(`Venda registrada, porém houve erro ao decrementar o estoque: ${updateError.message}`);
    }

    return {
      ...saleData,
      product_name: product.name,
    } as Sale;
  },
};
