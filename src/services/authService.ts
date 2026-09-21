import { supabase, isSupabaseConfigured, isTableMissingError } from '../lib/supabase';
import { UserProfile } from '../types';

export const authService = {
  async getCurrentSession() {
    if (!isSupabaseConfigured) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          // The profiles table has not been created yet in the user's Supabase project.
          // Fall back gracefully to user auth metadata to keep the app working seamlessly.
          const { data: userData } = await supabase.auth.getUser();
          const authUser = userData?.user;
          return {
            id: userId,
            full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Wilson José',
            email: authUser?.email || '',
            role: 'admin',
            company_name: authUser?.user_metadata?.company_name || 'INOVATEC',
            created_at: authUser?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        console.warn('Notice fetching profile:', error.message || error);
        return null;
      }
      return data as UserProfile | null;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return null;
      }
      console.warn('Notice in getProfile:', err);
      return null;
    }
  },

  async signUp(email: string, password: string, fullName: string, companyName: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    });

    if (error) throw error;

    // Ensure profile row exists if table is created
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          role: 'admin',
          company_name: companyName,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Table may not exist yet if initial SQL script hasn't been executed
      }
    }

    return data;
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) throw error;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    if (!isSupabaseConfigured) throw new Error('Supabase não configurado.');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return {
            id: userId,
            full_name: updates.full_name || 'Wilson José',
            email: updates.email || '',
            role: updates.role || 'admin',
            company_name: updates.company_name || 'INOVATEC',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as UserProfile;
        }
        throw error;
      }
      return data as UserProfile;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return {
          id: userId,
          full_name: updates.full_name || 'Wilson José',
          email: updates.email || '',
          role: updates.role || 'admin',
          company_name: updates.company_name || 'INOVATEC',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserProfile;
      }
      throw err;
    }
  },
};
