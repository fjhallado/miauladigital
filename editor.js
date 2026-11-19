"use strict";
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const original=clone(window.AULA_MATERIAS||[]), originalBoards=clone(window.AULA_TABLONES||{general:[],asignaturas:{}}), initialCatalog=clone(window.AULA_CATALOGO||[]);
let state=clone(original),boards=clone(originalBoards),catalog=clone(initialCatalog);
const course=$('course');
function selected(){return state.find(c=>c.id===course.value)}
function status(s){$('status').textContent=s}
function actions(holder,i,size,edit,move,remove){const group=document.createElement('div');group.className='row-actions';[
  ['Editar',()=>edit(i),false],['↑',()=>move(i,-1),i===0],['↓',()=>move(i,1),i===size-1],['Quitar',()=>remove(i),false]
].forEach(([text,fn,disabled])=>{let b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;if(text==='Quitar')b.className='danger';b.onclick=()=>{fn();saveDraft()};group.append(b)});holder.append(group)}
function listRow(label,i,size,edit,move,remove){let d=document.createElement('div');d.className='list-row';let t=document.createElement('span');t.textContent=label;d.append(t);actions(d,i,size,edit,move,remove);return d}
function moveItem(arr,i,dir){const j=i+dir;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]]}
function moveEditedItem(items,i,d,editId){
 const input=$(editId);
 const other=i+d;
 if(other<0||other>=items.length)return;
 moveItem(items,i,d);
 if(input.value===String(i))input.value=other;
 else if(input.value===String(other))input.value=i;
}
function removeEditedItem(items,i,editId,cancel){
 const input=$(editId);
 items.splice(i,1);
 if(input.value===String(i))cancel();
 else if(input.value!==''&&Number(input.value)>i)input.value=Number(input.value)-1;
}
function safePath(raw){let v=raw.trim();if(!v||/[<>"'`\\]/.test(v)||/^\s*(javascript|data|file):/i.test(v)||v.startsWith('//'))return false;
 if(/^https?:\/\//i.test(v)){try{let u=new URL(v);return ['http:','https:'].includes(u.protocol)}catch{return false}}
 return !v.startsWith('/')&&!v.includes('..\\')&&!v.includes(' ' )&&!v.includes('://')&&/^[\w.\/\-#?%áéíóúüñÁÉÍÓÚÜÑ]+$/.test(v)
}
function unitSelect(){let v=$('resourceUnit').value;$('resourceUnit').replaceChildren(new Option('Sin unidad concreta',''));selected().units.forEach(u=>$('resourceUnit').add(new Option(typeof u==='string'?u:u.title,typeof u==='string'?u:u.title)));$('resourceUnit').value=v}
function render(){let c=selected();$('unitList').replaceChildren();$('resourceList').replaceChildren();c.units.forEach((u,i)=>$('unitList').append(listRow((i+1)+'. '+(typeof u==='string'?u:u.title),i,c.units.length,editUnit,(i,d)=>{moveEditedItem(c.units,i,d,'unitEditIndex');render()},i=>{if(confirm('¿Quitar la unidad?')){removeEditedItem(c.units,i,'unitEditIndex',cancelUnit);render()}})));
(c.resources||[]).forEach((r,i)=>$('resourceList').append(listRow((i+1)+'. '+r.title+' · '+r.type,i,c.resources.length,editResource,(i,d)=>{moveEditedItem(c.resources,i,d,'resourceEditIndex');render()},i=>{if(confirm('¿Quitar este recurso?')){removeEditedItem(c.resources,i,'resourceEditIndex',cancelResource);render()}})));unitSelect()}
function cancelUnit(){$('unitForm').reset();$('unitEditIndex').value='';$('unitSubmit').textContent='+ Añadir unidad';$('unitCancel').hidden=true}
function cancelResource(){$('resourceForm').reset();$('resourceEditIndex').value='';$('resourceSubmit').textContent='+ Añadir recurso';$('resourceCancel').hidden=true;unitSelect();preview()}
function editUnit(i,focus=true){let u=selected().units[i];$('unit').value=typeof u==='string'?u:u.title;$('unitImage').value=typeof u==='string'?'':(u.image||'');$('unitDesc').value=typeof u==='string'?'':(u.description||'');$('unitTrimester').value=typeof u==='string'?'':(u.trimester||'');$('unitEditIndex').value=i;$('unitSubmit').textContent='Guardar cambios de unidad';$('unitCancel').hidden=false;if(focus)$('unit').focus()}
function editResource(i,focus=true){let r=selected().resources[i];$('resourceEditIndex').value=i;$('kind').value=r.type;$('title').value=r.title;$('description').value=r.description||'';$('url').value=r.url;$('imageUrl').value=r.image||'';$('resourceUnit').value=r.unit||'';$('resourceSubmit').textContent='Guardar cambios del recurso';$('resourceCancel').hidden=false;preview();if(focus)$('title').focus()}
$('unitCancel').onclick=()=>{cancelUnit();saveDraft()};
$('resourceCancel').onclick=()=>{cancelResource();saveDraft()};
course.onchange=()=>{cancelUnit();cancelResource();render();saveDraft()};
$('unitForm').onsubmit=e=>{e.preventDefault();let v=$('unit').value.trim(),idx=$('unitEditIndex').value,img=$('unitImage').value.trim(),desc=$('unitDesc').value.trim();if(!v)return;if(img&&!safePath(img)){alert('Ruta de imagen no válida');return}let unit={title:v};if(img)unit.image=img;if(desc)unit.description=desc;if($('unitTrimester').value)unit.trimester=Number($('unitTrimester').value);if(idx==='')selected().units.push(unit);else selected().units[Number(idx)]=unit;cancelUnit();render();status('Unidad guardada. Descarga datos.js al terminar.');saveDraft()};
$('resourceForm').onsubmit=e=>{e.preventDefault();let url=$('url').value.trim(),image=$('imageUrl').value.trim();if(!safePath(url)||image&&!safePath(image)){alert('Revisa las rutas. Usa una URL https:// o una ruta local relativa segura.');return}let c=selected();c.resources=c.resources||[];let record={type:$('kind').value,title:$('title').value.trim(),description:$('description').value.trim(),url};if(image)record.image=image;if($('resourceUnit').value)record.unit=$('resourceUnit').value;let idx=$('resourceEditIndex').value;if(idx==='')c.resources.push(record);else c.resources[Number(idx)]=record;cancelResource();render();status('Recurso guardado. Descarga datos.js al terminar.');saveDraft()};
function preview(){let root=$('resourcePreview');root.replaceChildren();let title=$('title').value.trim(),img=$('imageUrl').value.trim();let strong=document.createElement('strong');strong.textContent=title||'Vista previa del recurso';root.append(strong);let p=document.createElement('p');p.textContent=$('description').value.trim()||'Descripción opcional';root.append(p);if(img&&safePath(img)){const el=document.createElement('img');el.src=img;el.alt='Imagen del recurso (si ya existe en su ruta)';el.onerror=()=>{el.remove();let message=document.createElement('small');message.textContent='La imagen no está disponible todavía en la ruta indicada.';root.append(message)};root.append(el)}}
['title','description','imageUrl'].forEach(id=>$(id).addEventListener('input',preview));
function renderCatalog(){let r=$('catalogList');r.replaceChildren();catalog.forEach((x,i)=>r.append(listRow(x.title+' · '+(x.modalidad==='pago'?'De pago':'Gratuito'),i,catalog.length,i=>{let v=prompt('Nombre del recurso',catalog[i].title);if(v!==null&&v.trim())catalog[i].title=v.trim();renderCatalog()},(i,d)=>{moveItem(catalog,i,d);renderCatalog()},i=>{if(confirm('¿Quitar del catálogo?')){catalog.splice(i,1);renderCatalog()}})))}
$('catalogForm').onsubmit=e=>{e.preventDefault();let url=$('catalogUrl').value.trim(),modalidad=$('catalogType').value;if(!safePath(url)||(modalidad==='pago'&&!/^https:\/\//i.test(url))){alert('Enlace no válido: los de pago deben ser https:// externos.');return}catalog.push({title:$('catalogTitle').value.trim(),description:$('catalogDescription').value.trim(),url,modalidad});$('catalogForm').reset();renderCatalog();status('Catálogo actualizado. Descarga datos.js');saveDraft()};
const boardScope=$('board-scope');
function posts(create=false){
 if(boardScope.value==='general')return boards.general;
 if(create&&!Object.hasOwn(boards.asignaturas,boardScope.value)){
  boards.asignaturas={...boards.asignaturas,[boardScope.value]:[]};
 }
 return Object.hasOwn(boards.asignaturas,boardScope.value)?boards.asignaturas[boardScope.value]:[];
}
function renderPosts(){$('postList').replaceChildren();posts().forEach((m,i)=>$('postList').append(listRow((m.alias||'Visitante')+': '+m.texto.slice(0,80),i,posts().length,i=>{let x=prompt('Mensaje revisado',posts()[i].texto);if(x!==null&&x.trim())posts()[i].texto=x.trim();renderPosts()},(i,d)=>{moveItem(posts(),i,d);renderPosts()},i=>{if(confirm('¿Quitar mensaje?')){posts().splice(i,1);renderPosts()}})))}
boardScope.onchange=()=>{renderPosts();saveDraft()};
$('postForm').onsubmit=e=>{e.preventDefault();let text=$('postMessage').value.trim();if(!text)return;posts(true).push({alias:$('postAlias').value.trim()||'Visitante',texto:text,fecha:new Date().toLocaleDateString('es-ES')});$('postForm').reset();renderPosts();status('Mensaje añadido. Descarga datos.js al terminar.');saveDraft()};
function download(name,content,type){let blob=new Blob([content],{type}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
$('download').onclick=()=>{download('datos.js','window.AULA_MATERIAS = '+JSON.stringify(state,null,2)+';\nwindow.AULA_TABLONES = '+JSON.stringify(boards,null,2)+';\nwindow.AULA_CATALOGO = '+JSON.stringify(catalog,null,2)+';\n','text/javascript;charset=utf-8');status('datos.js generado. Sustituye el archivo anterior en la web y en su alojamiento.')};
$('exportBackup').onclick=()=>{download('mi-aula-copia-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(contents(),null,2),'application/json')};
$('importBackup').onchange=async e=>{
 const file=e.target.files[0];
 if(!file)return;
 try{
  const data=readContents(JSON.parse(await file.text()));
  if(!confirm('¿Restaurar los contenidos de esta copia de seguridad?'))return;
  loadContents(data);
  saveDraft();
  status('Copia cargada. Descarga datos.js para publicarla.');
 }catch(err){
  alert('No se pudo importar el archivo JSON: '+err.message);
 }finally{
  e.target.value='';
 }
};
$('reset').onclick=()=>{
 if(!confirm('¿Restaurar la versión publicada y borrar los cambios del editor?'))return;
 loadContents(published);
 saveDraft();
 status('Versión publicada cargada en el editor.');
};

const DRAFT_KEY='mi-aula-digital-editor-draft:'+location.pathname;
const formFields=[
 ['unit','unitImage','unitDesc','unitTrimester','unitEditIndex'],
 ['kind','title','description','url','imageUrl','resourceUnit','resourceEditIndex'],
 ['postAlias','postMessage'],
 ['catalogTitle','catalogDescription','catalogUrl','catalogType']
];
const fieldIds=formFields.flat();
const published={materias:original,tablones:originalBoards,catalogo:initialCatalog};
const publishedJSON=JSON.stringify(published);
let defaults,storedDraft=null,waitingForRecovery=false,unsaved=false;

function contents(){return {materias:state,tablones:boards,catalogo:catalog}}
function readContents(data){
 const string=value=>typeof value==='string';
 const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 const listed=(items,check)=>Array.isArray(items)&&items.every(check);
 const courseRecord=c=>record(c)&&string(c.id)&&!!c.id&&string(c.title)&&
  listed(c.units,u=>string(u)||(record(u)&&string(u.title)))&&
  listed(c.resources,r=>record(r)&&string(r.title)&&string(r.type)&&string(r.url));
 const messages=items=>listed(items,m=>record(m)&&string(m.texto));
 const boards=data?.tablones??originalBoards;
 const catalog=data?.catalogo??[];
 if(!data||!listed(data.materias,courseRecord)||!data.materias.length||
    new Set(data.materias.map(c=>c.id)).size!==data.materias.length||
    !record(boards)||!messages(boards.general)||!record(boards.asignaturas)||
    !Object.values(boards.asignaturas).every(messages)||
    !listed(catalog,r=>record(r)&&string(r.title)&&string(r.url))){
  throw Error('Estructura no válida');
 }
 return {materias:data.materias,tablones:boards,catalogo:catalog};
}
function loadContents(data){
 const previousCourse=course.value, previousBoard=boardScope.value;
 ({materias:state,tablones:boards,catalogo:catalog}=clone(data));
 const options=()=>state.map(c=>new Option(c.title+(c.grade?' · '+c.grade:''),c.id));
 course.replaceChildren(...options());
 if(state.some(c=>c.id===previousCourse))course.value=previousCourse;
 boardScope.replaceChildren(new Option('Portada general','general'),...options());
 if(state.some(c=>c.id===previousBoard))boardScope.value=previousBoard;
 $('postForm').reset();
 $('catalogForm').reset();
 cancelUnit();
 cancelResource();
 render();
 renderPosts();
 renderCatalog();
}
function draftMessage(text){
 const node=$('draftStatus');
 if(node.textContent!==text)node.textContent=text;
}
function currentFields(){
 const forms=formFields.map(ids=>ids.map(id=>[id,$(id).value]));
 return Object.fromEntries(forms.filter(fields=>fields.some(([id,value])=>value!==defaults[id])).flat());
}
function readDraft(raw){
 const draft=JSON.parse(raw);
 if(draft?.version!==1||typeof draft.base!=='string'||!draft.fields||
    Array.isArray(draft.fields)||typeof draft.fields!=='object'||
    !Object.values(draft.fields).every(value=>typeof value==='string')){
  throw Error('Formato de borrador no válido');
 }
 draft.data=readContents(draft.data);
 return draft;
}
function showRecovery(raw,message,freeze){
 let recoverable=false;
 if(raw!==null){try{readDraft(raw);recoverable=true}catch{}}
 waitingForRecovery=freeze;
 $('editorLayout').inert=freeze;
 $('draftActions').hidden=false;
 $('recoverDraft').hidden=!recoverable;
 $('discardDraft').textContent=raw===null?'Cargar versión publicada':'Descartar borrador';
 draftMessage(message);
}
function hideRecovery(){
 waitingForRecovery=false;
 $('editorLayout').inert=false;
 $('draftActions').hidden=true;
}
function saveDraft(){
 if(waitingForRecovery)return;
 const data=contents();
 const fields=currentFields();
 const changed=JSON.stringify(data)!==publishedJSON;
 const hasFields=Object.keys(fields).length>0;
 const pending=changed||hasFields;
 try{
  const raw=localStorage.getItem(DRAFT_KEY);
  if(raw!==storedDraft){
   unsaved=pending;
   showRecovery(raw,'El borrador cambió en otra pestaña. Puedes descargar tus cambios antes de cargar otra versión.',false);
   return;
  }
  const next=pending?JSON.stringify({version:1,base:publishedJSON,data,fields,course:course.value,board:boardScope.value}):null;
  if(next!==raw){
   if(next===null)localStorage.removeItem(DRAFT_KEY);
   else localStorage.setItem(DRAFT_KEY,next);
  }
  storedDraft=next;
  unsaved=false;
  draftMessage(changed?'Cambios sin publicar. Borrador guardado en este navegador.':
   hasFields?'Formulario en borrador. Guárdalo en su sección para incluirlo al descargar datos.js.':
   'Guardado automático activado en este navegador.');
 }catch{
  unsaved=pending;
  draftMessage('No se pudo guardar el borrador. Guarda los formularios pendientes y descarga datos.js antes de cerrar.');
 }
}
function restoreDraft(draft){
 loadContents(draft.data);
 if(state.some(c=>c.id===draft.course))course.value=draft.course;
 if(state.some(c=>c.id===draft.board)||draft.board==='general')boardScope.value=draft.board;
 render();
 renderPosts();
 const unitIndex=Number(draft.fields.unitEditIndex);
 if(draft.fields.unitEditIndex&&Number.isInteger(unitIndex)&&selected().units[unitIndex])editUnit(unitIndex,false);
 const resourceIndex=Number(draft.fields.resourceEditIndex);
 if(draft.fields.resourceEditIndex&&Number.isInteger(resourceIndex)&&selected().resources[resourceIndex])editResource(resourceIndex,false);
 for(const id of fieldIds){
  if(id==='unitEditIndex'||id==='resourceEditIndex')continue;
  if(Object.hasOwn(draft.fields,id))$(id).value=draft.fields[id];
 }
 preview();
 hideRecovery();
 saveDraft();
 if(!unsaved&&(Object.keys(currentFields()).length||JSON.stringify(contents())!==publishedJSON)){
  draftMessage('Borrador recuperado. '+$('draftStatus').textContent);
 }
}
function reopenDraft(recover){
 try{
  const raw=localStorage.getItem(DRAFT_KEY);
  if(recover){
   if(raw===null)throw Error('El borrador ya no está disponible.');
   const draft=readDraft(raw);
   if(unsaved&&!confirm('¿Sustituir los cambios de esta pestaña por el borrador guardado?'))return;
   if(localStorage.getItem(DRAFT_KEY)!==raw)throw Error('El borrador acaba de cambiar. Vuelve a intentarlo.');
   storedDraft=raw;
   restoreDraft(draft);
  }else{
   if((raw!==null||unsaved)&&!confirm('¿Descartar el borrador y cargar la versión publicada?'))return;
   if(localStorage.getItem(DRAFT_KEY)!==raw)throw Error('El borrador acaba de cambiar. Vuelve a intentarlo.');
   storedDraft=raw;
   hideRecovery();
   loadContents(published);
   saveDraft();
   status('Versión publicada cargada en el editor.');
  }
 }catch(error){
  draftMessage(error.message);
 }
}

loadContents(published);
defaults=Object.fromEntries(fieldIds.map(id=>[id,$(id).value]));
for(const id of fieldIds){
 $(id).addEventListener('input',saveDraft);
 $(id).addEventListener('change',saveDraft);
}
$('recoverDraft').onclick=()=>reopenDraft(true);
$('discardDraft').onclick=()=>reopenDraft(false);
window.addEventListener('storage',event=>{
 if((event.key===DRAFT_KEY||event.key===null)&&event.newValue!==storedDraft){
  saveDraft();
 }
});
window.addEventListener('beforeunload',event=>{
 if(!unsaved)return;
 event.preventDefault();
 event.returnValue='';
});
try{
 storedDraft=localStorage.getItem(DRAFT_KEY);
 if(storedDraft===null)saveDraft();
 else{
  const draft=readDraft(storedDraft);
  if(draft.base===publishedJSON||JSON.stringify(draft.data)===publishedJSON)restoreDraft(draft);
  else showRecovery(storedDraft,'Hay un borrador de otra versión. Si lo recuperas, se cargará la copia que guardaste. Si prefieres partir de los contenidos publicados, descarta el borrador.',true);
 }
}catch{
 if(storedDraft!==null)showRecovery(storedDraft,'No se pudo leer el borrador guardado. Puedes descartarlo y cargar la versión publicada.',true);
 else draftMessage('El navegador no permite el guardado automático. Descarga los cambios antes de cerrar.');
}
