(()=>{
"use strict";
const $=id=>document.getElementById(id);
const control=window.MAD_CONTROL, examId="tic";
const KEY="mi-aula-digital-tic2-examen-v1", HISTORY_KEY="mi-aula-digital-tic2-examen-historial-v1", MAX_DURATION=2*60*60*1000;
// IMPORTANTE: la clave del profesor se encuentra en el código cliente y NO es un control de acceso seguro.
const RESET_PASSWORD_DIGEST="4f9d462ffeaf16ab189b3d7e2a6feb2394f7faa2246e94e1cb91c5321c1a47f6";
const SALT='MiAulaDigital-Profesor-v1:';
async function verifyTeacherPassword(pass){const bytes=new TextEncoder().encode(SALT+pass);const raw=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(raw)].map(v=>v.toString(16).padStart(2,'0')).join('')===RESET_PASSWORD_DIGEST;}
let state=null,done=false,interval=null,stale=false,starting=false;
function history(){try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(h)?h:[]}catch(e){return []}}
function archive(reason){if(!state)return;const h=history();h.push({student:state.student,started:state.started,finished:state.finished||null,timing:state.timing||null,archivedAt:stamp(),archiveReason:reason,html:state.html||"",css:state.css||"",events:state.events||[]});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h))}catch(e){alert("El historial no se ha podido guardar (almacenamiento lleno). Descarga una copia antes de continuar.");throw e}}
function resetExam(){
 if(stale)return;
 if(control?.canResetExam(examId,state?.resetVersion)){
  performReset('reinicio autorizado desde el panel del profesor');
  return;
 }
 if(control?.remote)return;
 const modal=$("resetDialog");$("resetPassword").value="";$("resetPassword").type="password";
 $("toggleResetPassword").textContent="Ver contraseña";$("toggleResetPassword").setAttribute("aria-pressed","false");
 $("resetError").textContent="";
 modal.showModal();$("resetPassword").focus();
}
async function confirmReset(){
 if(control?.remote||stale)return;
 const pass=$("resetPassword").value;
 if(!await verifyTeacherPassword(pass)){$("resetError").textContent="Contraseña incorrecta.";return}
 performReset('reinicio autorizado por profesor');
}
function performReset(reason){
 if(stale)return;
 if(!confirm("El examen actual quedará archivado localmente y podrás iniciar otro durante el horario de examen. ¿Continuar?"))return;
 if($("resetDialog").open)$("resetDialog").close();$("resetPassword").value="";
try{archive(reason)}catch(e){return}
if(interval){clearInterval(interval);interval=null}localStorage.removeItem(KEY);state=null;done=false;
$("student").value="";$("endTime").value="";$("endTime").disabled=false;$("endTimeLabel").textContent="Hora de fin: —";$("studentLabel").textContent="";$("alerts").textContent="0 avisos";$("preview").srcdoc="";$("previewStatus").textContent="Sin ejecutar";
$("html").readOnly=false;$("css").readOnly=false;$("execute").disabled=false;$("finish").textContent="Finalizar y descargar entrega";
$("html").value="";$("css").value="";document.dispatchEvent(new Event("exam-code-refresh"));$("timer").textContent="120:00";$("examState").textContent="Examen en curso. Cambiar de pestaña finaliza el intento.";$("initialMsg").textContent="Reinicio autorizado. El intento anterior queda archivado en este navegador.";
$("startExam").textContent="Comenzar nuevo examen";$("startScreen").hidden=false;$("examScreen").hidden=true;updateExamAccess();$("student").focus();
}
const stamp=()=>new Date().toISOString();
function persist(){if(!state||stale||$("examScreen").hidden)return;state.html=$("html").value;state.css=$("css").value;try{
 const previous=JSON.parse(localStorage.getItem(KEY)||'null');
 if(previous?.started===state.started&&previous.finished&&previous.finished!==state.finished)return;
 localStorage.setItem(KEY,JSON.stringify(state));
}catch(e){$("examState").textContent="No se puede guardar localmente: descarga la entrega"}}
function log(type){if(!state||state.finished)return;(state.events??=[]).push({type,at:stamp()});$("alerts").textContent=state.events.length+" avisos";persist()}
function boot(){let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
if(saved&&saved.started&&saved.deadline){state=saved;$("student").value=saved.student||"";$("endTime").value=saved.endTime||deadlineLabel();$("endTime").disabled=true;$("startExam").textContent="Continuar examen iniciado";$("initialMsg").textContent="Hay un examen previo en este navegador. El tiempo del intento se conserva al volver a entrar."}
}
function localHHMM(timestamp){const d=new Date(timestamp);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function computeEndTime(value, now){
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return {error:"Introduce una hora de finalización válida (HH:MM)."};
 const [hour,minute]=value.split(":").map(Number);
 const end=new Date(now);end.setHours(hour,minute,0,0);
 // A time just past midnight can be the following day, but never more than two hours ahead.
 if(end.getTime()<=now)end.setDate(end.getDate()+1);
 const ms=end.getTime()-now;
 if(ms>MAX_DURATION)return {error:"La hora de finalización debe estar dentro de las próximas 2 horas. Comprueba la hora indicada por el profesor."};
 if(ms<1000)return {error:"La hora de finalización debe ser posterior a la hora actual."};
 return {deadline:end.getTime()};
}
function isTeacherTest(){return state?.student?.trim().toLowerCase()==="fjhallado"}
function clockNow(){return state?.timing?control.attemptNow(state.timing):Date.now()}
function deadlineLabel(){return state.timing?control.timeLabel(state.deadline):localHHMM(state.deadline)}
async function begin(){
 if(stale||starting)return;
 const student=$("student").value.trim();
 if(state&&student!==state.student){
  $("initialMsg").textContent="Ya existe un examen iniciado con otro nombre. Para cambiar de alumno, usa «Reiniciar examen (profesor)».";
  return;
 }
 if(!state){
  if(!student){$("initialMsg").textContent="Introduce el identificador antes de comenzar.";return}
  starting=true;
  updateExamAccess();
  const attempt=control?await control.prepareAttempt(examId):{timing:null,resetVersion:0};
  starting=false;
  updateExamAccess();
  if(stale)return;
  if(attempt.error){$("initialMsg").textContent=attempt.error;return}
  const {timing,resetVersion}=attempt;
  const endTime=timing?'':$("endTime").value;
  const end=timing?{deadline:control.attemptDeadline(timing)}:computeEndTime(endTime,Date.now());
  if(end.error){$("initialMsg").textContent=end.error;return}
  state={student,started:new Date(timing?control.attemptNow(timing):Date.now()).toISOString(),resetVersion,timing,deadline:end.deadline,endTime,html:"",css:"",events:[],finished:false};
 }
$("startScreen").hidden=true;$("examScreen").hidden=false;$("html").value=state.html||"";$("css").value=state.css||"";
$("studentLabel").textContent="Alumno: "+state.student;
$("endTime").value=state.endTime||deadlineLabel();
$("endTime").disabled=true;
$("endTimeLabel").textContent="Hora de fin: "+deadlineLabel()+(state.timing?" (hora peninsular)":"");
$("pasteStatus").textContent=isTeacherTest()?"Copiar y pegar habilitado (fjhallado)":"Pegado bloqueado en el editor";
$("alerts").textContent=(state.events||[]).length+" avisos";
if(state.finished){lock();showCompletion();}
else if(!tick()){$("html").focus();interval=setInterval(tick,500)}
$("preview").srcdoc="";$("previewStatus").textContent="Sin ejecutar";document.dispatchEvent(new Event("exam-code-refresh"));persist();updateResetFreedom();checkNavigation();
}
function tick(){
 if(!state||state.finished||$("examScreen").hidden)return false;
 const ms=Math.max(0,state.deadline-clockNow()),s=Math.ceil(ms/1000);
 $("timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
 $("timer").classList.toggle("warning",s<=300);
 if(ms>0)return false;
 finish("tiempo agotado",!state.timing);
 return true;
}
function lock(){done=true;$("html").readOnly=true;$("css").readOnly=true;$("execute").disabled=true;$("finish").textContent=state.timing&&state.reason==="tiempo agotado"?"Descargar entrega":"Volver a descargar entrega";}
function output(){
 const css=$("css").value;
 // The CSS editor is a separate file, but the preview must combine both editors.
 const style="<style data-preview-css>"+css.replace(/<\/style/gi,"<\\/style")+"</style>";
 let content=$("html").value;
 if(!content.trim())return "<!doctype html><html lang=\"es\"><head>"+style+"</head><body></body></html>";
 if(/<\/head\s*>/i.test(content))return content.replace(/<\/head\s*>/i,style+"</head>");
 if(/<head\b[^>]*>/i.test(content))return content.replace(/<head\b[^>]*>/i,m=>m+style);
 if(/<html\b[^>]*>/i.test(content))return content.replace(/<html\b[^>]*>/i,m=>m+"<head>"+style+"</head>");
 return '<!doctype html><html lang="es"><head><meta charset="UTF-8">'+style+'</head><body>'+content+'</body></html>';
}
function run(){
 if(!state||tick()||done)return;
 // srcdoc is loaded again on every click, including edits made only to CSS.
 $("preview").srcdoc=output();
 $("previewStatus").textContent="Actualizando…";
 if(!done)persist();
}
$("preview").addEventListener("load",()=>{if(state)$("previewStatus").textContent="Vista previa actualizada"});
function download(name,contents,type){let blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function showCompletion(){
 $("examState").textContent=state.reason==="intento de navegación"?
  'Examen finalizado por intento de navegación. Si el archivo no se descargó, usa «Volver a descargar entrega» y súbelo a Teams.':
  'Examen finalizado. Descarga la entrega si la necesitas.';
}
function finish(reason,downloadFile=true){if(!state)return;if(!state.finished){clearInterval(interval);interval=null;state.finished=new Date(reason==="tiempo agotado"?state.deadline:clockNow()).toISOString();state.reason=reason;persist();lock();showCompletion();}
if(!downloadFile)return;
let safe=state.student.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,35);
download("examen_TIC_II_"+safe+".json",JSON.stringify({format:"mi-aula-digital-tic-exam",version:2,...state,historyLocal:history()},null,2),"application/json");
}
const VOID=new Set(["area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"]);
$("html").addEventListener("input",e=>{if(done||tick())return;if(e.inputType==="insertText"&&e.data===">"){let p=$("html").selectionStart,left=$("html").value.slice(0,p),m=left.match(/<([A-Za-z][\w-]*)(?:\s[^<>]*?)?>$/);
if(m&&!VOID.has(m[1].toLowerCase())&&!/\/\s*>$/.test(m[0])){$("html").setRangeText("</"+m[1]+">",p,p,"start");$("html").setSelectionRange(p,p)}}persist()});
$("css").addEventListener("input",()=>{if(!done&&!tick())persist()});
for(const id of ["html","css"])$(id).addEventListener("beforeinput",event=>{if(done||tick())event.preventDefault()});
for(let id of ["html","css"]){let e=$(id);e.addEventListener("paste",ev=>{if(isTeacherTest())return;ev.preventDefault();log("intento de pegado")});e.addEventListener("drop",ev=>{if(isTeacherTest())return;ev.preventDefault();log("intento de arrastrar texto")});e.addEventListener("keydown",ev=>{if(!isTeacherTest()&&(ev.ctrlKey||ev.metaKey)&&["v"].includes(ev.key.toLowerCase()))ev.preventDefault();if(ev.key==="Tab"&&!done&&!tick()){ev.preventDefault();e.setRangeText("  ",e.selectionStart,e.selectionEnd,"end");persist()}})}
const checkNavigation=window.MADExamNavigation.watch({
 active:()=>!!state&&!state.finished&&!stale&&!$("examScreen").hidden,
 leave(reason){log(reason);finish(reason);},
 returnToExam:tick
});
window.addEventListener("beforeunload",persist);
$("toggleResetPassword").onclick=()=>{const input=$("resetPassword"),shown=input.type==="password";input.type=shown?"text":"password";$("toggleResetPassword").textContent=shown?"Ocultar contraseña":"Ver contraseña";$("toggleResetPassword").setAttribute("aria-pressed",String(shown));input.focus()};
$("cancelReset").onclick=()=>$("resetDialog").close();
$("resetPasswordForm").addEventListener("submit",event=>{event.preventDefault();confirmReset()});
function updateExamAccess(){
 const window=control?.examWindow(examId);
 $("startExam").disabled=starting||(!state&&window?.allowed===false);
 $("manualDeadline").hidden=!!(state?state.timing:window?.schedule);
 $("examScheduleNotice").textContent=state?'':window?.message||'';
 if(state?.timing&&!state.finished){
  if(control.updateTiming(examId,state.timing)){
   state.deadline=control.attemptDeadline(state.timing);
   $("endTimeLabel").textContent="Hora de fin: "+deadlineLabel()+(state.timing?" (hora peninsular)":"");
   if($("examScreen").hidden){
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
   }else persist();
  }
  if(!$("examScreen").hidden)tick();
  else if(control.ready&&state.deadline<=clockNow()){
   $("student").value=state.student;
   begin();
  }
 }
 updateResetFreedom();
}
function updateResetFreedom(){
 const allowed=!!control?.canResetExam(examId,state?.resetVersion);
 for(const id of ['resetFromStart','resetExam']){
  const button=$(id);
  button.disabled=!!control?.remote&&(!state||!allowed);
  button.textContent=allowed?'🔓 Nuevo intento autorizado':'🔒 Reiniciar examen (profesor)';
  button.title=button.disabled?'El profesor puede autorizar otro intento desde su panel.':'';
 }
}
window.addEventListener('storage',event=>{
 if(event.key!==KEY||stale)return;
 let previous,current;
 try{previous=JSON.parse(event.oldValue);current=JSON.parse(event.newValue)}catch{return}
 if(previous?.started===current?.started&&previous?.finished===current?.finished)return;
 stale=true;
 location.reload();
});
$("startExam").onclick=begin;$("resetFromStart").onclick=resetExam;$("resetExam").onclick=resetExam;$("execute").onclick=run;
$("fullscreen").onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{})};
$("finish").onclick=()=>{if(tick())return;if(state?.finished||confirm("¿Finalizar el examen? No podrás volver a editar y se descargará el archivo de entrega.")){if(!tick())finish("entrega del alumno")}};
boot();
if(state?.finished)begin();
if(control)control.onChange(updateExamAccess);else updateExamAccess();
})();
