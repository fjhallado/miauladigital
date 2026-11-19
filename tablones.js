"use strict";
(()=>{
 const zone=document.querySelector('[data-board]');
 if(!zone)return;
 const board=zone.dataset.board;
 const data=window.AULA_TABLONES||{};
 const previous=board==='general'?(data.general||[]):((data.asignaturas||{})[board]||[]);
 const endpoint=(window.MAD_CONTROL_API||'').trim().replace(/\/+$/,'');
 const form=zone.querySelector('form');
 const send=form.querySelector('button');
 const notice=zone.querySelector('.board-status');
 const empty=zone.querySelector('.board-empty');
 const list=zone.querySelector('.board-posts');
 const newer=document.createElement('div');
 const more=zone.querySelector('.board-more');
 const madrid=new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeZone:'Europe/Madrid'});
 let before=null,pendingPost=null,loadVersion=0;
 function renderPost(message){
  const article=document.createElement('article');
  article.className='board-post';
  const alias=document.createElement('strong');
  alias.textContent=message.alias||'Visitante';
  const time=document.createElement('time');
  if(message.createdAt){
   time.dateTime=new Date(message.createdAt).toISOString();
   time.textContent=madrid.format(message.createdAt);
  }else time.textContent=message.fecha||'';
  const text=document.createElement('p');
  text.textContent=message.texto;
  article.append(alias,time,text);
  return article;
 }
 list.append(newer,...previous.map(renderPost));
 empty.hidden=previous.length>0;
 const params=()=>new URLSearchParams({board});
 async function request(options={},query=params()){
  const res=await fetch(endpoint+'/comments?'+query,{cache:'no-store',signal:AbortSignal.timeout(10000),...options});
  const result=await res.json();
  if(!res.ok)throw Error(result.error||'El tablón no está disponible.');
  return result;
 }
 async function load(append=false){
  const version=++loadVersion;
  const query=params();
  if(append&&before)query.set('before',before);
  more.disabled=true;
  try{
   const result=await request({},query);
   if(version!==loadVersion)return;
   if(!append)newer.replaceChildren();
   newer.append(...result.comments.map(renderPost));
   before=result.nextBefore;
   more.hidden=!before;
   empty.textContent='Todavía no hay comentarios publicados.';
   empty.hidden=previous.length>0||newer.childElementCount>0;
  }catch{
   if(version!==loadVersion)return;
   if(append)notice.textContent='No se pudieron cargar los comentarios anteriores. Inténtalo de nuevo.';
   else if(!empty.hidden)empty.textContent='No se pudieron cargar los comentarios. Recarga la página para volver a intentarlo.';
  }finally{
   if(version===loadVersion)more.disabled=false;
  }
 }
 more.addEventListener('click',()=>load(true));
 if(!/^https?:\/\//i.test(endpoint)){
  notice.textContent='El tablón en línea está disponible en Mi Aula Digital publicada.';
  return;
 }
 send.disabled=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(send.disabled)return;
  const alias=form.elements.alias.value.trim(),texto=form.elements.mensaje.value.trim();
  if(texto.length<5){notice.textContent='Escribe un comentario de al menos cinco caracteres.';return}
  if(!pendingPost||pendingPost.alias!==alias||pendingPost.texto!==texto){
   pendingPost={nonce:crypto.randomUUID(),alias,texto};
  }
  send.disabled=true;
  notice.textContent='Enviando comentario…';
  try{
   const result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pendingPost)});
   if(form.elements.alias.value.trim()===alias&&form.elements.mensaje.value.trim()===texto)form.reset();
   pendingPost=null;
   if(result.status==='published'){
    notice.textContent='Tu comentario se ha publicado.';
    await load();
   }else notice.textContent=result.status==='removed'?'El comentario se ha retirado del tablón.':'Tu comentario está pendiente de revisión.';
  }catch(error){
   notice.textContent=error instanceof TypeError||error instanceof DOMException?
    'No se pudo enviar el comentario. Inténtalo de nuevo.':error.message;
  }finally{
   send.disabled=false;
  }
 });
 load();
})();
