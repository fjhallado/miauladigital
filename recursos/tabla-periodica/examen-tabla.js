/* Examen mixto: usa el conjunto de elementos y los filtros definidos por el laboratorio. */
(()=>{'use strict';
if(!document.body.classList.contains('exam-only'))return;
const $=id=>document.getElementById(id),modeLabels={simbolos:'Nombre → símbolo',nombres:'Símbolo → nombre',ubicacion:'Ubicación en la tabla'};
let items=[],index=0,student='',finished=false,report=null,started=null;let navigationAlerts=[],lastNavigation=0;
const STORE='mi-aula-digital-examen-periodica-v1', ARCHIVE='mi-aula-digital-examen-periodica-archivo-v1';
// Mismo código de recuperación que el examen de TIC II. En web estática la contraseña
// es una barrera de interfaz, no una autenticación resistente a manipulación del navegador.
const RESET_PASSWORD_DIGEST='4f9d462ffeaf16ab189b3d7e2a6feb2394f7faa2246e94e1cb91c5321c1a47f6';
const SALT='MiAulaDigital-Profesor-v1:';
async function verifyTeacherPassword(pass){const bytes=new TextEncoder().encode(SALT+pass);const raw=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(raw)].map(v=>v.toString(16).padStart(2,'0')).join('')===RESET_PASSWORD_DIGEST;}
const examPage=!!$('exam-reset-dialog');
const control=window.MAD_CONTROL, examId='periodica';
let selectionSnapshot=null,resetVersion=0,stale=false,timing=null,interval=null,starting=false;
function clockNow(){return timing?control.attemptNow(timing):Date.now()}
function saveExam(){if(!examPage||!started||stale)return;try{localStorage.setItem(STORE,JSON.stringify({items,index,student,finished,report,started,resetVersion,timing,selection:selectionSnapshot,navigationAlerts}))}catch(e){console.warn('No se ha podido guardar el examen',e);if($('exam-aviso'))$('exam-aviso').textContent='Atención: el navegador no puede guardar el examen. Descarga tu entrega en cuanto termines.'}}
function captureSelection(){return {mode:choiceMode.value,groups:[...chosenGroups],families:[...chosenFamilies],lanthanides:lanthanidesCheck.checked,actinides:actinidesCheck.checked,scope:$('alcance').value,count:$('exam-cantidad').value}}
function restoreSelection(s){if(!s)return;choiceMode.value=s.mode||'grupos';chosenGroups.clear();(s.groups||[]).forEach(x=>chosenGroups.add(x));chosenFamilies.clear();(s.families||[]).forEach(x=>chosenFamilies.add(x));lanthanidesCheck.checked=!!s.lanthanides;actinidesCheck.checked=!!s.actinides;$('alcance').value=s.scope||'118';$('exam-cantidad').value=s.count||'15';drawOptions();selectionSummary()}
function lockSelection(locked){$('tipo-seleccion').disabled=locked;$('alcance').disabled=locked;$('exam-cantidad').disabled=locked;$('exam-alumno').readOnly=locked;for(const id of ['incluir-lantanidos','incluir-actinidos','seleccionar-todo','borrar-seleccion'])$(id).disabled=locked;document.querySelectorAll('#opciones-seleccion input').forEach(el=>el.disabled=locked)}
function updateVisibility(){if(!examPage)return;document.body.classList.toggle('exam-in-progress',!!started&&!finished);document.body.classList.toggle('exam-finished',!!started&&!!finished);$('exam-config').hidden=!!started;$('exam-sesion').hidden=!started||finished;$('exam-resultado').hidden=!finished;lockSelection(!!started);if($('exam-alert-count'))$('exam-alert-count').textContent=navigationAlerts.length+' avisos de navegación';if(started){$('exam-identidad').textContent=student;$('exam-alumno').value=student}}
function showResults(){if(!report)return;const score=report.nota,correct=report.aciertos;
 if($('exam-fin'))$('exam-fin').textContent=report.motivo_fin==='tiempo agotado'?'Tiempo agotado. Descarga tu entrega.':'';
 $('exam-nota').textContent=`${score.toFixed(2).replace('.',',')} / 10`;
 $('exam-resumen').textContent=`${correct} de ${items.length} correctas · ${student}`;if($('exam-alert-summary'))$('exam-alert-summary').textContent=`Registro de navegación: ${navigationAlerts.length} avisos. Los cambios de pestaña no prueban que se hayan consultado respuestas.`;
 $('exam-detalle').replaceChildren();report.respuestas.forEach(r=>{let a=document.createElement('article');a.className='exam-review-item '+(r.correcta?'ok':'bad');let head=document.createElement('strong');head.textContent=`${r.numero}. ${modeLabels[r.tipo]} · ${r.correcta?'Correcta':'Incorrecta'}`;let p=document.createElement('p');p.textContent=`Tu respuesta: ${r.respuesta} · Solución: ${r.solucion}`;a.append(head,p);$('exam-detalle').append(a)})}
function bootExam(){if(!examPage)return;let saved;try{saved=JSON.parse(localStorage.getItem(STORE)||'null')}catch(e){};if(!saved||!saved.started||!Array.isArray(saved.items)||!saved.items.length){updateVisibility();return}
 ({items,index,student,finished,report,started}=saved);index=Math.min(Math.max(0,Number(index)||0),items.length-1);resetVersion=saved.resetVersion||0;timing=saved.timing||null;selectionSnapshot=saved.selection;navigationAlerts=Array.isArray(saved.navigationAlerts)?saved.navigationAlerts:[];restoreSelection(selectionSnapshot);$('exam-alumno').value=student;updateVisibility();if(finished){showResults()}else{render();$('exam-aviso').textContent='Examen recuperado. Las respuestas anteriores y la selección permanecen guardadas.';startTimer()}}
function resetDialog(){if(!examPage||stale)return;if(control?.canResetExam(examId,resetVersion)){authorizeReset(true);return;}if(control?.remote)return;const d=$('exam-reset-dialog');$('exam-reset-password').value='';$('exam-reset-password').type='password';$('exam-ver-password').textContent='Ver contraseña';$('exam-ver-password').setAttribute('aria-pressed','false');$('exam-reset-error').textContent='';d.showModal();$('exam-reset-password').focus()}
async function authorizeReset(free=false){if(stale||(!free&&control?.remote))return;if(!free&&!await verifyTeacherPassword($('exam-reset-password').value)){$('exam-reset-error').textContent='Contraseña incorrecta.';return}if(!confirm('¿Iniciar un nuevo intento? El anterior quedará archivado únicamente en este navegador.'))return;
 try{if(started){let hist=JSON.parse(localStorage.getItem(ARCHIVE)||'[]');if(!Array.isArray(hist))hist=[];hist.push({student,started,finished,timing,selection:selectionSnapshot,items,report,navigationAlerts,archivedAt:new Date().toISOString()});localStorage.setItem(ARCHIVE,JSON.stringify(hist))}}catch(e){alert('No se ha podido archivar el examen. Comprueba el almacenamiento antes de reiniciar.');return}
 clearInterval(interval);interval=null;timing=null;localStorage.removeItem(STORE);items=[];index=0;student='';finished=false;report=null;started=null;selectionSnapshot=null;navigationAlerts=[];lastNavigation=0;if($('exam-reset-dialog').open)$('exam-reset-dialog').close();$('exam-alumno').value='';$('exam-pregunta').replaceChildren();$('exam-detalle').replaceChildren();updateVisibility();selectionSummary();updateExamAccess();$('exam-estado').textContent='Reinicio autorizado. Ya puedes comenzar un nuevo examen.';$('exam-alumno').focus();}
function updateResetFreedom(){
 const allowed=!!control?.canResetExam(examId,resetVersion);
 document.querySelectorAll('.exam-reset-control').forEach(button=>{
  button.disabled=!!control?.remote&&(!started||!allowed);
  button.textContent=allowed?'🔓 Nuevo intento autorizado':'🔒 Reiniciar examen (profesor)';
  button.title=button.disabled?'El profesor puede autorizar otro intento desde su panel.':'';
 });
}
if(examPage){$('exam-reiniciar-inicio').addEventListener('click',resetDialog);$('exam-reiniciar-sesion').addEventListener('click',resetDialog);$('exam-cancelar-reset').addEventListener('click',()=>$('exam-reset-dialog').close());$('exam-ver-password').addEventListener('click',()=>{const input=$('exam-reset-password');let show=input.type==='password';input.type=show?'text':'password';$('exam-ver-password').textContent=show?'Ocultar contraseña':'Ver contraseña';$('exam-ver-password').setAttribute('aria-pressed',String(show))});$('exam-reset-form').addEventListener('submit',e=>{e.preventDefault();authorizeReset()})}

const shuffle=a=>{let v=[...a];for(let i=v.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[v[i],v[j]]=[v[j],v[i]]}return v};
function selectionSummary(){let pool=filteredElements();$('exam-seleccion').textContent=`Selección actual: ${pool.length} elementos disponibles · ${choiceMode.value==='grupos'?chosenGroups.size+' columnas':chosenFamilies.size+' familias'}${choiceMode.value==='grupos'&&lanthanidesCheck.checked?' · Lantánidos':''}${choiceMode.value==='grupos'&&actinidesCheck.checked?' · Actínidos':''}. El examen se generará con esta selección.`;}
$('tipo-seleccion').addEventListener('change',selectionSummary);$('alcance').addEventListener('change',selectionSummary);$('opciones-seleccion').addEventListener('change',selectionSummary);$('incluir-lantanidos').addEventListener('change',selectionSummary);$('incluir-actinidos').addEventListener('change',selectionSummary);$('seleccionar-todo').addEventListener('click',selectionSummary);$('borrar-seleccion').addEventListener('click',selectionSummary);selectionSummary();
// Mix types as evenly as possible, shuffle question order, and avoid repeating an element
// until the available pool has been exhausted.
function createQuestions(pool,count){let source=shuffle(pool),cursor=0,used=new Set(),result=[];const types=shuffle(Array.from({length:count},(_,i)=>['simbolos','nombres','ubicacion'][i%3]));
 for(const type of types){let e=source.find(x=>!used.has(x.n));if(!e){source=shuffle(pool);used.clear();e=source[0]}used.add(e.n);result.push({type,n:e.n,answer:null});}
 return result;
}
function byElement(q){return elements[q.n-1]}
function savedAnswers(){return items.filter(q=>q.answer!==null&&String(q.answer).trim()!=='').length}
function renderBoard(selected){let html='<div class="exam-table-scroller" tabindex="0" aria-label="Tabla periódica vacía: desliza para ver todas las columnas"><div class="exam-grid" role="group" aria-label="Elige la posición del elemento">';
 html+='<span class="exam-axis" style="grid-column:1;grid-row:1">G/P</span>';
 for(let g=1;g<=18;g++)html+=`<span class="exam-axis" style="grid-column:${g+1};grid-row:1" title="${groupNames[g-1]}">${g}</span>`;
 for(let p=1;p<=9;p++)html+=`<span class="exam-axis" style="grid-column:1;grid-row:${p<=7?p+1:p+2}">${p<=7?p:p===8?'La–Lu':'Ac–Lr'}</span>`;
 for(const el of elements){let row=el.p<=7?el.p+1:el.p+2;html+=`<button type="button" class="exam-cell${selected===el.n?' picked':''}" data-exam-position="${el.n}" style="grid-column:${el.g+1};grid-row:${row}" aria-label="Grupo ${el.g}, ${el.p>7?'serie inferior':'periodo '+el.p}" aria-pressed="${selected===el.n}" title="Grupo ${el.g} · ${el.p>7?'serie inferior':'periodo '+el.p}"></button>`}
 html+='</div></div>';return html;}
function render(){let q=items[index],el=byElement(q),body=$('exam-pregunta');$('exam-identidad').textContent=student;$('exam-progreso').textContent=`Pregunta ${index+1} de ${items.length}`;$('exam-barra').style.width=`${100*savedAnswers()/items.length}%`;$('exam-contador').textContent=`${savedAnswers()} de ${items.length} respondidas`;
 let prompt=q.type==='simbolos'?`¿Cuál es el símbolo del ${el.name}?`:q.type==='nombres'?`¿Cómo se llama el elemento ${el.symbol}?`:`¿Dónde colocarías ${el.symbol} en la tabla periódica?`;
 body.innerHTML=`<span class="exam-question-kind">${modeLabels[q.type]}</span><h3>${index+1}. ${prompt}</h3>`;
 if(q.type==='ubicacion'){
  body.insertAdjacentHTML('beforeend',renderBoard(q.answer));body.insertAdjacentHTML('beforeend',`<p class="exam-position-hint" id="exam-position-text">${q.answer?'Casilla seleccionada. Puedes cambiarla antes de entregar.':'Pulsa una casilla. No aparecerán nombres, símbolos ni números atómicos como ayuda.'}</p>`);
  body.querySelectorAll('[data-exam-position]').forEach(b=>b.addEventListener('click',()=>{if(finished||tickExam())return;q.answer=Number(b.dataset.examPosition);body.querySelectorAll('[data-exam-position]').forEach(x=>{let chosen=x===b;x.classList.toggle('picked',chosen);x.setAttribute('aria-pressed',String(chosen))});$('exam-position-text').textContent='Casilla seleccionada. Puedes cambiarla antes de entregar.';$('exam-barra').style.width=`${100*savedAnswers()/items.length}%`;$('exam-contador').textContent=`${savedAnswers()} de ${items.length} respondidas`;saveExam();}));
 }else{let input=document.createElement('input');input.className='exam-answer';input.type='text';input.autocomplete='off';input.spellcheck=false;input.placeholder='Escribe tu respuesta';input.setAttribute('aria-label','Respuesta a la pregunta '+(index+1));input.value=q.answer??'';input.addEventListener('input',()=>{if(finished||tickExam())return;q.answer=input.value;$('exam-barra').style.width=`${100*savedAnswers()/items.length}%`;$('exam-contador').textContent=`${savedAnswers()} de ${items.length} respondidas`;saveExam()});body.append(input)}
 $('exam-anterior').disabled=index===0;$('exam-siguiente').disabled=index===items.length-1;$('exam-aviso').textContent='Puedes retroceder para revisar las respuestas antes de terminar.';
}
$('exam-empezar').addEventListener('click',async()=>{if(stale||starting)return;if(examPage&&started){$('exam-estado').textContent='Ya existe un examen iniciado. Solo el profesor puede reiniciarlo.';return}let name=$('exam-alumno').value.trim().replace(/\s+/g,' ');if(!name){$('exam-alumno').focus();$('exam-seleccion').textContent='Escribe tu nombre y apellidos antes de comenzar.';return}let pool=filteredElements(),count=Number($('exam-cantidad').value);if(!pool.length){selectionSummary();$('exam-seleccion').textContent+=' Selecciona al menos una columna o familia con elementos disponibles.';return}if(examPage&&control){
 starting=true;
 updateExamAccess();
 const attempt=await control.prepareAttempt(examId);
 starting=false;
 updateExamAccess();
 if(stale)return;
 if(attempt.error){$('exam-estado').textContent=attempt.error;return}
 ({timing,resetVersion}=attempt);
 $('exam-estado').textContent='';
 }
 student=name;navigationAlerts=[];lastNavigation=0;items=createQuestions(pool,count);index=0;started=new Date(clockNow()).toISOString();selectionSnapshot=captureSelection();finished=false;report=null;saveExam();lockSelection(true);$('exam-config').hidden=true;$('exam-resultado').hidden=true;$('exam-sesion').hidden=false;updateVisibility();render();updateExamAccess();startTimer();$('examen-tabla').scrollIntoView({behavior:'smooth',block:'start'});});
$('exam-anterior').addEventListener('click',()=>{if(!finished&&!tickExam()&&index){index--;render();saveExam()}});$('exam-siguiente').addEventListener('click',()=>{if(!finished&&!tickExam()&&index<items.length-1){index++;render();saveExam()}});
function grading(q){const e=byElement(q);if(q.type==='ubicacion')return q.answer===e.n;return matches(String(q.answer??''),e,q.type)}
function expected(q){let e=byElement(q);return q.type==='simbolos'?e.symbol:q.type==='nombres'?e.name:`Grupo ${e.g}, ${e.p>7?'serie inferior':`período ${e.p}`}`}
function submitted(q){if(q.type!=='ubicacion')return String(q.answer??'').trim()||'(sin respuesta)';const e=elements[Number(q.answer)-1];return e?`Grupo ${e.g}, ${e.p>7?'serie inferior':`período ${e.p}`}`:'(sin respuesta)'}
function finishExam(reason){
 if(finished||!items.length)return;
 finished=true;
 clearInterval(interval);
 interval=null;
 const correct=items.filter(grading).length,score=correct/items.length*10;
 report={tipo:'Examen mixto de tabla periódica · Mi Aula Digital',version:'1.4.55',alumno:student,inicio:started,fin:new Date(reason==='tiempo agotado'?control.attemptDeadline(timing):clockNow()).toISOString(),motivo_fin:reason,preguntas:items.length,aciertos:correct,nota:Number(score.toFixed(2)),avisos_navegacion:navigationAlerts,numero_avisos_navegacion:navigationAlerts.length,seleccion:{modo:choiceMode.value,grupos:[...chosenGroups],familias:[...chosenFamilies],lantanidos:lanthanidesCheck.checked,actinidos:actinidesCheck.checked,alcance:Number($('alcance').value)},respuestas:items.map((q,i)=>({numero:i+1,tipo:q.type,elemento:byElement(q).name,simbolo:byElement(q).symbol,respuesta:submitted(q),respuesta_posicion:q.type==='ubicacion'?q.answer:null,solucion:expected(q),correcta:grading(q)}))};
 showResults();
 $('exam-sesion').hidden=true;
 $('exam-resultado').hidden=false;
 updateVisibility();
 saveExam();
}
$('exam-entregar').addEventListener('click',()=>{
 if(finished||tickExam())return;
 const left=items.length-savedAnswers();
 if(left&&!confirm(`Quedan ${left} preguntas sin responder. ¿Quieres terminar y corregir igualmente?`))return;
 if(confirm('¿Finalizar el examen? Después no podrás modificar las respuestas.')&&!tickExam()){
  finishExam('entrega del alumno');
 }
});
function tickExam(){
 if(!timing||finished||stale)return false;
 const deadline=control.attemptDeadline(timing);
 const seconds=Math.max(0,Math.ceil((deadline-clockNow())/1000));
 const clock=$('exam-reloj');
 clock.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · Fin '+control.timeLabel(deadline)+' (hora peninsular)';
 if(seconds>0)return false;
 finishExam('tiempo agotado');
 return true;
}
function startTimer(){
 const clock=$('exam-reloj');
 if(!clock)return;
 clock.hidden=!timing;
 if(timing&&!finished&&!tickExam()){
  clearInterval(interval);
  interval=setInterval(tickExam,500);
 }
}
function updateExamAccess(){
 if(!examPage)return;
 const window=control?.examWindow(examId);
 $('exam-empezar').disabled=starting||window?.allowed===false;
 $('exam-horario').textContent=window?.message||'';
 if(!finished&&control?.updateTiming(examId,timing))saveExam();
 tickExam();
 updateResetFreedom();
}
function filename(ext){let s=student.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,55);return 'Examen_Tabla_Periodica_'+(s||'alumno')+'.'+ext}
function download(data,mime,name){let b=new Blob([data],{type:mime}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
$('exam-descargar-json').addEventListener('click',()=>{if(report)download(JSON.stringify(report,null,2),'application/json;charset=utf-8',filename('json'))});
$('exam-descargar-csv').addEventListener('click',()=>{if(!report)return;let rows=[['Alumno','Nota','Nº','Tipo','Respuesta','Solución','Correcta'],...report.respuestas.map(r=>[report.alumno,report.nota,r.numero,modeLabels[r.tipo],r.respuesta,r.solucion,r.correcta?'Sí':'No'])];let csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');download(csv,'text/csv;charset=utf-8',filename('csv'))});
$('exam-nuevo').addEventListener('click',()=>{if(examPage){resetDialog();return}items=[];report=null;finished=false;$('exam-resultado').hidden=true;$('exam-config').hidden=false;selectionSummary();$('exam-alumno').focus()});
function noteNavigation(reason){
 if(!started||finished)return;
 const now=Date.now();if(now-lastNavigation<1400)return;lastNavigation=now;
 navigationAlerts.push({fecha:new Date(now).toISOString(),tipo:reason});
 if($('exam-alert-count'))$('exam-alert-count').textContent=navigationAlerts.length+' avisos de navegación';
 saveExam();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)noteNavigation('La pestaña dejó de estar visible');else tickExam()});
window.addEventListener('blur',()=>{if(!document.hidden)noteNavigation('La ventana perdió el foco')});
window.addEventListener('pagehide',()=>noteNavigation('La página se abandonó o recargó'));
bootExam();
if(examPage){
 if(control)control.onChange(updateExamAccess);else updateExamAccess();
 window.addEventListener('storage',event=>{
  if(event.key!==STORE||stale)return;
  let previous,current;
  try{previous=JSON.parse(event.oldValue);current=JSON.parse(event.newValue)}catch{return}
  if(previous?.started===current?.started)return;
  stale=true;
  location.reload();
 });
}
})();
