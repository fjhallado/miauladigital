(() => {
 'use strict';
 const key='mad-examen-vistas-v1';
 const $=id=>document.getElementById(id);
 function mount({loadFigure,savePDF}) {
  const api=window.MAD_CONTROL;
  const form=$('viewExamStart'), workspace=document.querySelector('.workspace');
  const status=$('viewExamStatus'), countdown=$('viewExamClock'), download=$('viewExamDownload');
  const request=window.MADLamina.request;
  let record=null,busy=false;
  try{record=JSON.parse(localStorage.getItem(key))}catch{}
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(record))}catch{/* Keep the open attempt in memory. */}};
  const schedule=()=>api.status.schedules.vistas;
  const matches=planned=>!!(planned&&record&&record.startsAt===planned.startsAt&&record.figure===planned.figure);
  const open=planned=>planned&&api.remote&&api.ready&&!api.error&&api.labAccess('vistas').allowed&&
   api.now()>=planned.startsAt&&api.now()<planned.endsAt;
  function canEdit(){
   const attempt=record?.attempt;
   if(!attempt||attempt.stamp||busy||api.now()>=attempt.deadline)return false;
   return !api.ready||!!api.error||(matches(schedule())&&open(schedule()));
  }
  function showAttempt(){
   document.body.dataset.viewExamReady='';
   loadFigure(record.figure-1,record.drawing);
   render();
  }
  function render(){
   const planned=schedule(), attempt=record?.attempt, sameExam=matches(planned);
   if(attempt&&!attempt.stamp&&api.ready&&!api.error){
    const labDeadline=api.status.labDeadlines.vistas??Infinity;
    const expiry=sameExam&&api.labAccess('vistas').allowed?Math.min(planned.endsAt,labDeadline):api.now();
    if(expiry<attempt.deadline){attempt.deadline=Math.floor(expiry);persist();}
   }
   const canStart=open(planned)&&(!sameExam||!attempt);
   form.hidden=!canStart;
   form.querySelector('button').disabled=busy;
   download.hidden=!attempt;
   download.disabled=busy;
   download.textContent=attempt?.stamp?'Volver a descargar PDF':'Entregar y descargar PDF';
   workspace.inert=!canEdit();
   let description;
   if(attempt?.stamp)description='Examen entregado. Puedes volver a descargar tu lámina con el mismo sello.';
   else if(attempt)description=canEdit()?'Dibuja el alzado, la planta y el perfil. Pulsa Entregar cuando hayas terminado.':'El dibujo está cerrado. Puedes descargar la lámina con el trabajo guardado.';
   else if(!api.ready)description='Consultando el horario…';
   else if(api.error)description='No se pudo consultar el horario. Vuelve a cargar la página.';
   else if(canStart)description='Figura '+planned.figure+' · '+planned.minutes+' min. El intento empieza al pulsar Comenzar.';
   else if(planned&&api.now()<planned.startsAt)description='El examen abre el '+api.dateLabel(planned.startsAt)+'.';
   else description='El examen está cerrado. El horario se configura en Profesor.';
   if(status.textContent!==description)status.textContent=description;
   const left=attempt&&!attempt.stamp?Math.max(0,Math.ceil((attempt.deadline-api.now())/1000)):0;
   countdown.hidden=!left;
   if(left)countdown.textContent='Tiempo restante '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
  }
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   const planned=schedule();
   if(busy||!open(planned)||(matches(planned)&&record.attempt))return;
   const student=Object.fromEntries([...new FormData(form)].map(([field,value])=>[field,value.trim()]));
   if(Object.values(student).some(value=>!value)){
    $('viewExamError').textContent='Escribe el nombre, el curso y el grupo.';
    return;
   }
   if(!matches(planned))record={id:crypto.randomUUID(),startsAt:planned.startsAt,figure:planned.figure};
   record.student=student;
   persist();
   busy=true;render();$('viewExamError').textContent='';
   try{
    record.attempt=await request('/view-exam/start',{id:record.id,startsAt:record.startsAt,figure:record.figure});
    persist();
    showAttempt();
   }catch(error){$('viewExamError').textContent=error.message;}
   finally{busy=false;render();}
  });
  download.addEventListener('click',async()=>{
   if(!record?.attempt||busy)return;
   if(canEdit()&&!confirm('¿Entregar el examen? El dibujo quedará cerrado.'))return;
   busy=true;render();$('viewExamError').textContent='';
   try{
    if(!record.attempt.stamp){
     record.attempt=await request('/view-exam/finish',{id:record.id});
     persist();
    }
    await savePDF(record.student,record.attempt.stamp,true);
   }catch(error){$('viewExamError').textContent=error.message;}
   finally{busy=false;render();}
  });
  // Check the deadline before any drawing event, including the interval before the next timer tick.
  for(const type of ['pointerdown','click','change','keydown']){
   workspace.addEventListener(type,event=>{
    if(!canEdit()){event.preventDefault();event.stopImmediatePropagation();}
   },true);
  }
  if(record?.attempt){
   showAttempt();
   const {id,startsAt,figure}=record;
   request('/view-exam/start',{id,startsAt,figure}).then(attempt=>{
    if(record.id!==id||record.attempt.stamp)return;
    attempt.deadline=Math.min(attempt.deadline,record.attempt.deadline);
    record.attempt=attempt;
    persist();render();
   }).catch(()=>{});
  }
  api.onChange(render);
  setInterval(render,1000);
  return {save(drawing){if(canEdit()){record.drawing=drawing;persist();}}};
 }
 window.MADViewExam={mount};
})();
