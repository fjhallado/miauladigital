/* Mi Aula Digital · control de acceso. Modo local o sincronización con Worker. */
(()=>{'use strict';
const raw=(window.MAD_CONTROL_API||'').trim();
const url=/^https?:\/\//i.test(raw)?raw.replace(/\/+$/,''):'';
const LOCAL_KEY='mad-profesor-controles-v1';
const DEFAULT={gamesEnabled:true,examsUnlocked:false,examResets:{tic:0,periodica:0}};
let status={...DEFAULT}, ready=false, error=null, observers=[];
function parse(value){
 const examResets={...DEFAULT.examResets};
 for(const exam of Object.keys(examResets)){
  const version=value?.examResets?.[exam];
  if(Number.isSafeInteger(version)&&version>=0)examResets[exam]=version;
 }
 return {gamesEnabled:value?.gamesEnabled===true,examsUnlocked:value?.examsUnlocked===true,examResets};
}
function readLocal(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}')}}catch(e){return {...DEFAULT}}}
function notify(){window.dispatchEvent(new CustomEvent('mad-control-change',{detail:{...status,ready,error}}));observers.forEach(cb=>{try{cb({...status},ready,error)}catch(e){console.error(e)}})}
let pending=null;
function refresh(fresh=false){
 if(!url){status=parse(readLocal());ready=true;error=null;notify();return Promise.resolve(status);}
 if(pending)return fresh===true?pending.then(()=>refresh(true)):pending;
 pending=(async()=>{
  try{
   const res=await fetch(url+'/status',{cache:'no-store',mode:'cors',signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw Error('El servidor respondió '+res.status);
   const data=await res.json();
   if(!data.examResets)throw Error('Actualiza el servidor de control del profesor.');
   status=parse(data);error=null;
  }catch(e){error=e.message;status={...status,gamesEnabled:false,examsUnlocked:false}}
  finally{pending=null}
  ready=true;notify();return status;
 })();
 return pending;
}
function examVersion(exam){return status.examResets[exam]||0}
function canResetExam(exam,attemptVersion){
 return ready&&!error&&(status.examsUnlocked||(url&&examVersion(exam)>(attemptVersion||0)));
}
async function versionForNewAttempt(exam){
 if(url){
  await refresh();
  if(error)return null;
 }
 return examVersion(exam);
}
function onChange(callback){observers.push(callback);callback({...status},ready,error);return()=>{observers=observers.filter(fn=>fn!==callback)}}
function protectGames(escapeHref){
 const overlay=document.createElement('div');overlay.id='mad-games-gate';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:#08172fee;color:#ecf5ff;font-family:system-ui,sans-serif;padding:22px;text-align:center';
 overlay.innerHTML='<div style="max-width:460px;background:#142d51;border:1px solid #537caf;border-radius:18px;padding:28px"><div style="font-size:42px">🔒</div><h1 style="font-size:23px">Cafetería cerrada temporalmente</h1><p id="mad-games-reason">El profesor ha desactivado el acceso a los juegos.</p><a id="mad-games-return" style="display:inline-block;margin-top:16px;padding:10px 17px;background:#317de3;border-radius:9px;color:white;text-decoration:none" href="#">Volver a Mi Aula Digital</a></div>';
 overlay.querySelector('#mad-games-return').setAttribute('href',escapeHref||'index.html');
 function update(){
  const block=!ready||!status.gamesEnabled;
  const wasBlocked=overlay.style.display==='flex';
  overlay.style.display=block?'flex':'none';
  document.documentElement.style.overflow=block?'hidden':'';
  overlay.querySelector('#mad-games-reason').textContent=!ready?'Comprobando el permiso de acceso…':error?'No se pudo comprobar el permiso. Vuelve a intentarlo más tarde.':'El profesor ha desactivado temporalmente los juegos.';
  document.querySelectorAll('body > :not(#mad-games-gate):not(script)').forEach(n=>n.toggleAttribute('inert',block));
  if(block&&!wasBlocked){
   if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
   overlay.querySelector('#mad-games-return').focus();
  }
 }
 const attach=()=>{document.body.append(overlay);onChange(update)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
}
function markGameLinks(){
 const links=document.querySelectorAll('a[href*="cafeteria.html"],a[href*="juegos.html"],a[href*="juegos/"]');
 links.forEach(link=>{if(!ready||!status.gamesEnabled){link.setAttribute('aria-disabled','true');link.style.opacity='.45';link.style.pointerEvents='none';link.title='Cafetería desactivada por el profesor'}else{link.removeAttribute('aria-disabled');link.style.opacity='';link.style.pointerEvents='';link.removeAttribute('title')}})
}
window.MAD_CONTROL={get url(){return url},get remote(){return !!url},get ready(){return ready},get error(){return error},get status(){return {...status}},gamesEnabled:()=>ready&&status.gamesEnabled,examUnlimited:()=>ready&&status.examsUnlocked,refresh,onChange,examVersion,canResetExam,versionForNewAttempt,protectGames,markGameLinks,localUpdate(data){if(url)throw Error('La sincronización remota está activada');status=parse(data);localStorage.setItem(LOCAL_KEY,JSON.stringify(status));ready=true;notify();return status}};
window.addEventListener('storage',e=>{if(!url&&e.key===LOCAL_KEY)refresh()});
window.addEventListener('focus',()=>{if(url)refresh()});
window.addEventListener('pageshow',()=>{if(url)refresh()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>onChange(markGameLinks),{once:true});else onChange(markGameLinks);
refresh();if(url)setInterval(refresh,20000);
})();
