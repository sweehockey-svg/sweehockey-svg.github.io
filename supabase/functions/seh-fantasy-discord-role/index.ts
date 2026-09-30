import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = "554294924284264458";
const ROLE_ID = "1554762554893410345";
const CHANNEL_ID = "1554762153901166662";
const COMPETITION_CODE = "SCL2027";
const DEFAULT_ORIGINS = [
  "https://www.svenskehockey.se",
  "https://svenskehockey.se",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "http://127.0.0.1:8770",
  "http://localhost:8770",
];

function allowedOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...configured].includes(origin) ? origin : null;
}

function responseHeaders(origin: string | null) {
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
  return headers;
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin),
  });
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
}

function supabaseClients(authorization: string) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !publishableKey || !serviceKey) throw new Error("SUPABASE_CONFIG_MISSING");

  return {
    user: createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    admin: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function discord(path: string, token: string, init: RequestInit = {}, retry = true) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (response.status === 429 && retry) {
    let waitMs = 1000;
    try {
      const payload = await response.clone().json();
      waitMs = Math.min(5000, Math.max(300, Number(payload?.retry_after || 1) * 1000));
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return discord(path, token, init, false);
  }

  return response;
}

Deno.serve(async (request: Request) => {
  const origin = allowedOrigin(request);
  if (request.method === "OPTIONS") {
    if (request.headers.get("Origin") && !origin) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403, null);
    return new Response(null, { status: 204, headers: responseHeaders(origin) });
  }
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, origin);
  if (request.headers.get("Origin") && !origin) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403, null);

  try {
    const authorization = request.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "UNAUTHORIZED" }, 401, origin);

    const clients = supabaseClients(authorization);
    const { data: userData, error: userError } = await clients.user.auth.getUser();
    if (userError || !userData.user) return json({ error: "UNAUTHORIZED" }, 401, origin);

    const { data: competition, error: competitionError } = await clients.admin
      .from("ehockey_fantasy_competitions")
      .select("id,code")
      .eq("code", COMPETITION_CODE)
      .maybeSingle();
    if (competitionError) throw competitionError;
    if (!competition) return json({ error: "COMPETITION_NOT_FOUND" }, 404, origin);

    const { data: entry, error: entryError } = await clients.admin
      .from("ehockey_fantasy_entries")
      .select("id")
      .eq("competition_id", competition.id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (entryError) throw entryError;
    if (!entry) return json({ error: "FANTASY_TEAM_REQUIRED" }, 409, origin);

    const { data: link, error: linkError } = await clients.admin
      .from("ehockey_discord_player_links")
      .select("discord_user_id,status,approved_player_key")
      .eq("user_id", userData.user.id)
      .eq("status", "approved")
      .not("approved_player_key", "is", null)
      .maybeSingle();
    if (linkError) throw linkError;
    const discordUserId = String(link?.discord_user_id || "").trim();
    if (!discordUserId) return json({ error: "APPROVED_DISCORD_LINK_REQUIRED" }, 409, origin);

    const token = Deno.env.get("SEH_DISCORD_BOT_TOKEN") ||
      Deno.env.get("DISCORD_BOT_TOKEN") || "";
    if (!token) throw new Error("DISCORD_BOT_TOKEN_MISSING");

    const memberPath = `/guilds/${GUILD_ID}/members/${discordUserId}`;
    const memberResponse = await discord(memberPath, token);
    if (memberResponse.status === 404) {
      return json({
        error: "DISCORD_MEMBER_REQUIRED",
        channel_url: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}`,
      }, 409, origin);
    }
    if (!memberResponse.ok) {
      const detail = (await memberResponse.text()).slice(0, 500);
      throw new Error(`DISCORD_MEMBER_${memberResponse.status}: ${detail}`);
    }

    const member = await memberResponse.json();
    if (Array.isArray(member?.roles) && member.roles.includes(ROLE_ID)) {
      return json({
        ok: true,
        assigned: false,
        already_assigned: true,
        channel_url: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}`,
      }, 200, origin);
    }

    const roleResponse = await discord(
      `${memberPath}/roles/${ROLE_ID}`,
      token,
      {
        method: "PUT",
        headers: {
          "X-Audit-Log-Reason": encodeURIComponent(`SCL 2027 Fantasy-lag sparat (${entry.id})`),
        },
      },
    );
    if (!roleResponse.ok) {
      const detail = (await roleResponse.text()).slice(0, 500);
      throw new Error(`DISCORD_ROLE_${roleResponse.status}: ${detail}`);
    }

    return json({
      ok: true,
      assigned: true,
      already_assigned: false,
      channel_url: `https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}`,
    }, 200, origin);
  } catch (error) {
    console.error("Fantasy Discord role error", error);
    return json({ error: "ROLE_ASSIGNMENT_FAILED", detail: errorText(error).slice(0, 500) }, 500, origin);
  }
});
