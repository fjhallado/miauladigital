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
   if(!response.ok)throw Error('No se pudo guardar en el servidor.');
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
$('teacherLogout').addEventListener('click',logout);
api.onChange(()=>{if(loggedIn&&!busy)render()});
render();
})();
