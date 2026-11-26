(()=>{
'use strict';
const script=document.currentScript;
const lab=script.dataset.lab;
const access=window.MAD_CONTROL;
if(location.protocol==='file:')return;
if(script.dataset.modeParam&&new URLSearchParams(location.search).get(script.dataset.modeParam)!=='1')return;

if(lab){
 const root=document.documentElement;
 root.dataset.labBlocked='';
 const css=document.createElement('style');
 css.textContent=`
  html[data-lab-blocked] body > :not(#mad-lab-gate),
  html[data-lab-blocked] body > :not(#mad-lab-gate) * { visibility:hidden!important }
  html[data-lab-blocked] { overflow:hidden!important }
  html[data-lab-blocked] dialog::backdrop { display:none!important }
  #mad-lab-gate { position:fixed;inset:0;z-index:2147483647;display:grid;
   place-items:center;overflow:auto;padding:24px;background:#08172f;color:#eef6ff;
   font:1rem/1.55 system-ui,sans-serif;text-align:center;box-sizing:border-box }
  #mad-lab-gate[hidden] { display:none }
  #mad-lab-gate > div { width:min(100%,32rem);box-sizing:border-box;padding:24px;
   background:#142d51;border:1px solid #537caf;border-radius:18px }
  #mad-lab-gate h1 { margin:0;color:inherit;font-size:1.5rem }
  #mad-lab-gate a { display:inline-block;padding:8px 16px;border-radius:9px;
   background:#3175d4;color:#fff;text-decoration:none }
 `;
 document.head.append(css);
 function blockLabShortcuts(event){
  if(root.hasAttribute('data-lab-blocked'))event.stopImmediatePropagation();
 }
 for(const type of ['keydown','keyup','keypress'])window.addEventListener(type,blockLabShortcuts,true);
 document.addEventListener('DOMContentLoaded',()=>{
  const gate=document.createElement('section');
  gate.id='mad-lab-gate';
  gate.hidden=true;
  gate.setAttribute('aria-labelledby','mad-lab-title');
  gate.innerHTML='<div><h1 id="mad-lab-title">Acceso al laboratorio</h1><p role="status"></p><a>Volver a Laboratorio</a></div>';
  const title=gate.querySelector('h1'), note=gate.querySelector('p'), back=gate.querySelector('a');
  back.href=new URL('laboratorio.html',script.src).href;
  document.body.append(gate);
  const disabled=new Set();
  let lastAllowed;
  function update(){
   const result=access?.labAccess(lab)??{allowed:false,message:'No se pudo comprobar el plazo. Recarga la página.'};
   const checking=access?.remote&&!access.ready;
   const showNotice=!result.allowed&&(result.closed||!checking);
   const revealNotice=showNotice&&gate.hidden;
   if(showNotice){
    if(note.textContent!==result.message)note.textContent=result.message;
    title.textContent=result.closed?'Laboratorio cerrado':'Acceso al laboratorio';
   }
   gate.hidden=!showNotice;
   if(lastAllowed!==result.allowed){
    lastAllowed=result.allowed;
    root.toggleAttribute('data-lab-blocked',!result.allowed);
    if(result.allowed){
     for(const node of disabled)node.inert=false;
     disabled.clear();
    }else{
     document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
     if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
     for(const node of document.body.children){
      if(node!==gate&&!node.inert){node.inert=true;disabled.add(node)}
     }
    }
   }
   if(revealNotice)back.focus();
  }
  if(access)access.onChange(update);
  else update();
 },{once:true});
 return;
}

document.addEventListener('DOMContentLoaded',()=>{
 if(!access)return;
 const cards=[...document.querySelectorAll('[data-lab-card]')].map(card=>({
  lab:card.dataset.labCard,link:card.querySelector('a.btn'),note:card.querySelector('.lab-deadline')
 }));
 for(const card of cards)card.href=card.link.getAttribute('href');
 access.onChange(()=>{
  for(const {lab,link,note,href} of cards){
   const {allowed,message}=access.labAccess(lab);
   note.hidden=!message;
   if(note.textContent!==message)note.textContent=message;
   if(allowed){
    link.setAttribute('href',href);
    link.removeAttribute('aria-disabled');
   }else{
    link.removeAttribute('href');
    link.setAttribute('aria-disabled','true');
   }
  }
 });
},{once:true});
})();
