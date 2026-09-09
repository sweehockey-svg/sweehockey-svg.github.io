from pathlib import Path
import re

app_path = Path('app.js')
index_path = Path('index.html')
app = app_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')

def sub_once(pattern, replacement, text, label, flags=re.S):
    new, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return new

app = sub_once(
    r"  function profileRequestBaseline\(row\)\{.*?\n  \}\n  function profileValueForAdmin",
    '''  function profileRequestBaseline(row){
    const approved=profileApprovalBaselines.get(String(row?.player_key||''))||{};
    const player=faDirectoryMap().get(String(row?.player_key||''))||{};
    const link=faApprovedLinks.find((entry)=>String(entry.user_id)===String(row?.user_id))||{};
    const live={
      presentation:faClean(approved.presentation),
      positions_text:faClean(approved.positions_text)||faClean(player.primary_position),
      availability_status:faClean(approved.availability_status),
      team_status:faClean(approved.team_status),
      contact:faClean(approved.contact)||(faClean(link.discord_username)?`Discord: ${faClean(link.discord_username)}`:''),
      twitch_url:faClean(approved.twitch_url),
      x_url:faClean(approved.x_url),
      instagram_url:faClean(approved.instagram_url),
      image_url:faClean(approved.image_url)
    };
    const snap=row?.review_baseline&&typeof row.review_baseline==='object'?row.review_baseline:{};
    const baseline={...live};
    for(const [key] of PROFILE_CHANGE_FIELDS){if(Object.prototype.hasOwnProperty.call(snap,key))baseline[key]=faClean(snap[key]);}
    return baseline;
  }
  function profileValueForAdmin''',
    app,
    'profileRequestBaseline'
)

app = sub_once(
    r"  function profileChangesHtml\(row\)\{.*?\n  \}\n  function renderProfileApprovals",
    '''  function profileSafeAdminUrl(value){const url=faClean(value);return /^https?:\\/\\//i.test(url)?url:'';}
  function profileDecisionFor(row,key){const item=row?.field_decisions?.[key];return item&&typeof item==='object'?faClean(item.decision):'';}
  function profileAdminDate(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return faClean(value).slice(0,16);try{return new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);}catch(_){return d.toLocaleString('sv-SE');}}
  function profileChangeValueHtml(key,value,side){
    const text=faClean(value);
    if(key==='image_url'){
      const url=profileSafeAdminUrl(text);
      if(!url)return '<em class="profile-admin-empty-value">Ingen spelarbild</em>';
      return `<a class="profile-admin-image-preview" href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="${side==='from'?'Nuvarande':'Föreslagen'} spelarbild"><span>${side==='from'?'Nuvarande bild':'Öppna föreslagen bild'} ↗</span></a>`;
    }
    if(['twitch_url','x_url','instagram_url'].includes(key)){const url=profileSafeAdminUrl(text);if(url)return `<a class="profile-admin-value-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)} ↗</a>`;}
    if(!text)return '<em class="profile-admin-empty-value">Tomt</em>';
    const cls=key==='presentation'?' profile-admin-value--long':'';
    return `<div class="profile-admin-value${cls}">${escapeHtml(text).replace(/\\n/g,'<br>')}</div>`;
  }
  function profileChangesHtml(row){
    const changes=profileChangedFields(row);
    if(!changes.length)return '<p class="profile-admin-nochanges">Inga faktiska skillnader hittades i de inskickade profilfälten.</p>';
    return `<div class="profile-admin-changes-v2">${changes.map((change)=>{
      const decision=profileDecisionFor(row,change.key),decided=decision==='approved'||decision==='rejected';
      return `<article class="profile-admin-field${decided?` is-${decision}`:''}" data-profile-field="${escapeHtml(change.key)}"><div class="profile-admin-field__head"><span>${escapeHtml(change.label)}</span>${decided?`<strong class="profile-admin-field-status is-${decision}">${decision==='approved'?'Godkänd':'Avslagen'}</strong>`:'<strong class="profile-admin-field-status">Väntar</strong>'}</div><div class="profile-admin-field__compare"><div><small>NU</small>${profileChangeValueHtml(change.key,change.from,'from')}</div><i aria-hidden="true">→</i><div><small>FÖRESLAGET</small>${profileChangeValueHtml(change.key,change.to,'to')}</div></div>${decided?'':`<div class="profile-admin-field__actions"><button type="button" data-profile-field-approve="${row.id}" data-profile-field-key="${escapeHtml(change.key)}">✓ Godkänn</button><button type="button" class="writer-secondary" data-profile-field-reject="${row.id}" data-profile-field-key="${escapeHtml(change.key)}">Avslå</button></div>`}</article>`;
    }).join('')}</div>`;
  }
  function renderProfileApprovals''',
    app,
    'profileChangesHtml'
)

