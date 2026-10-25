"use strict";
/* Contador global gratuito. No guarda nombres ni correos en Mi Aula Digital.
   API pública Abacus: https://abacus.jasoncameron.dev
   Contamos una sola vez por sesión de pestaña/navegador y mostramos una
   cifra común para toda la web (no usuarios únicos verificables). */
(() => {
  const nodes = document.querySelectorAll('[data-visit-counter]');
  if (!nodes.length) return;
  const name = 'mi-aula-digital-fjhallado-2026';
  const key = 'entradas-globales';
  const api = 'https://abacus.jasoncameron.dev/';
  const sessionKey = 'aula-global-visit-v1';
  const show = text => nodes.forEach(el => { el.textContent = text; });
  const render = data => {
    const value = Number(data && data.value);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Respuesta incorrecta');
    show('Visitas a Mi Aula Digital: ' + value.toLocaleString('es-ES'));
  };
  if (location.protocol === 'file:') {
    show('El contador global se activará al publicar la web');
    return;
  }
  let counted = false;
  try { counted = sessionStorage.getItem(sessionKey) === '1'; } catch (_) {}
  const url = api + (counted ? 'get/' : 'hit/') + encodeURIComponent(name) + '/' + encodeURIComponent(key);
  // Solo una petición por sesión, independientemente de la sección visitada.
  if (!counted) {
    try { sessionStorage.setItem(sessionKey, '1'); } catch (_) {}
  }
  fetch(url, {mode:'cors', cache:'no-store'})
    .then(r => { if (!r.ok) throw new Error('Servicio no disponible'); return r.json(); })
    .then(render)
    .catch(() => show('Visitas globales: temporalmente no disponibles'));
})();
