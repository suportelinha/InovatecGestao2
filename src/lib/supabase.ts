import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hpcgpwoylsyqdgawytuf.supabase.co';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_dxNnpZodga73ppEovD6Xfw_-UUh_FZD';

function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip /rest/v1 or /rest/v1/ suffix if entered by mistake
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = rawSupabaseAnonKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('your-project.supabase.co') &&
  !supabaseAnonKey.includes('your-anon-key-here')
);

export function extractSupabaseProjectId(url: string): string {
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split('.');
    if (hostParts.length >= 3 && hostParts[1] === 'supabase' && hostParts[2] === 'co') {
      return hostParts[0];
    }
  } catch {
    // fallback regex
    const match = url.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
    if (match) return match[1];
  }
  return '';
}

export const supabaseProjectId = extractSupabaseProjectId(supabaseUrl);
export const supabaseSqlEditorUrl = supabaseProjectId
  ? `https://supabase.com/dashboard/project/${supabaseProjectId}/sql/new`
  : 'https://supabase.com/dashboard';

/**
 * Checks if a Supabase error is caused by missing tables/schema (e.g. PGRST205).
 * This occurs when the user connects their Supabase project but has not yet run
 * the initial SQL setup script in the Supabase SQL Editor.
 */
export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  const details = String(error.details || '');
  const hint = String(error.hint || '');
  const fullText = `${code} ${message} ${details} ${hint}`.toLowerCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' || // PostgreSQL undefined_table
    fullText.includes('schema cache') ||
    fullText.includes('relation') ||
    fullText.includes('does not exist') ||
    fullText.includes('could not find the table')
  );
}

// Fallback dummy URL to prevent createClient crashing during module initial load if env is unset
const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