app = sub_once(
    r"  function renderProfileApprovals\(\)\{.*?\n  \}\n  async function loadProfileApprovals",
    '''  function renderProfileApprovals(){
    const host=$('profileAdminRequests');
    if($('profileAdminRequestCount'))$('profileAdminRequestCount').textContent=String(profileApprovalRequests.length);
    if(!host)return;
    host.replaceChildren();
    if(!profileApprovalRequests.length){const p=document.createElement('p');p.className='fa-admin-empty player-admin-empty-state';p.textContent='Inga profilärenden väntar.';host.append(p);return;}
    for(const row of profileApprovalRequests){
      const label=row.request_type==='report'?'FELRAPPORT':'PROFILÄNDRING',detail=profileRequestDetail(row)||'Ingen extra information',playerName=faApprovalPlayerName(row.player_key);
      const item=document.createElement('article');item.className=`profile-admin-request-card${row.request_type==='report'?' is-report':''}`;item.dataset.adminRequestKey=`profile:${row.id}`;
      if(row.request_type==='report'){
        item.innerHTML=`<header class="profile-admin-request-card__head"><div><span class="profile-admin-type is-report">${label}</span><a class="profile-admin-player-link" href="#/spelare/${encodeURIComponent(row.player_key||'')}">${escapeHtml(playerName)} ↗</a><small>${escapeHtml(profileAdminDate(row.submitted_at))}</small></div><span class="profile-admin-waiting">Väntar</span></header><div class="profile-admin-report-body">${escapeHtml(detail)}</div><footer class="profile-admin-request-card__footer"><button type="button" data-profile-request-approve="${row.id}">Markera hanterad</button><button type="button" class="writer-secondary" data-profile-request-reject="${row.id}">Avslå / stäng</button></footer>`;
      }else{
        const changes=profileChangedFields(row),undecided=changes.filter((change)=>!['approved','rejected'].includes(profileDecisionFor(row,change.key))),approved=changes.filter((change)=>profileDecisionFor(row,change.key)==='approved').length,rejected=changes.filter((change)=>profileDecisionFor(row,change.key)==='rejected').length;
        item.innerHTML=`<header class="profile-admin-request-card__head"><div><span class="profile-admin-type">${label}</span><a class="profile-admin-player-link" href="#/spelare/${encodeURIComponent(row.player_key||'')}">${escapeHtml(playerName)} ↗</a><small>${escapeHtml(profileAdminDate(row.submitted_at))}</small></div><div class="profile-admin-progress"><span>${approved} godkända</span><span>${rejected} avslagna</span><strong>${undecided.length} kvar</strong></div></header>${profileChangesHtml(row)}<footer class="profile-admin-request-card__footer">${undecided.length?`<button type="button" data-profile-request-approve="${row.id}">Godkänn alla återstående</button><button type="button" class="writer-secondary" data-profile-request-reject="${row.id}">Avslå alla återstående</button>`:'<span class="profile-admin-finalizing">Ärendet slutbehandlas…</span>'}</footer>`;
      }
      host.append(item);
    }
  }
  async function loadProfileApprovals''',
    app,
    'renderProfileApprovals'
)

marker="  async function reviewProfileRequest(id,decision){"
if marker not in app: raise SystemExit('reviewProfileRequest marker missing')
app=app.replace(marker,'''  async function reviewProfileField(id,key,decision){
    faSetStatus(decision==='approved'?`Godkänner ${key}…`:`Avslår ${key}…`,'working');
    const{error}=await sb.rpc('seh_review_player_profile_field',{p_request_id:Number(id),p_field_key:key,p_decision:decision,p_admin_note:null});
    if(error){faSetStatus('Fel: '+error.message,'error');return;}
    const notify=await flushDiscordNotifications();
    faSetStatus((decision==='approved'?'Profilfältet är godkänt och publicerat.':'Profilfältet är avslaget.')+discordNotifySuffix(notify),'success');
    await loadProfileApprovals();updatePlayerAdminCounters();
  }
'''+marker,1)

