(() => {
 'use strict';
 const key='mad-examen-vistas-v1';
 const archiveKey=id=>'mad-examen-vistas-archivo-v1:'+id;
 const $=id=>document.getElementById(id);
 const figuresOf=value=>value?.figures??(value?.figure?[value.figure]:[]);
 const sheetCount=count=>count+(count===1?' lámina':' láminas');
 function readRecord(){
  try{
   const saved=JSON.parse(localStorage.getItem(key));
   if(!saved)return null;
   saved.figures=figuresOf(saved);
   saved.drawings??=saved.drawing?{[saved.figures[0]]:saved.drawing}:{};
   delete saved.drawing;
   return saved;
  }catch{return null;}
 }
 function mount({loadFigure,savePDF,getMode}) {
  const api=window.MAD_CONTROL, navigation=window.MADExamNavigation;
  const form=$('viewExamStart'), workspace=document.querySelector('.workspace'), sheets=$('viewExamSheets'), toolbar=sheets.parentElement;
  const status=$('viewExamStatus'), countdown=$('viewExamClock'), download=$('viewExamDownload'), notice=$('viewExamError');
  const dismiss=$('viewExamDismiss'), reset=$('viewExamReset'), back=$('viewExamBack'), warning=$('viewExamWarning');
  const request=window.MADLamina.request;
  let record=readRecord(),starting=false,resetting=false,delivery=null,automatic=false;
  const schedule=()=>api.status.schedules.vistas;
  const matches=(planned,saved=record)=>!!(saved&&saved.startsAt===(planned?.startsAt??null)&&
   (!planned||figuresOf(planned).join(',')===saved.figures.join(',')));
  const open=planned=>api.remote&&api.ready&&!api.error&&api.labAccess('vistas').allowed&&
   (planned?api.now()>=planned.startsAt&&api.now()<planned.endsAt:!!api.status.viewExamDefaultMinutes);
  const canReset=()=>!!record&&open(schedule())&&api.examVersion('vistas')>(record.attempt?.resetVersion??record.resetVersion??0);
  const sealed=()=>!!record?.attempt?.stamp;
  const active=()=>!!(record&&(record.attempt||starting)&&!record.closed&&!sealed());
  function persist(replace=false){
   try{
    const latest=readRecord();
    if(!replace&&(localStorage.getItem(archiveKey(record.id))!==null||(latest&&latest.id!==record.id)))return false;
    if(latest?.id===record.id&&(latest.closed||latest.attempt?.stamp)&&!record.closed&&!sealed())return false;
    localStorage.setItem(key,JSON.stringify(record));return true;
   }
   catch{notice.textContent='No se pudo guardar en este navegador. Descarga el examen antes de cerrar la página.';return false;}
  }
  function archive(){
   try{localStorage.setItem(archiveKey(record.id),JSON.stringify(record));return true;}
   catch{notice.textContent='No se ha podido archivar el intento anterior. Descarga una copia antes de repetir.';return false;}
  }
  function canEdit(){
   const attempt=record?.attempt;
   if(!attempt||!active()||starting||document.hidden||api.now()>=attempt.deadline)return false;
   return !api.ready||!!api.error||(matches(schedule())&&open(schedule()));
  }
  function selectSheet(figure){
   if(recoverClosed())return;
   record.selected=figure;
   loadFigure(figure-1,record.drawings[figure]);
   sheets.querySelectorAll('button').forEach(button=>{
    button.setAttribute('aria-current',Number(button.dataset.figure)===figure?'step':'false');
   });
   persist();
  }
  function showAttempt(){
   if(record.dismissed){render();return;}
   document.body.dataset.viewExamReady='';
   sheets.replaceChildren(...record.figures.map((figure,i)=>{
    const button=document.createElement('button');
    const title='Lámina '+(i+1), figureLabel=document.createElement('span');
    button.type='button';
    button.dataset.figure=figure;
    figureLabel.className='view-exam-figure-label';
    figureLabel.textContent=' · Figura '+figure;
    button.setAttribute('aria-label',title+figureLabel.textContent);
    button.append(title,figureLabel);
    button.onclick=()=>selectSheet(figure);
    return button;
   }));
   selectSheet(record.figures.includes(record.selected)?record.selected:record.figures[0]);
   render();
  }
  function render(){
   const planned=schedule(), attempt=record?.attempt;
   const canStart=open(planned)&&(!matches(planned)||!attempt)&&!(record?.closed&&matches(planned));
   const busy=starting||resetting||!!delivery, dismissed=!!record?.dismissed;
   const showWorkspace=!!attempt&&!dismissed&&!canStart;
   form.hidden=!canStart;
   form.querySelector('button').disabled=busy;
   toolbar.hidden=canStart;
   download.hidden=!attempt&&!record?.closed;
   download.disabled=busy;
   download.textContent=sealed()?'Volver a descargar PDF':record?.closed?'Descargar PDF':'Entregar y descargar PDF';
   dismiss.hidden=!sealed()||!record.downloaded||dismissed;
   dismiss.disabled=busy;
   reset.hidden=!canReset();
   reset.disabled=busy;
   back.hidden=!dismissed;
   warning.hidden=dismissed&&!canStart;
   sheets.hidden=!showWorkspace||record.figures.length<=1;
   document.body.toggleAttribute('data-view-exam-ready',showWorkspace);
   workspace.inert=!canEdit();
   let description;
   if(canStart){
    const count=figuresOf(planned).length;
    description=planned?'Convocatoria programada · '+sheetCount(count)+' · '+planned.minutes+' min. El intento empieza al pulsar Comenzar.':
     'Examen aleatorio · 5 láminas · '+api.status.viewExamDefaultMinutes+' min. El intento empieza al pulsar Comenzar.';
   }
   else if(dismissed)description='Examen cerrado. Puedes volver a descargar tu PDF para subirlo a Teams.';
   else if(record?.closed===navigation.reason)description='Examen finalizado por intento de navegación. '+(delivery?'Preparando el PDF del trabajo guardado…':'Si el PDF no se descargó, pulsa «'+download.textContent+'» para recuperarlo.');
   else if(record?.closed==='tiempo agotado')description='Examen finalizado por tiempo agotado. Puedes descargar el trabajo guardado.';
   else if(sealed())description='Examen entregado. Puedes volver a descargar el PDF con el mismo sello.';
   else if(record?.closed)description='El examen está cerrado. Puedes descargar el trabajo guardado.';
   else if(attempt)description=(record.startsAt===null?'Examen aleatorio':'Convocatoria programada')+' · '+
    sheetCount(record.figures.length)+'. Identifica las caras y dibuja las tres vistas. Pulsa Entregar cuando termines.';
   else if(!api.ready)description='Consultando el horario…';
   else if(api.error)description='No se pudo consultar el horario. Vuelve a cargar la página.';
   else if(planned&&api.now()<planned.startsAt)description='El examen abre el '+api.dateLabel(planned.startsAt)+'.';
   else description='El examen está cerrado. El horario se configura en Profesor.';
   if(status.textContent!==description)status.textContent=description;
   const left=!canStart&&attempt&&active()?Math.max(0,Math.ceil((attempt.deadline-api.now())/1000)):0;
   countdown.hidden=!left;
   if(left)countdown.textContent='Tiempo restante '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
  }
  function update(){
   const attempt=record?.attempt,planned=schedule();
   if(attempt&&active()&&api.ready&&!api.error){
    const expiry=matches(planned)&&api.labAccess('vistas').allowed?Math.min(planned?.endsAt??Infinity,api.status.labDeadlines.vistas??Infinity):api.now();
    attempt.deadline=Math.min(attempt.deadline,Math.floor(expiry));
   }
   if(attempt&&active()&&api.now()>=attempt.deadline)close('tiempo agotado');
   render();
  }
  function recoverClosed(){
   const other=readRecord();
   if(!other||!record||other.id!==record.id)return false;
   const ended=(other.closed||other.attempt?.stamp)&&!record.closed&&!sealed();
   if(!ended&&!(other.attempt&&!record.attempt)&&(!other.dismissed||record.dismissed))return false;
   record=other;
   if(record.attempt)showAttempt();
   else render();
   return true;
  }
  function close(reason){
   if(!active()||recoverClosed())return;
   record.closed=reason;
   record.mode=getMode();
   automatic=reason===navigation.reason;
   persist();
   if(record.attempt)deliver(automatic);
   else render();
  }
  function deliver(wantsDownload){
   if(delivery||!record?.attempt)return;
   const saved=record;
   notice.textContent='';
   delivery=(async()=>{
    if(!saved.attempt.stamp?.code?.startsWith('2.')||
       (saved.figures.length>1&&saved.attempt.stamps?.length!==saved.figures.length)){
     saved.attempt=await request('/view-exam/finish',{id:saved.id,reason:saved.closed},{keepalive:true});
     saved.closed=saved.attempt.reason??saved.closed;
     if(record===saved)persist();
    }
    if(wantsDownload){
     await savePDF({...saved,mode:saved.mode??getMode(),reason:saved.closed});
     saved.downloaded=true;
     if(record===saved)persist();
    }
   })().catch(error=>{
    notice.textContent=error.message+' El intento queda cerrado. Puedes volver a intentar la descarga.';
   }).finally(()=>{delivery=null;render();});
   render();
  }
  async function startAttempt({restore=false,downloadAfter=false}={}){
   if(starting||!record)return;
   starting=true;render();
   const saved=record;
   try{
    const {id,startsAt,figures,resetVersion}=saved;
    const attempt=await request('/view-exam/start',{id,startsAt,figures,resetVersion},{keepalive:true});
    if(record!==saved||recoverClosed())return;
    if(saved.attempt)attempt.deadline=Math.min(attempt.deadline,saved.attempt.deadline);
    saved.attempt=attempt;
    saved.figures=figuresOf(attempt);
    saved.closed=attempt.reason??saved.closed;
    showAttempt();
    if(downloadAfter||(saved.closed&&!sealed()))deliver(downloadAfter||(automatic&&!restore));
   }catch(error){
    notice.textContent=error.message;
   }finally{starting=false;checkVisibility();update();}
  }
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const planned=schedule();
   if(starting||resetting||delivery||!open(planned))return;
   const latest=readRecord();
   if(matches(planned,latest)&&(latest.attempt||latest.closed)){
    record=latest;
    if(record.attempt)showAttempt();
    render();
    return;
   }
   const student=Object.fromEntries([...new FormData(form)].map(([field,value])=>[field,value.trim()]));
   if(Object.values(student).some(value=>!value)){
    notice.textContent='Escribe el nombre, el curso y el grupo.';
    return;
   }
   const previous=record, continuing=matches(planned);
   if(previous&&!continuing&&!archive())return;
   const id=continuing?record.id:crypto.randomUUID();
   record={id,startsAt:planned?.startsAt??null,figures:figuresOf(planned),resetVersion:api.examVersion('vistas'),drawings:{},student};
   notice.textContent='';
   if(!persist(true)){record=previous;render();return;}
   startAttempt();
  });
  download.addEventListener('click',()=>{
   if(!record||delivery||starting)return;
   if(!record.attempt){if(record.closed)startAttempt({restore:true,downloadAfter:true});return;}
   if(!record.closed&&!sealed()&&canEdit()&&!confirm('¿Entregar el examen? Todas las láminas quedarán cerradas.'))return;
   if(!record.closed&&!sealed()){
    record.closed='entrega del alumno';
    record.mode=getMode();
    persist();
   }
   deliver(true);
  });
  dismiss.addEventListener('click',()=>{
   if(!sealed()||!record.downloaded||starting||resetting||delivery)return;
   record.dismissed=true;
   if(!persist())record.dismissed=false;
   render();
   if(record.dismissed)back.focus();
  });
  reset.addEventListener('click',async()=>{
   if(starting||resetting||delivery||!canReset())return;
   const previous=record;
   resetting=true;render();
   try{
    await api.refresh(true);
    if(record!==previous||!canReset())return;
    if(!confirm('¿Iniciar un nuevo intento? El examen anterior quedará archivado en este navegador.'))return;
    if(readRecord()?.id!==previous.id||!archive())return;
    localStorage.removeItem(key);
    record=null;
    automatic=false;
    form.reset();
    notice.textContent='Reinicio autorizado. Introduce tus datos para comenzar.';
   }catch{
    notice.textContent='No se pudo preparar el nuevo intento. Vuelve a intentarlo.';
   }finally{resetting=false;render();if(!form.hidden&&record===null)form.elements.name.focus();}
  });
  const checkVisibility=navigation.watch({active,leave:close,returnToExam(){
   if(record?.closed&&!sealed()&&record.attempt)deliver(automatic);
   update();
  }});
  for(const type of ['pointerdown','click','change','keydown']){
   workspace.addEventListener(type,event=>{
    if(!canEdit()||recoverClosed()){event.preventDefault();event.stopImmediatePropagation();}
   },true);
  }
  window.addEventListener('storage',event=>{
   if(event.key!==key)return;
   const latest=readRecord();
   if(latest?.id===record?.id){recoverClosed();return;}
   record=latest;
   automatic=false;
   if(record?.attempt)showAttempt();
   else render();
  });
  if(record?.attempt){
   showAttempt();
   if(!sealed())startAttempt({restore:true});
  }else if(record?.closed)startAttempt({restore:true});
  api.onChange(update);
  setInterval(update,1000);
  return {save(drawing){if(canEdit()&&!recoverClosed()){record.drawings[record.selected]=drawing;persist();}}};
 }
 window.MADViewExam={mount};
})();
