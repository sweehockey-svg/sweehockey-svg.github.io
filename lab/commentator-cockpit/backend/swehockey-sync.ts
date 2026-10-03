
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";
import { DateTime } from "npm:luxon@3.5.0";

const BASE = "https://stats.swehockey.se";
const COMPETITIONS = new Map([
  ["21043",{name:"Hockeyettan Norra",league:"Hockeyettan",group:"Norra"}],
  ["21044",{name:"Hockeyettan Södra",league:"Hockeyettan",group:"Södra"}],
  ["21088",{name:"HockeyTvåan Herr Region Väst A",league:"HockeyTvåan",group:"Väst A"}],
  ["21089",{name:"HockeyTvåan Herr Region Väst B",league:"HockeyTvåan",group:"Väst B"}],
  ["21090",{name:"HockeyTvåan Herr Region Väst C",league:"HockeyTvåan",group:"Väst C"}],
  ["21213",{name:"HockeyTvåan Herr Syd A",league:"HockeyTvåan",group:"Syd A"}],
  ["21214",{name:"HockeyTvåan Herr Syd B",league:"HockeyTvåan",group:"Syd B"}],
  ["21505",{name:"HockeyTvåan Herr Östra",league:"HockeyTvåan",group:"Östra"}],
  ["21319",{name:"HockeyTvåan Herr Region Norr A",league:"HockeyTvåan",group:"Norr A"}],
  ["21320",{name:"HockeyTvåan Herr Region Norr B",league:"HockeyTvåan",group:"Norr B"}],
  ["21321",{name:"HockeyTvåan Herr Region Norr C",league:"HockeyTvåan",group:"Norr C"}]
]);
const ZONE = "Europe/Stockholm";
const SOURCE = "swehockey";
const UA = "HockeyCommentator/0.1 (+https://www.svenskehockey.se/lab/commentator-cockpit/)";
const PARSER_VERSION = "base-sync-v8";

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

function intOrNull(value:string|null|undefined) {
  const text=clean(value);
  return /^-?\d+$/.test(text) ? Number(text) : null;
}

function decimalOrNull(value:string|null|undefined) {
  const text=clean(value).replace(",",".");
  const n=Number(text);
  return text && Number.isFinite(n) ? n : null;
}

function clockToSeconds(value:string|null|undefined) {
  const m=clean(value).match(/^(\d{1,3}):(\d{2})$/);
  return m ? Number(m[1])*60+Number(m[2]) : null;
}

function headerIndex(header:string[], name:string) {
  return header.findIndex(x=>clean(x)===name);
}