old_click="""    $('profileAdminRequests')?.addEventListener('click',(event)=>{\n      const approve=event.target.closest('[data-profile-request-approve]'),reject=event.target.closest('[data-profile-request-reject]');\n      if(approve)reviewProfileRequest(approve.dataset.profileRequestApprove,'approved');else if(reject)reviewProfileRequest(reject.dataset.profileRequestReject,'rejected');\n    });"""
new_click="""    $('profileAdminRequests')?.addEventListener('click',(event)=>{\n      const fieldApprove=event.target.closest('[data-profile-field-approve]'),fieldReject=event.target.closest('[data-profile-field-reject]');\n      if(fieldApprove){reviewProfileField(fieldApprove.dataset.profileFieldApprove,fieldApprove.dataset.profileFieldKey,'approved');return;}\n      if(fieldReject){reviewProfileField(fieldReject.dataset.profileFieldReject,fieldReject.dataset.profileFieldKey,'rejected');return;}\n      const approve=event.target.closest('[data-profile-request-approve]'),reject=event.target.closest('[data-profile-request-reject]');\n      if(approve)reviewProfileRequest(approve.dataset.profileRequestApprove,'approved');else if(reject)reviewProfileRequest(reject.dataset.profileRequestReject,'rejected');\n    });"""
if old_click not in app: raise SystemExit('profile click handler missing')
app=app.replace(old_click,new_click,1)

old_approved="<small>kopplad till <b>${escapeHtml(faApprovalPlayerName(row.approved_player_key))}</b></small>"
new_approved="<small>kopplad till <a class=\"fa-admin-player-link\" href=\"#/spelare/${encodeURIComponent(row.approved_player_key||'')}\">${escapeHtml(faApprovalPlayerName(row.approved_player_key))} ↗</a></small>"
if old_approved in app: app=app.replace(old_approved,new_approved,1)

