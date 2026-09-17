(() => {
  'use strict';

  const PROFILE_KEY = 'seh_app_my_profile_v1';
  const PUBLIC_ID = 'seh-player-division-journey';
  const MY_ID = 'seh-my-division-journey';
  const DIVISIONS = Object.freeze({ Neo: 1, Core: 2, Lite: 3, Pro: 4, Elite: 5 });
  const EXCLUDED = Object.freeze([
    'qualifier', 'qualification', 'kval', 'wildcard', 'crossover',
    'registration', 'free agent', 'warmup', 'pre-season', 'preseason'
  ]);

  let client = null;
  let scheduled = false;
  let publicLoadToken = 0;
  let myLoadToken = 0;
  const historyCache = new Map();

  function cfg() {
    return window.SEH_CONFIG || window.EHOCKEY_CONFIG || window.APP_CONFIG || window.config || {};
  }

  function getClient() {
    if (window.__SEH_NATIVE_SUPABASE_CLIENT__) return window.__SEH_NATIVE_SUPABASE_CLIENT__;
    if (client) return client;
    const config = cfg();
    const url = String(config.supabaseUrl || config.SUPABASE_URL || '').trim();
    const key = String(config.supabasePublishableKey || config.supabaseAnonKey || config.SUPABASE_ANON_KEY || config.SUPABASE_PUBLISHABLE_KEY || '').trim();
    if (!window.supabase?.createClient || !url || !key) return null;
    client = window.supabase.createClient(url, key);
    return client;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeDivision(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    return Object.keys(DIVISIONS).find(name => name.toLowerCase() === raw) || '';
  }

  function rowGames(row) {
    const totalSkater = Number(row?.total_skater_games);
    const totalGoalie = Number(row?.total_goalie_games);
    if (Number.isFinite(totalSkater) || Number.isFinite(totalGoalie)) {
      return Math.max(0, Number.isFinite(totalSkater) ? totalSkater : 0) +
        Math.max(0, Number.isFinite(totalGoalie) ? totalGoalie : 0);
    }
    return ['regular_skater_games', 'playoff_skater_games', 'regular_goalie_games', 'playoff_goalie_games']
      .reduce((sum, key) => sum + Math.max(0, Number(row?.[key]) || 0), 0);
  }

  function rowDateValue(row) {
    const raw = row?.chronology_date || row?.chronology_end_date || '';
    const value = raw ? Date.parse(`${raw}T00:00:00Z`) : NaN;
    return Number.isFinite(value) ? value : 0;
  }

  function isRealEclDivisionRow(row) {
    if (String(row?.competition_name || '').trim().toUpperCase() !== 'ECL') return false;
    if (!normalizeDivision(row?.division)) return false;
    if (rowGames(row) <= 0) return false;
    const text = String(row?.league_name || '').toLowerCase();
    return !EXCLUDED.some(word => text.includes(word));
  }

  function cleanLeagueLabel(value) {
    return String(value || '')
      .replace(/\s*[🇦-🇿]{2}\s*$/u, '')
      .replace(/European Championship League/gi, 'ECL')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compactSeasonLabel(row) {
    const source = cleanLeagueLabel(row?.league_name || row?.leagueName);
    const division = normalizeDivision(row?.division);
    let match = source.match(/^ECL\s*'?((?:20)?\d{2}|\d{1,2})\s*:\s*(Winter|Spring)/i);
    if (match) {
      let value = match[1];
      if (/^20\d{2}$/.test(value)) value = value.slice(2);
      return `ECL ${value}${/^winter$/i.test(match[2]) ? 'W' : 'S'}`;
    }
    match = source.match(/^ECL\s*'?((?:20)?\d{2}|\d{1,2})/i);
    if (match) {
      let value = match[1];
      if (/^20\d{2}$/.test(value)) value = value.slice(2);
      return `ECL ${value}`;
    }
    const withoutDivision = source.replace(new RegExp(`\\s*(?:-|–|:)??\\s*${division}\\s*$`, 'i'), '').trim();
    return withoutDivision.length <= 13 ? withoutDivision : 'ECL';
  }

  function normalizeHistory(rawRows) {
    const grouped = new Map();
    for (const raw of Array.isArray(rawRows) ? rawRows : []) {
      if (!isRealEclDivisionRow(raw)) continue;
      const division = normalizeDivision(raw.division);
      const leagueId = String(raw.league_id ?? '').trim();
      const key = `${leagueId}|${division}`;
      const current = grouped.get(key) || {
        leagueId,
        leagueName: cleanLeagueLabel(raw.league_name),
        division,
        teams: [],
        games: 0,
        chronologyDate: raw.chronology_date || raw.chronology_end_date || '',
        chronologyEndDate: raw.chronology_end_date || raw.chronology_date || ''
      };
      const team = String(raw.team_name_in_tournament || '').trim();
      if (team && !current.teams.includes(team)) current.teams.push(team);
      current.games += rowGames(raw);
      if (rowDateValue(raw) && (!current.chronologyDate || rowDateValue(raw) < Date.parse(`${current.chronologyDate}T00:00:00Z`))) {
        current.chronologyDate = raw.chronology_date || raw.chronology_end_date || current.chronologyDate;
      }
      grouped.set(key, current);
    }

    const rows = [...grouped.values()].sort((a, b) => {
      const av = a.chronologyDate ? Date.parse(`${a.chronologyDate}T00:00:00Z`) : 0;
      const bv = b.chronologyDate ? Date.parse(`${b.chronologyDate}T00:00:00Z`) : 0;
      return av - bv || Number(a.leagueId || 0) - Number(b.leagueId || 0);
    });

    return rows.map(row => ({ ...row, seasonLabel: compactSeasonLabel(row) }));
  }

  async function loadHistory(playerKey) {
    const key = String(playerKey || '').trim();
    if (!key) return [];
    if (historyCache.has(key)) return historyCache.get(key);
    const promise = (async () => {
      const sb = getClient();
      if (!sb) throw new Error('Supabase saknas');
      const result = await sb
        .from('v_ehockey_player_tournaments_web_v14')
        .select('league_id,league_name,competition_name,division,division_key,team_name_in_tournament,chronology_date,chronology_end_date,total_skater_games,total_goalie_games,regular_skater_games,playoff_skater_games,regular_goalie_games,playoff_goalie_games')
        .eq('player_key', key)
        .order('chronology_date', { ascending: true, nullsFirst: false });
      if (result.error) throw result.error;
      return normalizeHistory(result.data || []);
    })();
    historyCache.set(key, promise);
    try {
      return await promise;
    } catch (error) {
      historyCache.delete(key);
      throw error;
    }
  }

  function currentRoutePlayerValue() {
    const match = String(location.hash || '').match(/^#\/spelare\/([^?]+)/i);
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function resolvePublicPlayerKey() {
    const routeValue = currentRoutePlayerValue();
    if (/^[a-f0-9]{40,}$/i.test(routeValue)) return routeValue;
    const name = String(document.querySelector('#playerName')?.textContent || '').trim();
    if (!name) return '';
    const sb = getClient();
    if (!sb) return '';
    const result = await sb
      .from('app_player_directory_cache')
      .select('player_key,display_gamertag')
      .eq('display_gamertag', name)
      .limit(5);
    if (result.error) throw result.error;
    return String(result.data?.[0]?.player_key || '').trim();
  }

  function readMyPlayerKey() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      return String(profile?.playerKey || profile?.player_key || profile?.key || '').trim();
    } catch (_) {
      return '';
    }
  }

  async function resolveMyPlayerKey() {
    const local = readMyPlayerKey();
    if (local) return local;
    const sb = getClient();
    if (!sb) return '';
    const result = await sb.rpc('seh_get_my_player_account');
    if (result.error) throw result.error;
    const row = Array.isArray(result.data) ? (result.data[0] || {}) : (result.data || {});
    return String(row?.status || '') === 'approved' ? String(row?.player_key || '').trim() : '';
  }

  function pointTooltip(row) {
    const teams = row.teams.length ? row.teams.join(' / ') : 'Lag saknas';
    return `${row.leagueName || row.seasonLabel} · ${row.division} · ${teams} · ${row.games} matcher`;
  }

  function chartMarkup(rows, compact = false) {
    const visibleRows = rows;
    if (!visibleRows.length) return '';

    const margin = { left: compact ? 50 : 62, right: compact ? 18 : 24, top: 22, bottom: compact ? 42 : 52 };
    const step = compact ? 48 : 82;
    const width = Math.max(compact ? 430 : 650, margin.left + margin.right + Math.max(1, visibleRows.length - 1) * step);
    const height = compact ? 238 : 286;
    const chartHeight = height - margin.top - margin.bottom;
    const xSpan = Math.max(1, width - margin.left - margin.right);
    const xFor = index => visibleRows.length === 1
      ? margin.left + xSpan / 2
      : margin.left + (index / (visibleRows.length - 1)) * xSpan;
    const yFor = division => margin.top + (5 - DIVISIONS[division]) / 4 * chartHeight;

    const grid = Object.entries(DIVISIONS)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => {
        const y = yFor(name);
        return `<line class="seh-div-grid" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
          <text class="seh-div-axis" x="${margin.left - 9}" y="${y + 4}" text-anchor="end">${name.toUpperCase()}</text>`;
      }).join('');

    const points = visibleRows.map((row, index) => ({ row, x: xFor(index), y: yFor(row.division) }));
    const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    const nodes = points.map((point, index) => {
      const latest = index === points.length - 1;
      const seasonText = compact ? String(point.row.seasonLabel || '').replace(/^ECL\s*/i, '') : point.row.seasonLabel;
      return `<g class="seh-div-point${latest ? ' is-latest' : ''}">
        <circle cx="${point.x}" cy="${point.y}" r="${compact ? 6 : 7}"><title>${esc(pointTooltip(point.row))}</title></circle>
        <text class="seh-div-season" x="${point.x}" y="${height - 13}" text-anchor="middle">${esc(seasonText)}</text>
      </g>`;
    }).join('');

    return `<div class="seh-div-chart-scroll"><svg class="seh-div-chart" viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="ECL-divisionsresa från ${esc(visibleRows[0].division)} till ${esc(visibleRows[visibleRows.length - 1].division)}">
      ${grid}
      ${points.length > 1 ? `<path class="seh-div-line" d="${path}"></path>` : ''}
      ${nodes}
    </svg></div>`;
  }

  function footerMarkup(rows) {
    if (!rows.length) return '';
    const first = rows[0];
    const latest = rows[rows.length - 1];
    return `<div class="seh-div-footer"><span>${esc(first.seasonLabel)}: ${esc(first.division)}</span><span>${esc(latest.seasonLabel)}: ${esc(latest.division)}</span></div>`;
  }

  function publicCardMarkup(rows) {
    return `<div class="seh-div-head"><div><small>DIVISIONSRESA</small><h2>ECL-divisionskurva</h2><p>Endast ECL-divisioner där spelaren faktiskt har registrerade matcher.</p></div><span>${rows.length} stopp</span></div>
      ${chartMarkup(rows, false)}
      ${footerMarkup(rows)}`;
  }

  function myCardMarkup(rows) {
    return `<div class="seh-me-section-head"><div><small>DIVISIONSRESA</small><h3>Din ECL-resa</h3></div><span>${rows.length} stopp</span></div>
      <div class="seh-my-div-body">${chartMarkup(rows, true)}${footerMarkup(rows)}</div>`;
  }

  async function renderPublic() {
    const route = document.querySelector('#spaRouteView[data-route="player"]');
    const page = route?.querySelector('#playerPage:not([hidden])');
    const overview = page?.querySelector('[data-player-panel="overview"]');
    const playerName = page?.querySelector('#playerName');
    if (!route || !page || !overview || !playerName?.textContent?.trim()) return;

    const routeSnapshot = String(location.hash || '');
    let host = overview.querySelector(`#${PUBLIC_ID}`);
    if (!host) {
      host = document.createElement('section');
      host.id = PUBLIC_ID;
      host.className = 'seh-player-division-card';
      host.setAttribute('aria-label', 'Spelarens ECL-divisionsresa');
      overview.appendChild(host);
    }

    let token = 0;
    try {
      const playerKey = await resolvePublicPlayerKey();
      if (String(location.hash || '') !== routeSnapshot || !host.isConnected) return;
      if (!playerKey) {
        host.remove();
        return;
      }
      if (host.dataset.playerKey === playerKey && host.dataset.ready === '1') return;
      if (host.dataset.loadingKey === playerKey) return;
      token = ++publicLoadToken;
      host.dataset.loadingKey = playerKey;
      host.dataset.ready = '0';
      host.innerHTML = '<div class="seh-div-loading">Hämtar divisionsresa…</div>';
      const rows = await loadHistory(playerKey);
      if (token !== publicLoadToken || !host.isConnected) return;
      if (!rows.length) {
        host.remove();
        return;
      }
      host.dataset.playerKey = playerKey;
      host.dataset.ready = '1';
      delete host.dataset.loadingKey;
      host.innerHTML = publicCardMarkup(rows);
    } catch (error) {
      console.warn('[Svensk eHockey] Spelarens divisionskurva kunde inte laddas', error);
      if ((token && token !== publicLoadToken) || !host.isConnected) return;
      delete host.dataset.loadingKey;
      host.dataset.ready = '0';
      host.innerHTML = '<div class="seh-div-empty">Divisionsresan kunde inte laddas just nu.</div>';
    }
  }

  async function renderMy() {
    const root = document.querySelector('#seh-my-ehockey.show');
    const career = root?.querySelector('.seh-me-career-section');
    if (!root || !career) return;

    let host = root.querySelector(`#${MY_ID}`);
    if (!host) {
      host = document.createElement('section');
      host.id = MY_ID;
      host.className = 'seh-me-section seh-my-division-section';
      host.setAttribute('aria-label', 'Din ECL-divisionsresa');
      career.insertAdjacentElement('afterend', host);
    }

    let token = 0;
    try {
      const playerKey = await resolveMyPlayerKey();
      if (!host.isConnected) return;
      if (!playerKey) {
        host.remove();
        return;
      }
      if (host.dataset.playerKey === playerKey && host.dataset.ready === '1') return;
      if (host.dataset.loadingKey === playerKey) return;
      token = ++myLoadToken;
      host.dataset.loadingKey = playerKey;
      host.dataset.ready = '0';
      host.innerHTML = '<div class="seh-div-loading seh-div-loading--my">Hämtar din divisionsresa…</div>';
      const rows = await loadHistory(playerKey);
      if (token !== myLoadToken || !host.isConnected) return;
      if (!rows.length) {
        host.remove();
        return;
      }
      host.dataset.playerKey = playerKey;
      host.dataset.ready = '1';
      delete host.dataset.loadingKey;
      host.innerHTML = myCardMarkup(rows);
    } catch (error) {
      console.warn('[Svensk eHockey] Din divisionsresa kunde inte laddas', error);
      if ((token && token !== myLoadToken) || !host.isConnected) return;
      delete host.dataset.loadingKey;
      host.dataset.ready = '0';
      host.innerHTML = '<div class="seh-div-empty seh-div-empty--my">Din divisionsresa kunde inte laddas just nu.</div>';
    }
  }

  function run() {
    scheduled = false;
    renderPublic();
    renderMy();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'data-route'] });
  window.addEventListener('hashchange', () => {
    publicLoadToken += 1;
    schedule();
  });
  window.addEventListener('storage', event => {
    if (event.key === PROFILE_KEY) {
      myLoadToken += 1;
      historyCache.clear();
      schedule();
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
})();