function parseSeasonStatsTables(tables:any[]) {
  const skaters:any[]=[];
  const goalies:any[]=[];
  let currentTeam="";

  for(const rows of tables) {
    if(!rows.length) continue;

    const firstCell=clean(rows[0]?.cells?.[0] || "");
    if(firstCell && firstCell !== "Goalkeeping Statistics" && firstCell !== "Playing Statistics") {
      currentTeam=firstCell;
    }

    const playingLabel=rows.findIndex((r:any)=>r.cells.some((x:string)=>x==="Playing Statistics"));
    if(playingLabel>=0 && currentTeam) {
      const skaterHeaderIndex=rows.findIndex((r:any,i:number)=>i>playingLabel && r.cells.includes("Name") && r.cells.includes("GP") && r.cells.includes("TP"));
      if(skaterHeaderIndex>=0) {
        const header=rows[skaterHeaderIndex].cells;
        const ix=(name:string)=>headerIndex(header,name);
        for(const row of rows.slice(skaterHeaderIndex+1)) {
          if(row.cells.some((x:string)=>x.startsWith("Sorted by"))) break;
          const name=clean(row.cells[ix("Name")] || "");
          const position=clean(row.cells[ix("Pos")] || "");
          const jersey=intOrNull(row.cells[ix("No")]);
          const gp=intOrNull(row.cells[ix("GP")]);
          if(!name || !position || gp===null) continue;
          skaters.push({
            team:currentTeam,sourceName:name,jersey,position,gamesPlayed:gp,
            goals:intOrNull(row.cells[ix("G")]),
            assists:intOrNull(row.cells[ix("A")]),
            points:intOrNull(row.cells[ix("TP")]),
            pim:intOrNull(row.cells[ix("PIM")]),
            plusMinus:intOrNull(row.cells[ix("+/-")]),
            gameWinningGoals:intOrNull(row.cells[ix("GWG")]),
            powerPlayGoals:intOrNull(row.cells[ix("PPG")]),
            shorthandedGoals:intOrNull(row.cells[ix("SHG")]),
            shots:intOrNull(row.cells[ix("SOG")]),
            shootingPct:decimalOrNull(row.cells[ix("SG%")]),
            faceoffWins:intOrNull(row.cells[ix("FO+")]),
            faceoffLosses:intOrNull(row.cells[ix("FO-")]),
            faceoffTotal:intOrNull(row.cells[ix("FO")]),
            faceoffPct:decimalOrNull(row.cells[ix("FO%")]),
            sourceRow:row.cells
          });
        }
      }
    }

    const goalieLabel=rows.findIndex((r:any)=>r.cells.some((x:string)=>x==="Goalkeeping Statistics"));
    if(goalieLabel>=0 && currentTeam) {
      const goalieHeaderIndex=rows.findIndex((r:any,i:number)=>i>goalieLabel && r.cells.includes("Name") && r.cells.includes("GPI") && r.cells.includes("SVS%"));
      if(goalieHeaderIndex>=0) {
        const header=rows[goalieHeaderIndex].cells;
        const ix=(name:string)=>headerIndex(header,name);
        for(const row of rows.slice(goalieHeaderIndex+1)) {
          if(row.cells.some((x:string)=>x.startsWith("Sorted by"))) break;
          const name=clean(row.cells[ix("Name")] || "");
          const jersey=intOrNull(row.cells[ix("No")]);
          const gpi=intOrNull(row.cells[ix("GPI")]);
          if(!name || gpi===null) continue;
          goalies.push({
            team:currentTeam,sourceName:name,jersey,
            gamesPlayed:gpi,
            minutesPlayedSeconds:clockToSeconds(row.cells[ix("MIP")]),
            goalsAgainst:intOrNull(row.cells[ix("GA")]),
            saves:intOrNull(row.cells[ix("SVS")]),
            shotsAgainst:intOrNull(row.cells[ix("SOG")]),
            savePct:decimalOrNull(row.cells[ix("SVS%")]),
            gaa:decimalOrNull(row.cells[ix("GAA")]),
            shutouts:intOrNull(row.cells[ix("SO")]),
            wins:intOrNull(row.cells[ix("W")]),
            losses:intOrNull(row.cells[ix("L")]),
            sourceRow:row.cells,
            gpt:ix("GPT")>=0 ? intOrNull(row.cells[ix("GPT")]) : null,
            gkd:ix("GKD")>=0 ? intOrNull(row.cells[ix("GKD")]) : null
          });
        }
      }
    }
  }

  return {skaters,goalies};
}

