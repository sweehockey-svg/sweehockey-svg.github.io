
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";
import { DateTime } from "npm:luxon@3.5.0";

const BASE = "https://stats.swehockey.se";
const COMPETITION_ID = "21043";
const ZONE = "Europe/Stockholm";
const SOURCE = "swehockey";
const UA = "HockeyCommentator/0.1 (+https://www.svenskehockey.se/lab/commentator-cockpit/)";
const PARSER_VERSION = "base-sync-v2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const clean = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();
const norm = (s: string) => clean(s).toLocaleLowerCase("sv-SE");

function directRows($: cheerio.CheerioAPI, table: any) {
  return $(table).children("tbody").children("tr").map((_: number, tr: any) => ({
    cells: $(tr).children("th,td").map((__: number, td: any) => clean($(td).text())).get(),
    links: $(tr).find("a").map((__: number, a: any) => ({
      text: clean($(a).text()),
      href: $(a).attr("href") || ""
    })).get(),
    titles: $(tr).find("[title]").map((__: number, el: any) => clean($(el).attr("title") || "")).get()
  })).get();
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fetchHtml(path: string) {
  const url = BASE + path;
  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Swehockey ${response.status} for ${url}`);
  return { url, status: response.status, text, hash: await sha256(text) };
}

async function logFetch(item: {url:string,status:number,text:string,hash:string}, entityType: string, entityKey: string) {
  const { data: previous } = await admin
    .from("ingest_fetches")
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

function splitGame(text: string) {
  const separator = " - ";
  const idx = text.indexOf(separator);
  if (idx < 1) return null;
  return [clean(text.slice(0, idx)), clean(text.slice(idx + separator.length))] as const;
}

function parseScore(text: string) {
  const m = text.match(/^(\d+)\s*-\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] as const : null;
}

function localIso(dateTimeText: string) {
  const dt = DateTime.fromFormat(clean(dateTimeText), "yyyy-MM-dd HH:mm", { zone: ZONE });
  return dt.isValid ? dt.toUTC().toISO() : null;
}

function localNoonIso(dateText: string) {
  const dt = DateTime.fromFormat(clean(dateText) + " 12:00", "yyyy-MM-dd HH:mm", { zone: ZONE });
  return dt.isValid ? dt.toUTC().toISO() : null;
}

function gameLocalDate(iso: string | null) {
  if (!iso) return "";
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(ZONE);
  return dt.isValid ? dt.toFormat("yyyy-MM-dd") : "";
}

function playerNameParts(sourceName: string) {
  const comma = sourceName.indexOf(",");
  if (comma < 0) return { first: "", last: clean(sourceName) };
  return {
    last: clean(sourceName.slice(0, comma)),
    first: clean(sourceName.slice(comma + 1))
  };
}

Deno.serve(async (req: Request) => {
  const started = Date.now();
  try {
    const candidate = req.headers.get("x-sync-token") || "";
    const { data: valid, error: authError } = await admin.rpc("validate_swehockey_sync_token", { candidate });
    if (authError || valid !== true) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const [overview, schedule, roster] = await Promise.all([
      fetchHtml(`/ScheduleAndResults/Overview/${COMPETITION_ID}`),
      fetchHtml(`/ScheduleAndResults/Schedule/${COMPETITION_ID}`),
      fetchHtml(`/Teams/Info/TeamRoster/${COMPETITION_ID}`)
    ]);

    const previousFetches = await Promise.all(
      [overview, schedule, roster].map(async (item) => {
        const { data } = await admin
          .from("ingest_fetches")
          .select("content_hash,parser_version")
          .eq("url", item.url)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data || null;
      })
    );

    const unchanged =
      previousFetches[0]?.content_hash === overview.hash &&
      previousFetches[1]?.content_hash === schedule.hash &&
      previousFetches[2]?.content_hash === roster.hash &&
      previousFetches.every((row:any) => row?.parser_version === PARSER_VERSION);

    if (unchanged) {
      await Promise.all([
        logFetch(overview, "competition_overview", COMPETITION_ID),
        logFetch(schedule, "competition_schedule", COMPETITION_ID),
        logFetch(roster, "competition_roster", COMPETITION_ID)
      ]);
      return Response.json({
        ok: true,
        unchanged: true,
        competition: "Hockeyettan Norra",
        competition_id: COMPETITION_ID,
        elapsed_ms: Date.now() - started
      });
    }

    const $overview = cheerio.load(overview.text);
    const $schedule = cheerio.load(schedule.text);
    const $roster = cheerio.load(roster.text);

    const overviewTables = $overview("table.tblContent").toArray().map(t => directRows($overview, t));
    const scheduleTables = $schedule("table.tblContent").toArray().map(t => directRows($schedule, t));
    const rosterTables = $roster("table.tblContent").toArray().map(t => directRows($roster, t));

    const standingsRows = overviewTables.find(rows =>
      rows.some(r => r.cells[0] === "RK" && r.cells[1] === "Team" && r.cells.includes("GP"))
    ) || [];

    const standingsHeader = standingsRows.findIndex(r => r.cells[0] === "RK" && r.cells[1] === "Team");
    const standings = standingsRows.slice(Math.max(0, standingsHeader + 1))
      .filter(r => /^\d+$/.test(r.cells[0] || "") && r.cells[1])
      .map(r => {
        const gfga = (r.cells[6] || "").match(/^(\d+):(\d+)/);
        return {
          rank: Number(r.cells[0]),
          team: clean(r.cells[1]),
          gp: Number(r.cells[2] || 0),
          w: Number(r.cells[3] || 0),
          t: Number(r.cells[4] || 0),
          l: Number(r.cells[5] || 0),
          gf: gfga ? Number(gfga[1]) : null,
          ga: gfga ? Number(gfga[2]) : null,
          gd: Number(r.cells[7] || 0),
          points: Number(r.cells[8] || 0),
          source_values: {
            gf_ga: r.cells[6] || null,
            otw: Number(r.cells[9] || 0),
            otl: Number(r.cells[10] || 0),
            gwsw: Number(r.cells[11] || 0),
            gwsl: Number(r.cells[12] || 0)
          }
        };
      });

    const resultsRows = overviewTables.find(rows =>
      rows.some(r => r.cells.includes("Result") && r.cells.includes("Spectators") && r.cells.includes("Venue"))
    ) || [];
    const resultsHeader = resultsRows.findIndex(r => r.cells.includes("Result") && r.cells.includes("Spectators"));
    const results = resultsRows.slice(Math.max(0, resultsHeader + 1))
      .filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.cells[0] || "") && r.cells[1])
      .map(r => {
        const teams = splitGame(r.cells[1]);
        const score = parseScore(r.cells[2] || "");
        const href = r.links.map((l:any) => l.href).join(" ");
        const idMatch = href.match(/\/Game\/Events\/(\d+)/);
        const gameNumber = r.titles.find((v:string) => /^90\d{6}$/.test(v)) || null;
        if (!teams || !score) return null;
        return {
          date: r.cells[0],
          home: teams[0],
          away: teams[1],
          homeScore: score[0],
          awayScore: score[1],
          periods: r.cells[3] || null,
          attendance: /^\d+$/.test(r.cells[4] || "") ? Number(r.cells[4]) : null,
          venue: r.cells[5] || null,
          gameId: idMatch ? idMatch[1] : null,
          gameNumber
        };
      }).filter(Boolean) as any[];

    const fullScheduleRows = scheduleTables.find(rows =>
      rows.some(r => r.cells.includes("Date") && r.cells.includes("Time") && r.cells.includes("Game") && r.cells.includes("Venue"))
    ) || [];
    const scheduleHeader = fullScheduleRows.findIndex(r =>
      r.cells.includes("Date") && r.cells.includes("Time") && r.cells.includes("Game")
    );
    const futureGames:any[] = [];
    let scheduleDate = "";
    for (const r of fullScheduleRows.slice(Math.max(0, scheduleHeader + 1))) {
      const explicitDate = r.cells.find((c:string) => /^\d{4}-\d{2}-\d{2}$/.test(c));
      if (explicitDate) scheduleDate = explicitDate;
      if (!scheduleDate) continue;

      const time = r.cells.find((c:string) => /^\d{2}:\d{2}$/.test(c));
      const gameIndex = r.cells.findIndex((c:string) => c.includes(" - "));
      if (!time || gameIndex < 0) continue;

      const teams = splitGame(r.cells[gameIndex]);
      if (!teams) continue;

      const resultCell = r.cells[gameIndex + 1] || "";
      if (parseScore(resultCell)) continue;

      const gameNumber = r.titles.find((v:string) => /^90\d{6}$/.test(v)) || null;
      futureGames.push({
        dateTime: `${scheduleDate} ${time}`,
        home: teams[0],
        away: teams[1],
        venue: r.cells[r.cells.length - 1] || null,
        gameNumber
      });
    }

    const rosterBlocks = rosterTables
      .filter(rows => rows.some(r => r.cells.includes("Birthdate") && r.cells.includes("Position")))
      .map(rows => {
        const team = clean(rows[0]?.cells?.[0] || "");
        const header = rows.findIndex(r => r.cells.includes("Birthdate") && r.cells.includes("Position"));
        const players = rows.slice(header + 1)
          .filter(r => /^\d+$/.test(r.cells[0] || "") && /^\d{4}-\d{2}-\d{2}$/.test(r.cells[2] || ""))
          .map(r => ({
            jersey: Number(r.cells[0]),
            sourceName: clean(r.cells[1]),
            birthDate: r.cells[2],
            position: clean(r.cells[3]),
            shoots: clean(r.cells[4]),
            height: /^\d+$/.test(r.cells[5] || "") && Number(r.cells[5]) >= 120 && Number(r.cells[5]) <= 230 ? Number(r.cells[5]) : null,
            weight: /^\d+$/.test(r.cells[6] || "") && Number(r.cells[6]) >= 35 && Number(r.cells[6]) <= 180 ? Number(r.cells[6]) : null,
            nationality: (r.cells[7] || "").match(/^([A-Z]{3})/)?.[1] || null,
            youthClub: clean(r.cells[8] || "") || null
          }));
        return { team, players };
      })
      .filter(block => block.team && block.players.length);

    let { data: competition, error: compError } = await admin
      .from("competitions")
      .select("id")
      .eq("source", SOURCE)
      .eq("source_competition_id", COMPETITION_ID)
      .maybeSingle();
    if (compError) throw compError;

    if (!competition) {
      const inserted = await admin.from("competitions").insert({
        source: SOURCE,
        source_competition_id: COMPETITION_ID,
        name: "Hockeyettan Norra",
        league_name: "Hockeyettan",
        season_label: "2026/27",
        group_name: "Norra",
        country_code: "SWE",
        source_url: overview.url
      }).select("id").single();
      if (inserted.error) throw inserted.error;
      competition = inserted.data;
    } else {
      const upd = await admin.from("competitions").update({
        name: "Hockeyettan Norra",
        league_name: "Hockeyettan",
        season_label: "2026/27",
        group_name: "Norra",
        country_code: "SWE",
        source_url: overview.url,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", competition.id);
      if (upd.error) throw upd.error;
    }
    const competitionId = competition.id;

    const teamNames = new Set<string>();
    standings.forEach(s => teamNames.add(s.team));
    rosterBlocks.forEach(b => teamNames.add(b.team));
    futureGames.forEach(g => { teamNames.add(g.home); teamNames.add(g.away); });
    results.forEach(g => { teamNames.add(g.home); teamNames.add(g.away); });

    const teamPayload = [...teamNames].map(canonical_name => ({
      canonical_name,
      country_code: "SWE",
      updated_at: new Date().toISOString()
    }));
    const teamUpsert = await admin.from("teams")
      .upsert(teamPayload, { onConflict: "canonical_name" })
      .select("id,canonical_name");
    if (teamUpsert.error) throw teamUpsert.error;
    const teamMap = new Map(teamUpsert.data.map((t:any) => [t.canonical_name, t.id]));

    const parsedPlayers = new Map<string, any>();
    for (const block of rosterBlocks) {
      for (const p of block.players) {
        const parts = playerNameParts(p.sourceName);
        const key = `${norm(parts.first)}|${norm(parts.last)}|${p.birthDate}`;
        if (!parsedPlayers.has(key)) {
          parsedPlayers.set(key, {
            first_name: parts.first || null,
            last_name: parts.last || null,
            display_name: clean([parts.first, parts.last].filter(Boolean).join(" ")),
            birth_date: p.birthDate,
            nationality_code: p.nationality,
            shoots_catches: p.shoots || null,
            primary_position: p.position || null,
            height_cm: p.height,
            weight_kg: p.weight,
            youth_club: p.youthClub,
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    const playerPayload = [...parsedPlayers.values()];
    const playerUpsert = await admin.from("players")
      .upsert(playerPayload, { onConflict: "first_name,last_name,birth_date" })
      .select("id,first_name,last_name,birth_date");
    if (playerUpsert.error) throw playerUpsert.error;
    const playerMap = new Map(playerUpsert.data.map((p:any) => [
      `${norm(p.first_name || "")}|${norm(p.last_name || "")}|${p.birth_date}`, p.id
    ]));

    const deactivate = await admin.from("team_rosters")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("competition_id", competitionId);
    if (deactivate.error) throw deactivate.error;

    const rosterPayload:any[] = [];
    for (const block of rosterBlocks) {
      const teamId = teamMap.get(block.team);
      if (!teamId) continue;
      for (const p of block.players) {
        const parts = playerNameParts(p.sourceName);
        const pkey = `${norm(parts.first)}|${norm(parts.last)}|${p.birthDate}`;
        const playerId = playerMap.get(pkey);
        if (!playerId) continue;
        rosterPayload.push({
          competition_id: competitionId,
          team_id: teamId,
          player_id: playerId,
          roster_stint: 1,
          jersey_number: p.jersey,
          position: p.position || null,
          source_name: p.sourceName,
          is_active: true,
          last_seen_at: new Date().toISOString(),
          source_fragment: {
            birth_date: p.birthDate,
            shoots_catches: p.shoots,
            height_cm: p.height,
            weight_kg: p.weight,
            nationality: p.nationality,
            youth_club: p.youthClub
          },
          updated_at: new Date().toISOString()
        });
      }
    }
    const rosterUpsert = await admin.from("team_rosters")
      .upsert(rosterPayload, { onConflict: "competition_id,team_id,player_id,roster_stint" });
    if (rosterUpsert.error) throw rosterUpsert.error;

    const existingGamesQ = await admin.from("games")
      .select("id,source_game_id,source_event_game_id,game_number,home_team_id,away_team_id,scheduled_start")
      .eq("competition_id", competitionId)
      .limit(1000);
    if (existingGamesQ.error) throw existingGamesQ.error;
    let existingGames = existingGamesQ.data || [];

    const schedulePayload:any[] = [];
    for (const g of futureGames) {
      const homeId = teamMap.get(g.home);
      const awayId = teamMap.get(g.away);
      const scheduledStart = localIso(g.dateTime);
      if (!homeId || !awayId || !scheduledStart) continue;
      schedulePayload.push({
        competition_id: competitionId,
        source: SOURCE,
        source_game_id: `schedule:${g.dateTime}|${g.home}|${g.away}`,
        game_number: g.gameNumber,
        scheduled_start: scheduledStart,
        home_team_id: homeId,
        away_team_id: awayId,
        venue_name: g.venue,
        status: "scheduled",
        source_url: schedule.url,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    if (schedulePayload.length) {
      const scheduleUpsert = await admin.from("games")
        .upsert(schedulePayload, { onConflict: "source,source_game_id" });
      if (scheduleUpsert.error) throw scheduleUpsert.error;
    }

    const refreshedGames = await admin.from("games")
      .select("id,source_game_id,home_team_id,away_team_id,scheduled_start")
      .eq("competition_id", competitionId)
      .limit(1000);
    if (refreshedGames.error) throw refreshedGames.error;
    existingGames = refreshedGames.data || [];

    let resultUpdates = 0;
    for (const g of results) {
      const homeId = teamMap.get(g.home);
      const awayId = teamMap.get(g.away);
      if (!homeId || !awayId) continue;
      const match = existingGames.find((x:any) =>
        x.home_team_id === homeId &&
        x.away_team_id === awayId &&
        gameLocalDate(x.scheduled_start) === g.date
      );
      const values:any = {
        competition_id: competitionId,
        source: SOURCE,
        game_number: g.gameNumber,
        source_event_game_id: g.gameId,
        home_team_id: homeId,
        away_team_id: awayId,
        venue_name: g.venue,
        attendance: g.attendance,
        status: "final",
        home_score: g.homeScore,
        away_score: g.awayScore,
        source_url: g.gameId ? `${BASE}/Game/Events/${g.gameId}` : overview.url,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (match) {
        const upd = await admin.from("games").update(values).eq("id", match.id);
        if (upd.error) throw upd.error;
      } else {
        values.source_game_id = `result:${g.date}|${g.home}|${g.away}`;
        values.scheduled_start = localNoonIso(g.date);
        const ins = await admin.from("games").insert(values);
        if (ins.error) throw ins.error;
      }
      resultUpdates++;
    }

    const standingsHash = await sha256(JSON.stringify(standings));
    let { data: snapshot } = await admin.from("standings_snapshots")
      .select("id")
      .eq("competition_id", competitionId)
      .eq("content_hash", standingsHash)
      .maybeSingle();

    if (!snapshot && standings.length) {
      const snapIns = await admin.from("standings_snapshots").insert({
        competition_id: competitionId,
        content_hash: standingsHash,
        source_url: overview.url
      }).select("id").single();
      if (snapIns.error) throw snapIns.error;
      snapshot = snapIns.data;

      const standingsPayload = standings.map(s => ({
        snapshot_id: snapshot.id,
        team_id: teamMap.get(s.team),
        rank: s.rank,
        games_played: s.gp,
        wins: s.w,
        ties: s.t,
        losses: s.l,
        goals_for: s.gf,
        goals_against: s.ga,
        goal_diff: s.gd,
        points: s.points,
        source_values: s.source_values
      })).filter(r => r.team_id);
      const standingsIns = await admin.from("standings_snapshot_rows").insert(standingsPayload);
      if (standingsIns.error) throw standingsIns.error;
    }

    await Promise.all([
      logFetch(overview, "competition_overview", COMPETITION_ID),
      logFetch(schedule, "competition_schedule", COMPETITION_ID),
      logFetch(roster, "competition_roster", COMPETITION_ID)
    ]);

    const vasbyId = teamMap.get("Väsby IK HK") || null;
    const vasbyRosterCount = vasbyId
      ? rosterPayload.filter(r => r.team_id === vasbyId && r.is_active).length
      : 0;

    return Response.json({
      ok: true,
      competition: "Hockeyettan Norra",
      competition_id: COMPETITION_ID,
      counts: {
        teams: teamPayload.length,
        players: playerPayload.length,
        roster_rows: rosterPayload.length,
        vasby_roster: vasbyRosterCount,
        standings: standings.length,
        scheduled_games: schedulePayload.length,
        result_updates: resultUpdates
      },
      elapsed_ms: Date.now() - started
    });
  } catch (error) {
    console.error("swehockey-sync failed", error);
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : (typeof error === "object" && error ? JSON.stringify(error) : String(error)),
      elapsed_ms: Date.now() - started
    }, { status: 500 });
  }
});
