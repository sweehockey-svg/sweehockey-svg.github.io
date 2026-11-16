$ErrorActionPreference = 'Stop'
$url = 'https://sportsgamer.gg/leagues/534/teams/6981'
$html = (Invoke-WebRequest $url -TimeoutSec 25).Content
if ($html -notmatch '(?is)<h2\b[^>]*class="[^"]*\bprofile-name\b[^"]*"[^>]*>\s*ECL\b[^<]*Winter\s*-\s*Free Agent\b' -or
    $html -notmatch 'href="https://sportsgamer\.gg/leagues/534"') {
    throw 'Unexpected SportsGamer team page; existing Free Agents preserved'
}

$tables = [regex]::Matches($html, '(?is)<table\b[^>]*class="[^"]*\broster-table\b[^"]*"[^>]*>.*?</table>')
$roster = @(
    foreach ($table in $tables) {
        foreach ($row in [regex]::Matches($table.Value, '(?is)<tr\b[^>]*>.*?</tr>')) {
            if ($row.Value -notmatch '/players/') { continue }
            $player = [regex]::Match($row.Value, '(?is)<a\s+href="(?:https://sportsgamer\.gg)?/players/([0-9]+)"[^>]*>\s*<b>([^<]+)</b>')
            $flag = [regex]::Match($row.Value, '(?is)<td\b[^>]*class="[^"]*\bflag-cell\b[^"]*"[^>]*>(.*?)</td>')
            if (!$player.Success -or !$flag.Success -or [int]$player.Groups[1].Value -le 0) {
                throw 'Unrecognized SportsGamer roster row; existing Free Agents preserved'
            }
            [ordered]@{
                id = [int]$player.Groups[1].Value
                name = [Net.WebUtility]::HtmlDecode($player.Groups[2].Value).Trim()
                swedish = $flag.Groups[1].Value -match '(?i)src="(?:https://sportsgamer\.gg)?/images/flags/se\.svg"'
            }
        }
    }
)
if (!$roster.Count -or @($roster.id | Sort-Object -Unique).Count -ne $roster.Count) {
    throw 'Empty or duplicate SportsGamer roster; existing Free Agents preserved'
}
[ordered]@{ leagueId = 534; teamId = 6981; players = $roster } | ConvertTo-Json -Depth 5 -Compress
