import { supabase, isTableMissingError } from '../lib/supabase';
import { Category } from '../types';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (isTableMissingError(error)) {
          return [];
        }
        throw error;
      }

      // If user has no categories yet, automatically seed initial default categories in the database
      if (!data || data.length === 0) {
        const initialNames = ['Eletrônicos', 'Informática', 'Acessórios', 'Assistência Técnica', 'Geral'];
        try {
          const { data: inserted, error: insertError } = await supabase
            .from('categories')
            .insert(initialNames.map((name) => ({ user_id: user.id, name })))
            .select();

          if (!insertError && inserted && inserted.length > 0) {
            return inserted as Category[];
          }
        } catch {
          // If seeding fails, return empty array without crashing
        }
        return [];
      }

      return data as Category[];
    } catch (err) {
      if (isTableMissingError(err)) {
        return [];
      }
      return [];
    }
  },

  async createCategory(name: string): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const cleanName = name.trim();
    if (!cleanName) throw new Error('O nome da categoria é obrigatório');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: cleanName,
      })
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        throw new Error('A tabela de categorias ainda não foi criada no Supabase. Execute o script SQL no painel do Supabase.');
      }
      throw error;
    }
    return data as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      if (isTableMissingError(error)) {
        throw new Error('A tabela de categorias ainda não foi criada no Supabase. Execute o script SQL no painel do Supabase.');
      }
      throw error;
    }
  },
};