workspace_marker="  function playerAdminPendingKeys(){"
if workspace_marker not in app: raise SystemExit('playerAdminPendingKeys marker missing')
workspace=r'''  let playerAdminActiveView='queue',playerAdminQueueFilter='all';
  function setPlayerAdminView(view){const allowed=['queue','links','fa'];playerAdminActiveView=allowed.includes(view)?view:'queue';try{sessionStorage.setItem('seh_admin_player_view',playerAdminActiveView);}catch(_){}document.querySelectorAll('[data-player-admin-view]').forEach((node)=>{node.hidden=node.dataset.playerAdminView!==playerAdminActiveView;});document.querySelectorAll('[data-player-admin-tab]').forEach((button)=>{const active=button.dataset.playerAdminTab===playerAdminActiveView;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',active?'true':'false');});}
  function setPlayerAdminQueueFilter(filter){const allowed=['all','profiles','links','fa'];playerAdminQueueFilter=allowed.includes(filter)?filter:'all';document.querySelectorAll('[data-admin-queue]').forEach((panel)=>{panel.hidden=playerAdminQueueFilter!=='all'&&panel.dataset.adminQueue!==playerAdminQueueFilter;});document.querySelectorAll('[data-player-admin-filter]').forEach((button)=>button.classList.toggle('is-active',button.dataset.playerAdminFilter===playerAdminQueueFilter));}
  function filterApprovedLinks(){const input=$('playerAdminLinkSearch'),q=faClean(input?.value).toLowerCase();$('faAdminApprovedLinks')?.querySelectorAll('article').forEach((row)=>{row.hidden=Boolean(q)&&!String(row.textContent||'').toLowerCase().includes(q);});}
  function setPlayerAdminFaForm(open){const form=$('faAdminSearch')?.closest('.fa-admin-form'),layout=form?.closest('.fa-admin-layout'),button=$('playerAdminFaToggle');if(!form)return;form.hidden=!open;layout?.classList.toggle('is-editor-open',Boolean(open));if(button)button.textContent=open?'Stäng formulär':'+ Lägg till / redigera';if(open)setTimeout(()=>$('faAdminSearch')?.focus(),0);}
  function initPlayerAdminWorkspace(){
    if(!isPlayerAdminPage)return;
    const module=document.querySelector('.admin-player-module');if(!module)return;
    if(module.dataset.workspaceV2==='1'){updatePlayerAdminCounters();return;}
    const queueHead=$('adminPlayerPendingTotal')?.closest('.admin-player-section-head'),queueGrid=module.querySelector('.fa-admin-approval-grid'),linksHead=$('adminPlayerApprovedTotal')?.closest('.admin-player-section-head'),linksPanel=$('faAdminApprovedLinks')?.closest('.fa-admin-approval-panel'),faHead=module.querySelector('.admin-player-section-head--fa'),faLayout=$('faAdminList')?.closest('.fa-admin-layout'),livebar=module.querySelector('.admin-player-livebar');
    if(!queueHead||!queueGrid||!linksHead||!linksPanel||!faHead||!faLayout||!livebar)return;
    module.dataset.workspaceV2='1';module.classList.add('admin-player-workspace-v2');
    const tabs=document.createElement('nav');tabs.className='player-admin-tabs';tabs.setAttribute('aria-label','Spelarhantering');tabs.innerHTML=`<button type="button" data-player-admin-tab="queue"><span>Ärenden</span><strong id="playerAdminTabQueueCount">0</strong><small>Det som kräver beslut</small></button><button type="button" data-player-admin-tab="links"><span>Kopplade konton</span><strong id="playerAdminTabLinksCount">0</strong><small>Discord ↔ spelarprofil</small></button><button type="button" data-player-admin-tab="fa"><span>Free Agents</span><strong id="playerAdminTabFaCount">0</strong><small>Publicerade och manuella</small></button>`;livebar.insertAdjacentElement('afterend',tabs);
    const wrap=(name,nodes)=>{const pane=document.createElement('section');pane.className=`player-admin-view player-admin-view--${name}`;pane.dataset.playerAdminView=name;nodes[0].before(pane);nodes.forEach((node)=>pane.append(node));return pane;};
    wrap('queue',[queueHead,queueGrid]);wrap('links',[linksHead,linksPanel]);wrap('fa',[faHead,faLayout]);
    const queueTools=document.createElement('div');queueTools.className='player-admin-queue-tools';queueTools.innerHTML=`<div><span>VISA</span><button type="button" data-player-admin-filter="all" class="is-active">Alla <b id="playerAdminFilterAll">0</b></button><button type="button" data-player-admin-filter="profiles">Profiler <b id="playerAdminFilterProfiles">0</b></button><button type="button" data-player-admin-filter="links">Discord <b id="playerAdminFilterLinks">0</b></button><button type="button" data-player-admin-filter="fa">Free Agent <b id="playerAdminFilterFa">0</b></button></div>`;queueHead.insertAdjacentElement('afterend',queueTools);
    const linksTools=document.createElement('div');linksTools.className='player-admin-links-tools';linksTools.innerHTML='<label><span>SÖK KOPPLING</span><input id="playerAdminLinkSearch" type="search" autocomplete="off" placeholder="Discord eller gamertag…"></label>';linksHead.insertAdjacentElement('afterend',linksTools);
    const faToggle=document.createElement('button');faToggle.id='playerAdminFaToggle';faToggle.className='writer-secondary player-admin-fa-toggle';faToggle.type='button';faToggle.textContent='+ Lägg till / redigera';faHead.append(faToggle);setPlayerAdminFaForm(false);
    tabs.addEventListener('click',(event)=>{const button=event.target.closest('[data-player-admin-tab]');if(button)setPlayerAdminView(button.dataset.playerAdminTab);});queueTools.addEventListener('click',(event)=>{const button=event.target.closest('[data-player-admin-filter]');if(button)setPlayerAdminQueueFilter(button.dataset.playerAdminFilter);});linksTools.querySelector('input')?.addEventListener('input',filterApprovedLinks);faToggle.addEventListener('click',()=>setPlayerAdminFaForm($('faAdminSearch')?.closest('.fa-admin-form')?.hidden));
    try{playerAdminActiveView=sessionStorage.getItem('seh_admin_player_view')||'queue';}catch(_){playerAdminActiveView='queue';}setPlayerAdminView(playerAdminActiveView);setPlayerAdminQueueFilter('all');updatePlayerAdminCounters();
  }
'''
app=app.replace(workspace_marker,workspace+workspace_marker,1)

