(() => {
 'use strict';
 const madrid = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
 });
 function formatTime(timestamp) {
  const parts = Object.fromEntries(madrid.formatToParts(timestamp).map(({type, value}) => [type, value]));
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}:${parts.second}`;
 }
 async function request(path, data) {
  const api = window.MAD_CONTROL?.url || window.MAD_CONTROL_API;
  if (!api) throw Error('El servicio de sellado y examen requiere conexión.');
  const options = {cache: 'no-store', signal: AbortSignal.timeout(10000)};
  if (data !== undefined) Object.assign(options, {
   method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
  });
  const response = await fetch(api + path, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(result.error || 'El servicio de láminas no responde. Vuelve a intentarlo.');
  return result;
 }
 function drawSeal(ctx, code, right, top) {
  const url = new URL('verificar-lamina.html', location.href);
  url.hash = code;
  const qr = window.qrcode(0, 'M');
  qr.addData(url.href);
  qr.make();
  const count = qr.getModuleCount(), cell = Math.floor(188 / (count + 8));
  const size = (count + 8) * cell, left = right - size;
  ctx.fillStyle = '#fff';
  ctx.fillRect(left, top, size, size);
  ctx.fillStyle = '#000';
  for (let row = 0; row < count; row++)for (let column = 0; column < count; column++){
   if(qr.isDark(row,column))ctx.fillRect(left+(column+4)*cell,top+(row+4)*cell,cell,cell);
  }
 }
 window.MADLamina = {formatTime, request, drawSeal};
})();
