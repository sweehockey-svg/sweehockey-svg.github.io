
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";
import { DateTime } from "npm:luxon@3.5.0";

const BASE = "https://stats.swehockey.se";
const COMPETITION_SOURCE_ID = "21043";
const VASBY_NAME = "Väsby IK HK";
const SOURCE = "swehockey";
const ZONE = "Europe/Stockholm";
const PARSER_VERSION = "game-sync-v1";
const UA = "HockeyCommentator/0.1 (+https://www.svenskehockey.se/lab/commentator-cockpit/)";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const clean = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();
const norm = (s: string | null | undefined) => clean(s).toLocaleLowerCase("sv-SE");

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fetchHtml(path: string) {
  const url = BASE + path;
  const response = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml" }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Swehockey ${response.status} for ${url}`);
  return { url, status: response.status, text, hash: await sha256(text) };
}

async function logFetch(item: any, entityType: string, entityKey: string) {
  const { data: previous } = await admin.from("ingest_fetches")
    .select("content_hash,parser_version")
    .eq("url", item.url)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("ingest_fetches").insert({
    source: SOURCE,
    source_entity_type: entityType,
    source_entity_key: entityKey,
    url: item.url,
    content_hash: item.hash,
    parser_version: PARSER_VERSION,
    http_status: item.status,
    changed: previous?.content_hash !== item.hash || previous?.parser_version !== PARSER_VERSION,
    metadata: { bytes: item.text.length }
  });
}

function parsePlayerText(text: string) {
  const m = clean(text).match(/^(\d+)\.\s*(.+)$/);
  if (!m) return null;
  return { jersey: Number(m[1]), sourceName: clean(m[2]).replace(/\s*\(\d+\)\s*$/, "") };
}

function parsePlayerList(text: string) {
  const normalized = clean(text);
  const segments = normalized.match(/\d+\.\s*.*?(?=\d+\.\s*|$)/g) || [];
  return segments.map(parsePlayerText).filter(Boolean) as Array<{jersey:number,sourceName:string}>;
}