app=sub_once(r"  function updatePlayerAdminCounters\(\)\{.*?\n  \}\n  function playerAdminSetLiveState",'''  function updatePlayerAdminCounters(){
    const total=faLinkRequests.length+faApprovalRequests.length+profileApprovalRequests.length;
    if($('adminPlayerPendingTotal'))$('adminPlayerPendingTotal').textContent=String(total);
    if($('adminPlayerApprovedTotal'))$('adminPlayerApprovedTotal').textContent=String(faApprovedLinks.length);
    if($('playerAdminTabQueueCount'))$('playerAdminTabQueueCount').textContent=String(total);
    if($('playerAdminTabLinksCount'))$('playerAdminTabLinksCount').textContent=String(faApprovedLinks.length);
    if($('playerAdminTabFaCount'))$('playerAdminTabFaCount').textContent=String(faEntries.length);
    if($('playerAdminFilterAll'))$('playerAdminFilterAll').textContent=String(total);
    if($('playerAdminFilterProfiles'))$('playerAdminFilterProfiles').textContent=String(profileApprovalRequests.length);
    if($('playerAdminFilterLinks'))$('playerAdminFilterLinks').textContent=String(faLinkRequests.length);
    if($('playerAdminFilterFa'))$('playerAdminFilterFa').textContent=String(faApprovalRequests.length);
    for(const [name,count] of [['links',faLinkRequests.length],['fa',faApprovalRequests.length],['profiles',profileApprovalRequests.length]]){const panel=document.querySelector(`[data-admin-queue="${name}"]`);if(panel)panel.classList.toggle('has-pending',count>0);}
    setPlayerAdminQueueFilter(playerAdminQueueFilter);filterApprovedLinks();
  }
  function playerAdminSetLiveState''',app,'updatePlayerAdminCounters')

old_assign="faLinkRequests=linksResult.data||[];faApprovedLinks=approvedLinksResult.data||[];faApprovalRequests=requestsResult.data||[];faRenderApprovals();await loadProfileApprovals();"
if old_assign not in app: raise SystemExit('approval assignment marker missing')
app=app.replace(old_assign,old_assign.replace('faRenderApprovals();','faRenderApprovals();filterApprovedLinks();'),1)

old_edit="""      if(edit){\n        const entry=faEntryById(Number(edit.dataset.faEditId));if(!entry)return;"""
if old_edit not in app: raise SystemExit('FA edit marker missing')
app=app.replace(old_edit,"""      if(edit){\n        setPlayerAdminFaForm(true);\n        const entry=faEntryById(Number(edit.dataset.faEditId));if(!entry)return;""",1)

target="if(isPlayerAdminPage){await loadFreeAgentAdmin();startPlayerAdminAutoRefresh();}"
if app.count(target)!=2: raise SystemExit(f'expected 2 player admin init calls, got {app.count(target)}')
app=app.replace(target,"if(isPlayerAdminPage){await loadFreeAgentAdmin();initPlayerAdminWorkspace();startPlayerAdminAutoRefresh();}")

old_status="const statusLabel = (value) => value==='approved'?'Godkänd':value==='rejected'?'Avslagen':'Väntar på admin';"
if old_status not in app: raise SystemExit('status label marker missing')
app=app.replace(old_status,"const statusLabel = (value) => value==='approved'?'Godkänd':value==='rejected'?'Avslagen':value==='partially_approved'?'Delvis godkänd':'Väntar på admin';",1)

if 'admin-player-workspace-v2.css' not in index:
    index=index.replace('<link rel="stylesheet" href="players-register-v1276.css', '<link rel="stylesheet" href="admin-player-workspace-v2.css?v=20260909-v2">\n  <link rel="stylesheet" href="players-register-v1276.css',1)
index=re.sub(r'app\.js\?v=[^"\']+','app.js?v=20260909-v13001-admin-player-workspace-v2',index,count=1)

app_path.write_text(app,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
