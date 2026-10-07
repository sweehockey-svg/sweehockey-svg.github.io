(() => {
  'use strict';
  if(new URLSearchParams(location.search).get('embed')==='1'&&window.parent!==window){
    document.body.classList.add('tv-embedded');
    document.getElementById('chatConnect').addEventListener('click',event=>{
      event.preventDefault();window.parent.postMessage({type:'seh-tv-open-account'},location.origin);
    });
  }
  const frame=document.getElementById('broadcast'),audio=document.getElementById('audio'),status=document.getElementById('status'),text=document.getElementById('statusText'),error=document.getElementById('error');
  let muted=true;
  const sendAudio=()=>frame.contentWindow?.postMessage({type:'seh-tv-audio',muted},location.origin);
  audio.addEventListener('click',()=>{muted=!muted;audio.textContent=muted?'Slå på ljud':'Stäng av ljud';audio.setAttribute('aria-pressed',String(!muted));sendAudio();});
  frame.addEventListener('load',sendAudio);
  window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.type!=='seh-tv-status')return;text.textContent=String(e.data.text||'Väntar på sändning').slice(0,180);status.classList.toggle('playing',e.data.playing===true);});
  document.getElementById('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('player').requestFullscreen();}catch{error.textContent='Helskärm stöds inte här. Prova att vrida mobilen till liggande läge.';}});
  document.getElementById('retry').addEventListener('click',()=>{text.textContent='Ansluter igen…';status.classList.remove('playing');frame.src=frame.getAttribute('src');});
})();
