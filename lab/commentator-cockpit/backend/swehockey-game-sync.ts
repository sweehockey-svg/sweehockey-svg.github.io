
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as cheerio from "npm:cheerio@1.0.0";
import { DateTime } from "npm:luxon@3.5.0";
import pdf from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";

const BASE = "https://stats.swehockey.se";
const COMPETITION_SOURCE_ID = "21043";
const VASBY_NAME = "Väsby IK HK";
const SOURCE = "swehockey";
const ZONE = "Europe/Stockholm";
const PARSER_VERSION = "game-sync-v7";
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

async function fetchBinary(path:string) {
  const url = BASE + path;
  const response = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "application/pdf,*/*" }
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!response.ok) throw new Error(`Swehockey ${response.status} for ${url}`);
  return {
    url,
    status:response.status,
    bytes,
    contentType:response.headers.get("content-type") || "",
    hash:await sha256(Array.from(bytes).join(","))
  };
}

async function logBinaryFetch(item:any, entityType:string, entityKey:string) {
  const { data:previous } = await admin.from("ingest_fetches")
    .select("content_hash,parser_version")
    .eq("url",item.url)
    .order("fetched_at",{ascending:false})
    .limit(1)
    .maybeSingle();

  await admin.from("ingest_fetches").insert({
    source:SOURCE,
    source_entity_type:entityType,
    source_entity_key:entityKey,
    url:item.url,
    content_hash:item.hash,
    parser_version:PARSER_VERSION,
    http_status:item.status,
    changed:previous?.content_hash !== item.hash || previous?.parser_version !== PARSER_VERSION,
    metadata:{ bytes:item.bytes.length, content_type:item.contentType }
  });
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
  const rawName=clean(m[2]);
  const positionMatch=rawName.match(/\s*\((RD|LD|RW|LW|CE|GK)\)\s*$/i);
  return {
    jersey:Number(m[1]),
    sourceName:rawName
      .replace(/\s*\((RD|LD|RW|LW|CE|GK)\)\s*$/i,"")
      .replace(/\s*\(\d+\)\s*$/,""),
    listedPosition:positionMatch ? positionMatch[1].toUpperCase() : null
  };
}

