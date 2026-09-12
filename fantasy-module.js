(() => {
  "use strict";

  const TEMPLATE = `
    <main class="directory-shell fantasy-shell">
      <section class="fantasy-hero">
        <div class="fantasy-hero__copy">
          <p class="directory-kicker">SVENSK eHOCKEY FANTASY / PILOT</p>
          <h1>SCL 27 <em>Fantasy</em></h1>
          <p class="fantasy-hero__lead">Bygg ett lag med riktiga SCL-spelare och samla poäng från deras prestationer. Pilotversionen används för SCL 27 och blir grunden för framtida Fantasy i fler tävlingar.</p>
          <div class="fantasy-hero__badges">
            <span>6 SPELARE</span><span>100 BUDGET</span><span>MAX 2 / RIKTIGT LAG</span><span>KAPTEN 1,5×</span>
          </div>
        </div>
        <aside class="fantasy-hero__side" aria-label="Fantasyöversikt">
          <article class="fantasy-hero-stat"><span>START</span><strong id="fantasyHeroStart">1 OKT</strong></article>
          <article class="fantasy-hero-stat"><span>STATUS</span><strong id="fantasyHeroStatus" class="is-cyan">SETUP</strong></article>
          <article class="fantasy-hero-stat"><span>BUDGET</span><strong id="fantasyHeroBudget" class="is-gold">100</strong></article>
          <article class="fantasy-hero-stat"><span>LAG</span><strong id="fantasyHeroEntries">0</strong></article>
        </aside>
      </section>

      <nav class="fantasy-tabs" aria-label="Fantasy">
        <button type="button" class="is-active" data-fantasy-tab="team">Mitt lag</button>
        <button type="button" data-fantasy-tab="players">Spelare</button>
        <button type="button" data-fantasy-tab="leaderboard">Topplista</button>
        <button type="button" data-fantasy-tab="rules">Regler</button>
      </nav>

      <section class="fantasy-panel" data-fantasy-panel="team">
        <section id="fantasyGate" class="fantasy-gate">
          <div>
            <p class="directory-kicker">MITT FANTASY-LAG</p>
            <h2 id="fantasyGateTitle">Kontrollerar ditt konto…</h2>
            <p id="fantasyGateText">Du måste vara inloggad med Discord och ha en godkänd spelarprofil kopplad för att skapa ett lag.</p>
            <p id="fantasyGateStatus" class="fantasy-status" role="status"></p>
          </div>
          <div class="fantasy-gate__actions">
            <button id="fantasyDiscordLogin" class="fantasy-primary" type="button">Logga in med Discord</button>
            <a id="fantasyConnectProfile" class="fantasy-secondary" href="#/free-agents" hidden>Koppla spelarprofil</a>
          </div>
        </section>

        <section id="fantasyBuilder" class="fantasy-builder" hidden>
          <div id="fantasySetupBanner" class="fantasy-setup-banner" hidden>
            <div><strong>SCL 27 är under uppbyggnad</strong><br><span>Spelarpool och priser publiceras när SCL 27-rostrarna finns i databasen.</span></div>
          </div>

          <div class="fantasy-builder-top">
            <label class="fantasy-team-name">
              <span>FANTASY-LAGETS NAMN</span>
              <input id="fantasyTeamName" maxlength="40" placeholder="T.ex. eSwahns Dream Team">
            </label>
            <div class="fantasy-mini-stat"><span>VALDA</span><strong id="fantasySelectedCount">0 / 6</strong></div>
            <div class="fantasy-mini-stat"><span>ANVÄNT</span><strong id="fantasyBudgetUsed">0</strong></div>
            <div class="fantasy-mini-stat"><span>KVAR</span><strong id="fantasyBudgetLeft">100</strong></div>
          </div>

          <div class="fantasy-layout">
            <section class="fantasy-rink">
              <div class="fantasy-rink__head"><span>STARTSEXA</span><h3>Din laguppställning</h3></div>
              <div id="fantasyLineup" class="fantasy-lineup">
                <article class="fantasy-slot" data-slot="LW"></article>
                <article class="fantasy-slot" data-slot="C"></article>
                <article class="fantasy-slot" data-slot="RW"></article>
                <article class="fantasy-slot" data-slot="LD"></article>
                <article class="fantasy-slot" data-slot="RD"></article>
                <article class="fantasy-slot" data-slot="G"></article>
              </div>
            </section>

            <section class="fantasy-market">
              <div class="fantasy-market__head"><span>SPELARMARKNAD</span><h3>Välj spelare</h3></div>
              <div class="fantasy-market__filters">
                <label class="fantasy-filter"><span>SÖK</span><input id="fantasyMarketSearch" type="search" placeholder="Gamertag eller lag…"></label>
                <label class="fantasy-filter"><span>POSITION</span><select id="fantasyMarketPosition"><option value="all">Alla</option><option>LW</option><option>C</option><option>RW</option><option>LD</option><option>RD</option><option>G</option></select></label>
              </div>
              <div id="fantasyMarketList" class="fantasy-player-list"></div>
            </section>
          </div>

          <div class="fantasy-builder-actions">
            <p id="fantasySaveStatus" class="fantasy-status" role="status"></p>
            <button id="fantasySaveTeam" class="fantasy-primary" type="button">Spara mitt lag</button>
          </div>
        </section>
      </section>

      <section class="fantasy-panel" data-fantasy-panel="players" hidden>
        <div class="fantasy-section-head">
          <div><p class="directory-kicker">SCL 27 / SPELARPOOL</p><h2>Fantasy-spelare</h2><p>Pris, position, riktigt lag och aktuell ranking.</p></div>
        </div>
        <div class="fantasy-players-filters">
          <label class="fantasy-filter"><span>SÖK</span><input id="fantasyPlayersSearch" type="search" placeholder="Gamertag eller lag…"></label>
          <label class="fantasy-filter"><span>POSITION</span><select id="fantasyPlayersPosition"><option value="all">Alla</option><option>LW</option><option>C</option><option>RW</option><option>LD</option><option>RD</option><option>G</option></select></label>
        </div>
        <div id="fantasyPlayersGrid" class="fantasy-players-grid"></div>
      </section>

      <section class="fantasy-panel" data-fantasy-panel="leaderboard" hidden>
        <div class="fantasy-section-head">
          <div><p class="directory-kicker">GLOBAL TOPPLISTA</p><h2>SCL 27 Fantasy</h2><p>Alla Fantasy-lag rankas på verkliga SCL 27-resultat.</p></div>
        </div>
        <div id="fantasyLeaderboard" class="fantasy-leaderboard"></div>
      </section>

      <section class="fantasy-panel" data-fantasy-panel="rules" hidden>
        <div class="fantasy-section-head">
          <div><p class="directory-kicker">PILOTREGLER</p><h2>Så fungerar SCL 27 Fantasy</h2><p>Poängsystemet är version 1 och kan finjusteras innan tävlingen öppnar.</p></div>
        </div>
        <div class="fantasy-rules-grid">
          <article class="fantasy-rule-card"><span>01 / LAGET</span><h3>Sex spelare</h3><p>LW, C, RW, LD, RD och G. Samma spelare kan bara väljas en gång.</p></article>
          <article class="fantasy-rule-card"><span>02 / BUDGET</span><h3>100 Fantasy Credits</h3><p>Varje spelare får ett pris. Hela startsexan måste rymmas inom budgeten.</p></article>
          <article class="fantasy-rule-card"><span>03 / LAGGRÄNS</span><h3>Max två från samma SCL-lag</h3><p>Du måste sprida valen och kan inte bara plocka en hel verklig förstafemma.</p></article>
          <article class="fantasy-rule-card"><span>04 / KAPTEN</span><h3>1,5× poäng</h3><p>Exakt en spelare utses till kapten och får 50 procent extra Fantasy-poäng.</p></article>
          <article class="fantasy-rule-card">
            <span>05 / POÄNG</span><h3>Första poängmodellen</h3>
            <table class="fantasy-scoring">
              <thead><tr><th>Händelse</th><th>F</th><th>D</th><th>G</th></tr></thead>
              <tbody>
                <tr><td>Spelad match</td><td>+1</td><td>+1</td><td>+1</td></tr>
                <tr><td>Mål</td><td>+5</td><td>+6</td><td>+10</td></tr>
                <tr><td>Assist</td><td>+3</td><td>+4</td><td>+5</td></tr>
                <tr><td>GWG</td><td>+2</td><td>+2</td><td>–</td></tr>
                <tr><td>Block</td><td>–</td><td>+0,25</td><td>–</td></tr>
                <tr><td>Vinst</td><td>–</td><td>–</td><td>+4</td></tr>
                <tr><td>Räddning</td><td>–</td><td>–</td><td>+0,20</td></tr>
                <tr><td>Hållen nolla</td><td>–</td><td>–</td><td>+5</td></tr>
                <tr><td>Insläppt mål</td><td>–</td><td>–</td><td>−0,50</td></tr>
              </tbody>
            </table>
          </article>
          <article class="fantasy-rule-card"><span>06 / ÅTKOMST</span><h3>Discord + kopplad spelarprofil</h3><p>Du kan läsa Fantasy-sidan utan konto, men för att skapa och spara ett lag måste du vara inloggad med Discord och ha en godkänd koppling till ditt spelarkort.</p></article>
        </div>
      </section>
    </main>
  `;

  window.SEH_FANTASY_TEMPLATE = TEMPLATE;

  window.SEH_initFantasy = function SEH_initFantasy() {
    const root = document.querySelector('#spaRouteView[data-route="fantasy"]');
    if (!root) return;

    const $ = (selector) => root.querySelector(selector);
    const $$ = (selector) => [...root.querySelectorAll(selector)];
    const clean = (value) => String(value ?? '').trim();
    const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const fmt = (value, digits = 0) => new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(num(value));

    const state = {
      competition: null,
      pool: [],
      leaderboard: [],
      entry: null,
      picks: new Map(),
      account: null,
      session: null,
      activeTab: 'team'
    };

    const authApi = () => window.SEH_AUTH_API || null;
    const client = () => authApi()?.getClient?.() || null;

    function setStatus(selector, text, tone = '') {
      const el = $(selector);
      if (!el) return;
      el.textContent = text || '';
      if (tone) el.dataset.tone = tone;
      else el.removeAttribute('data-tone');
    }

    function formatDate(value) {
      const raw = clean(value);
      if (!raw) return '–';
      const date = new Date(raw.length === 10 ? raw + 'T12:00:00' : raw);
      if (Number.isNaN(date.valueOf())) return raw;
      return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(date);
    }

    function competitionOpen() {
      const comp = state.competition;
      if (!comp || comp.status !== 'open') return false;
      if (!comp.lock_at) return true;
      return new Date(comp.lock_at).getTime() > Date.now();
    }

    function eligibleSlots(player) {
      const explicit = Array.isArray(player?.eligible_slots)
        ? player.eligible_slots.map((x) => clean(x).toUpperCase()).filter(Boolean)
        : [];
      if (explicit.length) return [...new Set(explicit)];
      const pos = clean(player?.primary_position).toUpperCase();
      if (pos === 'F' || pos === 'FORWARD') return ['LW', 'C', 'RW'];
      if (pos === 'D' || pos === 'DEF' || pos === 'BACK') return ['LD', 'RD'];
      if (['LW', 'C', 'RW', 'LD', 'RD', 'G'].includes(pos)) return [pos];
      return [];
    }

    function selectedIds() {
      return new Set([...state.picks.values()].map((pick) => Number(pick.player.id)));
    }

    function playerById(id) {
      return state.pool.find((row) => Number(row.id) === Number(id)) || null;
    }

    function usedBudget() {
      return [...state.picks.values()].reduce((sum, pick) => sum + num(pick.player.price), 0);
    }

    function teamCount(player) {
      const id = player?.real_team_id;
      if (id == null) return 0;
      return [...state.picks.values()].filter((pick) => String(pick.player.real_team_id) === String(id)).length;
    }

    function renderHero() {
      const comp = state.competition;
      $('#fantasyHeroStart').textContent = comp?.starts_on ? formatDate(comp.starts_on).toUpperCase() : '1 OKT';
      $('#fantasyHeroStatus').textContent = clean(comp?.status || 'setup').toUpperCase();
      $('#fantasyHeroBudget').textContent = fmt(comp?.budget || 100);
      $('#fantasyHeroEntries').textContent = String(state.leaderboard.length || 0);
    }

    function showGate(kind, text) {
      const gate = $('#fantasyGate');
      const builder = $('#fantasyBuilder');
      const login = $('#fantasyDiscordLogin');
      const connect = $('#fantasyConnectProfile');
      if (gate) gate.hidden = false;
      if (builder) builder.hidden = true;
      if (connect) connect.hidden = true;
      if (login) login.hidden = false;

      let title = 'Logga in för att bygga ditt lag';
      if (kind === 'pending') {
        title = 'Spelarkopplingen väntar på godkännande';
        if (login) login.hidden = true;
      } else if (kind === 'unlinked') {
        title = 'Koppla din spelarprofil först';
        if (login) login.hidden = true;
        if (connect) connect.hidden = false;
      } else if (kind === 'wrong-account') {
        title = 'Fantasy använder Discord-inloggning';
      } else if (kind === 'loading') {
        title = 'Kontrollerar ditt konto…';
        if (login) login.hidden = true;
      }
      $('#fantasyGateTitle').textContent = title;
      $('#fantasyGateText').textContent = text || 'Du måste vara inloggad med Discord och ha en godkänd spelarprofil kopplad för att skapa ett lag.';
    }

    function showBuilder() {
      $('#fantasyGate').hidden = true;
      $('#fantasyBuilder').hidden = false;
      const open = competitionOpen();
      const hasPool = state.pool.length > 0;
      $('#fantasySetupBanner').hidden = open && hasPool;
      $('#fantasySaveTeam').disabled = !(open && hasPool);
      if (!hasPool) {
        setStatus('#fantasySaveStatus', 'Spelarpoolen öppnas när SCL 27-rostrarna och priserna är klara.');
      } else if (!open) {
        setStatus('#fantasySaveStatus', 'Lagbygget är inte öppet ännu.');
      } else {
        setStatus('#fantasySaveStatus', '');
      }
    }

    function renderLineup() {
      const budget = num(state.competition?.budget || 100);
      const used = usedBudget();
      const selected = state.picks.size;
      const captainId = [...state.picks.values()].find((pick) => pick.isCaptain)?.player?.id || null;

      $('#fantasySelectedCount').textContent = selected + ' / 6';
      $('#fantasyBudgetUsed').textContent = fmt(used, used % 1 ? 1 : 0);
      $('#fantasyBudgetLeft').textContent = fmt(budget - used, (budget - used) % 1 ? 1 : 0);
      $('#fantasyBudgetLeft').classList.toggle('over-budget', used > budget);

      $$('.fantasy-slot').forEach((slotEl) => {
        const slot = slotEl.dataset.slot;
        const pick = state.picks.get(slot);
        if (!pick) {
          slotEl.innerHTML = '<span class="fantasy-slot__position">' + slot + '</span><div class="fantasy-slot__empty">Välj ' + slot + '</div>';
          return;
        }
        const p = pick.player;
        const captain = Number(captainId) === Number(p.id);
        slotEl.innerHTML = `
          <span class="fantasy-slot__position">${slot}</span>
          <div class="fantasy-slot__player">
            <strong>${escapeHtml(clean(p.display_gamertag) || 'Okänd')}</strong>
            <small>${escapeHtml(clean(p.real_team_name) || 'Lag ej klart')} · ${fmt(p.price, num(p.price) % 1 ? 1 : 0)}</small>
            <div class="fantasy-slot__actions">
              <button type="button" data-fantasy-captain="${p.id}" class="${captain ? 'is-captain' : ''}">${captain ? 'KAPTEN' : 'Gör kapten'}</button>
              <button type="button" data-fantasy-remove="${slot}">Ta bort</button>
            </div>
          </div>
        `;
      });
    }

    function filteredPlayers(searchSelector, positionSelector) {
      const query = clean($(searchSelector)?.value).toLocaleLowerCase('sv-SE');
      const position = clean($(positionSelector)?.value || 'all').toUpperCase();
      return state.pool
        .filter((p) => p.is_available !== false)
        .filter((p) => {
          if (position !== 'ALL' && !eligibleSlots(p).includes(position)) return false;
          if (!query) return true;
          return [p.display_gamertag, p.real_team_name, p.primary_position]
            .join(' ')
            .toLocaleLowerCase('sv-SE')
            .includes(query);
        })
        .sort((a, b) => num(b.price) - num(a.price) || clean(a.display_gamertag).localeCompare(clean(b.display_gamertag), 'sv'));
    }

    function renderMarket() {
      const host = $('#fantasyMarketList');
      if (!host) return;
      const rows = filteredPlayers('#fantasyMarketSearch', '#fantasyMarketPosition');
      const selected = selectedIds();
      if (!state.pool.length) {
        host.innerHTML = '<div class="fantasy-empty">Spelarpoolen är inte publicerad ännu.</div>';
        return;
      }
      host.innerHTML = rows.map((p) => {
        const isSelected = selected.has(Number(p.id));
        return `
          <article class="fantasy-player-row">
            <div class="fantasy-player-row__main">
              <strong>${escapeHtml(p.display_gamertag)}</strong>
              <small>${escapeHtml(clean(p.real_team_name) || 'Lag ej klart')} · ${escapeHtml(eligibleSlots(p).join('/') || clean(p.primary_position) || '–')}${p.ranking_position ? ' · #' + p.ranking_position : ''}</small>
            </div>
            <div class="fantasy-player-row__price"><b>${fmt(p.price, num(p.price) % 1 ? 1 : 0)}</b><span>CR</span></div>
            <button type="button" data-fantasy-add="${p.id}" ${isSelected || !competitionOpen() ? 'disabled' : ''}>${isSelected ? 'Vald' : 'Lägg till'}</button>
          </article>
        `;
      }).join('') || '<div class="fantasy-empty">Inga spelare matchar filtret.</div>';
    }

    function renderPlayers() {
      const host = $('#fantasyPlayersGrid');
      if (!host) return;
      const rows = filteredPlayers('#fantasyPlayersSearch', '#fantasyPlayersPosition');
      if (!state.pool.length) {
        host.innerHTML = '<div class="fantasy-empty">SCL 27-spelarpoolen publiceras när rostrarna är klara.</div>';
        return;
      }
      host.innerHTML = rows.map((p) => `
        <article class="fantasy-player-card">
          <div class="fantasy-player-card__top"><span>${escapeHtml(eligibleSlots(p).join('/') || clean(p.primary_position) || '–')}</span><b>${fmt(p.price, num(p.price) % 1 ? 1 : 0)} CR</b></div>
          <h3>${escapeHtml(p.display_gamertag)}</h3>
          <p>${escapeHtml(clean(p.real_team_name) || 'Lag ej klart')}</p>
          <footer><span>${p.ranking_position ? '#' + p.ranking_position + ' RP' : 'Ej rankad'}</span><span>${p.ranking_points ? fmt(p.ranking_points) + ' RP' : ''}</span></footer>
        </article>
      `).join('') || '<div class="fantasy-empty">Inga spelare matchar filtret.</div>';
    }

    function renderLeaderboard() {
      const host = $('#fantasyLeaderboard');
      if (!host) return;
      if (!state.leaderboard.length) {
        host.innerHTML = '<div class="fantasy-empty">Topplistan är tom. Den fylls när Fantasy-lag börjar skapas.</div>';
        return;
      }
      const rows = [...state.leaderboard].sort((a, b) => num(b.total_points) - num(a.total_points) || num(a.entry_id) - num(b.entry_id));
      host.innerHTML = rows.map((row, index) => `
        <article class="fantasy-leaderboard-row">
          <span>#${row.current_rank || index + 1}</span>
          <strong>${escapeHtml(row.team_name || 'Namnlöst lag')}</strong>
          <b>${fmt(row.total_points, num(row.total_points) % 1 ? 1 : 0)} P</b>
        </article>
      `).join('');
    }

    function renderAll() {
      renderHero();
      renderLineup();
      renderMarket();
      renderPlayers();
      renderLeaderboard();
    }

    function addPlayer(id) {
      const player = playerById(id);
      if (!player || state.picks.size >= 6) return;
      if (teamCount(player) >= num(state.competition?.max_players_per_real_team || 2)) {
        setStatus('#fantasySaveStatus', 'Du får välja högst ' + (state.competition?.max_players_per_real_team || 2) + ' spelare från samma riktiga lag.', 'error');
        return;
      }
      const slot = eligibleSlots(player).find((candidate) => !state.picks.has(candidate));
      if (!slot) {
        setStatus('#fantasySaveStatus', 'Det finns ingen ledig position för ' + player.display_gamertag + '.', 'error');
        return;
      }
      state.picks.set(slot, { player, isCaptain: false });
      setStatus('#fantasySaveStatus', '');
      renderAll();
    }

    function removePlayer(slot) {
      state.picks.delete(slot);
      renderAll();
    }

    function setCaptain(id) {
      for (const [slot, pick] of state.picks.entries()) {
        state.picks.set(slot, { ...pick, isCaptain: Number(pick.player.id) === Number(id) });
      }
      renderLineup();
    }

    async function loadPublic() {
      const sb = client();
      if (!sb) throw new Error('Supabase kunde inte startas.');
      const compResult = await sb.from('ehockey_fantasy_competitions').select('*').eq('code', 'SCL27').maybeSingle();
      if (compResult.error) throw compResult.error;
      state.competition = compResult.data || null;
      if (!state.competition) throw new Error('SCL 27 Fantasy är inte konfigurerad.');

      const [poolResult, leaderboardResult] = await Promise.all([
        sb.from('ehockey_fantasy_player_pool').select('*').eq('competition_id', state.competition.id).order('price', { ascending: false }).order('display_gamertag', { ascending: true }),
        sb.from('v_ehockey_fantasy_leaderboard').select('*').eq('competition_id', state.competition.id).order('total_points', { ascending: false }).limit(100)
      ]);
      if (poolResult.error) throw poolResult.error;
      if (leaderboardResult.error) throw leaderboardResult.error;
      state.pool = poolResult.data || [];
      state.leaderboard = leaderboardResult.data || [];
      renderAll();
    }

    async function loadMyEntry() {
      const sb = client();
      const session = state.session;
      if (!sb || !session?.user || !state.competition) return;
      const entryResult = await sb.from('ehockey_fantasy_entries')
        .select('*')
        .eq('competition_id', state.competition.id)
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (entryResult.error) throw entryResult.error;
      state.entry = entryResult.data || null;
      state.picks.clear();
      if (!state.entry) {
        if (!clean($('#fantasyTeamName').value)) {
          $('#fantasyTeamName').value = state.account?.playerName ? state.account.playerName + ' Fantasy' : '';
        }
        renderAll();
        return;
      }
      $('#fantasyTeamName').value = state.entry.team_name || '';
      const picksResult = await sb.from('ehockey_fantasy_entry_players')
        .select('pool_player_id,slot,is_captain,locked_price')
        .eq('entry_id', state.entry.id);
      if (picksResult.error) throw picksResult.error;
      for (const row of picksResult.data || []) {
        const player = playerById(row.pool_player_id);
        if (player) state.picks.set(row.slot, { player, isCaptain: Boolean(row.is_captain), lockedPrice: row.locked_price });
      }
      renderAll();
    }

    async function resolveAccess() {
      const api = authApi();
      const sb = client();
      if (!api || !sb) {
        showGate('logged-out', 'Inloggningen kunde inte startas.');
        return;
      }
      showGate('loading', 'Kontrollerar Discord och spelarprofil…');
      await api.initialize?.();
      const authState = api.getState?.() || {};
      let session = authState.session || null;
      if (!session?.user) {
        const sessionResult = await sb.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        session = sessionResult.data?.session || null;
      }
      state.session = session;
      if (!session?.user) {
        showGate('logged-out');
        return;
      }
      if (!api.isDiscordUser?.(session.user)) {
        showGate('wrong-account', 'Du är inloggad med ett admin-/skribentkonto. Logga in med Discord för att skapa ett Fantasy-lag.');
        return;
      }

      let account = authState.playerAccount || null;
      if (!account || account.status === 'unknown') {
        account = await api.resolvePlayerAccount?.(sb, session.user);
        if (authState && account) authState.playerAccount = account;
      }
      state.account = account;

      if (account?.status === 'pending') {
        showGate('pending', 'Din valda spelarprofil måste godkännas av admin innan du kan skapa ett Fantasy-lag.');
        return;
      }
      if (account?.status !== 'approved' || !clean(account?.playerKey)) {
        showGate('unlinked', 'Discord-kontot är inloggat, men du har ännu ingen godkänd spelarprofil kopplad.');
        return;
      }

      showBuilder();
      await loadMyEntry();
    }

    async function discordLogin() {
      const sb = client();
      if (!sb) return;
      setStatus('#fantasyGateStatus', 'Öppnar Discord…', 'working');
      try {
        const existing = await sb.auth.getSession();
        if (existing.data?.session && !authApi()?.isDiscordUser?.(existing.data.session.user)) {
          await sb.auth.signOut();
        }
        localStorage.setItem('seh_oauth_return', '#/fantasy');
        const redirectTo = window.location.origin + window.location.pathname;
        const { error } = await sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo } });
        if (error) throw error;
      } catch (error) {
        localStorage.removeItem('seh_oauth_return');
        setStatus('#fantasyGateStatus', 'Fel: ' + (error?.message || error), 'error');
      }
    }

    async function saveTeam() {
      const sb = client();
      if (!sb) return;
      const name = clean($('#fantasyTeamName').value);
      const budget = num(state.competition?.budget || 100);
      if (!competitionOpen()) {
        setStatus('#fantasySaveStatus', 'Lagbygget är inte öppet ännu.', 'error');
        return;
      }
      if (state.picks.size !== 6) {
        setStatus('#fantasySaveStatus', 'Välj alla sex positioner innan du sparar.', 'error');
        return;
      }
      if (usedBudget() > budget) {
        setStatus('#fantasySaveStatus', 'Laget är över budget.', 'error');
        return;
      }
      const captains = [...state.picks.values()].filter((pick) => pick.isCaptain);
      if (captains.length !== 1) {
        setStatus('#fantasySaveStatus', 'Välj exakt en kapten.', 'error');
        return;
      }
      if (name.length < 2) {
        setStatus('#fantasySaveStatus', 'Ge Fantasy-laget ett namn.', 'error');
        $('#fantasyTeamName').focus();
        return;
      }

      const button = $('#fantasySaveTeam');
      button.disabled = true;
      setStatus('#fantasySaveStatus', 'Sparar laget…', 'working');
      try {
        const picks = [...state.picks.entries()].map(([slot, pick]) => ({
          pool_player_id: pick.player.id,
          slot,
          is_captain: Boolean(pick.isCaptain)
        }));
        const { data, error } = await sb.rpc('seh_fantasy_save_my_team', {
          p_competition_code: 'SCL27',
          p_team_name: name,
          p_picks: picks
        });
        if (error) throw error;
        state.entry = data || state.entry;
        setStatus('#fantasySaveStatus', 'Laget är sparat.', 'success');
        await loadMyEntry();
      } catch (error) {
        setStatus('#fantasySaveStatus', 'Fel: ' + (error?.message || error), 'error');
      } finally {
        button.disabled = !competitionOpen();
      }
    }

    function switchTab(tab) {
      const allowed = new Set(['team', 'players', 'leaderboard', 'rules']);
      state.activeTab = allowed.has(tab) ? tab : 'team';
      $$('[data-fantasy-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.fantasyTab === state.activeTab));
      $$('[data-fantasy-panel]').forEach((panel) => { panel.hidden = panel.dataset.fantasyPanel !== state.activeTab; });
    }

    root.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-fantasy-tab]');
      if (tab) { switchTab(tab.dataset.fantasyTab); return; }
      const add = event.target.closest('[data-fantasy-add]');
      if (add) { addPlayer(add.dataset.fantasyAdd); return; }
      const remove = event.target.closest('[data-fantasy-remove]');
      if (remove) { removePlayer(remove.dataset.fantasyRemove); return; }
      const captain = event.target.closest('[data-fantasy-captain]');
      if (captain) { setCaptain(captain.dataset.fantasyCaptain); return; }
    });

    $('#fantasyDiscordLogin')?.addEventListener('click', discordLogin);
    $('#fantasySaveTeam')?.addEventListener('click', saveTeam);
    ['#fantasyMarketSearch', '#fantasyMarketPosition'].forEach((selector) => $(selector)?.addEventListener(selector.includes('Search') ? 'input' : 'change', renderMarket));
    ['#fantasyPlayersSearch', '#fantasyPlayersPosition'].forEach((selector) => $(selector)?.addEventListener(selector.includes('Search') ? 'input' : 'change', renderPlayers));

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    switchTab('team');
    (async () => {
      try {
        await loadPublic();
        await resolveAccess();
      } catch (error) {
        console.error('SCL 27 Fantasy kunde inte laddas', error);
        setStatus('#fantasyGateStatus', 'Fel: ' + (error?.message || error), 'error');
        const players = $('#fantasyPlayersGrid');
        if (players && !players.children.length) players.innerHTML = '<div class="fantasy-empty">Fantasy-data kunde inte hämtas just nu.</div>';
      }
    })();
  };
})();
