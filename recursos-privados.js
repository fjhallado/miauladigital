(() => {
 const byId = id => document.getElementById(id);
 const documentId = document.body.dataset.privateResources;
 const gate = byId('resource-gate');
 const main = byId('resource-content');
 const content = byId('resource-document');
 const lock = byId('resource-lock');
 const form = byId('resource-login');
 const password = byId('resource-password');
 const message = byId('resource-message');
 const submit = form.querySelector('button');
 const key = 'mad-private-resources-session';
 const api = window.MAD_CONTROL_API;
 const path = '/private-resources/document?document=' + encodeURIComponent(documentId);
 let timer;

 function readSession() {
  try { return JSON.parse(sessionStorage.getItem(key)); }
  catch { return null; }
 }

 function storeSession(session) {
  try {
   if (session) sessionStorage.setItem(key, JSON.stringify(session));
   else sessionStorage.removeItem(key);
  } catch { /* The current page remains usable when browser storage is unavailable. */ }
 }

 async function responseData(response) {
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'No se ha podido abrir el catálogo.');
  return data;
 }

 function request(pathname, options) {
  if (!api) throw Error('No se ha podido conectar con el servidor.');
  return fetch(api + pathname, { ...options, cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(responseData);
 }

 function close(note) {
  clearTimeout(timer);
  storeSession(null);
  main.hidden = true;
  content.replaceChildren();
  gate.hidden = false;
  message.textContent = note || '';
 }

 function show(data, session) {
  if (typeof data.html !== 'string') throw Error('El catálogo no está disponible.');
  content.innerHTML = data.html;
  gate.hidden = true;
  main.hidden = false;
  lock.hidden = !session;
  message.textContent = '';
  if (session) {
   clearTimeout(timer);
   timer = setTimeout(() => close('La sesión ha caducado. Introduce de nuevo la contraseña.'), Math.max(0, session.expiresAt - Date.now()));
  }
  const target = location.hash.slice(1);
  if (target) byId(target)?.scrollIntoView();
 }

 async function open(session) {
  const data = await request(path, { headers: { Authorization: 'Bearer ' + session.token } });
  show(data, session);
 }

 lock.addEventListener('click', () => { close('Acceso cerrado.'); password.focus(); });
 form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  message.textContent = 'Comprobando el acceso…';
  try {
   const session = await request('/private-resources/login', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:password.value})
   });
   await open(session);
   storeSession(session);
   lock.focus();
  } catch (error) {
   close(error instanceof TypeError ? 'No se ha podido conectar con el servidor. Vuelve a intentarlo.' : error.message);
   password.focus();
  } finally {
   password.value = '';
   submit.disabled = false;
  }
 });

 function previewRequest() {
  if (window.parent === window) return null;
  try { return window.parent.madTeacherSalesPreview?.(window, documentId) || null; }
  catch { return null; }
 }

 const preview = previewRequest();
 const session = readSession();
 if (preview) preview.then(responseData).then(data => show(data)).catch(error => close(error.message));
 else if (session?.expiresAt > Date.now()) open(session).catch(error => close(error.message));
})();
