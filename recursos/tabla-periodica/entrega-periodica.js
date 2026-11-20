(()=>{
'use strict';
const root='mi-aula-nota-periodica:';
const endpoint=window.MAD_CONTROL?.url;
const memory=new Map();
const sending=new Set();
const events='mad-nota-periodica';

function read(key){
 if(memory.has(key))return memory.get(key);
 try{return JSON.parse(localStorage.getItem(key))}catch{return null}
}
function write(key,value){
 try{
  localStorage.setItem(key,JSON.stringify(value));
  memory.delete(key);
 }catch{memory.set(key,value)}
 window.dispatchEvent(new CustomEvent(events));
}
function pendingKeys(){
 const keys=new Set(memory.keys());
 try{
  for(let index=0;index<localStorage.length;index++){
   const key=localStorage.key(index);
   if(key?.startsWith(root))keys.add(key);
  }
 }catch{}
 return keys;
}
async function send(key){
 const entry=read(key);
 if(!endpoint||!entry?.payload||sending.has(key))return;
 sending.add(key);
 window.dispatchEvent(new CustomEvent(events));
 let updated;
 try{
  const response=await fetch(endpoint+'/periodic-grades',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(entry.payload),keepalive:true,signal:AbortSignal.timeout(10000)
  });
  if(response.ok&&(await response.json()).saved===true)updated={sent:true};
  else if([400,413].includes(response.status))updated={invalid:true};
 }catch{
  // The original entry stays pending for the next connection.
 }finally{
  sending.delete(key);
  if(updated)write(key,updated);
  else window.dispatchEvent(new CustomEvent(events));
 }
}
function flush(){
 for(const key of pendingKeys())send(key);
}
function enqueue(payload){
 const key=root+payload.inicio;
 if(!read(key))write(key,{payload});
 send(key);
}
function status(inicio){
 if(!endpoint)return 'El registro de notas está disponible en el aula publicada.';
 const key=root+inicio,entry=read(key);
 if(entry?.sent)return 'Nota guardada en el panel Profesor.';
 if(entry?.invalid)return 'No se pudo registrar la nota. Conserva el PDF y avisa al profesor.';
 if(sending.has(key))return 'Guardando la nota…';
 return 'Nota pendiente de envío. Si se pierde la conexión, vuelve a abrir el examen en este navegador para continuar el envío.';
}
window.MAD_PERIODIC_DELIVERY={enqueue,status,events};
if(endpoint){
 window.addEventListener('online',flush);
 window.addEventListener('focus',flush);
 window.addEventListener('storage',event=>{
  if(event.key?.startsWith(root))window.dispatchEvent(new CustomEvent(events));
 });
 window.setInterval(flush,20000);
 flush();
}
})();
