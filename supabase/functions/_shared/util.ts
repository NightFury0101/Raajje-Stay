// Shared helpers for Raajje Stay Edge Functions (Deno).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const env = (k: string, fallback?: string) => {
  const v = Deno.env.get(k) ?? fallback;
  if (v === undefined) throw new Error(`Missing secret ${k}. Set it with: supabase secrets set ${k}=...`);
  return v;
};
export { env };

// Service-role client: bypasses row level security, so only use it after checking who is calling.
export const adminClient = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

export async function caller(req: Request) {
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data } = await client.auth.getUser();
  return data.user;
}

// BML Connect. Confirm the base URLs and header format against the BML merchant
// documentation (docs.merchants.bankofmaldives.com.mv) before going live.
export const bml = {
  base: () => env('BML_API_BASE', 'https://api.merchants.bankofmaldives.com.mv/public'),
  headers: () => ({ Authorization: env('BML_API_KEY'), 'Content-Type': 'application/json', Accept: 'application/json' }),
};