function parseSpecialTeams($:cheerio.CheerioAPI) {
  const codeToName=new Map<string,string>();
  $(".divTeam").each((_:number,el:any)=>{
    const short=clean($(el).find(".divTeamShortName").text());
    const name=clean($(el).find(".divTeamName").text()).replace(/^[-–—]\s*/,"");
    if(short && name) codeToName.set(short,name);
  });

  const tables=$("table.tblContent").toArray().map(t=>directRows($,t));
  const ppRows=tables.find(rows=>rows.some((r:any)=>r.cells.includes("ADV.")&&r.cells.includes("PPGF"))) || [];
  const pkRows=tables.find(rows=>rows.some((r:any)=>r.cells.includes("DVG.")&&r.cells.includes("PPGA"))) || [];

  const map=new Map<string,any>();

  const ppHeader=ppRows.findIndex((r:any)=>r.cells.includes("ADV.")&&r.cells.includes("PPGF"));
  for(const row of ppRows.slice(Math.max(0,ppHeader+1))) {
    const code=clean(row.cells[1]||"");
    if(!code || code==="Totals" || code==="Average" || !codeToName.has(code)) continue;
    const current=map.get(code)||{code,team:codeToName.get(code)};
    Object.assign(current,{
      gamesPlayed:intOrNull(row.cells[2]),
      ppRank:intOrNull(row.cells[0]),
      ppOpportunities:intOrNull(row.cells[3]),
      ppGoals:intOrNull(row.cells[4]),
      ppPct:decimalOrNull(row.cells[5]),
      ppSeconds:clockToSeconds(row.cells[6]),
      ppSecondsPerGoal:row.cells[7]==="N/A"?null:clockToSeconds(row.cells[7]),
      shorthandedGoalsAgainst:intOrNull(row.cells[8]),
      ppSource:row.cells
    });
    map.set(code,current);
  }

  const pkHeader=pkRows.findIndex((r:any)=>r.cells.includes("DVG.")&&r.cells.includes("PPGA"));
  for(const row of pkRows.slice(Math.max(0,pkHeader+1))) {
    const code=clean(row.cells[1]||"");
    if(!code || code==="Totals" || code==="Average" || !codeToName.has(code)) continue;
    const current=map.get(code)||{code,team:codeToName.get(code)};
    Object.assign(current,{
      gamesPlayed:current.gamesPlayed ?? intOrNull(row.cells[2]),
      pkRank:intOrNull(row.cells[0]),
      pkOpportunities:intOrNull(row.cells[3]),
      pkGoalsAgainst:intOrNull(row.cells[4]),
      pkPct:decimalOrNull(row.cells[5]),
      pkSeconds:clockToSeconds(row.cells[6]),
      pkSecondsPerGoalAgainst:row.cells[7]==="N/A"?null:clockToSeconds(row.cells[7]),
      shorthandedGoalsFor:intOrNull(row.cells[8]),
      pkSource:row.cells
    });
    map.set(code,current);
  }

  return [...map.values()];
}


