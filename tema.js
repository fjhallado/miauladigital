"use strict";
const params=new URLSearchParams(location.search),courseId=params.get('asignatura')||'',unitTitle=params.get('unidad')||'';
const course=(window.AULA_MATERIAS||[]).find(x=>x.id===courseId);
const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
function makeLink(item){const el=document.createElement('article');el.className='resource';const tag=document.createElement('span');tag.className='tag';tag.textContent=item.type||'Material';const title=document.createElement('h3');title.textContent=item.title||'Recurso';const desc=document.createElement('p');desc.textContent=item.description||'';const a=document.createElement('a');const external=/^https?:\/\//i.test(item.url||'');a.href=item.url;a.textContent=external?'Abrir material ↗':'Abrir o descargar →';if(external){a.target='_blank';a.rel='noopener noreferrer'}el.append(tag,title,desc,a);return el}
if(!course || !course.units.some(u=>(typeof u==='string'?u:u.title)===unitTitle)){
set('topic-title','Tema no encontrado');set('topic-description','Vuelve a la asignatura y selecciona una unidad disponible.');document.getElementById('topic-content').hidden=true;
}else{
const unit=course.units.find(u=>(typeof u==='string'?u:u.title)===unitTitle);const obj=typeof unit==='string'?{title:unit}:unit;
document.title=unitTitle+' · '+course.title+' | Mi Aula Digital';set('topic-title',unitTitle);set('topic-grade',course.title+' · '+course.grade);set('topic-breadcrumb',unitTitle);set('topic-description',obj.description||'Apuntes, actividades y materiales de repaso de esta unidad.');
for(const id of ['course-back','course-back-top']){let a=document.getElementById(id);a.href='asignaturas/'+courseId+'.html';if(id==='course-back-top')a.textContent=course.title}
if(obj.image){const img=document.getElementById('topic-cover');img.src=(courseId==='tecnologia-1eso' ? 'recursos/media/tecnologia-1eso-tema-'+String(course.units.indexOf(unit)+1).padStart(2,'0')+'-cabecera.png' : obj.image.replace(/^\.\.\//,''));img.alt='Portada de '+unitTitle;document.getElementById('topic-cover-container').hidden=false;if(courseId==='tecnologia-1eso'||courseId==='tic-2bach')document.getElementById('topic-cover-container').classList.add('technology-cover')}
const groups={notes:[],worksheets:[],videos:[],interactive:[]};
(course.resources||[]).filter(r=>r.unit===unitTitle).forEach(r=>{const type=(r.type||'').toLowerCase();const key=/v[ií]deo|youtube/.test(type)?'videos':/ficha|ejercicio|pdf/.test(type)?'worksheets':/apunte|teor[ií]a|presentaci[oó]n/.test(type)?'notes':'interactive';groups[key].push(r)});
for(const [key,items] of Object.entries(groups)){const root=document.getElementById('topic-'+key);for(const r of items){const clone={...r};if(clone.url&&!/^https?:\/\//i.test(clone.url)&&clone.url.startsWith('../'))clone.url=clone.url.slice(3);root.append(makeLink(clone))}if(!items.length){const msg=document.createElement('p');msg.className='topic-empty';msg.textContent='Próximamente: materiales para este apartado.';root.append(msg)}}
}
