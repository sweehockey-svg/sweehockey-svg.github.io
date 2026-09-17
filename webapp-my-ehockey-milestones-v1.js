(() => {
  'use strict';

  const ROOT_ID = 'seh-my-ehockey';
  const PROFILE_KEY = 'seh_app_my_profile_v1';
  const HOST_ID = 'seh-my-career-milestones';
  const DIVISION_RANK = Object.freeze({ Neo: 1, Core: 2, Lite: 3, Pro: 4, Elite: 5 });
  const EXCLUDED_ECL = Object.freeze([
    'qualifier', 'qualification', 'kval', 'wildcard', 'crossover',
    'registration', 'free agent', 'warmup', 'pre-season', 'preseason'
  ]);
  const GAME_THRESHOLDS = [100, 250, 500, 1000];
  const TOURNAMENT_THRESHOLDS = [10, 25, 50, 100];
  const CLUB_THRESHOLDS = [10, 25, 50];
  const SAVE_THRESHOLDS = [1000, 2500, 5000, 10000];
  const POINT_THRESHOLDS = [100, 250, 500, 1000, 2000];

  let client = null;
  let loadToken = 0;
  let timer = 0;
  let loadedKey = '';

  function isWebApp() {
    return Boolean(
      window.__SEH_WEB_APP__ ||
      document.documentElement.classList.contains('seh-web-app') ||
      new URLSearchParams(location.search).get('webapp') === '1' ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    );
  }

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

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function fmt(value) {
    return Math.round(number(value)).toLocaleString('sv-SE');
  }

  function localPlayerKey() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      return String(profile?.playerKey || profile?.player_key || profile?.key || '').trim();
    } catch (_) {
      return '';
    }
  }

  async function resolvePlayerKey() {
    const local = localPlayerKey();
    if (local) return local;
    const sb = getClient();
    if (!sb) return '';
    const result = await sb.rpc('seh_get_my_player_account');
    if (result.error) throw result.error;
    const row = Array.isArray(result.data) ? (result.data[0] || {}) : (result.data || {});
    return String(row?.status || '') === 'approved' ? String(row?.player_key || '').trim() : '';
  }

  function rowGames(row) {
    const skater = Number(row?.total_skater_games);
    const goalie = Number(row?.total_goalie_games);
    if (Number.isFinite(skater) || Number.isFinite(goalie)) {
      return Math.max(0, Number.isFinite(skater) ? skater : 0) + Math.max(0, Number.isFinite(goalie) ? goalie : 0);
    }
    return ['regular_skater_games', 'playoff_skater_games', 'regular_goalie_games', 'playoff_goalie_games']
      .reduce((sum, key) => sum + Math.max(0, Number(row?.[key]) || 0), 0);
  }

  function normalizeDivision(value) {
    const raw = String(value || '').trim().toLowerCase();
    return Object.keys(DIVISION_RANK).find(name => name.toLowerCase() === raw) || '';
  }

  function cleanLeague(value) {
    return String(value || '')
      .replace(/European Championship League/gi, 'ECL')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function seasonLabel(row) {
    const source = cleanLeague(row?.league_name);
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
    return source || 'ECL';
  }

  function summarizeEcl(rows) {
    const seasons = new Map();
    let highestDivision = '';
    let highestRank = 0;

    for (const row of Array.isArray(rows) ? rows : []) {
      if (String(row?.competition_name || '').trim().toUpperCase() !== 'ECL') continue;
      if (rowGames(row) <= 0) continue;
      const leagueText = String(row?.league_name || '').toLowerCase();
      if (EXCLUDED_ECL.some(word => leagueText.includes(word))) continue;
      const division = normalizeDivision(row?.division);
      if (!division) continue;

      const leagueId = String(row?.league_id ?? '').trim();
      const key = leagueId || `${row?.league_name || ''}|${row?.chronology_date || ''}`;
      const date = String(row?.chronology_date || row?.chronology_end_date || '').trim();
      const existing = seasons.get(key);
      if (!existing || (date && (!existing.date || date < existing.date))) {
        seasons.set(key, { label: seasonLabel(row), date, division });
      }

      const rank = DIVISION_RANK[division] || 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestDivision = division;
      }
    }

    const ordered = [...seasons.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return {
      count: ordered.length,
      first: ordered[0]?.label || '–',
      latest: ordered[ordered.length - 1]?.label || '–',
      highestDivision: highestDivision || '–'
    };
  }

  function highestReached(value, thresholds) {
    const current = number(value);
    return [...thresholds].reverse().find(target => current >= target) || 0;
  }

  function nextTarget(value, thresholds, label) {
    const current = number(value);
    const target = thresholds.find(item => current < item);
    if (!target) return null;
    return { current, target, label, ratio: target > 0 ? current / target : 0 };
  }

  function buildBadges(row, ecl) {
    const games = number(row?.career_games);
    const tournaments = number(row?.tournament_count);
    const clubs = number(row?.club_count);
    const saves = number(row?.total_goalie_saves);
    const points = number(row?.total_points);
    const goalieGames = number(row?.total_goalie_games);
    const skaterGames = number(row?.total_skater_games);
    const badges = [];

    const gameMark = highestReached(games, GAME_THRESHOLDS);
    const tournamentMark = highestReached(tournaments, TOURNAMENT_THRESHOLDS);
    const clubMark = highestReached(clubs, CLUB_THRESHOLDS);
    if (gameMark) badges.push({ icon: 'GP', text: `${fmt(gameMark)} matcher` });
    if (tournamentMark) badges.push({ icon: 'T', text: `${fmt(tournamentMark)} turneringar` });
    if (clubMark) badges.push({ icon: 'K', text: `${fmt(clubMark)} klubbar` });

    if (goalieGames > 0 || saves > 0) {
      const saveMark = highestReached(saves, SAVE_THRESHOLDS);
      if (saveMark) badges.push({ icon: 'G', text: `${fmt(saveMark)} räddningar` });
    }
    if (skaterGames > 0 || points > 0) {
      const pointMark = highestReached(points, POINT_THRESHOLDS);
      if (pointMark) badges.push({ icon: 'P', text: `${fmt(pointMark)} poäng` });
    }

    if (ecl.count >= 10) badges.push({ icon: 'ECL', text: '10 ECL-säsonger' });
    if (ecl.highestDivision !== '–') badges.push({ icon: '↑', text: `${ecl.highestDivision} nådd` });
    return badges.slice(0, 6);
  }

  function findNextMilestone(row, ecl) {
    const candidates = [
      nextTarget(row?.career_games, GAME_THRESHOLDS, 'matcher'),
      nextTarget(row?.tournament_count, TOURNAMENT_THRESHOLDS, 'turneringar'),
      nextTarget(row?.club_count, CLUB_THRESHOLDS, 'klubbar')
    ].filter(Boolean);

    if (number(row?.total_goalie_games) > 0 || number(row?.total_goalie_saves) > 0) {
      const next = nextTarget(row?.total_goalie_saves, SAVE_THRESHOLDS, 'räddningar');
      if (next) candidates.push(next);
    }
    if (number(row?.total_skater_games) > 0 || number(row?.total_points) > 0) {
      const next = nextTarget(row?.total_points, POINT_THRESHOLDS, 'poäng');
      if (next) candidates.push(next);
    }
    if (ecl.count < 10) {
      candidates.push({ current: ecl.count, target: 10, label: 'ECL-säsonger', ratio: ecl.count / 10 });
    }

    candidates.sort((a, b) => b.ratio - a.ratio || a.target - b.target);
    return candidates[0] || null;
  }

  function recordCard(label, value, hint) {
    return `<div class="seh-me-record"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(hint)}</span></div>`;
  }

  function markup(row, ecl) {
    const badges = buildBadges(row, ecl);
    const next = findNextMilestone(row, ecl);
    const progress = next ? Math.max(0, Math.min(100, Math.round(next.ratio * 100))) : 100;
    const badgeHtml = badges.length
      ? badges.map(item => `<span class="seh-me-badge"><b>${esc(item.icon)}</b>${esc(item.text)}</span>`).join('')
      : '<span class="seh-me-badge is-muted"><b>•</b>Första milstolpen väntar</span>';

    return `
      <div class="seh-me-milestone-head">
        <div><small>REKORD & MILSTOLPAR</small><strong>Din karriärresa</strong></div>
        <span>${badges.length} upplåsta</span>
      </div>
      <div class="seh-me-record-grid">
        ${recordCard('Första ECL', ecl.first, 'Första registrerade ECL-säsong')}
        ${recordCard('Högsta division', ecl.highestDivision, 'Högsta registrerade ECL-nivå')}
        ${recordCard('ECL-säsonger', fmt(ecl.count), 'Med registrerade matcher')}
        ${recordCard('Senaste ECL', ecl.latest, 'Senaste registrerade ECL-säsong')}
      </div>
      <div class="seh-me-badges">${badgeHtml}</div>
      ${next ? `
        <div class="seh-me-next-milestone">
          <div><small>NÄSTA MILSTOLPE</small><strong>${esc(fmt(next.target))} ${esc(next.label)}</strong><span>${esc(fmt(next.current))} / ${esc(fmt(next.target))}</span></div>
          <div class="seh-me-progress" role="progressbar" aria-label="${esc(next.label)}" aria-valuemin="0" aria-valuemax="${esc(next.target)}" aria-valuenow="${esc(Math.round(next.current))}"><i style="width:${progress}%"></i></div>
        </div>` : `
        <div class="seh-me-next-milestone is-complete"><div><small>MILSTOLPAR</small><strong>Alla nuvarande nivåer är nådda</strong></div></div>`}
      <p class="seh-me-milestone-note">Milstolparna bygger på registrerade matcher och historik i Svensk eHockey.</p>`;
  }

  function ensureHost(root) {
    const careerSection = root?.querySelector('.seh-me-career-section');
    if (!careerSection) return null;

    let host = root.querySelector(`#${HOST_ID}`);
    if (host && host.closest('[data-me-career]')) {
      host.remove();
      host = null;
    }

    if (!host) {
      host = document.createElement('section');
      host.id = HOST_ID;
      host.className = 'seh-me-section seh-me-milestones';
      host.dataset.ready = '0';
      host.dataset.loading = '0';
      host.innerHTML = '<div class="seh-me-milestone-loading">Hämtar rekord & milstolpar…</div>';
      careerSection.insertAdjacentElement('afterend', host);
    }
    return host;
  }

  async function load(force = false) {
    if (!isWebApp()) return;
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;
    const host = ensureHost(root);
    if (!host) return;
    if (host.dataset.loading === '1') return;

    const playerKey = await resolvePlayerKey().catch(() => '');
    if (!host.isConnected) return;
    if (!playerKey) {
      host.remove();
      return;
    }
    if (!force && loadedKey === playerKey && host.dataset.ready === '1') return;

    const token = ++loadToken;
    host.dataset.loading = '1';
    host.dataset.ready = '0';
    host.innerHTML = '<div class="seh-me-milestone-loading">Hämtar rekord & milstolpar…</div>';

    try {
      const sb = getClient();
      if (!sb) throw new Error('Supabase saknas');

      const [careerResult, eclResult] = await Promise.all([
        sb.from('app_player_directory_cache')
          .select('player_key,career_games,total_skater_games,total_goalie_games,total_points,total_goalie_saves,tournament_count,club_count')
          .eq('player_key', playerKey)
          .limit(1),
        sb.from('v_ehockey_player_tournaments_web_v14')
          .select('league_id,league_name,competition_name,division,chronology_date,chronology_end_date,total_skater_games,total_goalie_games,regular_skater_games,playoff_skater_games,regular_goalie_games,playoff_goalie_games')
          .eq('player_key', playerKey)
          .eq('competition_name', 'ECL')
          .order('chronology_date', { ascending: true, nullsFirst: false })
      ]);

      if (token !== loadToken || !host.isConnected) return;
      if (careerResult.error) throw careerResult.error;
      const row = careerResult.data?.[0];
      if (!row) {
        host.remove();
        return;
      }

      const ecl = summarizeEcl(eclResult.error ? [] : (eclResult.data || []));
      host.innerHTML = markup(row, ecl);
      host.dataset.ready = '1';
      loadedKey = playerKey;
    } catch (error) {
      console.warn('[Svensk eHockey] Rekord & milstolpar kunde inte laddas', error);
      if (token !== loadToken || !host.isConnected) return;
      host.innerHTML = '<div class="seh-me-milestone-loading">Rekord & milstolpar kunde inte laddas just nu.</div>';
      host.dataset.ready = '0';
    } finally {
      if (host.isConnected) host.dataset.loading = '0';
    }
  }

  function schedule(delay = 80, force = false) {
    clearTimeout(timer);
    timer = window.setTimeout(() => load(force), delay);
  }

  const observer = new MutationObserver(mutations => {
    if (!isWebApp()) return;
    const root = document.getElementById(ROOT_ID);
    if (!root?.classList.contains('show')) return;

    const relevant = mutations.some(mutation => {
      const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
      if (target?.closest?.(`#${HOST_ID}`)) return false;
      if (mutation.type === 'attributes') return mutation.target === root;
      return !root.querySelector(`#${HOST_ID}`) || Boolean(target?.closest?.(`#${ROOT_ID}`));
    });
    if (relevant) schedule(80);
  });

  function start() {
    if (!isWebApp()) return;
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    schedule(250);
  }

  window.addEventListener('storage', event => {
    if (event.key === PROFILE_KEY) {
      loadedKey = '';
      loadToken += 1;
      schedule(80, true);
    }
  });

  window.SEH_REFRESH_MY_MILESTONES = () => {
    loadedKey = '';
    loadToken += 1;
    schedule(0, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
