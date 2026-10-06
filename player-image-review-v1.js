(() => {
  'use strict';

  const BUCKET_PRIVATE = 'player-image-submissions';
  const BUCKET_PUBLIC = 'player-profile-images';
  const MAX_SIZE = 8 * 1024 * 1024;
  const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
  let adminRefreshTimer = 0;
  let adminBusy = false;

  const clean = (value) => String(value ?? '').trim();
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function client() {
    return typeof window.sehGetAuthClient === 'function' ? window.sehGetAuthClient() : null;
  }

  function setStatus(root, text, tone = '') {
    const node = root?.querySelector('#myProfileFormStatus');
    if (!node) return;
    node.textContent = text || '';
    if (tone) node.dataset.tone = tone;
    else node.removeAttribute('data-tone');
  }

  function validateImage(file) {
    if (!file) return;
    if (!ALLOWED.has(file.type)) throw new Error('Bilden måste vara JPG, PNG eller WEBP.');
    if (file.size <= 0 || file.size > MAX_SIZE) throw new Error('Bilden får vara högst 8 MB.');
  }

  function extensionFor(file) {
    const ext = (file?.name?.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext;
    if (file?.type === 'image/png') return 'png';
    if (file?.type === 'image/webp') return 'webp';
    return 'jpg';
  }

  async function uploadPrivateOriginal(sb, file) {
    validateImage(file);
    const sessionResult = await sb.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const userId = sessionResult.data?.session?.user?.id;
    if (!userId) throw new Error('Discord-sessionen saknas.');

    const path = `submissions/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extensionFor(file)}`;
    const upload = await sb.storage.from(BUCKET_PRIVATE).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
    if (upload.error) throw upload.error;

    const submit = await sb.rpc('seh_submit_player_image_request', {
      p_original_path: path,
      p_original_filename: file.name,
      p_mime_type: file.type,
      p_size_bytes: file.size
    });
    if (submit.error) {
      try { await sb.storage.from(BUCKET_PRIVATE).remove([path]); } catch (_) {}
      throw submit.error;
    }
    return submit.data;
  }

  function profilePayload(root, currentProfile) {
    return {
      presentation: clean(root.querySelector('#myProfilePresentation')?.value),
      positions_text: clean(root.querySelector('#myProfilePositions')?.value),
      availability_status: clean(root.querySelector('#myProfileAvailability')?.value),
      team_status: clean(root.querySelector('#myProfileTeamStatus')?.value),
      contact: clean(root.querySelector('#myProfileContact')?.value),
      twitch_url: clean(root.querySelector('#myProfileTwitch')?.value),
      x_url: clean(root.querySelector('#myProfileX')?.value),
      instagram_url: clean(root.querySelector('#myProfileInstagram')?.value),
      image_url: clean(currentProfile?.image_url)
    };
  }

  function hasProfileChanges(payload, currentProfile) {
    return [
      'presentation', 'positions_text', 'availability_status', 'team_status',
      'contact', 'twitch_url', 'x_url', 'instagram_url'
    ].some((key) => clean(payload[key]) !== clean(currentProfile?.[key]));
  }

  async function submitMyProfile(root) {
    const sb = client();
    if (!sb) throw new Error('Supabase kunde inte startas.');
    const button = root.querySelector('#myProfileSubmit');
    if (button) button.disabled = true;
    setStatus(root, 'Skickar till admin…', 'working');

    try {
      const dash = await sb.rpc('seh_get_my_player_dashboard');
      if (dash.error) throw dash.error;
      const dashboard = Array.isArray(dash.data) ? (dash.data[0] || {}) : (dash.data || {});
      const currentProfile = dashboard.profile || {};
      const payload = profilePayload(root, currentProfile);
      const file = root.querySelector('#myProfileImage')?.files?.[0] || null;
      const textChanged = hasProfileChanges(payload, currentProfile);

      if (!file && !textChanged) {
        setStatus(root, 'Inga nya ändringar att skicka.');
        return;
      }

      if (file) await uploadPrivateOriginal(sb, file);

      if (textChanged) {
        const result = await sb.rpc('seh_submit_player_profile_request', {
          p_request_type: 'profile_update',
          p_payload: payload
        });
        if (result.error) throw result.error;
      }

      const input = root.querySelector('#myProfileImage');
      const preview = root.querySelector('#myProfileImagePreview');
      if (input) input.value = '';
      if (preview) {
        preview.hidden = true;
        preview.removeAttribute('src');
      }

      if (file && textChanged) {
        setStatus(root, 'Profiländringarna är skickade. Originalbilden ligger privat i bildkön tills admin har redigerat och publicerat den.', 'success');
      } else if (file) {
        setStatus(root, 'Originalbilden är skickad privat till bildkön. Den blir inte publik förrän admin har redigerat och publicerat den.', 'success');
      } else {
        setStatus(root, 'Profiländringarna är skickade och blir publika först efter admin-godkännande.', 'success');
      }

      await renderMyImageState(root, sb);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function renderMyImageState(root, sb = client()) {
    if (!root || !sb) return;
    let note = root.querySelector('#myProfileImageQueueState');
    const imageBox = root.querySelector('.my-profile-image-submit');
    if (!imageBox) return;

    const strong = imageBox.querySelector('strong');
    const small = imageBox.querySelector('small');
    const fileLabel = imageBox.querySelector('.my-profile-file span');
    if (strong) strong.textContent = 'Ladda upp originalbild';
    if (small) small.textContent = 'Originalet sparas privat. Admin redigerar bilden innan den publiceras på din spelarprofil.';
    if (fileLabel) fileLabel.textContent = 'Välj originalbild';

    if (!note) {
      note = document.createElement('div');
      note.id = 'myProfileImageQueueState';
      note.className = 'player-image-queue-state';
      imageBox.append(note);
    }

    try {
      const result = await sb.rpc('seh_get_my_player_image_requests');
      if (result.error) throw result.error;
      const rows = Array.isArray(result.data) ? result.data : [];
      const latest = rows[0] || null;
      const active = rows.find((row) => ['pending', 'editing'].includes(row.status));
      if (!active) {
        if (latest?.status === 'published') {
          note.textContent = 'Din senaste spelarbild är publicerad på din profil.';
          note.dataset.state = 'published';
        } else if (latest?.status === 'rejected') {
          note.textContent = latest.admin_note
            ? `Din senaste bild avslogs: ${latest.admin_note}`
            : 'Din senaste spelarbild blev avslagen av admin.';
          note.dataset.state = 'rejected';
        } else {
          note.textContent = 'Ingen spelarbild väntar på behandling.';
          note.dataset.state = 'idle';
        }
        return;
      }
      note.textContent = active.status === 'editing'
        ? 'Din senaste bild är hos admin och redigeras.'
        : 'Din senaste bild väntar på admin och är inte publik.';
      note.dataset.state = active.status;
    } catch (_) {
      note.textContent = '';
      note.dataset.state = 'idle';
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('#myProfileSubmit');
    if (!button) return;
    const root = button.closest('#spaRouteView[data-route="myProfile"]');
    if (!root) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitMyProfile(root).catch((error) => {
      setStatus(root, `Fel: ${error?.message || error}`, 'error');
      button.disabled = false;
    });
  }, true);

  async function currentWriterIsAdmin(sb) {
    const result = await sb.rpc('seh_current_writer');
    if (result.error) return false;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return clean(row?.role).toLowerCase() === 'admin';
  }

  function adminStatus(text, tone = '') {
    const node = document.querySelector('#playerImageAdminStatus');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.tone = tone;
  }

  async function setImageStatus(sb, id, status) {
    adminStatus(status === 'editing' ? 'Markerar bilden som under redigering…' : 'Avslår bildärendet…', 'working');
    const result = await sb.rpc('seh_admin_set_player_image_status', {
      p_request_id: Number(id),
      p_status: status,
      p_admin_note: null
    });
    if (result.error) throw result.error;
    await renderAdminQueue(true);
    adminStatus(status === 'editing' ? 'Bildärendet är markerat som under redigering.' : 'Bildärendet är avslaget.', 'success');
  }

  async function publishEditedImage(sb, row, file) {
    validateImage(file);
    adminStatus('Laddar upp den färdigredigerade bilden…', 'working');
    const safeKey = clean(row.player_key).replace(/[^a-z0-9_-]/gi, '_') || 'player';
    const finalPath = `published/${safeKey}/${Date.now()}.${extensionFor(file)}`;
    const upload = await sb.storage.from(BUCKET_PUBLIC).upload(finalPath, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type
    });
    if (upload.error) throw upload.error;

    const publicUrl = sb.storage.from(BUCKET_PUBLIC).getPublicUrl(finalPath).data.publicUrl;
    const publish = await sb.rpc('seh_admin_publish_player_image', {
      p_request_id: Number(row.id),
      p_final_path: finalPath,
      p_public_url: publicUrl
    });
    if (publish.error) {
      try { await sb.storage.from(BUCKET_PUBLIC).remove([finalPath]); } catch (_) {}
      throw publish.error;
    }

    await renderAdminQueue(true);
    adminStatus('Den redigerade spelarbilden är publicerad på spelarprofilen.', 'success');
  }

  function directAdminStatus(section, text, tone = '') {
    const node = section?.querySelector('#playerImageDirectStatus');
    if (!node) return;
    node.textContent = text || '';
    if (tone) node.dataset.tone = tone;
    else node.removeAttribute('data-tone');
  }

  async function publishDirectPlayerImage(sb, section, player, file) {
    validateImage(file);
    if (!player?.player_key) throw new Error('Välj en spelare först.');

    const button = section.querySelector('[data-direct-publish]');
    if (button) button.disabled = true;
    directAdminStatus(section, 'Laddar upp och publicerar spelarbilden…', 'working');

    const safeKey = clean(player.player_key).replace(/[^a-z0-9_-]/gi, '_') || 'player';
    const finalPath = `published/${safeKey}/${Date.now()}.${extensionFor(file)}`;
    const upload = await sb.storage.from(BUCKET_PUBLIC).upload(finalPath, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type
    });
    if (upload.error) {
      if (button) button.disabled = false;
      throw upload.error;
    }

    const publicUrl = sb.storage.from(BUCKET_PUBLIC).getPublicUrl(finalPath).data.publicUrl;
    const publish = await sb.rpc('seh_admin_publish_player_image_direct', {
      p_player_key: player.player_key,
      p_final_path: finalPath,
      p_public_url: publicUrl
    });
    if (publish.error) {
      try { await sb.storage.from(BUCKET_PUBLIC).remove([finalPath]); } catch (_) {}
      if (button) button.disabled = false;
      throw publish.error;
    }

    const selectedPreview = section.querySelector('[data-direct-selected-preview]');
    if (selectedPreview) {
      selectedPreview.src = publicUrl;
      selectedPreview.hidden = false;
    }
    const fileInput = section.querySelector('[data-direct-file]');
    if (fileInput) fileInput.value = '';
    const filePreview = section.querySelector('[data-direct-file-preview]');
    if (filePreview) {
      filePreview.hidden = true;
      filePreview.removeAttribute('src');
    }
    if (button) button.disabled = true;
    directAdminStatus(section, `${player.display_gamertag || 'Spelaren'} har fått den nya bilden publicerad.`, 'success');
  }

  function ensureDirectAdminUpload(panel, sb) {
    let section = panel.querySelector('#playerImageDirectUpload');
    if (section) return section;

    section = document.createElement('section');
    section.id = 'playerImageDirectUpload';
    section.className = 'player-image-admin-direct';
    section.innerHTML = `
      <div class="player-image-admin-direct__head">
        <div>
          <span>PUBLICERA SPELARBILD MANUELLT</span>
          <h3>Välj spelare och ladda upp färdig bild</h3>
        </div>
        <small>ADMIN</small>
      </div>
      <p class="player-image-admin-direct__help">För färdigredigerade bilder som inte kommer via spelarens egen bildkö. Bilden blir publik direkt och används på spelarprofil, Free Agents, Fantasy, lagbygge och Match Graphics.</p>
      <div class="player-image-admin-direct__search">
        <label>
          <span>Spelare</span>
          <input type="search" data-direct-search autocomplete="off" placeholder="Sök gamertag eller SportsGamer-ID…">
        </label>
        <div class="player-image-admin-direct__results" data-direct-results hidden></div>
      </div>
      <div class="player-image-admin-direct__selected" data-direct-selected hidden>
        <img data-direct-selected-preview alt="" hidden>
        <div>
          <small>VALD SPELARE</small>
          <strong data-direct-selected-name></strong>
          <span data-direct-selected-meta></span>
        </div>
        <button type="button" class="writer-secondary" data-direct-change>Byt spelare</button>
      </div>
      <div class="player-image-admin-direct__upload">
        <label class="my-profile-file">
          <input type="file" data-direct-file accept="image/jpeg,image/png,image/webp">
          <span>Välj färdig bild</span>
        </label>
        <img data-direct-file-preview class="player-image-admin-direct__preview" alt="Förhandsvisning av ny spelarbild" hidden>
      </div>
      <div class="player-image-admin-direct__actions">
        <button type="button" data-direct-publish disabled>Publicera bild</button>
        <p id="playerImageDirectStatus" class="admin-status" role="status"></p>
      </div>`;

    const queue = panel.querySelector('#playerImageAdminQueue');
    const regular = panel.querySelector('#profileAdminRequests');
    panel.insertBefore(section, queue || regular || null);

    const search = section.querySelector('[data-direct-search]');
    const results = section.querySelector('[data-direct-results]');
    const selectedBox = section.querySelector('[data-direct-selected]');
    const selectedName = section.querySelector('[data-direct-selected-name]');
    const selectedMeta = section.querySelector('[data-direct-selected-meta]');
    const selectedPreview = section.querySelector('[data-direct-selected-preview]');
    const fileInput = section.querySelector('[data-direct-file]');
    const filePreview = section.querySelector('[data-direct-file-preview]');
    const publishButton = section.querySelector('[data-direct-publish]');
    let selectedPlayer = null;
    let searchTimer = 0;
    let fileObjectUrl = '';

    const updatePublishState = () => {
      publishButton.disabled = !(selectedPlayer?.player_key && fileInput?.files?.[0]);
    };

    const clearResults = () => {
      results.replaceChildren();
      results.hidden = true;
    };

    const choosePlayer = (player) => {
      selectedPlayer = player;
      selectedBox.hidden = false;
      selectedName.textContent = player.display_gamertag || player.player_key || 'Okänd spelare';
      selectedMeta.textContent = [
        clean(player.player_country).toUpperCase(),
        player.sports_gamer_player_id ? `SG #${player.sports_gamer_player_id}` : ''
      ].filter(Boolean).join(' · ');
      const currentUrl = clean(player.image_url);
      if (currentUrl) {
        selectedPreview.src = currentUrl;
        selectedPreview.alt = `Nuvarande bild för ${selectedName.textContent}`;
        selectedPreview.hidden = false;
      } else {
        selectedPreview.hidden = true;
        selectedPreview.removeAttribute('src');
      }
      search.value = player.display_gamertag || '';
      clearResults();
      directAdminStatus(section, currentUrl ? 'Spelaren har redan en publicerad bild. En ny uppladdning ersätter den.' : '');
      updatePublishState();
    };

    const runSearch = async () => {
      const query = clean(search.value);
      if (query.length < 2) {
        clearResults();
        return;
      }

      results.hidden = false;
      results.innerHTML = '<span class="player-image-admin-direct__loading">Söker…</span>';
      const response = await sb.rpc('seh_admin_search_players', { p_query: query });
      if (response.error) throw response.error;
      const rows = Array.isArray(response.data) ? response.data : [];

      results.replaceChildren();
      if (!rows.length) {
        const empty = document.createElement('span');
        empty.className = 'player-image-admin-direct__loading';
        empty.textContent = 'Ingen spelare hittades.';
        results.append(empty);
        return;
      }

      rows.forEach((player) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'player-image-admin-direct__result';
        const meta = [
          clean(player.player_country).toUpperCase(),
          player.sports_gamer_player_id ? `SG #${player.sports_gamer_player_id}` : '',
          clean(player.image_url) ? 'Har bild' : 'Ingen publicerad bild'
        ].filter(Boolean).join(' · ');
        button.innerHTML = `<strong>${esc(player.display_gamertag || player.player_key)}</strong><small>${esc(meta)}</small>`;
        button.addEventListener('click', () => choosePlayer(player));
        results.append(button);
      });
    };

    search.addEventListener('input', () => {
      selectedPlayer = null;
      selectedBox.hidden = true;
      updatePublishState();
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        runSearch().catch((error) => {
          clearResults();
          directAdminStatus(section, 'Fel vid spelarsökning: ' + (error?.message || error), 'error');
        });
      }, 220);
    });

    section.querySelector('[data-direct-change]')?.addEventListener('click', () => {
      selectedPlayer = null;
      selectedBox.hidden = true;
      search.value = '';
      search.focus();
      updatePublishState();
      directAdminStatus(section, '');
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0] || null;
      if (fileObjectUrl) {
        URL.revokeObjectURL(fileObjectUrl);
        fileObjectUrl = '';
      }
      if (!file) {
        filePreview.hidden = true;
        filePreview.removeAttribute('src');
        updatePublishState();
        return;
      }
      try {
        validateImage(file);
        fileObjectUrl = URL.createObjectURL(file);
        filePreview.src = fileObjectUrl;
        filePreview.hidden = false;
        directAdminStatus(section, '');
      } catch (error) {
        fileInput.value = '';
        filePreview.hidden = true;
        directAdminStatus(section, 'Fel: ' + (error?.message || error), 'error');
      }
      updatePublishState();
    });

    publishButton.addEventListener('click', () => {
      const file = fileInput.files?.[0] || null;
      if (!selectedPlayer) {
        directAdminStatus(section, 'Välj en spelare först.', 'error');
        return;
      }
      if (!file) {
        directAdminStatus(section, 'Välj en färdig bild först.', 'error');
        return;
      }
      publishDirectPlayerImage(sb, section, selectedPlayer, file).catch((error) => {
        publishButton.disabled = false;
        directAdminStatus(section, 'Fel: ' + (error?.message || error), 'error');
      });
    });

    return section;
  }

  function updateAdminCounts(imageCount) {
    const safeCount = Number.isFinite(Number(imageCount)) ? Number(imageCount) : 0;
    window.SEH_playerImagePendingCount = safeCount;
    if (typeof window.SEH_refreshPlayerAdminCounters === 'function') {
      window.SEH_refreshPlayerAdminCounters();
      return;
    }

    const links = document.querySelectorAll('#faAdminLinkRequests > article').length;
    const fa = document.querySelectorAll('#faAdminRequests > article').length;
    const profiles = document.querySelectorAll('#profileAdminRequests > article').length;
    const profileTotal = profiles + safeCount;
    const total = links + fa + profileTotal;
    const set = (id, value) => { const n = document.getElementById(id); if (n) n.textContent = String(value); };
    set('profileAdminRequestCount', profileTotal);
    set('adminPlayerPendingTotal', total);
    set('playerAdminTabQueueCount', total);
    set('playerAdminFilterAll', total);
    set('playerAdminFilterProfiles', profileTotal);
  }

  async function renderAdminQueue(force = false) {
    if (adminBusy && !force) return;
    const panel = document.querySelector('[data-admin-queue="profiles"]');
    if (!panel) return;
    const sb = client();
    if (!sb) return;
    adminBusy = true;
    try {
      if (!await currentWriterIsAdmin(sb)) return;
      ensureDirectAdminUpload(panel, sb);
      const result = await sb.rpc('seh_admin_list_player_image_requests');
      if (result.error) throw result.error;
      const rows = Array.isArray(result.data) ? result.data : [];
      window.SEH_playerImagePendingKeys = rows.map((row) => `image:${row.id}`);

      let section = panel.querySelector('#playerImageAdminQueue');
      if (!section) {
        section = document.createElement('section');
        section.id = 'playerImageAdminQueue';
        section.className = 'player-image-admin-queue';
        const regular = panel.querySelector('#profileAdminRequests');
        panel.insertBefore(section, regular || null);
      }
      section.replaceChildren();

      const head = document.createElement('div');
      head.className = 'player-image-admin-head';
      head.innerHTML = `<div><span>SPELARBILDER</span><strong>${rows.length}</strong></div><p>Originalen är privata. Redigera bilden först och ladda sedan upp den färdiga versionen här.</p><p id="playerImageAdminStatus" class="admin-status" role="status"></p>`;
      section.append(head);

      if (!rows.length) {
        const empty = document.createElement('p');
        empty.className = 'fa-admin-empty';
        empty.textContent = 'Inga spelarbildsärenden väntar.';
        section.append(empty);
        updateAdminCounts(0);
        return;
      }

      for (const row of rows) {
        const signed = await sb.storage.from(BUCKET_PRIVATE).createSignedUrl(row.original_path, 3600);
        const signedUrl = signed.data?.signedUrl || '';
        const article = document.createElement('article');
        article.className = 'profile-admin-request-card player-image-admin-card';
        article.dataset.playerImageRequest = String(row.id);
        const when = row.submitted_at ? new Date(row.submitted_at).toLocaleString('sv-SE', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
        article.innerHTML = `
          <header class="profile-admin-request-card__head">
            <div>
              <span class="profile-admin-type">SPELARBILD · ${row.status === 'editing' ? 'REDIGERAS' : 'NY'}</span>
              <a class="profile-admin-player-link" href="#/spelare/${encodeURIComponent(row.player_key || '')}">${esc(row.display_gamertag || row.player_key)} ↗</a>
              <small>${esc(when)} · ${esc(row.original_filename || 'originalbild')}</small>
            </div>
            <span class="profile-admin-waiting">${row.status === 'editing' ? 'Under redigering' : 'Väntar'}</span>
          </header>
          <div class="player-image-admin-workflow">
            <div>
              <small>1 · ORIGINAL</small>
              ${signedUrl ? `<a class="profile-admin-image-preview" href="${esc(signedUrl)}" target="_blank" rel="noopener"><img src="${esc(signedUrl)}" alt="Inskickad originalbild"><span>Öppna original ↗</span></a>` : '<p>Originalbilden kunde inte öppnas.</p>'}
            </div>
            <i aria-hidden="true">→</i>
            <div>
              <small>2 · FÄRDIGREDIGERAD BILD</small>
              <label class="my-profile-file"><input type="file" data-final-image accept="image/jpeg,image/png,image/webp"><span>Välj färdig bild</span></label>
            </div>
          </div>
          <footer class="profile-admin-request-card__footer">
            <button type="button" data-publish>Publicera färdig bild</button>
            ${row.status !== 'editing' ? '<button type="button" class="writer-secondary" data-editing>Markera redigeras</button>' : ''}
            <button type="button" class="writer-secondary" data-reject>Avslå</button>
          </footer>`;

        article.querySelector('[data-editing]')?.addEventListener('click', () => {
          setImageStatus(sb, row.id, 'editing').catch((error) => adminStatus('Fel: ' + (error?.message || error), 'error'));
        });
        article.querySelector('[data-reject]')?.addEventListener('click', () => {
          setImageStatus(sb, row.id, 'rejected').catch((error) => adminStatus('Fel: ' + (error?.message || error), 'error'));
        });
        article.querySelector('[data-publish]')?.addEventListener('click', () => {
          const file = article.querySelector('[data-final-image]')?.files?.[0];
          if (!file) {
            adminStatus('Välj den färdigredigerade bilden först.', 'error');
            return;
          }
          publishEditedImage(sb, row, file).catch((error) => adminStatus('Fel: ' + (error?.message || error), 'error'));
        });
        section.append(article);
      }
      updateAdminCounts(rows.length);
    } catch (error) {
      console.warn('Svensk eHockey: kunde inte läsa spelarbildskön.', error);
    } finally {
      adminBusy = false;
    }
  }

  function routeEnhance() {
    const myProfile = document.querySelector('#spaRouteView[data-route="myProfile"]');
    if (myProfile) renderMyImageState(myProfile).catch(() => {});
    renderAdminQueue().catch(() => {});
  }

  const observer = new MutationObserver(() => {
    window.clearTimeout(routeEnhance._timer);
    routeEnhance._timer = window.setTimeout(routeEnhance, 80);
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});

  window.addEventListener('hashchange', () => window.setTimeout(routeEnhance, 80));
  window.addEventListener('focus', () => renderAdminQueue(true).catch(() => {}));
  routeEnhance();
  adminRefreshTimer = window.setInterval(() => renderAdminQueue().catch(() => {}), 8000);
  window.addEventListener('beforeunload', () => window.clearInterval(adminRefreshTimer), {once:true});
})();