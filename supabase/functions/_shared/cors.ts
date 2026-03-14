const ALLOWED_ORIGINS = [
  "https://abbavideo.com.br",
  "https://www.abbavideo.com.br",
  "https://cozy-opa-guide.lovable.app",
];

const BASE_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

// Allow Lovable preview/published origins
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Lovable preview URLs: https://*--*.lovable.app
  if (/^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;

  // Legacy/current Lovable preview host: https://*.lovableproject.com
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;

  return false;
}

export function getCorsHeaders(req: Request, extraHeaders?: string): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": extraHeaders
      ? `${BASE_HEADERS}, ${extraHeaders}`
      : BASE_HEADERS,
  };
}
