import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const WORKFLOWS = {
  swedish_players: "sync-swedish-players.yml",
  swedish_player_stats: "sync-swedish-player-stats.yml",
} as const;
const DEFAULT_ORIGINS = [
  "https://www.svenskehockey.se",
  "https://svenskehockey.se",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
];

type RequestBody = {
  action?: "start" | "status";
  job?: keyof typeof WORKFLOWS;
  request_id?: string;
};

function json(body: unknown, status: number, origin: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...configured].includes(origin) ? origin : null;
}

async function github(path: string, init: RequestInit = {}) {
  const token = Deno.env.get("GITHUB_SYNC_TOKEN") || "";
  if (!token) throw new Error("GITHUB_SYNC_TOKEN is not configured.");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "svensk-ehockey-admin-sync",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response;
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !publishableKey) throw new Error("Supabase configuration is missing.");

  const client = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("UNAUTHORIZED");

  const { data, error } = await client.rpc("seh_current_writer");
  if (error) throw error;
  const writer = Array.isArray(data) ? data[0] : data;
  if (!writer || writer.role !== "admin") throw new Error("FORBIDDEN");
  return { user: userData.user, writer };
}

async function findRun(repo: string, workflowFile: string, requestId: string) {
  const response = await github(
    `/repos/${repo}/actions/workflows/${workflowFile}/runs?event=workflow_dispatch&per_page=30`,
  );
  const payload = await response.json();
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
  const run = runs.find((item: Record<string, unknown>) =>
    String(item.display_title || "").includes(requestId)
  );
  if (!run) return { state: "queued", request_id: requestId };
  return {
    state: run.status,
    conclusion: run.conclusion,
    request_id: requestId,
    run_id: run.id,
    run_url: run.html_url,
    started_at: run.run_started_at || run.created_at,
    updated_at: run.updated_at,
  };
}

Deno.serve(async (request) => {
  const originHeader = request.headers.get("Origin");
  const origin = allowedOrigin(request);
  if (originHeader && !origin) return json({ error: "Origin is not allowed." }, 403, null);
  if (request.method === "OPTIONS") return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "https://www.svenskehockey.se",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    },
  });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  try {
    await requireAdmin(request);
    const body = await request.json() as RequestBody;
    if (!body.job || !(body.job in WORKFLOWS)) return json({ error: "Unknown sync job." }, 400, origin);
    const workflowFile = WORKFLOWS[body.job];

    const repo = Deno.env.get("GITHUB_SYNC_REPO") || "sweehockey-svg/sweehockey-svg.github.io";
    const ref = Deno.env.get("GITHUB_SYNC_REF") || "main";
    const requestId = String(body.request_id || "").trim();
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)) {
      return json({ error: "Invalid request id." }, 400, origin);
    }

    if (body.action === "status") {
      return json(await findRun(repo, workflowFile, requestId), 200, origin);
    }
    if (body.action !== "start") return json({ error: "Unknown action." }, 400, origin);

    await github(`/repos/${repo}/actions/workflows/${workflowFile}/dispatches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, inputs: { request_id: requestId } }),
    });
    return json({ state: "queued", request_id: requestId }, 202, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Du måste logga in igen." }, 401, origin);
    if (message === "FORBIDDEN") return json({ error: "Endast administratörer får starta synkningen." }, 403, origin);
    if (message === "GITHUB_SYNC_TOKEN is not configured.") {
      return json({ error: "GitHub-nyckeln GITHUB_SYNC_TOKEN saknas i Supabase." }, 500, origin);
    }
    if (message.startsWith("GitHub returned 404:")) {
      return json({ error: "Den valda GitHub-workflowen hittades inte på den valda branchen." }, 500, origin);
    }
    if (message.startsWith("GitHub returned 401:") || message.startsWith("GitHub returned 403:")) {
      return json({ error: "GitHub-nyckeln saknar behörighet att starta workflowen." }, 500, origin);
    }
    console.error("seh-admin-sync:", message);
    return json({ error: "Synktjänsten kunde inte slutföra begäran." }, 500, origin);
  }
});
