import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ekldxpsyopezszyloavf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// In-memory cache for resolved backend URL
let resolvedBackendUrl = null;
let lastResolvedTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Resolves the active backend URL:
 * 1. If VITE_API_URL is explicitly set (e.g., in local development: http://localhost:5000/api), uses it.
 * 2. Otherwise queries Supabase system_settings table for dynamic Cloudflare Tunnel URL.
 */
export async function getBackendBaseUrl() {
  const envApiUrl = import.meta.env.VITE_API_URL;

  // In local dev where localhost is set, use it directly
  if (envApiUrl && envApiUrl.includes('localhost')) {
    return envApiUrl.replace(/\/+$/, '');
  }

  // Return cached URL if fresh
  if (resolvedBackendUrl && (Date.now() - lastResolvedTime < CACHE_TTL_MS)) {
    return resolvedBackendUrl;
  }

  // Fetch live tunnel URL from Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'backend_url')
        .maybeSingle();

      if (!error && data?.value) {
        let cleanUrl = data.value.trim().replace(/\/+$/, '');
        if (!cleanUrl.endsWith('/api')) {
          cleanUrl += '/api';
        }
        resolvedBackendUrl = cleanUrl;
        lastResolvedTime = Date.now();
        console.log('[Backend Discovery] Connected via live tunnel:', resolvedBackendUrl);
        return resolvedBackendUrl;
      }
    } catch (err) {
      console.warn('[Backend Discovery] Supabase lookup error:', err);
    }
  }

  // Fallback to configured VITE_API_URL or localhost
  return (envApiUrl || 'http://localhost:5000/api').replace(/\/+$/, '');
}

/**
 * Resolves socket root URL (e.g. https://xyz.trycloudflare.com without /api)
 */
export async function getSocketBaseUrl() {
  const apiBase = await getBackendBaseUrl();
  return apiBase.replace('/api', '');
}
