#!/usr/bin/env python3
from __future__ import annotations
import json, os, re, sys
from collections import defaultdict
from typing import Any
import pymysql

LEAGUE_IDS = [524,525,526]
DACH = {"DE","AT","CH"}

def req(n):
    v=(os.environ.get(n) or "").strip()
    if not v: raise RuntimeError(f"Missing {n}")
    return v

def i(v):
    try: return int(v or 0)
    except: return 0

def low(row): return {str(k).lower():v for k,v in row.items()}
def first(row,*names):
    m=low(row)
    for n in names:
        if n.lower() in m and m[n.lower()] is not None: return m[n.lower()]
    return None

def norm(v):
    raw=str(v or "").strip().upper()
    mp={
      "GERMANY":"DE","GER":"DE","DEU":"DE",
      "AUSTRIA":"AT","AUT":"AT",
      "SWITZERLAND":"CH","SUI":"CH","SWI":"CH",
      "SWEDEN":"SE","SWE":"SE","FINLAND":"FI","FIN":"FI",
      "CZECHIA":"CZ","CZECH REPUBLIC":"CZ","CZE":"CZ",
      "SLOVAKIA":"SK","SVK":"SK","RUSSIA":"RU","RUS":"RU",
      "POLAND":"PL","POL":"PL","LATVIA":"LV","LAT":"LV",
      "NORWAY":"NO","NOR":"NO","DENMARK":"DK","DEN":"DK",
      "UNITED KINGDOM":"GB","GREAT BRITAIN":"GB","GBR":"GB",
      "FRANCE":"FR","FRA":"FR","NETHERLANDS":"NL","NED":"NL",
      "BELGIUM":"BE","BEL":"BE","ESTONIA":"EE","EST":"EE",
      "HUNGARY":"HU","HUN":"HU","ITALY":"IT","ITA":"IT",
      "SPAIN":"ES","ESP":"ES","PORTUGAL":"PT","POR":"PT",
      "CANADA":"CA","CAN":"CA","UNITED STATES":"US","USA":"US",
      "BOSNIA AND HERZEGOVINA":"BA","BOSNIA AND HERCEGOVINA":"BA"
    }
    if raw in mp: return mp[raw]
    if len(raw)==2 and raw.isalpha(): return raw
    return raw

def qid(x):
    if not re.fullmatch(r"[A-Za-z0-9_]+",x): raise RuntimeError("unsafe identifier")
    return f"`{x}`"

def sel(c,sql,p=()):
    if not re.match(r"^\s*select\b",sql,re.I): raise RuntimeError("SELECT-only")
    with c.cursor() as cur:
        cur.execute(sql,p)
        return list(cur.fetchall())

def table_columns(c, table):
    db=sel(c,"select database() db")[0]["db"]
    rows=sel(c,
      "select column_name as col from information_schema.columns where table_schema=%s and table_name=%s order by ordinal_position",
      (db,table))
    return [str(r.get("col") or "") for r in rows]

def pick(cols,*names):
    m={x.lower():x for x in cols}
    for n in names:
        if n.lower() in m: return m[n.lower()]
    return None

