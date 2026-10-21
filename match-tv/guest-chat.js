(() => {
 'use strict';
 const el=id=>document.getElementById(id),cfg=window.EHOCKEY_CONFIG;
 const list=el('chatMessages'),input=el('chatBody'),send=el('chatSend'),error=el('chatError');
 if(!cfg||!window.supabase){error.textContent='Chatten kunde inte startas. Ladda om sidan.';return;}
 const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
 let identity={can_write:false,is_admin:false},busy=false,loading=false,cooldown=0,signature='',modSignature='',checkedAt=0,checking=false;
 const guestName=el('chatGuestName'),mod=el('chatModeration'),queue=el('chatPending'),bans=el('chatBans');
 function token(){
  const key='seh-match-chat-guest-v1';let value;try{value=localStorage.getItem(key);}catch{}
  if(!/^[a-f0-9]{64}$/.test(value||'')){
   value=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
   try{localStorage.setItem(key,value);}catch{throw Error('Tillåt lokal lagring för att skriva som gäst.');}
  }return value;
 }
 const controls=()=>{input.disabled=false;send.disabled=busy||Date.now()<cooldown;guestName.disabled=busy;};
 async function account(){
  if(checking)return;checking=true;
  try{
   const {data,error:err}=await sb.rpc('seh_match_tv_chat_identity');if(err)throw err;
   identity=data||{can_write:false,is_admin:false};checkedAt=Date.now();
   el('chatAccount').textContent=identity.can_write?'Du skriver med verifierad gamertag: '+identity.gamertag:'Skriv som gäst. Ditt meddelande syns först efter godkännande.';
   el('chatGuestFields').hidden=!!identity.can_write;guestName.required=!identity.can_write;
   el('chatConnect').hidden=identity.can_write;mod.hidden=!identity.is_admin;
   el('chatCooldown').textContent=identity.can_write?'Max 500 tecken · 5 sekunders skrivpaus':'Max 500 tecken · 15 sekunders skrivpaus';
   signature='';modSignature='';controls();
  }catch{identity={can_write:false,is_admin:false};mod.hidden=true;el('chatGuestFields').hidden=false;guestName.required=true;controls();el('chatAccount').textContent='Kontot kunde inte kontrolleras. Gästmeddelanden kräver godkännande.';}
  finally{checking=false;}
 }
 const note=(text,parent)=>{const p=document.createElement('p');p.textContent=text;parent.append(p);};
 function message(row){
  const article=document.createElement('article');article.className='chat-message';
  const name=document.createElement('strong');name.textContent=row.gamertag;
  const badge=document.createElement('span');badge.className='chat-badge';badge.textContent=row.sender_kind==='guest'?'Gäst':'Verifierad GT';
  const time=document.createElement('time');time.dateTime=row.created_at;time.textContent=new Date(row.created_at).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Stockholm'});
  const body=document.createElement('p');body.textContent=row.body;article.append(name,badge,time,body);return article;
 }
 function action(parent,label,row,kind){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.addEventListener('click',async()=>{
   const hours=Number(el('chatBanHours').value);
   if(kind==='block_ip'&&!confirm('Blockera gästens nätadress i '+hours+' timmar? Andra på samma nät kan också drabbas. Meddelandet döljs och väntande meddelanden från nätet nekas.'))return;
   if(kind==='block'&&!confirm('Blockera '+row.gamertag+' i '+hours+' timmar? Meddelandet döljs; gästens väntande meddelanden nekas.'))return;
   button.disabled=true;error.textContent='';
   try{
    const {error:err}=await sb.rpc('seh_match_tv_chat_moderate',{p_id:row.id,p_source:row.sender_kind||'guest',p_action:kind,p_hours:hours});if(err)throw err;
    signature='';modSignature='';await refresh();
   }catch(err){error.textContent=err.message||'Åtgärden misslyckades.';button.disabled=false;}
  });parent.append(button);
 }
 async function moderation(){
  if(!identity.is_admin)return;
  const {data,error:err}=await sb.rpc('seh_match_tv_chat_moderation');if(err)throw err;
  const next=JSON.stringify(data);if(next===modSignature)return;modSignature=next;
  queue.replaceChildren();bans.replaceChildren();el('chatPendingCount').textContent=String(data.pending?.length||0);
  if(!data.pending?.length)note('Inga gästmeddelanden väntar.',queue);
  for(const row of data.pending||[]){
   row.sender_kind='guest';const card=message(row);
   action(card,'Godkänn',row,'approve');action(card,'Neka',row,'reject');action(card,'Blockera gäst',row,'block');
   if(row.can_block_ip)action(card,'Blockera IP',row,'block_ip');queue.append(card);
  }
  if(!data.bans?.length)note('Inga aktiva blockeringar.',bans);
  for(const ban of data.bans||[]){
   const card=document.createElement('article');card.className='chat-message';
   note(ban.label+' · '+({account:'Konto',guest:'Gästwebbläsare',ip:'Nätadress'}[ban.kind]||ban.kind)+' · till '+new Date(ban.expires_at).toLocaleString('sv-SE'),card);
   action(card,'Häv blockering',{id:ban.id},'unblock');bans.append(card);
  }
 }
 async function refresh(){
  if(loading||document.hidden)return;loading=true;
  try{
   const {data,error:err}=await sb.rpc('seh_match_tv_chat_list');if(err)throw err;
   const next=JSON.stringify(data)+identity.is_admin;
   if(next!==signature){
    signature=next;const bottom=list.scrollHeight-list.scrollTop-list.clientHeight<50,first=!list.querySelector('.chat-message');list.replaceChildren();
    if(!data?.length)note('Ingen har skrivit ännu. Skriv som gäst eller med din gamertag!',list);
    for(const row of [...(data||[])].reverse()){
     const card=message(row);
     if(identity.is_admin){action(card,'Dölj',row,'hide');action(card,row.sender_kind==='guest'?'Blockera gäst':'Blockera konto',row,'block');if(row.sender_kind==='guest')action(card,'Blockera IP',row,'block_ip');}
     list.append(card);
    }if(bottom||first)list.scrollTop=list.scrollHeight;
   }await moderation();
  }catch{error.textContent='Chatten kunde inte uppdateras. Försöker igen automatiskt.';}
  finally{loading=false;}
 }
 el('chatForm').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||Date.now()<cooldown)return;
  const body=input.value.trim(),name=guestName.value.trim();if(!body)return;
  if(!identity.can_write&&(name.length<2||name.length>40)){error.textContent='Skriv ett gästnamn med 2–40 tecken.';return;}
  busy=true;controls();error.textContent='';
  try{
   const guest=!identity.can_write;
   const {error:err}=await sb.rpc(guest?'seh_match_tv_chat_guest_send':'seh_match_tv_chat_send',guest?{p_token:token(),p_name:name,p_body:body}:{p_body:body});if(err)throw err;
   input.value='';cooldown=Date.now()+(guest?15000:5000);setTimeout(controls,guest?15100:5100);
   error.textContent=guest?'Skickat för godkännande. Meddelandet är inte publikt ännu.':'Meddelandet skickat.';await refresh();
  }catch(err){error.textContent=err.message||'Meddelandet kunde inte skickas.';void account();}
  finally{busy=false;controls();}
 });
 sb.auth.onAuthStateChange(()=>setTimeout(()=>void account().then(refresh),0));
 window.addEventListener('focus',()=>void account().then(refresh));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void account().then(refresh);});
 setInterval(()=>{if(!document.hidden){if(Date.now()-checkedAt>60000)void account();void refresh();}},5000);
 void account().then(refresh);
})();
