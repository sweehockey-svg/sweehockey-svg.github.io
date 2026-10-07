(() => {
  'use strict';
  const el=id=>document.getElementById(id),cfg=window.EHOCKEY_CONFIG;
  const list=el('chatMessages'),input=el('chatBody'),send=el('chatSend'),error=el('chatError');
  if(!cfg||!window.supabase){error.textContent='Chatten kunde inte startas. Ladda om sidan.';return;}
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  let identity={can_write:false,is_admin:false},busy=false,loading=false,cooldown=0,signature='',checkedAt=0,checking=false;
  const controls=()=>{input.disabled=!identity.can_write;send.disabled=!identity.can_write||busy||Date.now()<cooldown;};
  async function account(){
    if(checking)return;checking=true;
    try{
      const {data,error:err}=await sb.rpc('seh_match_tv_chat_identity');if(err)throw err;
      identity=data||{can_write:false,is_admin:false};checkedAt=Date.now();
      el('chatAccount').textContent=identity.can_write?'Du skriver som '+identity.gamertag:'För att skriva: logga in med Discord och koppla en godkänd gamertag.';
      el('chatConnect').hidden=identity.can_write;
      input.placeholder=identity.can_write?'Skriv till de andra tittarna…':'Discord + kopplad gamertag krävs';
      signature='';controls();
    }catch{identity={can_write:false,is_admin:false};controls();el('chatAccount').textContent='Kontot kunde inte kontrolleras. Försöker igen.';}
    finally{checking=false;}
  }
  async function refresh(){
    if(loading||document.hidden)return;loading=true;
    try{
      const {data,error:err}=await sb.from('seh_match_tv_chat').select('id,gamertag,body,created_at').order('created_at',{ascending:false}).limit(100);if(err)throw err;
      const next=JSON.stringify(data)+identity.is_admin;if(next===signature)return;signature=next;
      const bottom=list.scrollHeight-list.scrollTop-list.clientHeight<50,first=!list.querySelector('.chat-message');
      list.replaceChildren();
      if(!data.length){const empty=document.createElement('p');empty.textContent='Ingen har skrivit ännu. Säg hej när du är inloggad!';list.append(empty);}
      for(const row of [...data].reverse()){
        const article=document.createElement('article');article.className='chat-message';
        const name=document.createElement('strong');name.textContent=row.gamertag;
        const time=document.createElement('time');time.dateTime=row.created_at;time.textContent=new Date(row.created_at).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Stockholm'});
        const body=document.createElement('p');body.textContent=row.body;article.append(name,time,body);
        if(identity.is_admin){const hide=document.createElement('button');hide.type='button';hide.textContent='Dölj';hide.setAttribute('aria-label','Dölj meddelande från '+row.gamertag);hide.onclick=async()=>{hide.disabled=true;const result=await sb.rpc('seh_match_tv_chat_hide',{p_id:row.id});if(result.error){error.textContent=result.error.message;hide.disabled=false;}else await refresh();};article.append(hide);}
        list.append(article);
      }
      if(bottom||first)list.scrollTop=list.scrollHeight;
    }catch{error.textContent='Chatten kunde inte uppdateras. Försöker igen automatiskt.';}
    finally{loading=false;}
  }
  el('chatForm').addEventListener('submit',async event=>{
    event.preventDefault();if(!identity.can_write||busy||Date.now()<cooldown)return;
    const body=input.value.trim();if(!body)return;
    busy=true;controls();error.textContent='';
    try{const {error:err}=await sb.rpc('seh_match_tv_chat_send',{p_body:body});if(err)throw err;input.value='';cooldown=Date.now()+5000;setTimeout(controls,5100);await refresh();}
    catch(err){error.textContent=err.message||'Meddelandet kunde inte skickas.';void account();}
    finally{busy=false;controls();}
  });
  sb.auth.onAuthStateChange(()=>{setTimeout(()=>{void account().then(refresh);},0);});
  window.addEventListener('focus',()=>{void account().then(refresh);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void account().then(refresh);});
  setInterval(()=>{if(!document.hidden){if(Date.now()-checkedAt>60000)void account();void refresh();}},5000);
  void account().then(refresh);
})();
