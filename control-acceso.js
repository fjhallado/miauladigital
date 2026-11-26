/* Mi Aula Digital · control de acceso. Modo local o sincronización con Worker. */
(()=>{'use strict';
const raw=(window.MAD_CONTROL_API||'').trim();
const url=/^https?:\/\//i.test(raw)?raw.replace(/\/+$/,''):'';
const LOCAL_KEY='mad-profesor-controles-v1';
const DEFAULT_SCHEDULES={cafeteria:null,tic:null,periodica:null,vistas:null};
const DEFAULT_LAB_DEADLINES={periodica:null,factorlab:null,vistas:null,htmlcss:null};
const DEFAULT={gamesEnabled:true,labsEnabled:true,examsUnlocked:false,salesEnabled:false,commentsAutoPublish:false,examResets:{tic:0,periodica:0,vistas:0},schedules:DEFAULT_SCHEDULES,labDeadlines:DEFAULT_LAB_DEADLINES,viewExamDefaultMinutes:null};
const madridDate=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'});
const madridTime=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
let clock=null,boundary=null;
let status={...DEFAULT}, ready=false, error=null, observers=[], salesSupported=!url;
function parse(value){
 const examResets={...DEFAULT.examResets};
 for(const exam of Object.keys(examResets)){
  const version=value?.examResets?.[exam];
  if(Number.isSafeInteger(version)&&version>=0)examResets[exam]=version;
 }
 const schedules={...DEFAULT_SCHEDULES};
 for(const key of Object.keys(schedules)){
  const schedule=value?.schedules?.[key];
  if(Number.isSafeInteger(schedule?.startsAt)&&Number.isSafeInteger(schedule.endsAt)&&schedule.endsAt>schedule.startsAt){
   schedules[key]=schedule;
  }
 }
 const labDeadlines={...DEFAULT_LAB_DEADLINES};
 for(const lab of Object.keys(labDeadlines)){
  const deadline=value?.labDeadlines?.[lab];
  if(Number.isSafeInteger(deadline)&&deadline>0&&deadline<=8.64e15)labDeadlines[lab]=deadline;
 }
 const minutes=value?.viewExamDefaultMinutes;
 const viewExamDefaultMinutes=Number.isSafeInteger(minutes)&&minutes>0?minutes:null;
 return {gamesEnabled:value?.gamesEnabled===true,labsEnabled:value?.labsEnabled!==false,examsUnlocked:value?.examsUnlocked===true,salesEnabled:value?.salesEnabled===true,commentsAutoPublish:value?.commentsAutoPublish===true,examResets,schedules,labDeadlines,viewExamDefaultMinutes};
}
function readLocal(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}')}}catch(e){return {...DEFAULT}}}
function notify(){
 clearTimeout(boundary);
 const current=now();
 const schedules=Object.values(status.schedules).filter(Boolean).flatMap(schedule=>[schedule.startsAt,schedule.endsAt]);
 const next=Math.min(...[...schedules,...Object.values(status.labDeadlines)].filter(at=>at>current));
 if(Number.isFinite(next))boundary=setTimeout(notify,Math.min(2147483647,Math.max(1,next-current+10)));
 window.dispatchEvent(new CustomEvent('mad-control-change',{detail:{...status,ready,error}}));observers.forEach(cb=>{try{cb({...status},ready,error)}catch(e){console.error(e)}})}
let pending=null;
function refresh(fresh=false){
 if(!url){status=parse(readLocal());ready=true;error=null;notify();return Promise.resolve(status);}
 if(pending)return fresh===true?pending.then(()=>refresh(true)):pending;
 pending=(async()=>{
  try{
   const requested=performance.now();
   const res=await fetch(url+'/status',{cache:'no-store',mode:'cors',signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw Error('El servidor respondió '+res.status);
   const data=await res.json();
   if(!data.examResets)throw Error('Actualiza el servidor de control del profesor.');
   salesSupported=typeof data.salesEnabled==='boolean';
   const received=performance.now();
   if(Number.isSafeInteger(data.serverTime))clock={time:data.serverTime+(received-requested)/2,received};
   status=parse(data);error=null;
  }catch(e){error=e.message;status={...status,gamesEnabled:false,examsUnlocked:false,salesEnabled:false}}
  finally{pending=null}
  ready=true;notify();return status;
 })();
 return pending;
}
function examVersion(exam){return status.examResets[exam]||0}
function canResetExam(exam,attemptVersion){
 return examWindow(exam).allowed&&(status.examsUnlocked||(url&&examVersion(exam)>(attemptVersion||0)));
}
function now(){return clock?clock.time+performance.now()-clock.received:Date.now()}
function dateLabel(time){return madridDate.format(time)+' (hora peninsular)'}
function timeLabel(time){return madridTime.format(time)}
function phase(schedule){
 const current=now();
 return current<schedule.startsAt?'before':current<schedule.endsAt?'open':'after';
}
function gamesEnabled(){
 if(!ready||error||!status.gamesEnabled)return false;
 const schedule=status.schedules.cafeteria;
 return !schedule||(schedule.mode==='open'?phase(schedule)==='open':phase(schedule)!=='open');
}
function gamesNotice(){
 const schedule=status.schedules.cafeteria;
 if(!status.gamesEnabled||!schedule)return 'El profesor ha desactivado temporalmente los juegos.';
 if(schedule.mode==='closed')return 'La Cafetería reabre el '+dateLabel(schedule.endsAt)+'.';
 if(phase(schedule)==='before')return 'La Cafetería abre el '+dateLabel(schedule.startsAt)+'.';
 return 'El horario de apertura de la Cafetería ha terminado.';
}
function labAccess(lab){
 if(!status.labsEnabled){
  return {allowed:false,closed:true,message:'El profesor ha desactivado el acceso a los laboratorios.'};
 }
 const deadline=status.labDeadlines[lab];
 if(deadline&&now()>=deadline){
  return {allowed:false,closed:true,message:'El plazo de la práctica terminó el '+dateLabel(deadline)+'.'};
 }
 if(url&&(!ready||error)){
  return {allowed:false,message:error?'No se pudo comprobar el plazo. Vuelve a intentarlo en unos segundos.':'Consultando el plazo de la práctica…'};
 }
 return {allowed:true,message:deadline?'Abierto hasta el '+dateLabel(deadline)+'.':''};
}
function examWindow(exam){
 const schedule=status.schedules[exam];
 if(url&&(!ready||error))return {allowed:false,schedule,message:error?'No se pudo consultar el horario. Vuelve a intentarlo en unos segundos.':'Consultando el horario del examen…'};
 if(!schedule)return {allowed:true,schedule:null,message:''};
 const phaseNow=phase(schedule);
 if(phaseNow==='before')return {allowed:false,schedule,message:'El examen abre el '+dateLabel(schedule.startsAt)+'.'};
 if(phaseNow==='after')return {allowed:false,schedule,message:'El examen cerró el '+dateLabel(schedule.endsAt)+'.'};
 return {allowed:true,schedule,message:'Duración máxima: '+schedule.minutes+' min. Cierre el '+dateLabel(schedule.endsAt)+'.'};
}
async function prepareAttempt(exam){
 if(url)await refresh();
 const window=examWindow(exam);
 if(!window.allowed)return {error:window.message};
 const schedule=window.schedule;
 const start=Math.round(now());
 const timing=schedule?{scheduleStart:schedule.startsAt,limitAt:start+schedule.minutes*60000,
  closesAt:schedule.endsAt,offset:Math.round(start-Date.now())}:null;
 return {timing,resetVersion:examVersion(exam)};
}
function attemptNow(timing){return clock?now():Date.now()+(timing?.offset||0)}
function attemptDeadline(timing){return Math.min(timing.limitAt,timing.closesAt)}
function updateTiming(exam,timing){
 const schedule=status.schedules[exam];
 if(!ready||error||!timing||schedule?.startsAt!==timing.scheduleStart||schedule.endsAt===timing.closesAt||
    attemptNow(timing)>=attemptDeadline(timing))return false;
 timing.closesAt=schedule.endsAt;
 return true;
}
function onChange(callback){observers.push(callback);callback({...status},ready,error);return()=>{observers=observers.filter(fn=>fn!==callback)}}
function protectGames(escapeHref){
 const overlay=document.createElement('div');overlay.id='mad-games-gate';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:#08172fee;color:#ecf5ff;font-family:system-ui,sans-serif;padding:22px;text-align:center';
 overlay.innerHTML='<div style="max-width:460px;background:#142d51;border:1px solid #537caf;border-radius:18px;padding:28px"><div style="font-size:42px">🔒</div><h1 style="font-size:23px">Cafetería cerrada temporalmente</h1><p id="mad-games-reason">El profesor ha desactivado el acceso a los juegos.</p><a id="mad-games-return" style="display:inline-block;margin-top:16px;padding:10px 17px;background:#317de3;border-radius:9px;color:white;text-decoration:none" href="#">Volver a Mi Aula Digital</a></div>';
 overlay.querySelector('#mad-games-return').setAttribute('href',escapeHref||'index.html');
 function update(){
  const block=!gamesEnabled();
  const wasBlocked=overlay.style.display==='flex';
  overlay.style.display=block?'flex':'none';
  document.documentElement.style.overflow=block?'hidden':'';
  overlay.querySelector('#mad-games-reason').textContent=!ready?'Comprobando el permiso de acceso…':error?'No se pudo comprobar el permiso. Vuelve a intentarlo más tarde.':gamesNotice();
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
 links.forEach(link=>{if(!gamesEnabled()){link.setAttribute('aria-disabled','true');link.style.opacity='.45';link.style.pointerEvents='none';link.title='Cafetería desactivada por el profesor'}else{link.removeAttribute('aria-disabled');link.style.opacity='';link.style.pointerEvents='';link.removeAttribute('title')}})
}

window.MAD_CONTROL={get url(){return url},get remote(){return !!url},get salesSupported(){return salesSupported},get ready(){return ready},get error(){return error},get status(){return {...status}},gamesEnabled,salesEnabled:()=>ready&&!error&&status.salesEnabled===true,examUnlimited:()=>ready&&status.examsUnlocked,refresh,onChange,examVersion,canResetExam,now,dateLabel,timeLabel,phase,labAccess,examWindow,prepareAttempt,attemptNow,attemptDeadline,updateTiming,protectGames,markGameLinks,markSalesLinks,protectSales,localUpdate(data){if(url)throw Error('La sincronización remota está activada');status=parse(data);localStorage.setItem(LOCAL_KEY,JSON.stringify(status));ready=true;notify();return status}};
window.addEventListener('storage',e=>{if(!url&&e.key===LOCAL_KEY)refresh()});
window.addEventListener('focus',()=>{if(url)refresh()});
window.addEventListener('pageshow',()=>{if(url)refresh()});
document.addEventListener('visibilitychange',()=>{if(url&&!document.hidden){notify();refresh()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{onChange(markGameLinks)},{once:true});else{onChange(markGameLinks);}
refresh();if(url)setInterval(refresh,20000);
})();