function parseElapsed(text: string) {
  const m = clean(text).match(/^(\d{1,3}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function directRows($: cheerio.CheerioAPI, table: any) {
  return $(table).children("tbody").children("tr").map((_: number, tr: any) => ({
    cells: $(tr).children("th,td").map((__: number, td: any) => clean($(td).text())).get(),
    titles: $(tr).find("[title]").map((__: number, el: any) => clean($(el).attr("title") || "")).get(),
    links: $(tr).find("a").map((__: number, a: any) => ({
      text: clean($(a).text()),
      href: $(a).attr("href") || ""
    })).get()
  })).get();
}

function localDateTime(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(ZONE);
  return dt.isValid ? { date: dt.toFormat("yyyy-MM-dd"), time: dt.toFormat("HH:mm") } : { date: "", time: "" };
}

async function discoverGameIdentity(game: any, homeName: string, awayName: string) {
  const targets = [
    await fetchHtml(`/ScheduleAndResults/Schedule/${COMPETITION_SOURCE_ID}`),
    await fetchHtml(`/ScheduleAndResults/Live/${COMPETITION_SOURCE_ID}`)
  ];
  const wanted = localDateTime(game.scheduled_start);
  let foundGameNumber: string | null = game.game_number || null;
  let foundEventId: string | null = game.source_event_game_id || null;

  for (const item of targets) {
    const $ = cheerio.load(item.text);
    $("table.tblContent").each((_: number, table: any) => {
      let currentDate = "";
      for (const row of directRows($, table)) {
        const explicitDate = row.cells.find((c:string) => /^\d{4}-\d{2}-\d{2}$/.test(c));
        if (explicitDate) currentDate = explicitDate;

        const gameCell = row.cells.find((c:string) => c.includes(" - "));
        if (!gameCell || !gameCell.includes(homeName) || !gameCell.includes(awayName)) continue;
        const time = row.cells.find((c:string) => /^\d{2}:\d{2}$/.test(c)) || "";
        if (currentDate && wanted.date && currentDate !== wanted.date) continue;
        if (time && wanted.time && time !== wanted.time) continue;

        foundGameNumber = row.titles.find((v:string) => /^90\d{6}$/.test(v)) || foundGameNumber;
        const href = row.links.map((l:any) => l.href).join(" ");
        const id = href.match(/\/Game\/Events\/(\d+)/)?.[1] || null;
        if (id) foundEventId = id;
      }
    });
    await logFetch(item, item.url.includes("/Live/") ? "game_identity_live" : "game_identity_schedule", game.id);
  }

  const update:any = {
    game_number: foundGameNumber,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (foundEventId) {
    update.source_event_game_id = foundEventId;
    update.source_url = `${BASE}/Game/Events/${foundEventId}`;
  }
  const { error } = await admin.from("games").update(update).eq("id", game.id);
  if (error) throw error;
  return { gameNumber: foundGameNumber, eventId: foundEventId };
}

function parseLineup(html: string, game: any, homeName: string, awayName: string) {
  const $ = cheerio.load(html);
  const parsed:any[] = [];
  let lineupTable:any = null;

  $("table.tblContent").each((_:number, table:any) => {
    if (lineupTable) return;
    const direct = $(table).children("tbody").children("tr");
    const texts = direct.map((__:number,tr:any)=>clean($(tr).text())).get();
    if (texts.some((x:string)=>x.startsWith(homeName + " (")) &&
        texts.some((x:string)=>x.startsWith(awayName + " (")) &&
        texts.some((x:string)=>x.includes("1st Line"))) {
      lineupTable = $(table);
    }
  });

  if (!lineupTable) return parsed;

  let currentTeamId:string|null = null;
  let currentLine:number|null = null;
  let goalieMode = false;
  const goalieCounts = new Map<string,number>();

  const rows = lineupTable.children("tbody").children("tr").toArray();
  for (const tr of rows) {
    const cells = $(tr).children("th,td").map((_:number,td:any)=>clean($(td).text())).get();
    if (!cells.length) continue;

    const teamHeader = cells.find((x:string) =>
      x === homeName || x.startsWith(homeName + " (") ||
      x === awayName || x.startsWith(awayName + " (")
    );
    if (teamHeader) {
      currentTeamId = teamHeader.startsWith(homeName) ? game.home_team_id : game.away_team_id;
      currentLine = null;
      goalieMode = false;
      continue;
    }
    if (!currentTeamId) continue;

    const lineLabel = cells.find((x:string)=>/^\d+(?:st|nd|rd|th) Line$/i.test(x));
    const hasGoalies = cells.some((x:string)=>x === "Goalies");
    const playerCells = cells.map(parsePlayerText).filter(Boolean) as Array<{jersey:number,sourceName:string}>;
    const blankRow = cells.every((x:string)=>!x);

    if (blankRow) {
      currentLine = null;
      goalieMode = false;
      continue;
    }

    if (hasGoalies) {
      goalieMode = true;
      currentLine = null;
    }
    if (lineLabel) {
      currentLine = Number(lineLabel.match(/^\d+/)?.[0] || 0) || null;
      goalieMode = false;
    }

    if (!playerCells.length) continue;
    for (const p of playerCells) {
      let goalieRole:string|null = null;
      let position:string|null = null;
      if (goalieMode) {
        const next = (goalieCounts.get(currentTeamId) || 0) + 1;
        goalieCounts.set(currentTeamId,next);
        goalieRole = next === 1 ? "listed_1" : "listed_2";
        position = "GK";
      }
      parsed.push({
        team_id:currentTeamId,
        source_name:p.sourceName,
        jersey_number:p.jersey,
        position,
        line_number:goalieMode ? null : currentLine,
        goalie_role:goalieRole,
        is_extra:currentLine === null && !goalieMode,
        source_fragment:{ cells }
      });
    }
  }

  const unique = new Map<string,any>();
  for (const p of parsed) {
    const key = [p.team_id,p.jersey_number,norm(p.source_name),p.line_number,p.goalie_role].join("|");
    unique.set(key,p);
  }
  return [...unique.values()];
}

function locateRosterPlayer(roster:any[], teamId:string, jersey:number|null, sourceName?:string|null) {
  if (!jersey) return null;
  const candidates = roster.filter(r => r.team_id === teamId && r.jersey_number === jersey);
  if (candidates.length === 1) return candidates[0];
  if (sourceName) {
    const exact = candidates.find(r => norm(r.source_name) === norm(sourceName));
    if (exact) return exact;
  }
  return null;
}

async function syncLineup(game:any, eventId:string, htmlItem:any, homeName:string, awayName:string, roster:any[]) {
  if (!htmlItem.text) return { changed:false, players:0 };
  const lineup = parseLineup(htmlItem.text, game, homeName, awayName);
  if (!lineup.length) return { changed:false, players:0 };

  const canonical = lineup.map(p => ({
    team_id:p.team_id, source_name:p.source_name, jersey_number:p.jersey_number,
    position:p.position, line_number:p.line_number, goalie_role:p.goalie_role, is_extra:p.is_extra
  })).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const contentHash = await sha256(JSON.stringify(canonical));

  const { data: existing, error: existingError } = await admin.from("game_lineup_revisions")
    .select("id,is_current")
    .eq("game_id", game.id)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (!existing.is_current) {
      await admin.from("game_lineup_revisions").update({ is_current:false }).eq("game_id",game.id);
      await admin.from("game_lineup_revisions").update({ is_current:true, fetched_at:new Date().toISOString() }).eq("id",existing.id);
    }
    return { changed:false, players:lineup.length, revisionId:existing.id };
  }

  const { error: clearError } = await admin.from("game_lineup_revisions")
    .update({ is_current:false })
    .eq("game_id", game.id)
    .eq("is_current", true);
  if (clearError) throw clearError;

  const { data: revision, error: revisionError } = await admin.from("game_lineup_revisions").insert({
    game_id:game.id,
    content_hash:contentHash,
    status:game.status,
    is_current:true,
    source_url:`${BASE}/Game/LineUps/${eventId}`
  }).select("id").single();
  if (revisionError) throw revisionError;

  const payload = lineup.map(p => {
    const rosterPlayer = locateRosterPlayer(roster,p.team_id,p.jersey_number,p.source_name);
    return {
      lineup_revision_id:revision.id,
      team_id:p.team_id,
      player_id:rosterPlayer?.player_id || null,
      source_name:p.source_name,
      jersey_number:p.jersey_number,
      position:p.position || rosterPlayer?.position || null,
      line_number:p.line_number,
      goalie_role:p.goalie_role,
      is_extra:p.is_extra,
      source_fragment:p.source_fragment
    };
  });
  const { error: playersError } = await admin.from("game_lineup_players").insert(payload);
  if (playersError) throw playersError;
  return { changed:true, players:payload.length, revisionId:revision.id };
}

function inferEventType(rawType:string) {
  if (/^\d+\s*-\s*\d+\s*\(/.test(rawType)) return "goal";
  if (/^\d+\s+min$/i.test(rawType)) return "penalty";
  if (rawType === "GK In") return "goalie_in";
  if (rawType === "GK Out") return "goalie_out";
  if (rawType === "TO") return "timeout";
  if (rawType === "Powerbreak") return "powerbreak";
  if (rawType === "Game Interrupted") return "game_interrupted";
  return norm(rawType).replace(/[^a-z0-9åäö]+/g,"_").replace(/^_+|_+$/g,"_") || "event";
}

function displaySourceName(sourceName:string) {
  const name = clean(sourceName);
  const comma = name.indexOf(",");
  if (comma < 0) return name;
  return clean(name.slice(comma + 1) + " " + name.slice(0, comma));
}

function formatPlayerRef(player:{jersey:number,sourceName:string}) {
  return "#" + player.jersey + " " + displaySourceName(player.sourceName);
}

function formatEventDescription(row:any) {
  if (row.event_type === "goal" && row.players.length) {
    const scorer = formatPlayerRef(row.players[0]);
    const goalCount = row.actorText.match(/^\s*\d+\.\s*.*?\((\d+)\)/)?.[1] || null;
    const assists = row.players.slice(1).map(formatPlayerRef);
    return scorer + (goalCount ? " (" + goalCount + ")" : "") +
      (assists.length ? " · Ass: " + assists.join(", ") : "");
  }

  if (row.event_type === "penalty" && row.players[0]) {
    const reason = clean(row.details).replace(/^[-–—·\s]+/, "");
    return formatPlayerRef(row.players[0]) + (reason ? " · " + reason : "");
  }

  if ((row.event_type === "goalie_in" || row.event_type === "goalie_out") && row.players[0]) {
    return formatPlayerRef(row.players[0]);
  }

  return [row.actorText,row.details].filter(Boolean).join(" · ") || row.rawType;
}

function pctValue(text:string|null|undefined) {
  const n = Number(clean(text).replace("%","").replace(",","."));
  return Number.isFinite(n) ? n : null;
}

function clockSeconds(text:string|null|undefined) {
  const m = clean(text).replace(/[()]/g,"").match(/^(\d+):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function periodValues(text:string|null|undefined) {
  const m = clean(text).match(/\((\d+):(\d+):(\d+)(?::(\d+))?\)/);
  if (!m) return null;
  return [m[1],m[2],m[3],m[4]].filter(Boolean).map(Number);
}

function parseSummaryStats(html:string, game:any, lastGoal:any) {
  const $ = cheerio.load(html);
  let table:any = null;

  $("table.tblContent").each((_:number,t:any) => {
    if (table) return;
    const rows = $(t).children("tbody").children("tr").toArray().map((tr:any)=>
      $(tr).children("th,td").map((_:number,td:any)=>clean($(td).text())).get()
    );
    if (rows.some((cells:string[]) => cells.filter(x => x === "Shots").length >= 2) &&
        rows.some((cells:string[]) => cells.filter(x => x === "PIM").length >= 2)) {
      table = $(t);
    }
  });

  if (!table) return [];

  const rows = table.children("tbody").children("tr").toArray().map((tr:any)=>
    $(tr).children("th,td").map((_:number,td:any)=>clean($(td).text())).get()
  );

  function extractPair(label:string) {
    const cells = rows.find((r:string[]) => r.filter(x => x === label).length >= 2);
    if (!cells) return null;
    const idx1 = cells.indexOf(label);
    const idx2 = cells.indexOf(label, idx1 + 1);
    return {
      homeValue: cells[idx1 + 1] || null,
      homeExtra: cells[idx1 + 2] || null,
      awayValue: cells[idx2 + 1] || null,
      awayExtra: cells[idx2 + 2] || null
    };
  }

  const shots = extractPair("Shots");
  const saves = extractPair("Saves");
  const pim = extractPair("PIM");
  const pp = extractPair("PP");

  const homeShots = shots && /^\d+$/.test(shots.homeValue || "") ? Number(shots.homeValue) : null;
  const awayShots = shots && /^\d+$/.test(shots.awayValue || "") ? Number(shots.awayValue) : null;
  const homeSaves = saves && /^\d+$/.test(saves.homeValue || "") ? Number(saves.homeValue) : null;
  const awaySaves = saves && /^\d+$/.test(saves.awayValue || "") ? Number(saves.awayValue) : null;
  const homePim = pim && /^\d+$/.test(pim.homeValue || "") ? Number(pim.homeValue) : null;
  const awayPim = pim && /^\d+$/.test(pim.awayValue || "") ? Number(pim.awayValue) : null;
  const homePpPct = pp ? pctValue(pp.homeValue) : null;
  const awayPpPct = pp ? pctValue(pp.awayValue) : null;
  const homePpSeconds = pp ? clockSeconds(pp.homeExtra) : null;
  const awayPpSeconds = pp ? clockSeconds(pp.awayExtra) : null;

  const homeScore = lastGoal?.home_score ?? game.home_score ?? null;
  const awayScore = lastGoal?.away_score ?? game.away_score ?? null;

  const homeSavePct = homeSaves !== null && awayShots ? Number(((homeSaves / awayShots) * 100).toFixed(3)) : null;
  const awaySavePct = awaySaves !== null && homeShots ? Number(((awaySaves / homeShots) * 100).toFixed(3)) : null;

  return [
    {
      game_id:game.id,
      team_id:game.home_team_id,
      goals:homeScore,
      shots:homeShots,
      saves:homeSaves,
      save_pct:homeSavePct,
      pim:homePim,
      power_play_pct:homePpPct,
      power_play_seconds:homePpSeconds,
      period_stats:{
        shots:periodValues(shots?.homeExtra),
        pim:periodValues(pim?.homeExtra)
      },
      source_fragment:{ parser:PARSER_VERSION, side:"home" },
      source_updated_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    },
    {
      game_id:game.id,
      team_id:game.away_team_id,
      goals:awayScore,
      shots:awayShots,
      saves:awaySaves,
      save_pct:awaySavePct,
      pim:awayPim,
      power_play_pct:awayPpPct,
      power_play_seconds:awayPpSeconds,
      period_stats:{
        shots:periodValues(shots?.awayExtra),
        pim:periodValues(pim?.awayExtra)
      },
      source_fragment:{ parser:PARSER_VERSION, side:"away" },
      source_updated_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    }
  ];
}

function parseEventRows(html:string) {
  const $ = cheerio.load(html);
  let eventTable:any = null;
  $("table.tblContent").each((_:number,t:any)=>{
    if (eventTable) return;
    const texts = $(t).children("tbody").children("tr").map((__:number,tr:any)=>clean($(tr).text())).get();
    if (texts.some((x:string)=>/^1st period/i.test(x)) && texts.some((x:string)=>/^\d{1,3}:\d{2}/.test(x))) {
      eventTable = $(t);
    }
  });
  if (!eventTable) return [];

  const raw:any[] = [];
  let period:number|null = null;
  let ordinal = 0;
  const rows = eventTable.children("tbody").children("tr").toArray();
  for (const tr of rows) {
    const cells = $(tr).children("th,td").map((_:number,td:any)=>clean($(td).text())).get();
    if (!cells.length) continue;
    const p = cells.join(" ").match(/^(\d+)(?:st|nd|rd|th) period$/i);
    if (p) { period = Number(p[1]); continue; }
    if (!/^\d{1,3}:\d{2}$/.test(cells[0] || "")) continue;

    const time = cells[0];
    const rawType = cells[1] || "";
    const teamCode = cells[2] || "";
    const actorText = cells[3] || "";
    const details = cells[4] || "";
    const score = rawType.match(/^(\d+)\s*-\s*(\d+)\s*\(([^)]+)\)/);
    const penalty = rawType.match(/^(\d+)\s+min$/i);
    raw.push({
      ordinal: ordinal++,
      period,
      time,
      event_seconds: parseElapsed(time),
      rawType,
      teamCode,
      actorText,
      details,
      event_type: inferEventType(rawType),
      home_score: score ? Number(score[1]) : null,
      away_score: score ? Number(score[2]) : null,
      strength: score ? clean(score[3]) : null,
      penalty_minutes: penalty ? Number(penalty[1]) : null,
      players: parsePlayerList(actorText),
      cells
    });
  }
  return raw;
}

async function syncEvents(game:any, eventId:string, htmlItem:any, roster:any[]) {
  if (!htmlItem.text) return { events:0, participants:0 };
  const rows = parseEventRows(htmlItem.text);
  if (!rows.length) return { events:0, participants:0 };

  const teamCodeMap = new Map<string,string>();
  for (const row of rows) {
    if (!row.teamCode || !row.players.length || teamCodeMap.has(row.teamCode)) continue;
    const p = row.players[0];
    const home = locateRosterPlayer(roster,game.home_team_id,p.jersey,p.sourceName);
    const away = locateRosterPlayer(roster,game.away_team_id,p.jersey,p.sourceName);
    if (home && !away) teamCodeMap.set(row.teamCode,game.home_team_id);
    if (away && !home) teamCodeMap.set(row.teamCode,game.away_team_id);
  }

  const eventPayload:any[] = [];
  const rowByKey = new Map<string,any>();
  for (const row of rows) {
    const rawKey = JSON.stringify([row.period,row.time,row.rawType,row.teamCode,row.actorText,row.details]);
    const sourceKey = await sha256(rawKey);
    row.source_event_key = sourceKey;
    row.team_id = teamCodeMap.get(row.teamCode) || null;
    rowByKey.set(sourceKey,row);
    eventPayload.push({
      game_id:game.id,
      source_event_key:sourceKey,
      ordinal:row.ordinal,
      period:row.period,
      event_seconds:row.event_seconds,
      clock_display:row.time,
      event_type:row.event_type,
      team_id:row.team_id,
      strength:row.strength,
      home_score:row.home_score,
      away_score:row.away_score,
      description:formatEventDescription(row),
      is_active:true,
      source_hash:sourceKey,
      source_fragment:{
        cells:row.cells,
        team_code:row.teamCode,
        raw_type:row.rawType,
        penalty_minutes:row.penalty_minutes
      },
      last_seen_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    });
  }

  const { error: deactivateError } = await admin.from("game_events")
    .update({ is_active:false, updated_at:new Date().toISOString() })
    .eq("game_id",game.id);
  if (deactivateError) throw deactivateError;

  const { data: saved, error: saveError } = await admin.from("game_events")
    .upsert(eventPayload,{onConflict:"game_id,source_event_key"})
    .select("id,source_event_key");
  if (saveError) throw saveError;

  const eventIds = (saved || []).map((e:any)=>e.id);
  if (eventIds.length) {
    const { error: deletePlayersError } = await admin.from("game_event_players").delete().in("event_id",eventIds);
    if (deletePlayersError) throw deletePlayersError;
  }

  const participants:any[] = [];
  const otherTeam = (teamId:string|null) => teamId === game.home_team_id ? game.away_team_id :
                                            teamId === game.away_team_id ? game.home_team_id : null;

  for (const savedEvent of saved || []) {
    const row = rowByKey.get(savedEvent.source_event_key);
    if (!row) continue;
    const teamId = row.team_id;

    if (row.event_type === "goal") {
      row.players.forEach((p:any,i:number)=>{
        const rp = teamId ? locateRosterPlayer(roster,teamId,p.jersey,p.sourceName) : null;
        participants.push({
          event_id:savedEvent.id, player_id:rp?.player_id || null, team_id:teamId,
          source_name:p.sourceName, jersey_number:p.jersey,
          role:i===0 ? "scorer" : "assist", sort_order:i,
          source_fragment:{ actor_text:row.actorText }
        });
      });

      const onIce = row.details.match(/Pos\. Part\.:\s*([0-9 ,]+)\s*Neg\. Part\.:\s*([0-9 ,]+)/i);
      if (onIce && teamId) {
        const positive = onIce[1].split(",").map((x:string)=>Number(x.trim())).filter(Number.isFinite);
        const negative = onIce[2].split(",").map((x:string)=>Number(x.trim())).filter(Number.isFinite);
        positive.forEach((jersey:number,i:number)=>{
          const rp = locateRosterPlayer(roster,teamId,jersey,null);
          participants.push({
            event_id:savedEvent.id, player_id:rp?.player_id || null, team_id:teamId,
            source_name:rp?.source_name || `#${jersey}`, jersey_number:jersey,
            role:"on_ice_positive", sort_order:i, source_fragment:{}
          });
        });
        const negTeam = otherTeam(teamId);
        negative.forEach((jersey:number,i:number)=>{
          const rp = negTeam ? locateRosterPlayer(roster,negTeam,jersey,null) : null;
          participants.push({
            event_id:savedEvent.id, player_id:rp?.player_id || null, team_id:negTeam,
            source_name:rp?.source_name || `#${jersey}`, jersey_number:jersey,
            role:"on_ice_negative", sort_order:i, source_fragment:{}
          });
        });
      }
    } else if (["penalty","goalie_in","goalie_out"].includes(row.event_type) && row.players[0]) {
      const p = row.players[0];
      const rp = teamId ? locateRosterPlayer(roster,teamId,p.jersey,p.sourceName) : null;
      participants.push({
        event_id:savedEvent.id, player_id:rp?.player_id || null, team_id:teamId,
        source_name:p.sourceName, jersey_number:p.jersey,
        role:row.event_type === "penalty" ? "penalized" : "goalie",
        sort_order:0, source_fragment:{ actor_text:row.actorText }
      });
    }
  }

  if (participants.length) {
    const { error: partError } = await admin.from("game_event_players").insert(participants);
    if (partError) throw partError;
  }

  const bodyText = clean(cheerio.load(htmlItem.text)("body").text());
  const infoMatch = bodyText.match(/Shots\s*\d+[^]*?(\d+)\s*-\s*(\d+)\s*\([^)]*\)\s*(Final Score)?/i);
  const update:any = {
    source_event_game_id:eventId,
    source_url:`${BASE}/Game/Events/${eventId}`,
    last_seen_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
  const lastGoal = rows
    .filter((r:any)=>r.home_score !== null && r.away_score !== null)
    .sort((a:any,b:any)=>(b.event_seconds ?? -1) - (a.event_seconds ?? -1))[0] || null;
  if (lastGoal) {
    update.home_score = lastGoal.home_score;
    update.away_score = lastGoal.away_score;
  }
  if (/Final Score/i.test(bodyText)) update.status = "final";
  else if (rows.length) update.status = "live";
  if (infoMatch?.[3]) update.status = "final";

  const { error: gameUpdateError } = await admin.from("games").update(update).eq("id",game.id);
  if (gameUpdateError) throw gameUpdateError;

  const summaryStats = parseSummaryStats(htmlItem.text, game, lastGoal);
  if (summaryStats.length) {
    const { error: statsError } = await admin.from("team_game_stats")
      .upsert(summaryStats,{onConflict:"game_id,team_id"});
    if (statsError) throw statsError;
  }

  return {
    events:eventPayload.length,
    participants:participants.length,
    team_stats:summaryStats.length
  };
}

async function syncGameData(game:any, eventId:string, homeName:string, awayName:string) {
  const [lineupHtml, eventsHtml] = await Promise.all([
    fetchHtml(`/Game/LineUps/${eventId}`),
    fetchHtml(`/Game/Events/${eventId}`)
  ]);

  await Promise.all([
    logFetch(lineupHtml,"game_lineup",eventId),
    logFetch(eventsHtml,"game_events",eventId)
  ]);

  if (!lineupHtml.text && !eventsHtml.text) {
    return { eventId, awaiting:true, lineup:{players:0}, events:{events:0,participants:0} };
  }

  const { data: roster, error: rosterError } = await admin.from("team_rosters")
    .select("team_id,player_id,jersey_number,source_name,position,is_active")
    .eq("competition_id",game.competition_id)
    .in("team_id",[game.home_team_id,game.away_team_id]);
  if (rosterError) throw rosterError;

  const lineupResult = await syncLineup(game,eventId,lineupHtml,homeName,awayName,roster || []);
  const eventsResult = await syncEvents(game,eventId,eventsHtml,roster || []);
  return { eventId, awaiting:false, lineup:lineupResult, events:eventsResult };
}

Deno.serve(async (req:Request) => {
  const started = Date.now();
  const requestUrl = new URL(req.url);
  const force = requestUrl.searchParams.get("force") === "1";
  try {
    const candidate = req.headers.get("x-sync-token") || "";
    const { data:valid, error:authError } = await admin.rpc("validate_swehockey_sync_token",{candidate});
    if (authError || valid !== true) return Response.json({error:"forbidden"},{status:403});

    const { data:competition, error:competitionError } = await admin.from("competitions")
      .select("id")
      .eq("source",SOURCE)
      .eq("source_competition_id",COMPETITION_SOURCE_ID)
      .single();
    if (competitionError) throw competitionError;

    const { data:vasby, error:vasbyError } = await admin.from("teams")
      .select("id,canonical_name")
      .eq("canonical_name",VASBY_NAME)
      .single();
    if (vasbyError) throw vasbyError;

    const gameSelect = "id,competition_id,source_game_id,source_event_game_id,game_number,scheduled_start,home_team_id,away_team_id,status,home_score,away_score";

    const { data:latestFinal, error:finalError } = await admin.from("games")
      .select(gameSelect)
      .eq("competition_id",competition.id)
      .eq("status","final")
      .or(`home_team_id.eq.${vasby.id},away_team_id.eq.${vasby.id}`)
      .order("scheduled_start",{ascending:false})
      .limit(1)
      .maybeSingle();
    if (finalError) throw finalError;

    const { data:nextGame, error:nextError } = await admin.from("games")
      .select(gameSelect)
      .eq("competition_id",competition.id)
      .or(`home_team_id.eq.${vasby.id},away_team_id.eq.${vasby.id}`)
      .gt("scheduled_start",new Date().toISOString())
      .order("scheduled_start",{ascending:true})
      .limit(1)
      .maybeSingle();
    if (nextError) throw nextError;

    const teamIds = [...new Set([
      latestFinal?.home_team_id,latestFinal?.away_team_id,
      nextGame?.home_team_id,nextGame?.away_team_id
    ].filter(Boolean))];
    const { data:teams, error:teamsError } = await admin.from("teams")
      .select("id,canonical_name")
      .in("id",teamIds);
    if (teamsError) throw teamsError;
    const teamMap = new Map((teams || []).map((t:any)=>[t.id,t.canonical_name]));

    const output:any = { ok:true, bootstrap:null, next:null };

    if (latestFinal) {
      const { count:eventCount, error:countError } = await admin.from("game_events")
        .select("id",{count:"exact",head:true})
        .eq("game_id",latestFinal.id)
        .eq("is_active",true);
      if (countError) throw countError;

      const { count:lineupCount, error:lineupCountError } = await admin.from("game_lineup_revisions")
        .select("id",{count:"exact",head:true})
        .eq("game_id",latestFinal.id)
        .eq("is_current",true);
      if (lineupCountError) throw lineupCountError;

      const { count:teamStatsCount, error:teamStatsCountError } = await admin.from("team_game_stats")
        .select("id",{count:"exact",head:true})
        .eq("game_id",latestFinal.id);
      if (teamStatsCountError) throw teamStatsCountError;

      const legacyNumeric = /^\d+$/.test(latestFinal.source_game_id || "") ? latestFinal.source_game_id : null;
      const finalEventId = latestFinal.source_event_game_id || legacyNumeric;
      if ((force || (eventCount || 0) === 0 || (lineupCount || 0) === 0 || (teamStatsCount || 0) < 2) && finalEventId) {
        output.bootstrap = await syncGameData(
          latestFinal,
          finalEventId,
          teamMap.get(latestFinal.home_team_id) || "",
          teamMap.get(latestFinal.away_team_id) || ""
        );
      } else {
        output.bootstrap = {
          skipped:true,
          existing_events:eventCount || 0,
          existing_lineups:lineupCount || 0,
          existing_team_stats:teamStatsCount || 0,
          eventId:finalEventId
        };
      }
    }

    if (nextGame) {
      const msToStart = new Date(nextGame.scheduled_start).getTime() - Date.now();
      const hoursToStart = msToStart / 3600000;
      output.next = {
        game_id:nextGame.id,
        game_number:nextGame.game_number,
        source_event_game_id:nextGame.source_event_game_id,
        hours_to_start:Math.round(hoursToStart * 10) / 10
      };

      if (hoursToStart <= 24 && hoursToStart >= -5) {
        const homeName = teamMap.get(nextGame.home_team_id) || "";
        const awayName = teamMap.get(nextGame.away_team_id) || "";
        const identity = await discoverGameIdentity(nextGame,homeName,awayName);
        output.next.identity = identity;
        if (identity.eventId) {
          output.next.sync = await syncGameData(nextGame,identity.eventId,homeName,awayName);
        } else {
          output.next.state = "awaiting_event_id";
        }
      } else {
        output.next.state = "idle_until_24h_before_start";
      }
    }

    output.elapsed_ms = Date.now() - started;
    return Response.json(output);
  } catch (error) {
    console.error("swehockey-game-sync failed",error);
    return Response.json({
      ok:false,
      error:error instanceof Error ? error.message : (typeof error === "object" && error ? JSON.stringify(error) : String(error)),
      elapsed_ms:Date.now()-started
    },{status:500});
  }
});
