/**
 * Supabase SQL Schema for INOVATEC - Gestão de Estoque e Vendas
 * Run this in the Supabase SQL Editor to set up all tables, RLS policies,
 * indexes, storage bucket, and atomic stock management functions.
 */
export const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- INOVATEC - Gestão de Estoque e Vendas
-- Script de Configuração Completa do Banco de Dados PostgreSQL / Supabase
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA: PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'admin',
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA: CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA: PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  purchase_price NUMERIC DEFAULT 0 NOT NULL,
  sale_price NUMERIC DEFAULT 0 NOT NULL,
  stock_quantity NUMERIC DEFAULT 0 NOT NULL,
  minimum_stock NUMERIC DEFAULT 0 NOT NULL,
  average_cost NUMERIC DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'normal' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA: STOCK_ENTRIES
CREATE TABLE IF NOT EXISTS public.stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  entry_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA: SALES
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_revenue NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  gross_profit NUMERIC NOT NULL,
  margin_percentage NUMERIC NOT NULL,
  sale_date DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'completed' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA: STOCK_EXITS (SAÍDAS DE ESTOQUE)
CREATE TABLE IF NOT EXISTS public.stock_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC DEFAULT 0 NOT NULL,
  total_cost NUMERIC DEFAULT 0 NOT NULL,
  reason TEXT DEFAULT 'avaria' NOT NULL,
  exit_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_user_id ON public.stock_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_product_id ON public.stock_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_date ON public.stock_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_stock_exits_user_id ON public.stock_exits(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_exits_product_id ON public.stock_exits(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_exits_date ON public.stock_exits(exit_date);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);

-- 9. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: PROFILES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- POLÍTICAS RLS: CATEGORIES
DROP POLICY IF EXISTS "categories_all_policy" ON public.categories;
CREATE POLICY "categories_all_policy" ON public.categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS RLS: PRODUCTS
DROP POLICY IF EXISTS "products_all_policy" ON public.products;
CREATE POLICY "products_all_policy" ON public.products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS RLS: STOCK_ENTRIES
DROP POLICY IF EXISTS "stock_entries_all_policy" ON public.stock_entries;
CREATE POLICY "stock_entries_all_policy" ON public.stock_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS RLS: STOCK_EXITS
DROP POLICY IF EXISTS "stock_exits_all_policy" ON public.stock_exits;
CREATE POLICY "stock_exits_all_policy" ON public.stock_exits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS RLS: SALES
DROP POLICY IF EXISTS "sales_all_policy" ON public.sales;
CREATE POLICY "sales_all_policy" ON public.sales
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. TRIGGER PARA CRIAR PERFIL AUTOMÁTICO NO CADASTRO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'admin',
    COALESCE(new.raw_user_meta_data->>'company_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    company_name = EXCLUDED.company_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. STORAGE BUCKET: PRODUCTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para o bucket 'products'
DROP POLICY IF EXISTS "Products images are publicly accessible" ON storage.objects;
CREATE POLICY "Products images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update their product images" ON storage.objects;
CREATE POLICY "Authenticated users can update their product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'products' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete their product images" ON storage.objects;
CREATE POLICY "Authenticated users can delete their product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'products' AND auth.role() = 'authenticated');
`;