function parsePlayerList(text: string) {
  const normalized = clean(text);
  const segments = normalized.match(/\d+\.\s*.*?(?=\d+\.\s*|$)/g) || [];
  return segments.map(parsePlayerText).filter(Boolean) as Array<{jersey:number,sourceName:string,listedPosition?:string|null}>;
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
    const playerCells = cells.map((cell:string,cellIndex:number)=>({
      cellIndex,
      player:parsePlayerText(cell)
    })).filter((item:any)=>item.player) as Array<{cellIndex:number,player:{jersey:number,sourceName:string,listedPosition?:string|null}}>;
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
    for (let playerIndex=0; playerIndex<playerCells.length; playerIndex++) {
      const item = playerCells[playerIndex];
      const p = item.player;
      let goalieRole:string|null = null;
      let position:string|null = null;
      if (goalieMode) {
        const next = (goalieCounts.get(currentTeamId) || 0) + 1;
        goalieCounts.set(currentTeamId,next);
        goalieRole = next === 1 ? "listed_1" : "listed_2";
        position = "GK";
      } else if (currentLine) {
        const defenseRow =
          cells.length >= 5 ||
          (cells.length === 4 && !lineLabel && playerCells.length <= 2);

        if (defenseRow) {
          position = playerCells.length === 2
            ? (["RD","LD"][playerIndex] || null)
            : (p.listedPosition || null);
        } else {
          const slotOffset = lineLabel ? 1 : 0;
          const forwardIndex = item.cellIndex - slotOffset;
          position = ["RW","CE","LW"][forwardIndex] || p.listedPosition || null;
        }
      } else if (p.listedPosition) {
        position = p.listedPosition;
      }
      parsed.push({
        team_id:currentTeamId,
        source_name:p.sourceName,
        jersey_number:p.jersey,
        position,
        line_number:goalieMode ? null : currentLine,
        goalie_role:goalieRole,
        is_extra:currentLine === null && !goalieMode,
        source_fragment:{
          cells,
          cell_index:item.cellIndex,
          row_player_index:playerIndex,
          row_player_count:playerCells.length
        }
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

function parseDecimalComma(text:string|null|undefined) {
  const value = Number(clean(text).replace(",","."));
  return Number.isFinite(value) ? value : null;
}

function splitPimShots(tail:string) {
  const candidates:any[] = [];
  for (let sogLen=1;sogLen<=2;sogLen++) {
    if (tail.length <= sogLen) continue;
    const pimText = tail.slice(0,-sogLen);
    const sogText = tail.slice(-sogLen);
    if (!/^\d+$/.test(pimText) || !/^\d+$/.test(sogText)) continue;
    const pim = Number(pimText);
    const shots = Number(sogText);
    if (pim > 99 || shots > 40) continue;
    let score = 0;
    if ([0,2,4,5,10,12,14,15,20,25].includes(pim)) score += 4;
    if (shots <= 15) score += 3;
    if (sogLen === 1) score += 1;
    candidates.push({pim,shots,score});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0] || null;
}

function parseSkaterSummaryLine(line:string) {
  const row=clean(line);
  const base=row.match(/^(.+?)(\d{1,3})(RD|LD|CE|RW|LW)(.+)$/);
  if(!base) return null;

  const sourceName=clean(base[1]);
  const jersey=Number(base[2]);
  const position=base[3];
  const rest=base[4];
  const pctCandidates:any[]=[];

  if(rest.endsWith("N/A")) {
    pctCandidates.push({pct:null,before:rest.slice(0,-3)});
  } else {
    const decimal=rest.match(/([,.])(\d{2})$/);
    if(!decimal) return null;
    const separatorIndex=decimal.index!;
    const decimals=decimal[2];
    for(let intLen=1;intLen<=3;intLen++) {
      const start=separatorIndex-intLen;
      if(start<0) continue;
      const intText=rest.slice(start,separatorIndex);
      if(!/^\d+$/.test(intText)) continue;
      const pct=Number(intText+"."+decimals);
      if(pct<0||pct>100) continue;
      pctCandidates.push({pct,before:rest.slice(0,start)});
    }
  }

  const candidates:any[]=[];
  for(const pctCandidate of pctCandidates) {
    const slash=pctCandidate.before.lastIndexOf("/");
    if(slash<0) continue;

    const lossesText=pctCandidate.before.slice(slash+1);
    const left=pctCandidate.before.slice(0,slash);
    if(!/^\d+$/.test(lossesText)||!lossesText.length) continue;
    const faceoffLosses=Number(lossesText);

    for(let winsLen=1;winsLen<=2;winsLen++) {
      if(left.length<=winsLen+5) continue;
      const winsText=left.slice(-winsLen);
      const stats=left.slice(0,-winsLen);
      if(!/^\d+$/.test(winsText)||!/^\d{3}/.test(stats)) continue;

      const faceoffWins=Number(winsText);
      const goals=Number(stats[0]);
      const assists=Number(stats[1]);
      const points=Number(stats[2]);
      if(points!==goals+assists) continue;

      let tail=stats.slice(3);
      let plusMinus:number|null=null;
      if(tail.startsWith("-")) {
        if(tail.length<4||!/^\-\d+$/.test(tail)) continue;
        plusMinus=-Number(tail[1]);
        tail=tail.slice(2);
      } else {
        if(tail.length<3||!/^\d+$/.test(tail)) continue;
        plusMinus=Number(tail[0]);
        tail=tail.slice(1);
      }

      const pimShots=splitPimShots(tail);
      if(!pimShots) continue;

      const totalFo=faceoffWins+faceoffLosses;
      let pctScore=0;
      if(pctCandidate.pct===null) {
        if(totalFo!==0) continue;
        pctScore=6;
      } else {
        if(totalFo<=0) continue;
        const expected=faceoffWins/totalFo*100;
        const delta=Math.abs(expected-pctCandidate.pct);
        if(delta>0.2) continue;
        pctScore=8-Math.min(delta,0.2)*10;
      }

      candidates.push({
        sourceName,jersey,position,goals,assists,points,plusMinus,
        pim:pimShots.pim,shots:pimShots.shots,
        faceoffWins,faceoffLosses,faceoffPct:pctCandidate.pct,
        sourceLine:row,score:pctScore+pimShots.score
      });
    }
  }

  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0];
  if(!best) return null;
  delete best.score;
  return best;
}

function parseGoalieSummaryLine(line:string) {
  const row=clean(line);
  const base=row.match(/^(.+?)(\d{1,3})GK(.+)$/);
  if(!base) return null;
  const sourceName=clean(base[1]);
  const jersey=Number(base[2]);
  const rest=base[3];

  const finalDecimal=rest.match(/([,.])(\d{2})$/);
  if(!finalDecimal) return null;
  const finalSep=finalDecimal.index!;
  const gaaDecimals=finalDecimal[2];
  const candidates:any[]=[];

  for(let gaaIntLen=1;gaaIntLen<=2;gaaIntLen++) {
    const gaaStart=finalSep-gaaIntLen;
    if(gaaStart<0) continue;
    const gaaInt=rest.slice(gaaStart,finalSep);
    if(!/^\d+$/.test(gaaInt)) continue;
    const gaa=Number(gaaInt+"."+gaaDecimals);
    if(gaa>20) continue;

    const beforeGaa=rest.slice(0,gaaStart);
    const colon=beforeGaa.lastIndexOf(":");
    if(colon<0||colon+3!==beforeGaa.length) continue;
    const secondsText=beforeGaa.slice(colon+1);
    if(!/^\d{2}$/.test(secondsText)||Number(secondsText)>59) continue;

    for(let minuteLen=1;minuteLen<=3;minuteLen++) {
      const minuteStart=colon-minuteLen;
      if(minuteStart<0) continue;
      const minuteText=beforeGaa.slice(minuteStart,colon);
      if(!/^\d+$/.test(minuteText)) continue;
      const minutes=Number(minuteText);
      if(minutes>120) continue;

      const beforeMip=beforeGaa.slice(0,minuteStart);
      const saveDecimal=beforeMip.match(/([,.])(\d{2})$/);
      if(!saveDecimal) continue;
      const saveSep=saveDecimal.index!;
      const saveDecimals=saveDecimal[2];

      for(let pctIntLen=1;pctIntLen<=3;pctIntLen++) {
        const pctStart=saveSep-pctIntLen;
        if(pctStart<0) continue;
        const pctInt=beforeMip.slice(pctStart,saveSep);
        if(!/^\d+$/.test(pctInt)) continue;
        const savePct=Number(pctInt+"."+saveDecimals);
        if(savePct<0||savePct>100) continue;

        const numbers=beforeMip.slice(0,pctStart);
        if(!/^\d+$/.test(numbers)||numbers.length<3) continue;

        for(let a=1;a<numbers.length-1;a++) {
          for(let b=a+1;b<numbers.length;b++) {
            const shotsAgainst=Number(numbers.slice(0,a));
            const goalsAgainst=Number(numbers.slice(a,b));
            const saves=Number(numbers.slice(b));
            if(shotsAgainst>100||goalsAgainst>30||saves>100) continue;
            if(shotsAgainst-goalsAgainst!==saves) continue;
            if(shotsAgainst<=0) continue;

            const expected=saves/shotsAgainst*100;
            const delta=Math.abs(expected-savePct);
            if(delta>0.2) continue;

            let score=10-delta*10;
            if(shotsAgainst<=60) score+=2;
            if(goalsAgainst<=10) score+=2;
            if(minutes<=65) score+=2;

            candidates.push({
              sourceName,jersey,position:"GK",shotsAgainst,goalsAgainst,saves,
              savePct,minutesPlayedSeconds:minutes*60+Number(secondsText),
              gaa,sourceLine:row,score
            });
          }
        }
      }
    }
  }

  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0];
  if(!best) return null;
  delete best.score;
  return best;
}

function parsePlayerSummaryText(text:string, game:any, homeName:string, awayName:string, roster:any[]) {
  const lines = text.replace(/\r/g,"").split("\n").map(clean).filter(Boolean);
  const skaters:any[]=[];
  const goalies:any[]=[];
  let teamId:string|null=null;
  let mode:"skaters"|"goalies"|null=null;

  for (const line of lines) {
    if (line === homeName) { teamId=game.home_team_id; mode=null; continue; }
    if (line === awayName) { teamId=game.away_team_id; mode=null; continue; }
    if (!teamId) continue;

    if (/^NameNo\.Pos\.GATP\+\/-PIMSOGFO\+\/-FO%$/i.test(line)) {
      mode="skaters"; continue;
    }
    if (/^NameNo\.Pos\.SOGGASVSSVS%MIPGAA$/i.test(line)) {
      mode="goalies"; continue;
    }
    if (line === "Player Summary" || line.startsWith("Referee") || line.startsWith("Linesman") ||
        /^\d{4}-\d{2}-\d{2}/.test(line) || line.startsWith("Hockeyettan") ||
        line.startsWith("Group No.") || line.startsWith("Game No.")) {
      continue;
    }

    if (mode === "skaters") {
      const p=parseSkaterSummaryLine(line);
      if (!p) continue;
      const rp=locateRosterPlayer(roster,teamId,p.jersey,p.sourceName);
      skaters.push({
        game_id:game.id,team_id:teamId,player_id:rp?.player_id || null,
        source_name:p.sourceName,jersey_number:p.jersey,position:p.position,
        goals:p.goals,assists:p.assists,points:p.points,plus_minus:p.plusMinus,
        pim:p.pim,shots:p.shots,faceoff_wins:p.faceoffWins,faceoff_losses:p.faceoffLosses,
        faceoff_pct:p.faceoffPct,toi_seconds:null,
        source_fragment:{ source_line:p.sourceLine, parser:PARSER_VERSION },
        source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()
      });
      continue;
    }

    if (mode === "goalies") {
      const g=parseGoalieSummaryLine(line);
      if (!g) continue;
      const rp=locateRosterPlayer(roster,teamId,g.jersey,g.sourceName);
      goalies.push({
        game_id:game.id,team_id:teamId,player_id:rp?.player_id || null,
        source_name:g.sourceName,jersey_number:g.jersey,
        shots_against:g.shotsAgainst,goals_against:g.goalsAgainst,saves:g.saves,
        save_pct:g.savePct,minutes_played_seconds:g.minutesPlayedSeconds,gaa:g.gaa,
        decision:null,started:null,
        source_fragment:{ source_line:g.sourceLine, parser:PARSER_VERSION },
        source_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()
      });
    }
  }
  return { skaters,goalies };
}

async function syncPlayerSummary(game:any,eventId:string,homeName:string,awayName:string,roster:any[]) {
  const pdfItem=await fetchBinary(`/Game/Reports/PlayerSummary/${eventId}`);
  await logBinaryFetch(pdfItem,"player_summary_pdf",eventId);
  if (!pdfItem.contentType.includes("pdf") || !pdfItem.bytes.length) {
    return { available:false,skaters:0,goalies:0 };
  }

  const parsedPdf=await pdf(Buffer.from(pdfItem.bytes));
  const parsed=parsePlayerSummaryText(parsedPdf.text || "",game,homeName,awayName,roster);

  const { error:deleteSkatersError }=await admin.from("player_game_stats")
    .delete()
    .eq("game_id",game.id);
  if (deleteSkatersError) throw deleteSkatersError;

  const { error:deleteGoaliesError }=await admin.from("goalie_game_stats")
    .delete()
    .eq("game_id",game.id);
  if (deleteGoaliesError) throw deleteGoaliesError;

  if (parsed.skaters.length) {
    const { error:skaterInsertError }=await admin.from("player_game_stats").insert(parsed.skaters);
    if (skaterInsertError) throw skaterInsertError;
  }

  if (parsed.goalies.length) {
    const { error:goalieInsertError }=await admin.from("goalie_game_stats").insert(parsed.goalies);
    if (goalieInsertError) throw goalieInsertError;
  }

  return { available:true,skaters:parsed.skaters.length,goalies:parsed.goalies.length,pages:parsedPdf.numpages };
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
    team_stats:summaryStats.length,
    is_final:update.status === "final"
  };
}

async function syncFinalLineupOnly(game:any) {
  const eventId = game.source_event_game_id || (/^\d+$/.test(game.source_game_id || "") ? game.source_game_id : null);
  if (!eventId) return { skipped:true,reason:"missing_event_id" };

  const { data:teams, error:teamsError }=await admin.from("teams")
    .select("id,canonical_name")
    .in("id",[game.home_team_id,game.away_team_id]);
  if (teamsError) throw teamsError;
  const map=new Map((teams || []).map((t:any)=>[t.id,t.canonical_name]));
  const homeName=map.get(game.home_team_id) || "";
  const awayName=map.get(game.away_team_id) || "";
  if(!homeName || !awayName) return { skipped:true,reason:"missing_team_name" };

  const lineupHtml=await fetchHtml(`/Game/LineUps/${eventId}`);
  await logFetch(lineupHtml,"game_lineup",eventId);

  const { data:roster, error:rosterError }=await admin.from("team_rosters")
    .select("team_id,player_id,jersey_number,source_name,position,is_active")
    .eq("competition_id",game.competition_id)
    .in("team_id",[game.home_team_id,game.away_team_id]);
  if (rosterError) throw rosterError;

  return await syncLineup(game,eventId,lineupHtml,homeName,awayName,roster || []);
}


function fixedPct(value:any) {
  if (value === null || value === undefined || value === "") return "N/A";
  const n=Number(value);
  return Number.isFinite(n) ? n.toFixed(2).replace(".",",") : "N/A";
}

function fixedClock(seconds:any) {
  const n=Number(seconds);
  if (!Number.isFinite(n)) return "00:00";
  const m=Math.floor(n/60);
  const s=Math.floor(n%60);
  return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}

function parseOppPctSegment(segment:string,seconds:number|null) {
  const candidates:any[]=[];
  for(let oppLen=1;oppLen<=2;oppLen++){
    if(segment.length<=oppLen) continue;
    const oppText=segment.slice(0,oppLen);
    const pctText=segment.slice(oppLen);
    if(!/^\d+$/.test(oppText)) continue;
    if(pctText!=="N/A" && !/^\d{1,3}[,.]\d{2}$/.test(pctText)) continue;
    const opp=Number(oppText);
    const pct=pctText==="N/A" ? null : Number(pctText.replace(",","."));
    if(!Number.isFinite(opp) || opp<0 || opp>30) continue;
    if(pct!==null && (!Number.isFinite(pct) || pct<0 || pct>100)) continue;

    let score=0;
    if(opp<=15) score+=10;
    if(seconds!==null && opp>0){
      const secPerOpp=seconds/opp;
      if(secPerOpp>=20) score+=6;
      if(secPerOpp>=45) score+=5;
      score-=Math.abs(secPerOpp-120)/60;
    }
    if(pct===100 || pct===0) score+=1;
    candidates.push({opp,pct,score});
  }
  candidates.sort((a,b)=>b.score-a.score || a.opp-b.opp);
  return candidates[0] || null;
}

function parseOfficialSpecialTail(line:string, stats:any) {
  const compact=clean(line).replace(/\s+/g,"");
  const prefix=[
    stats.goals ?? "",
    stats.shots ?? "",
    stats.saves ?? "",
    fixedPct(stats.save_pct),
    stats.pim ?? "",
    fixedClock(stats.power_play_seconds)
  ].join("");

  if(!compact.startsWith(prefix)) return null;
  const tail=compact.slice(prefix.length);
  const timeMatch=tail.match(/\d{2}:\d{2}/);
  if(!timeMatch || timeMatch.index===undefined) return null;

  const ppSegment=tail.slice(0,timeMatch.index);
  const pkTime=timeMatch[0];
  const pkSegment=tail.slice(timeMatch.index+pkTime.length);
  const pp=parseOppPctSegment(ppSegment,Number(stats.power_play_seconds ?? 0));
  const pk=parseOppPctSegment(pkSegment,clockSeconds(pkTime));
  if(!pp || !pk) return null;

  return {
    power_play_opportunities:pp.opp,
    power_play_goals:pp.pct===null ? null : Math.round(pp.opp*pp.pct/100),
    power_play_pct:pp.pct,
    penalty_kill_opportunities:pk.opp,
    penalty_kill_goals_against:pk.pct===null ? null : Math.round(pk.opp*(100-pk.pct)/100),
    penalty_kill_pct:pk.pct,
    penalty_kill_seconds:clockSeconds(pkTime)
  };
}

async function syncOfficialSpecialTeams(game:any,eventId:string,homeName:string,awayName:string) {
  const { data:statsRows, error:statsError }=await admin.from("team_game_stats")
    .select("id,team_id,goals,shots,saves,save_pct,pim,power_play_pct,power_play_seconds,source_fragment")
    .eq("game_id",game.id);
  if(statsError) throw statsError;
  if((statsRows || []).length < 2) return {available:false,reason:"missing_team_stats"};

  const pdfItem=await fetchBinary(`/Game/Reports/OfficialGameReport/${eventId}`);
  await logBinaryFetch(pdfItem,"official_game_report_pdf",eventId);
  if(!pdfItem.contentType.includes("pdf") || !pdfItem.bytes.length){
    return {available:false,reason:"missing_pdf"};
  }

  const parsedPdf=await pdf(Buffer.from(pdfItem.bytes));
  const lines=(parsedPdf.text || "").replace(/\r/g,"").split("\n").map(clean).filter(Boolean);
  const gameTotalsIndex=lines.findIndex((line:string)=>line==="Game Totals");
  const periodIndex=lines.findIndex((line:string,i:number)=>i>gameTotalsIndex && /^1st period$/i.test(line));
  const totalLines=gameTotalsIndex>=0
    ? lines.slice(gameTotalsIndex+1,periodIndex>gameTotalsIndex?periodIndex:undefined)
    : lines;

  const namesByTeam=new Map([
    [game.home_team_id,homeName],
    [game.away_team_id,awayName]
  ]);

  let updated=0;
  const parsed:any[]=[];
  for(const stats of statsRows || []){
    const teamName=namesByTeam.get(stats.team_id);
    if(!teamName) continue;
    const nameIndex=totalLines.findIndex((line:string)=>line===teamName);
    if(nameIndex<1) continue;
    const rawLine=totalLines[nameIndex-1];
    const special=parseOfficialSpecialTail(rawLine,stats);
    if(!special) continue;

    const patch:any={
      power_play_opportunities:special.power_play_opportunities,
      power_play_goals:special.power_play_goals,
      power_play_pct:special.power_play_pct ?? stats.power_play_pct,
      penalty_kill_opportunities:special.penalty_kill_opportunities,
      penalty_kill_goals_against:special.penalty_kill_goals_against,
      penalty_kill_pct:special.penalty_kill_pct,
      source_fragment:{
        ...(stats.source_fragment || {}),
        official_game_report_row:rawLine,
        parser:PARSER_VERSION
      },
      source_updated_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
    const { error:updateError }=await admin.from("team_game_stats").update(patch).eq("id",stats.id);
    if(updateError) throw updateError;
    updated++;
    parsed.push({team:teamName,...special});
  }

  return {available:true,updated,pages:parsedPdf.numpages,teams:parsed};
}

async function syncFinalGameComplete(game:any) {
  const eventId = game.source_event_game_id || (/^\d+$/.test(game.source_game_id || "") ? game.source_game_id : null);
  if(!eventId) return {skipped:true,reason:"missing_event_id"};

  const { data:teams, error:teamsError }=await admin.from("teams")
    .select("id,canonical_name")
    .in("id",[game.home_team_id,game.away_team_id]);
  if(teamsError) throw teamsError;
  const map=new Map((teams || []).map((t:any)=>[t.id,t.canonical_name]));
  const homeName=map.get(game.home_team_id) || "";
  const awayName=map.get(game.away_team_id) || "";
  if(!homeName || !awayName) return {skipped:true,reason:"missing_team_name"};

  return await syncGameData(game,eventId,homeName,awayName);
}

async function syncFinalPlayerSummaryOnly(game:any) {
  const eventId = game.source_event_game_id || (/^\d+$/.test(game.source_game_id || "") ? game.source_game_id : null);
  if (!eventId) return { skipped:true,reason:"missing_event_id" };

  const { data:teams, error:teamsError }=await admin.from("teams")
    .select("id,canonical_name")
    .in("id",[game.home_team_id,game.away_team_id]);
  if (teamsError) throw teamsError;
  const map=new Map((teams || []).map((t:any)=>[t.id,t.canonical_name]));
  const homeName=map.get(game.home_team_id) || "";
  const awayName=map.get(game.away_team_id) || "";
  if(!homeName || !awayName) return { skipped:true,reason:"missing_team_name" };

  const { data:roster, error:rosterError }=await admin.from("team_rosters")
    .select("team_id,player_id,jersey_number,source_name,position,is_active")
    .eq("competition_id",game.competition_id)
    .in("team_id",[game.home_team_id,game.away_team_id]);
  if (rosterError) throw rosterError;

  return await syncPlayerSummary(game,eventId,homeName,awayName,roster || []);
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

  let playerSummary:any = { skipped:true };
  const shouldReadSummary = game.status === "final" || eventsResult.is_final === true;
  if (shouldReadSummary) {
    const { count:skaterCount, error:skaterCountError } = await admin.from("player_game_stats")
      .select("id",{count:"exact",head:true})
      .eq("game_id",game.id);
    if (skaterCountError) throw skaterCountError;
    const { count:goalieCount, error:goalieCountError } = await admin.from("goalie_game_stats")
      .select("id",{count:"exact",head:true})
      .eq("game_id",game.id);
    if (goalieCountError) throw goalieCountError;

    if ((skaterCount || 0) === 0 || (goalieCount || 0) === 0) {
      playerSummary = await syncPlayerSummary(game,eventId,homeName,awayName,roster || []);
    } else {
      playerSummary = { skipped:true,existing_skaters:skaterCount || 0,existing_goalies:goalieCount || 0 };
    }
  }

  let specialTeams:any = { skipped:true };
  if (game.status === "final" || eventsResult.is_final === true) {
    specialTeams = await syncOfficialSpecialTeams(game,eventId,homeName,awayName);
  }

  return {
    eventId,
    awaiting:false,
    lineup:lineupResult,
    events:eventsResult,
    player_summary:playerSummary,
    special_teams:specialTeams
  };
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

      const { count:playerStatsCount, error:playerStatsCountError } = await admin.from("player_game_stats")
        .select("id",{count:"exact",head:true})
        .eq("game_id",latestFinal.id);
      if (playerStatsCountError) throw playerStatsCountError;

      const { count:goalieStatsCount, error:goalieStatsCountError } = await admin.from("goalie_game_stats")
        .select("id",{count:"exact",head:true})
        .eq("game_id",latestFinal.id);
      if (goalieStatsCountError) throw goalieStatsCountError;

      const legacyNumeric = /^\d+$/.test(latestFinal.source_game_id || "") ? latestFinal.source_game_id : null;
      const finalEventId = latestFinal.source_event_game_id || legacyNumeric;
      if ((force || (eventCount || 0) === 0 || (lineupCount || 0) === 0 || (teamStatsCount || 0) < 2 || (playerStatsCount || 0) === 0 || (goalieStatsCount || 0) === 0) && finalEventId) {
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
          existing_player_stats:playerStatsCount || 0,
          existing_goalie_stats:goalieStatsCount || 0,
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


    if (nextGame) {
      const opponentId = nextGame.home_team_id === vasby.id ? nextGame.away_team_id : nextGame.home_team_id;
      const focusTeamIds = [...new Set([vasby.id,opponentId].filter(Boolean))];
      const recentFinalMap = new Map<string,any>();

      for (const teamId of focusTeamIds) {
        const { data:recent, error:recentError } = await admin.from("games")
          .select(gameSelect)
          .eq("competition_id",competition.id)
          .eq("status","final")
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order("scheduled_start",{ascending:false})
          .limit(5);
        if (recentError) throw recentError;
        for (const game of recent || []) recentFinalMap.set(game.id,game);
      }

      const recentFinals=[...recentFinalMap.values()]
        .sort((a:any,b:any)=>new Date(b.scheduled_start).getTime()-new Date(a.scheduled_start).getTime());

      if(recentFinals.length) {
        const ids=recentFinals.map((g:any)=>g.id);
        const [playerRows,goalieRows,lineupRows,specialRows]=await Promise.all([
          admin.from("player_game_stats").select("game_id").in("game_id",ids),
          admin.from("goalie_game_stats").select("game_id").in("game_id",ids),
          admin.from("game_lineup_revisions").select("game_id").in("game_id",ids).eq("is_current",true),
          admin.from("team_game_stats")
            .select("game_id,team_id,power_play_opportunities,penalty_kill_opportunities")
            .in("game_id",ids)
        ]);
        if(playerRows.error) throw playerRows.error;
        if(goalieRows.error) throw goalieRows.error;
        if(lineupRows.error) throw lineupRows.error;
        if(specialRows.error) throw specialRows.error;

        const playerGames=new Set((playerRows.data || []).map((r:any)=>r.game_id));
        const goalieGames=new Set((goalieRows.data || []).map((r:any)=>r.game_id));
        const lineupGames=new Set((lineupRows.data || []).map((r:any)=>r.game_id));

        const missing=recentFinals.find((g:any)=>
          !!g.source_event_game_id && (!playerGames.has(g.id) || !goalieGames.has(g.id))
        );

        if(missing) {
          output.backfill={
            game_id:missing.id,
            source_event_game_id:missing.source_event_game_id,
            result:await syncFinalPlayerSummaryOnly(missing)
          };
        } else {
          output.backfill={skipped:true,covered_games:recentFinals.length};
        }

        const latestForFocus=[...new Map(
          focusTeamIds.map((teamId:string)=>[
            teamId,
            recentFinals.find((g:any)=>g.home_team_id===teamId || g.away_team_id===teamId) || null
          ])
        ).values()].filter(Boolean) as any[];

        const missingLineup=latestForFocus.find((g:any)=>
          !!g.source_event_game_id && !lineupGames.has(g.id)
        );

        if(missingLineup) {
          output.lineup_backfill={
            game_id:missingLineup.id,
            source_event_game_id:missingLineup.source_event_game_id,
            result:await syncFinalLineupOnly(missingLineup)
          };
        } else {
          output.lineup_backfill={skipped:true,covered_games:latestForFocus.length};
        }

        const specialByGame=new Map<string,any[]>();
        for(const row of specialRows.data || []){
          const list=specialByGame.get(row.game_id) || [];
          list.push(row);
          specialByGame.set(row.game_id,list);
        }
        const missingSpecial=recentFinals.find((g:any)=>{
          if(!g.source_event_game_id) return false;
          const focusTeamId=focusTeamIds.find((teamId:string)=>
            g.home_team_id===teamId || g.away_team_id===teamId
          );
          if(!focusTeamId) return false;
          const rows=(specialByGame.get(g.id) || []).filter((row:any)=>row.team_id===focusTeamId);
          return rows.length<1 || rows.some((row:any)=>
            row.power_play_opportunities===null || row.penalty_kill_opportunities===null
          );
        });

        if(missingSpecial) {
          output.special_teams_backfill={
            game_id:missingSpecial.id,
            source_event_game_id:missingSpecial.source_event_game_id,
            result:await syncFinalGameComplete(missingSpecial)
          };
        } else {
          output.special_teams_backfill={skipped:true,covered_games:recentFinals.length};
        }
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
