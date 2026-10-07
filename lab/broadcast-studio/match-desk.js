(() => {
  'use strict';
  if(new URLSearchParams(location.search).get('obs')==='1')return;
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  const key='seh-match-desk-sv-v1'+(preview?'-preview':'');
  let matches=[],active='',noMatch=true;
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');matches=Array.isArray(saved.matches)?saved.matches:[];}catch{}
  const desk=document.createElement('div');desk.className='match-desk block';
  desk.innerHTML='<h3>MATCHBEVAKNING</h3><p>Ställ in lag, resultat och grafik ovan. Spara sedan matchen här. Endast vald stream spelas.</p><label>MATCHNAMN<input id="deskName" placeholder="T.ex. Västerås – Burchurs"></label><label>TWITCH-KANALER · EN PER RAD<textarea id="deskStreams" rows="3" placeholder="hemmalagets_kanal\nbortalagets_kanal"></textarea></label><div class="desk-actions"><button id="deskSave">Spara som ny match</button><button id="deskUpdate">Uppdatera vald match</button><button id="deskIdle">Ingen match just nu</button></div><p id="deskMessage" role="status"></p><div id="deskMatches"></div><small>Listan sparas i den här webbläsaren. Resultat för övriga matcher uppdateras manuellt. Byte skickas till Match-TV.</small>';
  document.querySelector('.stream-dock')?.prepend(desk);
  const get=id=>document.getElementById(id);
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({matches}));}catch{get('deskMessage').textContent='Webbläsaren kunde inte spara matchlistan.';}};
  const remember=()=>{const m=matches.find(m=>m.id===active);if(m)m.state=window.__sehStudioSnapshot();};
  const render=()=>{
    get('deskMatches').replaceChildren();
    matches.forEach(m=>{
      const row=document.createElement('div');row.className='desk-match'+(active===m.id?' selected':'');
      const title=document.createElement('strong');title.textContent=m.name+' · '+(m.state.hs||0)+'–'+(m.state.as||0);row.append(title);
      const choose=document.createElement('button');choose.textContent=active===m.id?'Vald match':'Välj match';choose.onclick=()=>{
        remember();active=m.id;get('deskName').value=m.name;get('deskStreams').value=m.streams.join('\n');window.__sehStudioRestore(m.state);persist();render();get('deskMessage').textContent='Visar '+m.name;
      };row.append(choose);
      m.streams.forEach(channel=>{const btn=document.createElement('button');btn.textContent='Visa '+channel;btn.onclick=()=>{
        remember();active=m.id;get('deskName').value=m.name;get('deskStreams').value=m.streams.join('\n');m.state={...m.state,videoSource:'twitch',twitchChannel:channel,twitchShow:true,scene:'live'};window.__sehStudioRestore(m.state);persist();render();get('deskMessage').textContent='Byter till '+channel+' – videon kan behöva några sekunder.';
      };row.append(btn);});get('deskMatches').append(row);
    });get('deskUpdate').disabled=!active;
  };
  const save=update=>{
    const name=get('deskName').value.trim(),raw=get('deskStreams').value.split(/\n|,/).map(s=>s.trim()).filter(Boolean);
    if(!name){get('deskMessage').textContent='Ange ett matchnamn.';return;}
    const streams=[];
    for(let channel of raw){if(/^https?:\/\//i.test(channel)){try{const u=new URL(channel);if(!/^(www\.)?twitch\.tv$/i.test(u.hostname))throw Error();channel=u.pathname.split('/').filter(Boolean)[0]||'';}catch{get('deskMessage').textContent='Ange Twitch-kanaler eller Twitch-länkar.';return;}}channel=channel.replace(/^@/,'');if(!/^[a-z0-9_]{1,25}$/i.test(channel)){get('deskMessage').textContent='Ogiltig Twitch-kanal: '+channel;return;}if(!streams.includes(channel.toLowerCase()))streams.push(channel.toLowerCase());}
    let m=update?matches.find(m=>m.id===active):null;
    if(update&&!m)return;
    if(!m){m={id:crypto.randomUUID()};matches.push(m);}
    Object.assign(m,{name,streams,state:window.__sehStudioSnapshot()});active=m.id;persist();render();get('deskMessage').textContent='Sparat '+name;
  };
  get('deskSave').onclick=()=>save(false);get('deskUpdate').onclick=()=>save(true);
  const updateIdle=()=>{get('deskIdle').setAttribute('aria-pressed',String(noMatch));get('deskIdle').textContent=noMatch?'Ingen match just nu · PÅ – klicka för att visa preview':'Ingen match just nu · AV';};
  get('deskIdle').onclick=()=>{noMatch=!noMatch;window.__sehStudioIdle(noMatch);updateIdle();get('deskMessage').textContent=noMatch?'Match-TV visar vänteskärmen. Preview kan ändras som vanligt.':'Match-TV visar nu aktuellt preview-läge.';};
  updateIdle();
  render();
})();
