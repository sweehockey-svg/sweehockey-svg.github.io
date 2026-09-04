import { createClient } from 'npm:@supabase/supabase-js@2.112.2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return response({ error: 'Inloggning krävs.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) return response({ error: 'Servern saknar nödvändiga inställningar.' }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: writerData, error: writerError } = await userClient.rpc('seh_current_writer');
  const writer = Array.isArray(writerData) ? writerData[0] : writerData;
  if (writerError || writer?.role !== 'admin') return response({ error: 'Adminbehörighet krävs.' }, 403);

  let body: { username?: string; password?: string };
  try { body = await request.json(); } catch (_) { return response({ error: 'Ogiltig JSON.' }, 400); }
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^[a-z0-9._-]{2,40}$/.test(username)) return response({ error: 'Ogiltigt användarnamn.' }, 400);
  if (password.length < 8 || password.length > 72) return response({ error: 'Lösenordet måste vara 8–72 tecken.' }, 400);

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `${username}@writers.svenskehockey.se`;
  let page = 1;
  let found = null;
  while (!found && page <= 10) {
    const users = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (users.error) return response({ error: users.error.message }, 500);
    found = users.data.users.find((user) => user.email?.toLowerCase() === email);
    if (users.data.users.length < 1000) break;
    page += 1;
  }
  if (!found) return response({ error: `Auth-användaren ${email} finns inte.` }, 404);
  const { error: updateError } = await adminClient.auth.admin.updateUserById(found.id, { password });
  if (updateError) return response({ error: updateError.message }, 500);
  return response({ ok: true, username, message: 'Lösenordet är uppdaterat.' });
});
