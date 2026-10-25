"use strict";
const catalog = document.getElementById('catalogo');
const list = window.AULA_CATALOGO || [];
if (!list.length) { const e=document.createElement('p'); e.className='notice';e.textContent='Próximamente: aquí aparecerán los nuevos materiales que se vayan incorporando.';catalog.append(e); }
for (const r of list){
 const art=document.createElement('article');art.className='resource';
 const tag=document.createElement('span');tag.className='tag';tag.textContent=r.modalidad==='pago'?'Recurso externo de pago':'Recurso gratuito';
 const h=document.createElement('h3');h.textContent=r.title||'Recurso';
 const p=document.createElement('p');p.textContent=r.description||'';
 art.append(tag,h,p);
 if(r.url){const a=document.createElement('a');a.href=r.url;a.textContent=r.modalidad==='pago'?'Ver en la plataforma externa →':'Abrir recurso →';if(/^https?:\/\//.test(r.url)){a.target='_blank';a.rel='noopener noreferrer'} art.append(a);}
 catalog.append(art);
}