def main():
    via=bool((os.environ.get("SSH_HOST") or "").strip())
    c=pymysql.connect(
      host="127.0.0.1" if via else req("DB_HOST"),
      port=int(os.environ.get("SSH_LOCAL_DB_PORT") or "3307") if via else int(os.environ.get("DB_PORT") or "3306"),
      user=req("DB_USER"), password=req("DB_PASSWORD"), database=req("DB_NAME"),
      charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, connect_timeout=20,
      read_timeout=120, autocommit=True, init_command="SET SESSION TRANSACTION READ ONLY")
    try:
        ph=",".join(["%s"]*len(LEAGUE_IDS))

        league_meta=sel(c,
          f"select leagueID,leagueName from `nhlgamer_leagues` where leagueID in ({ph})",
          tuple(LEAGUE_IDS))
        league_name={i(r["leagueID"]):str(r.get("leagueName") or f'League {r["leagueID"]}') for r in league_meta}

        league_rows=sel(c,f"select leagueID,teamID,teamName from `nhlgamer_leagueTeams` where leagueID in ({ph})",tuple(LEAGUE_IDS))
        team_name={(i(r["leagueID"]),i(r["teamID"])):str(r.get("teamName") or f'Team {r["teamID"]}') for r in league_rows}

        user_cols=table_columns(c,"nhlgamer_users")
        user_id_col=pick(user_cols,"userID","id","member_id")
        user_country_col=pick(user_cols,"country","countryCode","country_code")
        user_city_col=pick(user_cols,"city")
        user_nat_col=pick(user_cols,"nationality")
        user_join=""
        user_select=", '' as user_country, '' as user_city, '' as user_nationality"
        if user_id_col and (user_country_col or user_city_col or user_nat_col):
            user_join=f" left join `nhlgamer_users` u on u.{qid(user_id_col)}=p.userID"
            user_select=(
              ", "+(f"u.{qid(user_country_col)}" if user_country_col else "''")+" as user_country"
              ", "+(f"u.{qid(user_city_col)}" if user_city_col else "''")+" as user_city"
              ", "+(f"u.{qid(user_nat_col)}" if user_nat_col else "''")+" as user_nationality"
            )

        roster=sel(c,
          f"""select r.leagueID,r.teamID,r.playerID,
                     p.gamertag,p.psntag,p.country,p.nationality,p.city,p.userID
                     {user_select}
              from `nhlgamer_leagueRosters` r
              left join `nhlgamer_players` p on p.playerID=r.playerID
              {user_join}
              where r.leagueID in ({ph})
              order by r.leagueID,r.teamID,r.playerID""",tuple(LEAGUE_IDS))

        by={}
        player_res={}
        all_players=[]
        for r in roster:
            lid=i(r["leagueID"]); tid=i(r["teamID"]); pid=i(r["playerID"])
            tag=str(r.get("psntag") or r.get("gamertag") or f"Player {pid}").strip()
            country=norm(r.get("country") or r.get("user_country"))
            nationality=norm(r.get("nationality") or r.get("user_nationality"))
            city=str(r.get("city") or r.get("user_city") or "")
            foreign = (country not in DACH) if country else None
            player_res[pid]=country
            e={"league_id":lid,"team_id":tid,"team_name":team_name.get((lid,tid),f"Team {tid}"),
               "player_id":pid,"gamertag":tag,"country":country,"nationality":nationality,
               "city":city,"foreign":foreign}
            all_players.append(e)
            by.setdefault((lid,tid),[]).append(e)

        teams=[]
        for (lid,tid),rr in sorted(by.items(), key=lambda kv:(kv[0][0], kv[1][0]["team_name"].lower(), kv[0][1])):
            ff=[x for x in rr if x["foreign"] is True]
            unk=[x for x in rr if x["foreign"] is None]
            teams.append({"league_id":lid,"team_id":tid,"team_name":rr[0]["team_name"],
                          "roster_count":len(rr),"foreign_count":len(ff),"unknown_residence_count":len(unk),
                          "foreign_players":[{"player_id":x["player_id"],"gamertag":x["gamertag"],"country":x["country"],"nationality":x["nationality"],"city":x["city"]} for x in ff],
                          "unknown_residence_players":[{"player_id":x["player_id"],"gamertag":x["gamertag"],"nationality":x["nationality"],"city":x["city"]} for x in unk],
                          "roster_violation":len(ff)>2,
                          "needs_manual_review":bool(unk)})

        participants=sel(c,
          f"""select p.leagueID,p.matchID,p.teamID,p.playerID,
                     pl.country,pl.nationality,pl.psntag,pl.gamertag
              from `nhlgamer_participants` p
              left join `nhlgamer_players` pl on pl.playerID=p.playerID
              where p.leagueID in ({ph})""",tuple(LEAGUE_IDS))
        lin=defaultdict(dict)
        for r in participants:
            lid=i(r["leagueID"]); mid=i(r["matchID"]); tid=i(r["teamID"]); pid=i(r["playerID"])
            if not (lid and mid and tid and pid): continue
            cc=norm(r.get("country"))
            tag=str(r.get("psntag") or r.get("gamertag") or f"Player {pid}").strip()
            lin[(lid,mid,tid)][pid]={"player_id":pid,"gamertag":tag,"country":cc,"foreign":(cc not in DACH) if cc else None}

        lineup_violations=[]
        lineup_manual=[]
        for (lid,mid,tid),mp in sorted(lin.items()):
            vals=list(mp.values())
            ff=[x for x in vals if x["foreign"] is True]
            unk=[x for x in vals if x["foreign"] is None]
            if len(ff)>1:
                lineup_violations.append({"league_id":lid,"match_id":mid,"team_id":tid,
                    "team_name":team_name.get((lid,tid),f"Team {tid}"),"foreign_count":len(ff),"foreign_players":ff})
            elif unk:
                lineup_manual.append({"league_id":lid,"match_id":mid,"team_id":tid,
                    "team_name":team_name.get((lid,tid),f"Team {tid}"),"unknown_players":unk})

        league_names={}
        for lid in LEAGUE_IDS:
            league_names[str(lid)]={"name":league_name.get(lid,f"League {lid}"),
                                    "team_count":sum(1 for t in teams if t["league_id"]==lid),
                                    "roster_players":sum(t["roster_count"] for t in teams if t["league_id"]==lid)}

        out={"league_ids":LEAGUE_IDS,"dach_country_codes":sorted(DACH),
             "classification":"nhlgamer_players.country (residence field), not nhlgamer_players.nationality",
             "league_summary":league_names,
             "teams":teams,
             "roster_violations":[t for t in teams if t["roster_violation"]],
             "manual_review_teams":[t for t in teams if t["needs_manual_review"]],
             "lineup_violations":lineup_violations,
             "lineup_manual_review":lineup_manual,
             "players":all_players}
        with open("sportsgamer-discovery.json","w",encoding="utf-8") as f:
            json.dump(out,f,ensure_ascii=False,indent=2)

        print("GCL 13 audit: country/residence field used; nationality ignored for foreign status.")
        for lid in LEAGUE_IDS:
            print(f"=== LEAGUE {lid}: {league_name.get(lid, f'League {lid}')} ===")
            for t in [x for x in teams if x["league_id"]==lid]:
                fp=", ".join(f'{p["gamertag"]}({p["country"] or "?"}, nat={p["nationality"] or "?"})' for p in t["foreign_players"]) or "none"
                unk=", ".join(p["gamertag"] for p in t["unknown_residence_players"]) or "none"
                st="VIOLATION" if t["roster_violation"] else ("REVIEW" if t["needs_manual_review"] else "OK")
                print(f'{t["team_id"]}\t{t["team_name"]}\tforeign={t["foreign_count"]}\t{fp}\tunknown={unk}\t{st}')
        print("nhlgamer_users columns:", ",".join(user_cols) if user_cols else "table missing")
        print("Roster violations:",len(out["roster_violations"]))
        print("Teams needing manual residence review:",len(out["manual_review_teams"]))
        print("Lineup violations:",len(out["lineup_violations"]))
        print("Lineups needing manual review:",len(out["lineup_manual_review"]))
    finally:
        c.close()
    return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except Exception as e:
        print("GCL audit failed:",e,file=sys.stderr)
        raise
