import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const PROFILE_BASE = "https://www.svenskehockey.se/#/spelare/";
const MY_PROFILE_URL = "https://www.svenskehockey.se/#/min-profil";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) throw new Error("SUPABASE_SERVICE_CONFIG");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function discord(path: string, token: string, init: RequestInit = {}, retry = true) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
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

function snowflakeSort(a: any, b: any) {
  try {
    const aa = BigInt(String(a?.id || "0"));
    const bb = BigInt(String(b?.id || "0"));
    return aa < bb ? -1 : aa > bb ? 1 : 0;
  } catch (_) {
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  }
}

function isFreeCommand(content: unknown) {
  return /^!free\s*$/i.test(String(content || "").trim());
}

async function sendMessage(token: string, channelId: string, payload: Record<string, unknown>) {
  const response = await discord(`/channels/${channelId}/messages`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`SEND ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json().catch(() => ({}));
}

async function deleteMessage(token: string, channelId: string, messageId: string) {
  const response = await discord(`/channels/${channelId}/messages/${messageId}`, token, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    const detail = await response.text();
    throw new Error(`DELETE ${response.status}: ${detail.slice(0, 500)}`);
  }
}

async function resolvePlayer(admin: any, discordUserId: string) {
  const { data, error } = await admin.rpc("seh_discord_free_player_card_v1", {
    p_discord_user_id: discordUserId,
  });
  if (error) throw new Error(`RESOLVE: ${error.message}`);
  return data || { linked: false };
}

async function poll() {
  const token = Deno.env.get("SEH_DISCORD_BOT_TOKEN") || Deno.env.get("DISCORD_BOT_TOKEN") || "";
  if (!token) throw new Error("SEH_DISCORD_BOT_TOKEN saknas.");

  const admin = serviceClient();
  const { data: cfg, error: cfgError } = await admin
    .from("ehockey_discord_free_command_config")
    .select("enabled,channel_id,last_message_id,updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (cfgError) throw cfgError;

  const enabled = Boolean(cfg?.enabled);
  const channelId = String(cfg?.channel_id || "").trim();
  const lastMessageId = String(cfg?.last_message_id || "").trim();
  const configuredAt = Date.parse(String(cfg?.updated_at || "")) || 0;

  if (!enabled || !channelId) {
    return { enabled, configured: Boolean(channelId), processed: 0, commands: 0 };
  }

  const query = new URLSearchParams({ limit: "50" });
  if (lastMessageId) query.set("after", lastMessageId);

  const listResponse = await discord(`/channels/${channelId}/messages?${query.toString()}`, token, {
    method: "GET",
  });
  if (!listResponse.ok) {
    const detail = await listResponse.text();
    throw new Error(`READ ${listResponse.status}: ${detail.slice(0, 500)}`);
  }

  const messages = (await listResponse.json()) as any[];
  const ordered = Array.isArray(messages) ? [...messages].sort(snowflakeSort) : [];

  let commands = 0;
  let linked = 0;
  let unlinked = 0;
  let deleted = 0;
  const errors: string[] = [];
  let newest = lastMessageId;

  for (const message of ordered) {
    const id = String(message?.id || "");
    if (id) newest = id;
    if (!id || message?.author?.bot || !isFreeCommand(message?.content)) continue;

    if (!lastMessageId && configuredAt) {
      const messageTime = Date.parse(String(message?.timestamp || "")) || 0;
      if (messageTime && messageTime + 5000 < configuredAt) continue;
    }

    commands += 1;
    const discordUserId = String(message?.author?.id || "");
    if (!discordUserId) continue;

    try {
      const player = await resolvePlayer(admin, discordUserId);

      if (!player?.linked) {
        unlinked += 1;
        await sendMessage(token, channelId, {
          content: `<@${discordUserId}> ditt Discord-konto är inte kopplat till en godkänd spelarprofil. Koppla spelaren under **Min profil**: <${MY_PROFILE_URL}>`,
          allowed_mentions: { users: [discordUserId], parse: [] },
        });
      } else {
        linked += 1;
        const gt = String(player.display_gamertag || "Spelare").trim();
        const pos = String(player.primary_position || "–").trim();
        const division = String(player.division || "–").trim();
        const team = String(player.team_name || "Free Agent").trim();
        const playerKey = encodeURIComponent(String(player.player_key || ""));
        const profileUrl = `${PROFILE_BASE}${playerKey}`;

        await sendMessage(token, channelId, {
          content: `🟢 **${gt}** · ${pos} · ${division} · ${team}\n🔗 <${profileUrl}>`,
          allowed_mentions: { parse: [] },
        });
      }

      try {
        await deleteMessage(token, channelId, id);
        deleted += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const update: Record<string, unknown> = {
    last_polled_at: new Date().toISOString(),
    last_error: errors.length ? errors.join(" | ").slice(0, 2000) : null,
    updated_at: new Date().toISOString(),
  };
  if (newest) update.last_message_id = newest;

  const { error: updateError } = await admin
    .from("ehockey_discord_free_command_config")
    .update(update)
    .eq("id", 1);
  if (updateError) throw updateError;

  return {
    enabled: true,
    configured: true,
    processed: ordered.length,
    commands,
    linked,
    unlinked,
    deleted,
    errors,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const suppliedKey = request.headers.get("x-seh-internal-key") || "";
    const authClient = serviceClient();
    const { data: authCfg, error: authError } = await authClient
      .from("ehockey_discord_free_command_config")
      .select("poll_secret")
      .eq("id", 1)
      .maybeSingle();
    if (authError) throw authError;
    const expectedKey = String(authCfg?.poll_secret || "");
    if (!expectedKey || suppliedKey !== expectedKey) return json({ error: "Forbidden." }, 403);

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "poll");
    if (action !== "poll") return json({ error: "Unknown action." }, 400);
    return json(await poll());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const admin = serviceClient();
      await admin
        .from("ehockey_discord_free_command_config")
        .update({
          last_polled_at: new Date().toISOString(),
          last_error: message.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
    } catch (_) {}
    console.error("seh-discord-free:", message);
    return json({ error: message }, 500);
  }
});