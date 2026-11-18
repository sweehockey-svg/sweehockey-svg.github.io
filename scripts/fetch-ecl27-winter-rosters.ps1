param([string]$Output = (Join-Path $PSScriptRoot '../ecl27-winter-rosters.json'))

$ErrorActionPreference = 'Stop'
$base = 'https://sportsgamer.gg/leagues/535/teams'
$page = (Invoke-WebRequest $base -TimeoutSec 25).Content
$payload = [regex]::Match($page, 'data-page="([^"]+)"')
if (!$payload.Success) { throw 'SportsGamer team list not found' }
$league = ([Net.WebUtility]::HtmlDecode($payload.Groups[1].Value) | ConvertFrom-Json -AsHashtable).props.league
if ($league.id -ne 535 -or $league.name -notmatch 'Winter.*Registration' -or !$league.teams.Count) {
    throw 'Unexpected or empty Winter registration; previous snapshot preserved'
}

$teams = foreach ($team in $league.teams) {
    $id = [int]$team.id
    if ($id -le 0 -or !$team.name) { throw 'Invalid team in registration' }
    $html = (Invoke-WebRequest "$base/$id" -TimeoutSec 25).Content
    $tables = [regex]::Matches($html, '(?is)<table\b[^>]*class="[^"]*\broster-table\b[^"]*"[^>]*>.*?</table>')
    if (!$tables.Count) { throw "No roster tables for team $id" }
    $players = @(
        foreach ($table in $tables) {
            foreach ($m in [regex]::Matches($table.Value, '(?is)<a\s+href="(?:https://sportsgamer\.gg)?/players/([0-9]+)"[^>]*>\s*<b>([^<]+)</b>')) {
                [ordered]@{ id = [int]$m.Groups[1].Value; name = [Net.WebUtility]::HtmlDecode($m.Groups[2].Value).Trim() }
            }
        }
    )
    $players = @($players | Group-Object { $_.id } | ForEach-Object { $_.Group[0] })
    if ($players.Count -ne $team.players.Count) {
        throw "Roster for team $id changed during fetch or could not be read completely; retry"
    }
    [ordered]@{
        id = $id
        name = [string]$team.name
        requestedDivision = [int]$team.additionalInfo.division
        # The public list uses /images/no-logo.jpg for clubs without a logo.
        logoUrl = if ([string]$team.logo -match "^https://sportsgamer\.gg/storage/team-logos/\d+/$id/[^/?#]+$") { [string]$team.logo } else { '' }
        players = $players
    }
}
if (@($teams.id | Sort-Object -Unique).Count -ne @($teams).Count) { throw 'Duplicate team IDs' }
[ordered]@{ leagueId = 535; checkedAt = [DateTime]::UtcNow.ToString('o'); teams = @($teams) } |
    ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $Output -Encoding utf8NoBOM
Write-Output "$(@($teams).Count) teams and $(@($teams | ForEach-Object { $_.players }).Count) roster entries"
