(()=>{
"use strict";
const $=id=>document.getElementById(id);
const KEY="mi-aula-digital-tic2-examen-v1", HISTORY_KEY="mi-aula-digital-tic2-examen-historial-v1", MAX_DURATION=2*60*60*1000;
// IMPORTANTE: la clave del profesor se encuentra en el código cliente y NO es un control de acceso seguro.
const RESET_PASSWORD="@Fjhf3005";
let state=null,done=false, interval=null;
function history(){try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(h)?h:[]}catch(e){return []}}
function archive(reason){if(!state)return;const h=history();h.push({student:state.student,started:state.started,finished:state.finished||null,archivedAt:stamp(),archiveReason:reason,html:$("html").value||state.html||"",css:$("css").value||state.css||"",events:state.events||[]});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h))}catch(e){alert("El historial no se ha podido guardar (almacenamiento lleno). Descarga una copia antes de continuar.");throw e}}
function resetExam(){
 const modal=$("resetDialog");$("resetPassword").value="";$("resetPassword").type="password";
 $("toggleResetPassword").textContent="Ver contraseña";$("toggleResetPassword").setAttribute("aria-pressed","false");
 $("resetError").textContent="";
 modal.showModal();$("resetPassword").focus();
}
function confirmReset(){
 const pass=$("resetPassword").value;
 if(pass!==RESET_PASSWORD){$("resetError").textContent="Contraseña incorrecta.";return}
 if(!confirm("El examen actual quedará archivado localmente y podrás iniciar otro con una nueva hora de finalización. ¿Continuar?"))return;
 $("resetDialog").close();$("resetPassword").value="";
try{archive("reinicio autorizado por profesor")}catch(e){return}
if(interval){clearInterval(interval);interval=null}localStorage.removeItem(KEY);state=null;done=false;
$("student").value="";$("endTime").value="";$("endTime").disabled=false;$("endTimeLabel").textContent="Hora de fin: —";$("studentLabel").textContent="";$("alerts").textContent="0 avisos";$("preview").srcdoc="";$("previewStatus").textContent="Sin ejecutar";
$("html").readOnly=false;$("css").readOnly=false;$("execute").disabled=false;$("finish").textContent="Finalizar y descargar entrega";
$("html").value="";$("css").value="";document.dispatchEvent(new Event("exam-code-refresh"));$("timer").textContent="120:00";$("examState").textContent="Examen en curso";$("initialMsg").textContent="Reinicio autorizado. El intento anterior queda archivado en este navegador.";
$("startExam").textContent="Comenzar nuevo examen";$("startScreen").hidden=false;$("examScreen").hidden=true;$("student").focus();
}
const stamp=()=>new Date().toISOString();
function persist(){if(!state)return;state.html=$("html").value;state.css=$("css").value;try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){$("examState").textContent="No se puede guardar localmente: descarga la entrega"}}
function log(type){if(!state||state.finished)return;state.events.push({type,at:stamp()});$("alerts").textContent=state.events.length+" avisos";persist()}
function boot(){let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
if(saved&&saved.started&&saved.deadline){state=saved;$("student").value=saved.student||"";$("endTime").value=saved.endTime||localHHMM(saved.deadline);$("endTime").disabled=true;$("startExam").textContent="Continuar examen iniciado";$("initialMsg").textContent="Hay un examen previo en este navegador. La hora de finalización y la cuenta atrás no se pueden modificar."}
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
function begin(){if(state&&$("student").value.trim()!==state.student){$("initialMsg").textContent="Ya existe un examen iniciado con otro nombre ("+state.student+"). Para cambiar de alumno, usa «Reiniciar examen (profesor)».";return}if(!state){let student=$("student").value.trim();if(!student){$("initialMsg").textContent="Introduce el identificador antes de comenzar.";return}
let now=Date.now(),endTime=$("endTime").value;
 const end=computeEndTime(endTime,now);
 if(end.error){$("initialMsg").textContent=end.error;return}
 state={student,started:stamp(),deadline:end.deadline,endTime,html:"",css:"",events:[],finished:false};
 $("endTime").disabled=true;
}
$("startScreen").hidden=true;$("examScreen").hidden=false;$("html").value=state.html||"";$("css").value=state.css||"";
$("studentLabel").textContent="Alumno: "+state.student;
$("endTime").value=state.endTime||localHHMM(state.deadline);
$("endTime").disabled=true;
$("endTimeLabel").textContent="Hora de fin: "+localHHMM(state.deadline);
$("pasteStatus").textContent=isTeacherTest()?"Copiar y pegar habilitado (fjhallado)":"Pegado bloqueado en el editor";
$("alerts").textContent=(state.events||[]).length+" avisos";
if(state.finished){lock();$("examState").textContent="Examen finalizado. Descarga de nuevo tu entrega si hace falta.";}
else{$("html").focus();tick();interval=setInterval(tick,500)}
$("preview").srcdoc="";$("previewStatus").textContent="Sin ejecutar";document.dispatchEvent(new Event("exam-code-refresh"));persist();
}
function tick(){if(!state||state.finished)return;let ms=Math.max(0,state.deadline-Date.now()),s=Math.ceil(ms/1000);
$("timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
$("timer").classList.toggle("warning",s<=300);
if(ms<=0)finish("tiempo agotado");}
function lock(){done=true;$("html").readOnly=true;$("css").readOnly=true;$("execute").disabled=true;$("finish").textContent="Volver a descargar entrega";}
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
 if(!state)return;
 // srcdoc is loaded again on every click, including edits made only to CSS.
 $("preview").srcdoc=output();
 $("previewStatus").textContent="Actualizando…";
 if(!done)persist();
}
$("preview").addEventListener("load",()=>{if(state)$("previewStatus").textContent="Vista previa actualizada"});
function download(name,contents,type){let blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function finish(reason){if(!state)return;if(!state.finished){state.finished=stamp();state.reason=reason;persist();lock();$("examState").textContent="Examen finalizado ("+reason+"). Descarga y entrega tu archivo.";}
let safe=state.student.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,35);
download("examen_TIC_II_"+safe+".json",JSON.stringify({format:"mi-aula-digital-tic-exam",version:2,...state,historyLocal:history()},null,2),"application/json");
}
const VOID=new Set(["area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"]);
$("html").addEventListener("input",e=>{if(done)return;if(e.inputType==="insertText"&&e.data===">"){let p=$("html").selectionStart,left=$("html").value.slice(0,p),m=left.match(/<([A-Za-z][\w-]*)(?:\s[^<>]*?)?>$/);
if(m&&!VOID.has(m[1].toLowerCase())&&!/\/\s*>$/.test(m[0])){$("html").setRangeText("</"+m[1]+">",p,p,"start");$("html").setSelectionRange(p,p)}}persist()});
$("css").addEventListener("input",persist);
for(let id of ["html","css"]){let e=$(id);e.addEventListener("paste",ev=>{if(isTeacherTest())return;ev.preventDefault();log("intento de pegado")});e.addEventListener("drop",ev=>{if(isTeacherTest())return;ev.preventDefault();log("intento de arrastrar texto")});e.addEventListener("keydown",ev=>{if(!isTeacherTest()&&(ev.ctrlKey||ev.metaKey)&&["v"].includes(ev.key.toLowerCase()))ev.preventDefault();if(ev.key==="Tab"){ev.preventDefault();e.setRangeText("  ",e.selectionStart,e.selectionEnd,"end");persist()}})}
document.addEventListener("visibilitychange",()=>{if(document.hidden)log("pestaña oculta");else tick()});
window.addEventListener("blur",()=>{if(state&&!state.finished)log("ventana sin foco")});
window.addEventListener("beforeunload",persist);
$("toggleResetPassword").onclick=()=>{const input=$("resetPassword"),shown=input.type==="password";input.type=shown?"text":"password";$("toggleResetPassword").textContent=shown?"Ocultar contraseña":"Ver contraseña";$("toggleResetPassword").setAttribute("aria-pressed",String(shown));input.focus()};
$("cancelReset").onclick=()=>$("resetDialog").close();
$("resetPasswordForm").addEventListener("submit",event=>{event.preventDefault();confirmReset()});
$("startExam").onclick=begin;$("resetFromStart").onclick=resetExam;$("resetExam").onclick=resetExam;$("execute").onclick=run;
$("fullscreen").onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{})};
$("finish").onclick=()=>{if(state?.finished||confirm("¿Finalizar el examen? No podrás volver a editar y se descargará el archivo de entrega."))finish("entrega del alumno")};
boot();
})();