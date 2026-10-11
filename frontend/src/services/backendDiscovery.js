import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ekldxpsyopezszyloavf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn(
    '[Backend Discovery] VITE_SUPABASE_ANON_KEY is not set — live tunnel discovery is disabled. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting dashboard (e.g. Vercel) ' +
    'so the frontend can find the academy backend.'
  );
}

// In-memory cache for resolved backend URL
let resolvedBackendUrl = null;
let lastResolvedTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Short negative cache so a dead tunnel doesn't trigger a Supabase + health
// lookup on every single request
let lastFailedTime = 0;
const NEGATIVE_CACHE_TTL_MS = 15 * 1000; // 15 seconds

// Single-flight: concurrent requests share one in-progress lookup
let inflightLookup = null;

const HEALTH_TIMEOUT_MS = 6000;

/**
 * Pings the backend /health endpoint (server root, not /api) to verify a
 * discovered tunnel URL is actually alive. Quick-tunnel URLs die when the
 * academy machine stops the server, so never trust the stored row blindly.
 */
async function isBackendReachable(apiBase) {
  try {
    const root = apiBase.replace(/\/api\/?$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const res = await fetch(`${root}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolves the active backend URL:
 * 1. If VITE_API_URL is explicitly set (e.g., in local development: http://localhost:5000/api), uses it.
 * 2. Otherwise queries Supabase system_settings table for dynamic Cloudflare Tunnel URL
 *    and verifies it with a /health check before trusting it.
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

  // Share one in-progress lookup between concurrent requests
  if (!inflightLookup) {
    inflightLookup = lookupLiveBackendUrl(envApiUrl).finally(() => {
      inflightLookup = null;
    });
  }
  return inflightLookup;
}

async function lookupLiveBackendUrl(envApiUrl) {
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
        if (await isBackendReachable(cleanUrl)) {
          resolvedBackendUrl = cleanUrl;
          lastResolvedTime = Date.now();
          console.log('[Backend Discovery] Connected via live tunnel:', resolvedBackendUrl);
          return resolvedBackendUrl;
        }
        console.warn(
          '[Backend Discovery] Stored tunnel URL is unreachable (academy server may be off). ' +
          'Started new lookup instead of trusting it:',
          cleanUrl
        );
        lastFailedTime = Date.now();
      } else if (error) {
        console.warn('[Backend Discovery] Supabase lookup error:', error.message || error);
      }
    } catch (err) {
      console.warn('[Backend Discovery] Supabase lookup error:', err);
    }
  } else if (Date.now() - lastFailedTime > NEGATIVE_CACHE_TTL_MS) {
    console.warn('[Backend Discovery] Skipping live lookup (no Supabase client). Using fallback.');
    lastFailedTime = Date.now();
  }

  // Fallback to configured VITE_API_URL or localhost
  return (envApiUrl || 'http://localhost:5000/api').replace(/\/+$/, '');
}

/**
 * Resolves socket root URL (e.g. https://xyz.trycloudflare.com without /api)
 */
export async function getSocketBaseUrl() {
  const apiBase = await getBackendBaseUrl();
  return apiBase.replace(/\/api\/?$/, '');
}