Deno.serve(async (req: Request) => {
  const started = Date.now();
  try {
    const candidate = req.headers.get("x-sync-token") || "";
    const { data: valid, error: authError } = await admin.rpc("validate_swehockey_sync_token", { candidate });
    if (authError || valid !== true) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    let body:any={};
    try{ body=await req.json(); }catch{}
    const COMPETITION_ID=String(body.competition_id||"21043");
    const meta=COMPETITIONS.get(COMPETITION_ID);
    if(!meta) return Response.json({error:"competition_not_allowed"},{status:400});

    const [overview, schedule, roster, seasonStats, specialTeams] = await Promise.all([
      fetchHtml(`/ScheduleAndResults/Overview/${COMPETITION_ID}`),
      fetchHtml(`/ScheduleAndResults/Schedule/${COMPETITION_ID}`),
      fetchHtml(`/Teams/Info/TeamRoster/${COMPETITION_ID}`),
      fetchHtml(`/Teams/Info/PlayersByTeam/${COMPETITION_ID}`),
      fetchHtml(`/Teams/Statistics/PowerplayAndPenaltyKilling/${COMPETITION_ID}`)
    ]);

    const previousFetches = await Promise.all(
      [overview, schedule, roster, seasonStats, specialTeams].map(async (item) => {
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
      previousFetches[3]?.content_hash === seasonStats.hash &&
      previousFetches[4]?.content_hash === specialTeams.hash &&
      previousFetches.every((row:any) => row?.parser_version === PARSER_VERSION);

    if (unchanged) {
      await Promise.all([
        logFetch(overview, "competition_overview", COMPETITION_ID),
        logFetch(schedule, "competition_schedule", COMPETITION_ID),
        logFetch(roster, "competition_roster", COMPETITION_ID),
        logFetch(seasonStats, "competition_player_stats", COMPETITION_ID),
        logFetch(specialTeams, "competition_special_teams", COMPETITION_ID)
      ]);
      return Response.json({
        ok: true,
        unchanged: true,
        competition: meta.name,
        competition_id: COMPETITION_ID,
        elapsed_ms: Date.now() - started
      });
    }

    const $overview = cheerio.load(overview.text);
    const $schedule = cheerio.load(schedule.text);
    const $roster = cheerio.load(roster.text);
    const $seasonStats = cheerio.load(seasonStats.text);
    const $specialTeams = cheerio.load(specialTeams.text);

    const overviewTables = $overview("table.tblContent").toArray().map(t => directRows($overview, t));
    const scheduleTables = $schedule("table.tblContent").toArray().map(t => directRows($schedule, t));
    const rosterTables = $roster("table.tblContent").toArray().map(t => directRows($roster, t));
    const seasonStatsTables = $seasonStats("table.tblContent").toArray().map(t => directRows($seasonStats, t));
    const parsedSeasonStats = parseSeasonStatsTables(seasonStatsTables);
    const parsedSpecialTeams = parseSpecialTeams($specialTeams);

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
      rows.some(r =>
        r.cells.includes("Date") &&
        r.cells.includes("Game") &&
        r.cells.includes("Venue")
      )
    ) || [];
    const scheduleHeader = fullScheduleRows.findIndex(r =>
      r.cells.includes("Date") && r.cells.includes("Game")
    );
    const futureGames:any[] = [];
    let scheduleDate = "";
    for (const r of fullScheduleRows.slice(Math.max(0, scheduleHeader + 1))) {
      const dateMatch = r.cells.map((c:string)=>c.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "").find(Boolean);
      if (dateMatch) scheduleDate = dateMatch;
      if (!scheduleDate) continue;

      const time = r.cells.map((c:string)=>c.match(/\b\d{2}:\d{2}\b/)?.[0] || "").find(Boolean);
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
        name: meta.name,
        league_name: meta.league,
        season_label: "2026/27",
        group_name: meta.group,
        country_code: "SWE",
        source_url: overview.url
      }).select("id").single();
      if (inserted.error) throw inserted.error;
      competition = inserted.data;
    } else {
      const upd = await admin.from("competitions").update({
        name: meta.name,
        league_name: meta.league,
        season_label: "2026/27",
        group_name: meta.group,
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
    parsedSpecialTeams.forEach((s:any)=>teamNames.add(s.team));

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

    const rosterByIdentity = new Map<string,any>();
    const rosterByName = new Map<string,any>();
    for (const row of rosterPayload) {
      rosterByIdentity.set(`${row.team_id}|${row.jersey_number ?? ""}|${norm(row.source_name)}`,row);
      rosterByName.set(`${row.team_id}|${norm(row.source_name)}`,row);
    }

    const seasonUpdatedAt=new Date().toISOString();
    const playerSeasonPayload=parsedSeasonStats.skaters.map((s:any)=>{
      const teamId=teamMap.get(s.team);
      if(!teamId) return null;
      const rosterRow=rosterByIdentity.get(`${teamId}|${s.jersey ?? ""}|${norm(s.sourceName)}`) ||
        rosterByName.get(`${teamId}|${norm(s.sourceName)}`) || null;
      return {
        competition_id:competitionId,
        team_id:teamId,
        player_id:rosterRow?.player_id || null,
        source_name:s.sourceName,
        jersey_number:s.jersey,
        position:s.position,
        games_played:s.gamesPlayed,
        goals:s.goals,
        assists:s.assists,
        points:s.points,
        pim:s.pim,
        plus_minus:s.plusMinus,
        game_winning_goals:s.gameWinningGoals,
        power_play_goals:s.powerPlayGoals,
        shorthanded_goals:s.shorthandedGoals,
        shots:s.shots,
        shooting_pct:s.shootingPct,
        faceoff_wins:s.faceoffWins,
        faceoff_losses:s.faceoffLosses,
        faceoff_total:s.faceoffTotal,
        faceoff_pct:s.faceoffPct,
        source_fragment:{row:s.sourceRow,parser:PARSER_VERSION},
        source_updated_at:seasonUpdatedAt,
        updated_at:seasonUpdatedAt
      };
    }).filter(Boolean);

    const goalieSeasonPayload=parsedSeasonStats.goalies.map((g:any)=>{
      const teamId=teamMap.get(g.team);
      if(!teamId) return null;
      const rosterRow=rosterByIdentity.get(`${teamId}|${g.jersey ?? ""}|${norm(g.sourceName)}`) ||
        rosterByName.get(`${teamId}|${norm(g.sourceName)}`) || null;
      return {
        competition_id:competitionId,
        team_id:teamId,
        player_id:rosterRow?.player_id || null,
        source_name:g.sourceName,
        jersey_number:g.jersey,
        games_played:g.gamesPlayed,
        games_started:null,
        games_in_net:g.gamesPlayed,
        minutes_played_seconds:g.minutesPlayedSeconds,
        goals_against:g.goalsAgainst,
        saves:g.saves,
        shots_against:g.shotsAgainst,
        save_pct:g.savePct,
        gaa:g.gaa,
        shutouts:g.shutouts,
        wins:g.wins,
        losses:g.losses,
        source_fragment:{row:g.sourceRow,gpt:g.gpt,gkd:g.gkd,parser:PARSER_VERSION},
        source_updated_at:seasonUpdatedAt,
        updated_at:seasonUpdatedAt
      };
    }).filter(Boolean);

    if(playerSeasonPayload.length){
      const playerSeasonUpsert=await admin.from("player_season_stats")
        .upsert(playerSeasonPayload,{onConflict:"competition_id,team_id,source_name"});
      if(playerSeasonUpsert.error) throw playerSeasonUpsert.error;
    }
    if(goalieSeasonPayload.length){
      const goalieSeasonUpsert=await admin.from("goalie_season_stats")
        .upsert(goalieSeasonPayload,{onConflict:"competition_id,team_id,source_name"});
      if(goalieSeasonUpsert.error) throw goalieSeasonUpsert.error;
    }

    const specialUpdatedAt=new Date().toISOString();
    const specialTeamsPayload=parsedSpecialTeams.map((s:any)=>{
      const teamId=teamMap.get(s.team);
      if(!teamId) return null;
      return {
        competition_id:competitionId,
        team_id:teamId,
        games_played:s.gamesPlayed,
        pp_rank:s.ppRank,
        pp_opportunities:s.ppOpportunities,
        pp_goals:s.ppGoals,
        pp_pct:s.ppPct,
        pp_seconds:s.ppSeconds,
        pp_seconds_per_goal:s.ppSecondsPerGoal,
        shorthanded_goals_against:s.shorthandedGoalsAgainst,
        pk_rank:s.pkRank,
        pk_opportunities:s.pkOpportunities,
        pk_goals_against:s.pkGoalsAgainst,
        pk_pct:s.pkPct,
        pk_seconds:s.pkSeconds,
        pk_seconds_per_goal_against:s.pkSecondsPerGoalAgainst,
        shorthanded_goals_for:s.shorthandedGoalsFor,
        source_fragment:{
          code:s.code,
          pp:s.ppSource || null,
          pk:s.pkSource || null,
          parser:PARSER_VERSION
        },
        source_updated_at:specialUpdatedAt,
        updated_at:specialUpdatedAt
      };
    }).filter(Boolean);

    if(specialTeamsPayload.length){
      const specialUpsert=await admin.from("team_special_teams_stats")
        .upsert(specialTeamsPayload,{onConflict:"competition_id,team_id"});
      if(specialUpsert.error) throw specialUpsert.error;
    }

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
      logFetch(roster, "competition_roster", COMPETITION_ID),
      logFetch(seasonStats, "competition_player_stats", COMPETITION_ID),
      logFetch(specialTeams, "competition_special_teams", COMPETITION_ID)
    ]);

    return Response.json({
      ok: true,
      competition: meta.name,
      competition_id: COMPETITION_ID,
      counts: {
        teams: teamPayload.length,
        players: playerPayload.length,
        roster_rows: rosterPayload.length,
        standings: standings.length,
        scheduled_games: schedulePayload.length,
        result_updates: resultUpdates,
        player_season_stats: playerSeasonPayload.length,
        goalie_season_stats: goalieSeasonPayload.length,
        special_teams_stats: specialTeamsPayload.length
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
