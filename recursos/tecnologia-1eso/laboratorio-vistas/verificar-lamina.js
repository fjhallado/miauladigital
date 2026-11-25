(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const status = $('sealStatus'), details = $('sealDetails'), identifier = $('sealId');
 const form = $('sealForm'), password = $('sealPassword'), submit = form.querySelector('button');
 const validCode = code => /^[A-Za-z0-9_.-]{40,90}$/.test(code);
 let revision = 0;
 function reset() {
  revision++;
  const code = location.hash.slice(1);
  details.hidden = true;
  $('sealTime').textContent = '';
  $('sealFigure').textContent = '';
  identifier.textContent = '';
  form.reset();
  form.hidden = !validCode(code);
  submit.disabled = false;
  status.textContent = form.hidden ? 'Escanea el QR de la lámina para comprobar su fecha y hora.' :
   'Introduce la contraseña para consultar los datos de la lámina.';
 }
 form.addEventListener('submit', async event => {
  event.preventDefault();
  const code = location.hash.slice(1), current = revision;
  if (!validCode(code) || submit.disabled) return;
  submit.disabled = true;
  status.textContent = 'Comprobando el sello…';
  const entered = password.value;
  password.value = '';
  try {
   const stamp = await window.MADLamina.request('/view-stamp/verify', {code, password: entered});
   if (current !== revision) return;
   $('sealTime').textContent = window.MADLamina.formatTime(stamp.createdAt) + ' (hora peninsular)';
   $('sealFigure').textContent = (stamp.kind === 'e' ? 'Examen' : 'Práctica') + ' · Figura ' + stamp.figure + ' de la Ficha ' + (stamp.figure <= 24 ? 1 : 2);
   identifier.textContent = stamp.id;
   status.textContent = 'Sello de hora verificado';
   form.hidden = true;
   details.hidden = false;
  } catch (error) {
   if (current === revision) status.textContent = error.message;
  } finally {
   if (current === revision) submit.disabled = false;
  }
 });
 window.addEventListener('hashchange',reset);
 reset();
})();
