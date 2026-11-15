"""Read the same accepted-invite dates used by the old ECL '26 Spring export."""

import csv
import os
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

from ecl27_winter_source import connect, division_for_name

HISTORY = (4,5,17,18,19,20,23,24,25,27,28,29,35,36,37,40,41,42,55,56,57,58,65,66,67,68,
           94,95,96,97,119,120,121,122,123,170,171,172,173,174,190,191,192,193,194,
           250,251,252,253,254,305,306,307,308,309,338,339,340,341,342,379,380,381,382,383,
           411,412,413,414,415,461,462,463,464,465,482,484,485,486,487,488,489,490,491,
           502,503,504,505,506,507,508,509,510,511)
REQUESTED = dict(zip(range(540, 545), ("Elite", "Pro", "Lite", "Core", "Neo")))
OUTPUT = Path("/tmp/ecl27_winter_transfers.csv")


def placeholders(values):
    return ",".join(["%s"] * len(values))


def division(league, name, request=None):
    if league == 535:
        return REQUESTED.get(int(request or 0)) if str(request or "").isdigit() else None
    match = re.search(r"\b(elite|pro|lite|core|neo)\b", name or "", re.I)
    return match.group(1).title() if match else None


def build_rows(history, captains, current):
    by_player = defaultdict(list)
    for row in history:
        if valid_day(row["event_date"]):
            by_player[row["playerID"]].append(row)
    seen_destinations = set()
    moves = {}
    for player, rows in by_player.items():
        previous = None
        for row in sorted(rows, key=lambda item: (str(item["event_date"]), item["leagueID"], item["teamID"])):
            league, team = row["leagueID"], row["teamID"]
            if league in current:
                seen_destinations.add((player, league, team))
                if not previous or previous["teamID"] != team:
                    day = valid_day(row["event_date"])
                    key = f"winter-invite:{player}:{previous['teamID'] if previous else 0}:{team}:{day}"
                    moves[key] = to_csv_row(key, day, row, previous, "")
            previous = row
    for row in captains:
        player, league, team = row["playerID"], row["leagueID"], row["teamID"]
        day = valid_day(row["event_date"])
        if (player, league, team) in seen_destinations or not day:
            continue
        earlier = [entry for entry in by_player[player] if str(entry["event_date"])[:10] < day]
        previous = max(earlier, key=lambda entry: (str(entry["event_date"]), entry["leagueID"], entry["teamID"]), default=None)
        # The importer checks the Spring match record before accepting or rejecting this fallback.
        key = f"winter-captain:{player}:{team}:{day}"
        moves[key] = to_csv_row(key, day, row, previous, row["role"])
    return sorted(moves.values(), key=lambda item: (item[1], item[0]))


def valid_day(value):
    try:
        return date.fromisoformat(str(value)[:10]).isoformat()
    except ValueError:
        return None


def to_csv_row(key, day, row, previous, role):
    return (
        key, day, row["playerID"], row["player_name"], role,
        previous["teamID"] if previous else None, previous["teamName"] if previous else None,
        division(previous["leagueID"], previous["leagueName"], previous["requested"]) if previous else None,
        previous["leagueID"] if previous else None,
        row["teamID"], row["teamName"], division(row["leagueID"], row["leagueName"], row["requested"]), row["leagueID"],
    )


def main():
    from export_swedish_player_stats import select

    connection = connect()
    try:
        leagues = select(connection, "select leagueID,leagueName from nhlgamer_leagues where leagueName like %s", ("%ECL%27%Winter%",))
        current = (535, *sorted({int(row["leagueID"]) for row in leagues
                                  if int(row["leagueID"]) != 535 and division_for_name(row["leagueName"])}))
        current_in = placeholders(current)
        name = "coalesce(nullif(p.psntag,''), nullif(p.gamertag,''))"
        swedish = "upper(trim(coalesce(nullif(p.nationality,''),p.country,''))) in ('SE','SWE','SWEDEN','SVERIGE')"
        captains = select(connection, f"""
            select distinct p.playerID, {name} as player_name, lt.leagueID, lt.teamID, t.teamName, l.leagueName,
                   json_unquote(json_extract(lt.additional_info, '$.division')) as requested,
                   lt.registeredForLeague as event_date,
                   case when lt.teamCaptainID=p.playerID then 'Captain' else 'Assistant Captain' end as role
            from nhlgamer_leagueTeams lt
            join nhlgamer_players p on p.playerID in (lt.teamCaptainID,lt.teamAssistantCaptainID,lt.teamAssistantCaptainID2)
            join nhlgamer_teams t on t.teamID=lt.teamID
            join nhlgamer_leagues l on l.leagueID=lt.leagueID
            where lt.leagueID in ({current_in}) and {swedish} and {name} is not null
              and lt.registeredForLeague is not null
            """, current)
        targets = select(connection, f"""
            select distinct p.playerID
            from nhlgamer_teamInvites i join nhlgamer_players p on p.playerID=i.playerID
            where i.leagueID in ({current_in}) and i.inviteStatus=2
              and {swedish} and {name} is not null
            """, current)
        player_ids = sorted({int(row["playerID"]) for row in (*targets, *captains)})
        seasons = (*HISTORY, *current)
        history = []
        for start in range(0, len(player_ids), 200):
            batch = player_ids[start:start + 200]
            history.extend(select(connection, f"""
                select distinct p.playerID, {name} as player_name, i.leagueID, i.teamID,
                       t.teamName, l.leagueName, i.inviteDate as event_date,
                       json_unquote(json_extract(lt.additional_info, '$.division')) as requested
                from nhlgamer_teamInvites i
                join nhlgamer_players p on p.playerID=i.playerID
                join nhlgamer_teams t on t.teamID=i.teamID
                join nhlgamer_leagues l on l.leagueID=i.leagueID
                left join nhlgamer_leagueTeams lt on lt.leagueID=i.leagueID and lt.teamID=i.teamID
                where i.playerID in ({placeholders(batch)}) and i.leagueID in ({placeholders(seasons)})
                  and i.inviteStatus=2 and i.inviteDate is not null
                """, (*batch, *seasons)))
    finally:
        connection.close()
    rows = build_rows(history, captains, set(current))
    with OUTPUT.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(("transfer_key", "transfer_date", "player_id", "player_name", "player_role",
                         "from_team_id", "from_team", "from_division", "from_league_id",
                         "to_team_id", "to_team", "to_division", "to_league_id"))
        writer.writerows(rows)
    print(f"Winter leagues: {current}; accepted invites: {len(history)}; dated Swedish Winter moves: {len(rows)}")


if __name__ == "__main__":
    main()
