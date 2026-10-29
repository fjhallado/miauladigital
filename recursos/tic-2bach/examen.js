(()=>{
"use strict";
const $=id=>document.getElementById(id);
const KEY="mi-aula-digital-tic2-examen-v1", HISTORY_KEY="mi-aula-digital-tic2-examen-historial-v1", DURATION=50*60*1000;
// IMPORTANTE: la clave del profesor se encuentra en el código cliente y NO es un control de acceso seguro.
const RESET_PASSWORD="@Fjhf3005";
let state=null,done=false, interval=null;
function history(){try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(h)?h:[]}catch(e){return []}}
function archive(reason){if(!state)return;const h=history();h.push({student:state.student,started:state.started,finished:state.finished||null,archivedAt:stamp(),archiveReason:reason,html:$("html").value||state.html||"",css:$("css").value||state.css||"",events:state.events||[]});try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h))}catch(e){alert("El historial no se ha podido guardar (almacenamiento lleno). Descarga una copia antes de continuar.");throw e}}
function resetExam(){const pass=prompt("Contraseña del profesor para reiniciar el examen:");if(pass===null)return;if(pass!==RESET_PASSWORD){alert("Contraseña incorrecta.");return}if(!confirm("El examen actual quedará archivado localmente y se iniciará otro examen de 50 minutos. ¿Continuar?"))return;
try{archive("reinicio autorizado por profesor")}catch(e){return}
if(interval){clearInterval(interval);interval=null}localStorage.removeItem(KEY);state=null;done=false;
$("html").readOnly=false;$("css").readOnly=false;$("execute").disabled=false;$("finish").textContent="Finalizar y descargar entrega";
$("html").value="";$("css").value="";$("timer").textContent="50:00";$("examState").textContent="Examen en curso";$("initialMsg").textContent="Reinicio autorizado. El intento anterior queda archivado en este navegador.";
$("startExam").textContent="Comenzar nuevo examen de 50 minutos";$("startScreen").hidden=false;$("examScreen").hidden=true;
}
const stamp=()=>new Date().toISOString();
function persist(){if(!state)return;state.html=$("html").value;state.css=$("css").value;try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){$("examState").textContent="No se puede guardar localmente: descarga la entrega"}}
function log(type){if(!state||state.finished)return;state.events.push({type,at:stamp()});$("alerts").textContent=state.events.length+" avisos";persist()}
function boot(){let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
if(saved&&saved.started&&saved.deadline){state=saved;$("student").value=saved.student||"";$("startExam").textContent="Continuar examen iniciado";$("initialMsg").textContent="Hay un examen previo en este navegador. Su cuenta atrás no se reiniciará."}
}
function begin(){if(!state){let student=$("student").value.trim();if(!student){$("initialMsg").textContent="Introduce el identificador antes de comenzar.";return}
let now=Date.now();state={student,started:stamp(),deadline:now+DURATION,html:'<!doctype html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <title>Mi examen</title>\n</head>\n<body>\n  \n</body>\n</html>',css:"",events:[],finished:false};}
$("startScreen").hidden=true;$("examScreen").hidden=false;$("html").value=state.html||"";$("css").value=state.css||"";
$("studentLabel").textContent="Alumno: "+state.student;
$("alerts").textContent=(state.events||[]).length+" avisos";
if(state.finished){lock();$("examState").textContent="Examen finalizado. Descarga de nuevo tu entrega si hace falta.";}
else{$("html").focus();tick();interval=setInterval(tick,500)}
run();persist();
}
function tick(){if(!state||state.finished)return;let ms=Math.max(0,state.deadline-Date.now()),s=Math.ceil(ms/1000);
$("timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
$("timer").classList.toggle("warning",s<=300);
if(ms<=0)finish("tiempo agotado");}
function lock(){done=true;$("html").readOnly=true;$("css").readOnly=true;$("execute").disabled=true;$("finish").textContent="Volver a descargar entrega";}
function output(){const style="<style>"+$("css").value.replace(/<\/style/gi,"<\\/style")+"</style>";
let content=$("html").value;if(/<\/head>/i.test(content))return content.replace(/<\/head>/i,style+"</head>");
return '<!doctype html><html lang="es"><head><meta charset="UTF-8">'+style+'</head><body>'+content+'</body></html>';}
function run(){$("preview").srcdoc=output();if(!done)persist()}
function download(name,contents,type){let blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function finish(reason){if(!state)return;if(!state.finished){state.finished=stamp();state.reason=reason;persist();lock();$("examState").textContent="Examen finalizado ("+reason+"). Descarga y entrega tu archivo.";}
let safe=state.student.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,35);
download("examen_TIC_II_"+safe+".json",JSON.stringify({format:"mi-aula-digital-tic-exam",version:2,...state,historyLocal:history()},null,2),"application/json");
}
const VOID=new Set(["area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"]);
$("html").addEventListener("input",e=>{if(done)return;if(e.inputType==="insertText"&&e.data===">"){let p=$("html").selectionStart,left=$("html").value.slice(0,p),m=left.match(/<([A-Za-z][\w-]*)(?:\s[^<>]*?)?>$/);
if(m&&!VOID.has(m[1].toLowerCase())&&!/\/\s*>$/.test(m[0])){$("html").setRangeText("</"+m[1]+">",p,p,"start");$("html").setSelectionRange(p,p)}}persist()});
$("css").addEventListener("input",persist);
for(let id of ["html","css"]){let e=$(id);e.addEventListener("paste",ev=>{ev.preventDefault();log("intento de pegado")});e.addEventListener("drop",ev=>{ev.preventDefault();log("intento de arrastrar texto")});e.addEventListener("keydown",ev=>{if((ev.ctrlKey||ev.metaKey)&&["v"].includes(ev.key.toLowerCase()))ev.preventDefault();if(ev.key==="Tab"){ev.preventDefault();e.setRangeText("  ",e.selectionStart,e.selectionEnd,"end");persist()}})}
document.addEventListener("visibilitychange",()=>{if(document.hidden)log("pestaña oculta");else tick()});
window.addEventListener("blur",()=>{if(state&&!state.finished)log("ventana sin foco")});
window.addEventListener("beforeunload",persist);
$("startExam").onclick=begin;$("resetFromStart").onclick=resetExam;$("resetExam").onclick=resetExam;$("execute").onclick=run;
$("fullscreen").onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{})};
$("finish").onclick=()=>{if(state?.finished||confirm("¿Finalizar el examen? No podrás volver a editar y se descargará el archivo de entrega."))finish("entrega del alumno")};
boot();
})();