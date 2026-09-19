import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const PROFILE_BASE = "https://www.svenskehockey.se/#/spelare/";
const MY_PROFILE_URL = "https://www.svenskehockey.se/#/min-profil";

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [value.code, value.message, value.details, value.hint]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    if (parts.length) return parts.join(" | ");
    try { return JSON.stringify(value); } catch (_) {}
  }
  return String(error);
}

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

const VALID_POSITIONS = new Set(["LW","C","RW","LD","RD","G"]);
const ALL_SKATER_POSITIONS = ["LW","C","RW","LD","RD"];

function parseFreeCommand(content: unknown) {
  const raw = String(content || "").trim();
  const match = raw.match(/^!free(?:\s+(.+))?$/i);
  if (!match) return null;

  const args = String(match[1] || "")
    .toUpperCase()
    .replace(/[,+/|]+/g, " ")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!args.length) return { positions: [] as string[], invalid: [] as string[] };

  const positions: string[] = [];
  const invalid: string[] = [];

  for (const value of args) {
    if (value === "UTE" || value === "UTESPELARE" || value === "SKATER") {
      for (const pos of ALL_SKATER_POSITIONS) {
        if (!positions.includes(pos)) positions.push(pos);
      }
      continue;
    }

    if (VALID_POSITIONS.has(value)) {
      if (!positions.includes(value)) positions.push(value);
    } else {
      invalid.push(value);
    }
  }

  return { positions, invalid };
}

function sameText(a: unknown, b: unknown) {
  return String(a || "").trim().toLocaleLowerCase("sv-SE") === String(b || "").trim().toLocaleLowerCase("sv-SE");
}

function formatNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) : "0";
}

