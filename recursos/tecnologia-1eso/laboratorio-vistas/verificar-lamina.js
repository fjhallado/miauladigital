(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const status = $('sealStatus');
 async function verify() {
  const code = location.hash.slice(1);
  $('sealDetails').hidden = true;
  if (!/^[A-Za-z0-9_.-]{40,90}$/.test(code)) {
   status.textContent = 'Escanea el QR de la lámina para comprobar su fecha y hora.';
   return;
  }
  status.textContent = 'Comprobando el sello…';
  try {
   const stamp = await window.MADLamina.request('/view-stamp?' + new URLSearchParams({code}));
   if (location.hash.slice(1) !== code) return;
   $('sealTime').textContent = window.MADLamina.formatTime(stamp.createdAt) + ' (hora peninsular)';
   $('sealFigure').textContent = (stamp.kind === 'e' ? 'Examen' : 'Práctica') + ' · Figura ' + stamp.figure + ' de la Ficha 1';
   status.textContent = 'Sello de hora verificado';
   $('sealDetails').hidden = false;
  } catch (error) {
   if (location.hash.slice(1) === code) status.textContent = error.message;
  }
 }
 window.addEventListener('hashchange',verify);
 verify();
})();
