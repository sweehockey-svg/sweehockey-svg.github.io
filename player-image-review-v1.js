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