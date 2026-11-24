/* Examen mixto: usa el conjunto de elementos y los filtros definidos por el laboratorio. */
(()=>{'use strict';
if(!document.body.classList.contains('exam-only'))return;
const $=id=>document.getElementById(id),modeLabels={simbolos:'Nombre → símbolo',nombres:'Símbolo → nombre',ubicacion:'Ubicación en la tabla'};
let items=[],index=0,student='',finished=false,closed=false,report=null,started=null;let navigationAlerts=[];
const STORE='mi-aula-digital-examen-periodica-v1', ARCHIVE='mi-aula-digital-examen-periodica-archivo-v1';
const COMPLETED='mi-aula-digital-examen-periodica-finalizado-v1';
// Mismo código de recuperación que el examen de TIC II. En web estática la contraseña
// es una barrera de interfaz, no una autenticación resistente a manipulación del navegador.
const RESET_PASSWORD_DIGEST='4f9d462ffeaf16ab189b3d7e2a6feb2394f7faa2246e94e1cb91c5321c1a47f6';
const SALT='MiAulaDigital-Profesor-v1:';
async function verifyTeacherPassword(pass){const bytes=new TextEncoder().encode(SALT+pass);const raw=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(raw)].map(v=>v.toString(16).padStart(2,'0')).join('')===RESET_PASSWORD_DIGEST;}
const examPage=!!$('exam-reset-dialog');
const control=window.MAD_CONTROL, delivery=window.MAD_PERIODIC_DELIVERY, examId='periodica';
let selectionSnapshot=null,resetVersion=0,stale=false,timing=null,interval=null,starting=false,storageReadable=true;
function clockNow(){return control?.attemptNow(timing)??Date.now()}
function readExam(key){
 const raw=localStorage.getItem(key);
 try{return JSON.parse(raw)}catch{return null}
}
function snapshot(){
 return {items,index,student,finished,closed,report,started,resetVersion,timing,selection:selectionSnapshot,navigationAlerts};
}
function reloadExam(){
 if(stale)return;
 stale=true;
 clearInterval(interval);
 location.reload();
}
function currentAttempt(creating=false){
 const active=readExam(STORE);
 const completed=readExam(COMPLETED);
 const conflict=creating?!!(active?.started||completed?.started):
  !!(completed?.started||active?.finished||active?.started!==started);
 if(conflict)reloadExam();
 return !conflict;
}
function saveExam(creating=false){
 if(!examPage)return true;
 if(!started||stale||finished)return false;
 try{
  if(!currentAttempt(creating))return false;
  localStorage.setItem(STORE,JSON.stringify(snapshot()));
  return true;
 }catch{
  $('exam-aviso').textContent='El navegador no puede guardar el examen. Descarga tu entrega en cuanto termines.';
  return false;
 }
}
function saveCompletion(){
 if(!examPage)return {stored:true,reportStored:true};
 const full=JSON.stringify(snapshot());
 let stored=false,reportStored=false;
 // A previous tab can still write the active key, so keep the terminal state separately.
 try{
  localStorage.setItem(COMPLETED,full);
  stored=true;
  reportStored=true;
 }catch{
  try{
   localStorage.setItem(COMPLETED,JSON.stringify({started,resetVersion,finished:true,closed}));
   stored=true;
  }catch{}
 }
 // Keep the original key readable by the previous version and as a report fallback.
 try{
  localStorage.setItem(STORE,full);
  stored=true;
  reportStored=true;
 }catch{}
 return {stored,reportStored};
}
function captureSelection(){return {mode:choiceMode.value,groups:[...chosenGroups],families:[...chosenFamilies],lanthanides:lanthanidesCheck.checked,actinides:actinidesCheck.checked,scope:$('alcance').value,count:$('exam-cantidad').value}}
function restoreSelection(s){if(!s)return;choiceMode.value=s.mode||'grupos';chosenGroups.clear();(s.groups||[]).forEach(x=>chosenGroups.add(x));chosenFamilies.clear();(s.families||[]).forEach(x=>chosenFamilies.add(x));lanthanidesCheck.checked=!!s.lanthanides;actinidesCheck.checked=!!s.actinides;$('alcance').value=s.scope||'118';$('exam-cantidad').value=s.count||'15';drawOptions();selectionSummary()}
function lockSelection(locked){$('tipo-seleccion').disabled=locked;$('alcance').disabled=locked;$('exam-cantidad').disabled=locked;$('exam-alumno').readOnly=locked;for(const id of ['incluir-lantanidos','incluir-actinidos','seleccionar-todo','borrar-seleccion'])$(id).disabled=locked;document.querySelectorAll('#opciones-seleccion input').forEach(el=>el.disabled=locked)}
function updateVisibility(){
 const navigationNotice=$('exam-navigation-finished');
 if(navigationNotice)navigationNotice.hidden=report?.motivo_fin!==window.MADExamNavigation?.reason;
 if(!examPage)return;
 document.body.classList.toggle('exam-in-progress',!!started&&!finished);
 document.body.classList.toggle('exam-finished',!!started&&finished&&!closed);
 document.body.classList.toggle('exam-closed',closed);
 $('exam-config').hidden=!!started;
 $('exam-sesion').hidden=!started||finished;
 $('exam-resultado').hidden=!finished||closed;
 $('exam-cerrado').hidden=!closed;
 $('exam-cerrado-descargar').hidden=!report;
 lockSelection(!!started);
 $('exam-alert-count').textContent=navigationAlerts.length+' avisos de navegación';
 if(started){$('exam-identidad').textContent=student;$('exam-alumno').value=student}
}
function showResults(){if(!report)return;const score=report.nota,correct=report.aciertos;
 if($('exam-fin'))$('exam-fin').textContent=report.motivo_fin==='tiempo agotado'?'Tiempo agotado. Descarga tu entrega.':'';
 $('exam-nota').textContent=`${score.toFixed(2).replace('.',',')} / 10`;
 $('exam-resumen').textContent=`${correct} de ${items.length} correctas · ${student}`;if($('exam-alert-summary'))$('exam-alert-summary').textContent=`Registro de navegación: ${navigationAlerts.length} avisos. Los cambios de pestaña no prueban que se hayan consultado respuestas.`;
 $('exam-detalle').replaceChildren();report.respuestas.forEach(r=>{let a=document.createElement('article');a.className='exam-review-item '+(r.correcta?'ok':'bad');let head=document.createElement('strong');head.textContent=`${r.numero}. ${modeLabels[r.tipo]} · ${r.correcta?'Correcta':'Incorrecta'}`;let p=document.createElement('p');p.textContent=`Tu respuesta: ${r.respuesta} · Solución: ${r.solucion}`;a.append(head,p);$('exam-detalle').append(a)})}
function bootExam(){
 if(!examPage)return;
 let active,completed;
 try{
  active=readExam(STORE);
  completed=readExam(COMPLETED);
 }catch{
  storageReadable=false;
  $('exam-estado').textContent='Este navegador no permite guardar el examen. Usa un navegador que pueda conservar los datos del aula.';
  updateVisibility();
  return;
 }
 // Prefer the separate completion record even if a stale tab saved older answers.
 const saved=completed?.started?
  (completed.report||active?.started!==completed.started?completed:active):active;
 if(!saved?.started){updateVisibility();return}
 items=Array.isArray(saved.items)?saved.items:[];
 started=saved.started;
 student=saved.student||'';
 report=saved.report||null;
 finished=!!(completed?.started||saved.finished||!items.length);
 closed=!!(completed?.closed||saved.closed||(finished&&!report));
 index=Math.min(Math.max(0,Number(saved.index)||0),Math.max(0,items.length-1));
 resetVersion=completed?.resetVersion??saved.resetVersion??0;
 timing=saved.timing||null;
 selectionSnapshot=saved.selection;
 navigationAlerts=Array.isArray(saved.navigationAlerts)?saved.navigationAlerts:[];
 restoreSelection(selectionSnapshot);
 updateVisibility();
 if(finished)queueGrade();
 if(closed)return;
 if(finished)showResults();
 else{
  render();
  $('exam-aviso').textContent='Examen recuperado. Las respuestas anteriores y la selección permanecen guardadas.';
  startTimer();
 }
}
function canReset(){
 if(!control?.remote)return true;
 return control.canResetExam(examId,resetVersion)&&(!closed||control.examVersion(examId)>resetVersion);
}
function resetDialog(){
 if(!examPage||!started||stale||!canReset())return;
 if(control?.remote||control?.canResetExam(examId,resetVersion)){
  authorizeReset(true);
  return;
 }
 const dialog=$('exam-reset-dialog');
 $('exam-reset-password').value='';
 $('exam-reset-password').type='password';
 $('exam-ver-password').textContent='Ver contraseña';
 $('exam-ver-password').setAttribute('aria-pressed','false');
 $('exam-reset-error').textContent='';
 dialog.showModal();
 $('exam-reset-password').focus();
}
async function authorizeReset(free=false){
 if(!started||stale||!canReset()||(!free&&control?.remote))return;
 if(!free&&!await verifyTeacherPassword($('exam-reset-password').value)){
  $('exam-reset-error').textContent='Contraseña incorrecta.';
  return;
 }
 if(!confirm('¿Iniciar un nuevo intento? El anterior quedará archivado en este navegador.'))return;
 try{
  const completed=readExam(COMPLETED), active=readExam(STORE);
  if((completed?.started??active?.started)!==started){reloadExam();return}
  const oldHistory=readExam(ARCHIVE);
  const history=Array.isArray(oldHistory)?oldHistory:[];
  if(!history.some(attempt=>attempt?.started===started)){
   const archived=completed?.report?completed:active?.started===started?active:snapshot();
   history.push({...archived,archivedAt:new Date().toISOString()});
   localStorage.setItem(ARCHIVE,JSON.stringify(history));
  }
  localStorage.removeItem(STORE);
  localStorage.removeItem(COMPLETED);
 }catch{
  alert('No se ha podido archivar el examen. Comprueba el almacenamiento antes de reiniciar.');
  return;
 }
 clearInterval(interval);
 interval=null;
 timing=null;
 items=[];
 index=0;
 student='';
 finished=false;
 closed=false;
 report=null;
 updateDelivery();
 started=null;
 selectionSnapshot=null;
 navigationAlerts=[];
 if($('exam-reset-dialog').open)$('exam-reset-dialog').close();
 $('exam-alumno').value='';
 $('exam-pregunta').replaceChildren();
 $('exam-detalle').replaceChildren();
 updateVisibility();
 selectionSummary();
 updateExamAccess();
 $('exam-estado').textContent='Reinicio autorizado. Ya puedes comenzar un nuevo examen.';
 $('exam-alumno').focus();
}
function updateResetFreedom(){
 const allowed=!!started&&canReset();
 for(const button of document.querySelectorAll('.exam-reset-control')){
  if(button.id==='exam-cerrado-reiniciar')button.hidden=!allowed;
  button.disabled=!allowed;
  button.textContent=allowed&&control?.remote?'🔓 Nuevo intento autorizado':'🔒 Reiniciar examen (profesor)';
  button.title=button.disabled?'El profesor puede autorizar otro intento desde su panel.':'';
 }
}
if(examPage){
 for(const id of ['exam-reiniciar-inicio','exam-reiniciar-sesion','exam-cerrado-reiniciar']){
  $(id).addEventListener('click',resetDialog);
 }
 $('exam-cancelar-reset').addEventListener('click',()=>$('exam-reset-dialog').close());
 $('exam-ver-password').addEventListener('click',()=>{
  const input=$('exam-reset-password'),show=input.type==='password';
  input.type=show?'text':'password';
  $('exam-ver-password').textContent=show?'Ocultar contraseña':'Ver contraseña';
  $('exam-ver-password').setAttribute('aria-pressed',String(show));
 });
 $('exam-reset-form').addEventListener('submit',e=>{e.preventDefault();authorizeReset()});
}

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
function render(){let q=items[index],body=$('exam-pregunta');$('exam-identidad').textContent=student;$('exam-progreso').textContent=`Pregunta ${index+1} de ${items.length}`;$('exam-barra').style.width=`${100*savedAnswers()/items.length}%`;$('exam-contador').textContent=`${savedAnswers()} de ${items.length} respondidas`;
 const prompt=questionText(q);
 body.innerHTML=`<span class="exam-question-kind">${modeLabels[q.type]}</span><h3>${index+1}. ${prompt}</h3>`;
 if(q.type==='ubicacion'){
  body.insertAdjacentHTML('beforeend',renderBoard(q.answer));body.insertAdjacentHTML('beforeend',`<p class="exam-position-hint" id="exam-position-text">${q.answer?'Casilla seleccionada. Puedes cambiarla antes de entregar.':'Pulsa una casilla. No aparecerán nombres, símbolos ni números atómicos como ayuda.'}</p>`);
  body.querySelectorAll('[data-exam-position]').forEach(b=>b.addEventListener('click',()=>{if(finished||tickExam())return;q.answer=Number(b.dataset.examPosition);body.querySelectorAll('[data-exam-position]').forEach(x=>{let chosen=x===b;x.classList.toggle('picked',chosen);x.setAttribute('aria-pressed',String(chosen))});$('exam-position-text').textContent='Casilla seleccionada. Puedes cambiarla antes de entregar.';$('exam-barra').style.width=`${100*savedAnswers()/items.length}%`;$('exam-contador').textContent=`${savedAnswers()} de ${items.length} respondidas`;saveExam();}));
 }else{let input=document.createElement('input');input.className='exam-answer';input.type='text';input.maxLength=160;input.autocomplete='off';input.spellcheck=false;input.placeholder='Escribe tu respuesta';input.setAttribute('aria-label','Respuesta a la pregunta '+(index+1));input.value=q.answer??'';input.addEventListener('input',()=>{if(finished||tickExam())return;q.answer=input.value;$('exam-barra').style.width=`${100*savedAnswers()/items.length}%`;$('exam-contador').textContent=`${savedAnswers()} de ${items.length} respondidas`;saveExam()});body.append(input)}
 $('exam-anterior').disabled=index===0;$('exam-siguiente').disabled=index===items.length-1;$('exam-aviso').textContent='Puedes retroceder para revisar las respuestas antes de terminar.';
}
$('exam-empezar').addEventListener('click',async()=>{
 if(stale||starting||!storageReadable||started)return;
 const name=$('exam-alumno').value.trim().replace(/\s+/g,' ');
 if(!name){$('exam-alumno').focus();$('exam-seleccion').textContent='Escribe el identificador antes de comenzar.';return}
 const pool=filteredElements(),count=Number($('exam-cantidad').value);
 if(!pool.length){selectionSummary();$('exam-seleccion').textContent+=' Selecciona al menos una columna o familia con elementos disponibles.';return}
 if(examPage&&control){
  starting=true;
  updateExamAccess();
  const attempt=await control.prepareAttempt(examId);
  starting=false;
  updateExamAccess();
  if(stale)return;
  if(attempt.error){$('exam-estado').textContent=attempt.error;return}
  ({timing,resetVersion}=attempt);
 }
 student=name;
 navigationAlerts=[];
 items=createQuestions(pool,count);
 index=0;
 started=new Date(clockNow()).toISOString();
 selectionSnapshot=captureSelection();
 finished=false;
 closed=false;
 report=null;
 if(!saveExam(true)){
  started=null;
  timing=null;
  $('exam-estado').textContent='No se pudo guardar el intento. Revisa el almacenamiento del navegador antes de empezar.';
  return;
 }
 $('exam-estado').textContent='';
 updateVisibility();
 render();
 updateExamAccess();
 startTimer();
 checkNavigation?.();
 $('examen-tabla').scrollIntoView({behavior:'smooth',block:'start'});
});
$('exam-anterior').addEventListener('click',()=>{if(!finished&&!tickExam()&&index){index--;render();saveExam()}});$('exam-siguiente').addEventListener('click',()=>{if(!finished&&!tickExam()&&index<items.length-1){index++;render();saveExam()}});
function grading(q){return marking.correct(q)}
function questionText(q){
 const element=byElement(q);
 if(q.type==='simbolos')return '¿Cuál es el símbolo del '+element.name+'?';
 if(q.type==='nombres')return '¿Cómo se llama el elemento '+element.symbol+'?';
 return '¿Dónde colocarías '+element.symbol+' en la tabla periódica?';
}
function updateDelivery(){
 for(const id of ['exam-note-delivery','exam-cerrado-delivery']){
  const node=$(id);
  if(!node)continue;
  const active=!!report?.envioAutomatico&&!!delivery;
  node.hidden=!active;
  const text=active?delivery.status(report.inicio):'';
  if(node.textContent!==text)node.textContent=text;
 }
}
function queueGrade(){
 if(report?.envioAutomatico&&items.length&&delivery){
  const answers=items.map(({n,type,answer})=>{
   const trimmed=typeof answer==='string'?answer.trim():answer;
   return {n,type,answer:typeof trimmed==='string'&&trimmed.length>160?'(respuesta demasiado larga)':trimmed??null};
  });
  delivery.enqueue({alumno:report.alumno,inicio:report.inicio,fin:report.fin,items:answers});
 }
 updateDelivery();
}
function expected(q){let e=byElement(q);return q.type==='simbolos'?e.symbol:q.type==='nombres'?e.name:`Grupo ${e.g}, ${e.p>7?'serie inferior':`período ${e.p}`}`}
function submitted(q){if(q.type!=='ubicacion')return String(q.answer??'').trim()||'(sin respuesta)';const e=elements[Number(q.answer)-1];return e?`Grupo ${e.g}, ${e.p>7?'serie inferior':`período ${e.p}`}`:'(sin respuesta)'}
function finishExam(reason){
 if(finished||stale||!items.length)return;
 if(examPage){
  try{if(!currentAttempt())return}catch{}
 }
 finished=true;
 clearInterval(interval);
 interval=null;
 const correct=items.filter(grading).length,score=correct/items.length*10;
 report={tipo:'Examen mixto de tabla periódica · Mi Aula Digital',version:'1.4.55',alumno:student,inicio:started,fin:new Date(reason==='tiempo agotado'?control.attemptDeadline(timing):clockNow()).toISOString(),motivo_fin:reason,envioAutomatico:true,preguntas:items.length,aciertos:correct,nota:Number(score.toFixed(2)),avisos_navegacion:navigationAlerts,numero_avisos_navegacion:navigationAlerts.length,seleccion:{modo:choiceMode.value,grupos:[...chosenGroups],familias:[...chosenFamilies],lantanidos:lanthanidesCheck.checked,actinidos:actinidesCheck.checked,alcance:Number($('alcance').value)},respuestas:items.map((q,i)=>({numero:i+1,tipo:q.type,pregunta:questionText(q),elemento:byElement(q).name,simbolo:byElement(q).symbol,respuesta:submitted(q),respuesta_posicion:q.type==='ubicacion'?q.answer:null,solucion:expected(q),correcta:grading(q)}))};
 showResults();
 updateVisibility();
 const saved=saveCompletion();
 queueGrade();
 showSaveWarning(!saved.reportStored,'No se pudo guardar una copia del informe. Descarga tu entrega antes de salir.');
}
function showSaveWarning(show,text){
 const warning=$('exam-save-warning');
 if(!warning)return;
 warning.textContent=show?text:'';
 warning.hidden=!show;
}
function closeExam(){
 if(!finished||closed||stale)return;
 try{
  const completed=readExam(COMPLETED),active=readExam(STORE);
  if((completed?.started??active?.started)!==started){reloadExam();return}
 }catch{
  showSaveWarning(true,'No se pudo guardar el cierre. Descarga tu entrega antes de salir.');
  return;
 }
 closed=true;
 if(!saveCompletion().stored){
  closed=false;
  showSaveWarning(true,'No se pudo guardar el cierre. Descarga tu entrega antes de salir.');
  return;
 }
 updateVisibility();
 updateResetFreedom();
 $('exam-cerrado-titulo').focus();
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
 $('exam-empezar').disabled=!storageReadable||starting||window?.allowed===false;
 $('exam-horario').textContent=window?.message||'';
 if(!finished&&control?.updateTiming(examId,timing))saveExam();
 tickExam();
 updateResetFreedom();
}
function downloadPdf(){
 if(!report)return;
 try{
  const pdf=window.MAD_PERIODIC_PDF.create(report);
  const url=URL.createObjectURL(pdf);
  const link=document.createElement('a');
  const name=report.alumno.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,55);
  link.href=url;
  link.download='Examen_Tabla_Periodica_'+(name||'alumno')+'.pdf';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),12000);
 }catch{
  const notice=$(closed?'exam-cerrado-delivery':'exam-save-warning');
  notice.hidden=false;
  notice.textContent='No se pudo generar el PDF. Inténtalo de nuevo.';
 }
}
$('exam-descargar-pdf').addEventListener('click',downloadPdf);
if(examPage){
 $('exam-cerrado-descargar').addEventListener('click',downloadPdf);
 $('exam-cerrar').addEventListener('click',closeExam);
}
if(delivery)window.addEventListener(delivery.events,updateDelivery);
$('exam-nuevo').addEventListener('click',()=>{if(examPage){resetDialog();return}items=[];report=null;finished=false;$('exam-resultado').hidden=true;$('exam-config').hidden=false;selectionSummary();$('exam-alumno').focus()});
const checkNavigation=examPage?window.MADExamNavigation.watch({
 active:()=>!!started&&!finished&&!stale,
 leave(reason){
  navigationAlerts.push({fecha:new Date(clockNow()).toISOString(),tipo:reason});
  finishExam(reason);
  if(finished)downloadPdf();
 },
 returnToExam:tickExam
}):null;
bootExam();
if(examPage){
 if(control)control.onChange(updateExamAccess);else updateExamAccess();
 window.addEventListener('storage',event=>{
  if(stale||(event.key!==STORE&&event.key!==COMPLETED))return;
  let previous,current;
  try{previous=JSON.parse(event.oldValue);current=JSON.parse(event.newValue)}catch{return}
  if(previous?.started!==current?.started||previous?.finished!==current?.finished||previous?.closed!==current?.closed){
   reloadExam();
  }
 });
}
})();
