(()=>{
'use strict';
const $=id=>document.getElementById(id);
const api=window.MAD_CONTROL;
const fields={teacherGames:'gamesEnabled',teacherExams:'examsUnlocked'};
const examNames={tic:'Programación TIC II',periodica:'Tabla Periódica',both:'ambos exámenes'};
const DIGEST='4f9d462ffeaf16ab189b3d7e2a6feb2394f7faa2246e94e1cb91c5321c1a47f6';
const SALT='MiAulaDigital-Profesor-v1:';
let token='';
let loggedIn=!api.remote&&sessionStorage.getItem('mad-profesor-local')==='ok';
let busy=false;
const madridFields=new Intl.DateTimeFormat('en-CA',{
 timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',
 hour:'2-digit',minute:'2-digit',hourCycle:'h23'
});
let timetableDirty=false,timetableKey='';
function dateField(at){
 const parts=Object.fromEntries(madridFields.formatToParts(at).map(({type,value})=>[type,value]));
 return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;
}
function readDateField(field){
 const value=field.value;
 const apparent=Date.parse(value+'Z');
 if(!Number.isFinite(apparent))throw Error('Introduce la fecha y la hora.');
 const day=86400000;
 const offsets=new Set([apparent-day,apparent+day].map(probe=>Date.parse(dateField(probe)+'Z')-probe));
 const matches=[...offsets].map(offset=>apparent-offset).filter(time=>dateField(time)===value);
 if(matches.length!==1)throw Error('Esa hora es ambigua o no existe por el cambio de hora. Elige otra.');
 return matches[0];
}
function renderTimetable(state,unavailable){
 const target=$('teacherScheduleTarget').value;
 const cafe=target==='cafeteria';
 const schedule=state.schedules[target];
 const key=JSON.stringify([target,schedule]);
 $('teacherScheduleFields').disabled=busy||unavailable||!api.remote;
 $('teacherScheduleModeLabel').hidden=!cafe;
 $('teacherScheduleMode').disabled=!cafe;
 $('teacherScheduleMinutesLabel').hidden=cafe;
 $('teacherScheduleMinutes').disabled=cafe;
 $('teacherScheduleMinutes').required=!cafe;
 $('teacherCancelSchedule').disabled=!schedule;
 if(!timetableDirty&&key!==timetableKey){
  const start=Math.ceil(api.now()/300000)*300000;
  $('teacherScheduleStart').value=dateField(schedule?.startsAt??start);
  $('teacherScheduleEnd').value=dateField(schedule?.endsAt??start+3600000);
  $('teacherScheduleMode').value=schedule?.mode??'open';
  $('teacherScheduleMinutes').value=schedule?.minutes??60;
  timetableKey=key;
 }
 const closing=cafe&&$('teacherScheduleMode').value==='closed';
 $('teacherScheduleStartLabel').textContent=closing?'Inicio del cierre':'Apertura';
 $('teacherScheduleEndLabel').textContent=closing?'Reapertura':'Cierre';
 $('teacherSchedulePolicy').textContent=cafe?
  'Si programas la apertura, la Cafetería solo abre durante ese tramo y con el interruptor activado. Si programas un cierre, fuera de ese tramo manda el interruptor.':
  'El alumno puede empezar durante el horario. El intento termina al agotar su duración o al llegar el cierre, lo que ocurra primero.';
 const phase=schedule?api.phase(schedule):null;
 const label=phase==='before'?'Programado':phase==='open'?'En curso':'Finalizado';
 const text=schedule?label+'. '+api.dateLabel(schedule.startsAt)+' → '+api.dateLabel(schedule.endsAt)+
  (cafe?(schedule.mode==='open'?' · Apertura':' · Cierre'):' · '+schedule.minutes+' min por intento.'):
  'Sin horario programado.';
 if($('teacherScheduleInfo').textContent!==text)$('teacherScheduleInfo').textContent=text;
}

function message(text,error=false){
 const node=$('teacherStatus');
 node.textContent=text;
 node.style.color=error?'#ffb5bb':'#acddff';
}
async function localVerify(password){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(SALT+password));
 return Array.from(new Uint8Array(hash),value=>value.toString(16).padStart(2,'0')).join('')===DIGEST;
}
function render(){
 $('teacherLogin').hidden=loggedIn;
 $('teacherApp').hidden=!loggedIn;
 if(!loggedIn)return;
 const state=api.status;
 const unavailable=!api.ready||!!api.error;
 for(const [id,key] of Object.entries(fields)){
  if(!busy)$(id).checked=state[key];
  $(id).disabled=busy||unavailable;
 }
 $('teacherReset').disabled=busy||unavailable||!api.remote;
 $('teacherLogout').disabled=busy;
 renderTimetable(state,unavailable);
 $('teacherMode').textContent=api.remote?(unavailable?'Sin conexión con el servidor':'Sincronización entre ordenadores'):'Solo este navegador';
 $('teacherSecurityNote').textContent=api.remote?'Los cambios llegan al abrir las páginas y se comprueban cada 20 segundos mientras están abiertas.':'Conecta el servidor de control para reiniciar los intentos y gestionar la Cafetería desde todos los ordenadores.';
}
async function logIn(event){
 event.preventDefault();
 if(busy)return;
 const password=$('teacherPassword');
 $('teacherError').textContent='';
 busy=true;
 try{
  if(api.remote){
   const response=await request('/login','POST',{password:password.value});
   if(!response.ok)throw Error(response.status===401?'Contraseña incorrecta.':response.status===429?'Demasiados intentos. Prueba más tarde.':'El servidor no permite acceder.');
   ({token}=await response.json());
  }else{
   if(!await localVerify(password.value))throw Error('Contraseña incorrecta.');
   sessionStorage.setItem('mad-profesor-local','ok');
  }
  loggedIn=true;
  password.value='';
  await api.refresh(true);
  message(api.error?'No se han podido consultar los ajustes.':'Ajustes cargados.',!!api.error);
 }catch(error){
  $('teacherError').textContent=error.message;
 }finally{
  busy=false;
  render();
 }
}
function request(path,method,body){
 const headers={'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 return fetch(api.url+path,{method,headers,body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
}
async function save(path,method,body,success){
 if(busy)return;
 busy=true;
 render();
 message('Guardando cambios…');
 try{
  if(api.remote){
   const response=await request(path,method,body);
   if(response.status===401){
    logout();
    $('teacherError').textContent='La sesión ha caducado. Vuelve a acceder.';
    return;
   }
   if(!response.ok){
    const problem=await response.json().catch(()=>null);
    throw Error(problem?.error||'No se pudo guardar en el servidor.');
   }
   if(path==='/schedules'){timetableDirty=false;timetableKey=''}
   await api.refresh(true);
   message(api.error?'El servidor guardó el cambio. La consulta posterior ha fallado.':success,!!api.error);
  }else{
   api.localUpdate({...api.status,...body});
   message(success);
  }
 }catch(error){
  message(error.message,true);
  await api.refresh(true);
 }finally{
  busy=false;
  render();
 }
}
function logout(){
 token='';
 loggedIn=false;
 sessionStorage.removeItem('mad-profesor-token');
 sessionStorage.removeItem('mad-profesor-local');
 $('teacherError').textContent='';
 render();
}
$('teacherLoginForm').addEventListener('submit',logIn);
$('teacherShow').addEventListener('click',()=>{
 const input=$('teacherPassword');
 const shown=input.type==='password';
 input.type=shown?'text':'password';
 $('teacherShow').textContent=shown?'Ocultar':'Mostrar';
});
for(const [id,key] of Object.entries(fields)){
 $(id).addEventListener('change',()=>save('/settings','PUT',{[key]:$(id).checked},'Cambios guardados.'));
}
$('teacherResetForm').addEventListener('submit',event=>{
 event.preventDefault();
 if(!api.remote||api.error||busy)return;
 const chosen=$('teacherExamChoice').value;
 const exams=chosen==='both'?['tic','periodica']:[chosen];
 if(!confirm('¿Autorizar un nuevo intento de '+examNames[chosen]+' en todos los ordenadores? Cada alumno decidirá cuándo repetir.'))return;
 const expected=Object.fromEntries(exams.map(exam=>[exam,api.examVersion(exam)]));
 save('/exam-resets','POST',{exams,expected},'Nuevo intento autorizado para '+examNames[chosen]+'.');
});
$('teacherScheduleTarget').addEventListener('change',()=>{
 timetableDirty=false;
 render();
});
for(const id of ['teacherScheduleStart','teacherScheduleEnd','teacherScheduleMinutes','teacherScheduleMode']){
 $(id).addEventListener('input',()=>{timetableDirty=true;if(id==='teacherScheduleMode')render()});
}
$('teacherScheduleForm').addEventListener('submit',event=>{
 event.preventDefault();
 if(!api.remote||api.error||busy)return;
 const target=$('teacherScheduleTarget').value;
 try{
  const startsAt=readDateField($('teacherScheduleStart'));
  const endsAt=readDateField($('teacherScheduleEnd'));
  if(endsAt<=startsAt||endsAt<=api.now())throw Error('El cierre debe ser posterior a la apertura y estar en el futuro.');
  let schedule={startsAt,endsAt};
  if(target==='cafeteria')schedule.mode=$('teacherScheduleMode').value;
  else{
   const minutes=$('teacherScheduleMinutes').valueAsNumber;
   if(!Number.isSafeInteger(minutes)||minutes<1||minutes*60000>endsAt-startsAt){
    throw Error('La duración por intento debe caber en el horario.');
   }
   schedule.minutes=minutes;
  }
  save('/schedules','PUT',{target,schedule},'Horario guardado.');
 }catch(error){message(error.message,true)}
});
$('teacherCancelSchedule').addEventListener('click',()=>{
 if(!api.remote||api.error||busy)return;
 const target=$('teacherScheduleTarget').value;
 if(confirm('¿Quitar el horario programado?'))save('/schedules','PUT',{target,schedule:null},'Horario eliminado.');
});
$('teacherLogout').addEventListener('click',logout);
api.onChange(()=>{if(loggedIn&&!busy)render()});
render();
})();