function playerImageUrl(player: any) {
  const direct = String(player?.player_image || "").trim();
  if (/^https?:\/\//i.test(direct)) return direct;

  const sportsId = String(player?.sports_gamer_player_id || "").trim();
  if (sportsId) {
    return `https://www.svenskehockey.se/web-images/players/${encodeURIComponent(sportsId)}.png.webp`;
  }
  return "";
}

function careerText(player: any) {
  const primary = String(player?.primary_position || "").trim().toUpperCase();
  const goalieGames = Number(player?.total_goalie_games || 0);
  const goalieSaves = Number(player?.total_goalie_saves || 0);
  const savePctRaw = Number(player?.total_goalie_save_percentage);
  if (primary === "G" || goalieGames > 0 && Number(player?.total_skater_games || 0) === 0) {
    const parts = [`${formatNumber(goalieGames || player?.career_games)} GP`];
    if (goalieSaves > 0) parts.push(`${formatNumber(goalieSaves)} räddningar`);
    if (Number.isFinite(savePctRaw) && savePctRaw > 0) {
      const pct = savePctRaw <= 1 ? savePctRaw * 100 : savePctRaw;
      parts.push(`${pct.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % SV`);
    }
    return parts.join(" · ");
  }

  const games = Number(player?.career_games || 0);
  const points = Number(player?.total_points || 0);
  return `${formatNumber(games)} GP · ${formatNumber(points)} P`;
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
    .select("enabled,channel_id,last_message_id,activated_at")
    .eq("id", 1)
    .maybeSingle();
  if (cfgError) throw cfgError;

  const enabled = Boolean(cfg?.enabled);
  const channelId = String(cfg?.channel_id || "").trim();
  const lastMessageId = String(cfg?.last_message_id || "").trim();
  const configuredAt = Date.parse(String(cfg?.activated_at || "")) || 0;

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
  let nonBotMessages = 0;
  let readableNonBotMessages = 0;
  const errors: string[] = [];
  let newest = lastMessageId;

  for (const message of ordered) {
    const id = String(message?.id || "");
    if (!id) continue;

    if (!message?.author?.bot) {
      nonBotMessages += 1;
      if (String(message?.content || "").trim()) readableNonBotMessages += 1;
    }

    if (id) newest = id;
    if (message?.author?.bot) continue;

    const freeCommand = parseFreeCommand(message?.content);
    if (!freeCommand) continue;

    if (!lastMessageId && configuredAt) {
      const messageTime = Date.parse(String(message?.timestamp || "")) || 0;
      if (messageTime && messageTime + 5000 < configuredAt) continue;
    }

    commands += 1;
    const discordUserId = String(message?.author?.id || "");
    if (!discordUserId) continue;

    if (freeCommand.invalid.length) {
      try {
        await sendMessage(token, channelId, {
          content: `<@${discordUserId}> okänd position: **${freeCommand.invalid.join(", ")}**. Använd LW, C, RW, LD, RD, G eller **UTE**.`,
          allowed_mentions: { users: [discordUserId], parse: [] },
        });
        await deleteMessage(token, channelId, id);
        deleted += 1;
      } catch (error) {
        errors.push(errorText(error));
      }
      continue;
    }

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
        const profilePositions = String(player.positions_text || player.primary_position || "–").trim();
        const positions = freeCommand.positions.length
          ? freeCommand.positions.join(" / ")
          : profilePositions;
        const currentTeam = String(player.current_team || "").trim();
        const currentDivision = String(player.current_division || "").trim();
        const latestTeam = String(player.latest_team || "").trim();
        const latestEclTeam = String(player.latest_ecl_team || "").trim();
        const latestEclDivision = String(player.latest_ecl_division || "").trim();
        const isFreeAgent = String(player.current_status || "") !== "team" || !currentTeam;
        const playerKey = encodeURIComponent(String(player.player_key || ""));
        const profileUrl = `${PROFILE_BASE}${playerKey}`;
        const imageUrl = playerImageUrl(player);

        const fields: any[] = [
          { name: "POSITION", value: positions || "–", inline: true },
          {
            name: "AKTUELLT",
            value: isFreeAgent ? "Free Agent" : currentTeam,
            inline: true,
          },
          {
            name: "DISCORD",
            value: `<@${discordUserId}>`,
            inline: true,
          },
        ];

        if (!isFreeAgent && currentDivision) {
          fields.push({ name: "DIVISION", value: currentDivision, inline: true });
        }

        if (latestTeam && (isFreeAgent || !sameText(latestTeam, currentTeam))) {
          fields.push({ name: "SENASTE LAG", value: latestTeam, inline: true });
        }

        if (
          latestEclTeam &&
          !sameText(latestEclTeam, currentTeam) &&
          !sameText(latestEclTeam, latestTeam)
        ) {
          fields.push({
            name: "SENASTE ECL",
            value: latestEclDivision ? `${latestEclTeam} · ${latestEclDivision}` : latestEclTeam,
            inline: true,
          });
        } else if (
          latestEclTeam &&
          sameText(latestEclTeam, latestTeam) &&
          latestEclDivision
        ) {
          fields.push({
            name: "SENASTE ECL",
            value: `${latestEclTeam} · ${latestEclDivision}`,
            inline: true,
          });
        }

        const career = careerText(player);
        if (career) fields.push({ name: "KARRIÄR", value: career, inline: false });

        const embed: Record<string, unknown> = {
          color: 5763719,
          title: `🟢 ${gt} är ledig`,
          url: profileUrl,
          description: "Ledig för spel just nu.",
          fields,
          footer: { text: "Svensk eHockey · !free" },
          timestamp: new Date().toISOString(),
        };
        if (imageUrl) embed.thumbnail = { url: imageUrl };

        await sendMessage(token, channelId, {
          embeds: [embed],
          components: [{
            type: 1,
            components: [{
              type: 2,
              style: 5,
              label: "Spelarkort",
              url: profileUrl,
            }],
          }],
          allowed_mentions: { parse: [] },
        });
      }

      try {
        await deleteMessage(token, channelId, id);
        deleted += 1;
      } catch (error) {
        errors.push(errorText(error));
      }
    } catch (error) {
      errors.push(errorText(error));
    }
  }

  const contentHidden = nonBotMessages > 0 && readableNonBotMessages === 0;
  if (contentHidden) {
    errors.push("Discord returnerade meddelanden utan läsbar content. Kontrollera Message Content Intent för botten.");
  }

  const update: Record<string, unknown> = {
    last_polled_at: new Date().toISOString(),
    last_error: errors.length ? errors.join(" | ").slice(0, 2000) : null,
    updated_at: new Date().toISOString(),
  };
  if (newest && !contentHidden) update.last_message_id = newest;

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
    content_hidden: contentHidden,
    non_bot_messages: nonBotMessages,
    readable_non_bot_messages: readableNonBotMessages,
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
    const action = String(body?.action || "watch");

    if (action === "poll") return json(await poll());
    if (action !== "watch") return json({ error: "Unknown action." }, 400);

    const startedAt = Date.now();
    const results: any[] = [];
    let totals = { processed: 0, commands: 0, linked: 0, unlinked: 0, deleted: 0 };

    while (Date.now() - startedAt < 54000) {
      const result: any = await poll();
      results.push(result);
      totals = {
        processed: totals.processed + Number(result?.processed || 0),
        commands: totals.commands + Number(result?.commands || 0),
        linked: totals.linked + Number(result?.linked || 0),
        unlinked: totals.unlinked + Number(result?.unlinked || 0),
        deleted: totals.deleted + Number(result?.deleted || 0),
      };

      if (!result?.enabled || !result?.configured) break;
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    return json({
      mode: "watch",
      elapsed_ms: Date.now() - startedAt,
      iterations: results.length,
      ...totals,
      last: results.at(-1) || null,
    });
  } catch (error) {
    const message = errorText(error);
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