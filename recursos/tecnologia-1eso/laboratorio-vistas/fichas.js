(() => {
 'use strict';
 const status = document.getElementById('worksheetStatus');
 const files = document.getElementById('worksheetFiles');
 const sizes = new Intl.NumberFormat('es-ES', {maximumFractionDigits: 1});
 async function load() {
  const api = window.MAD_CONTROL?.url;
  try {
   if (!api) throw new Error('Servidor de fichas sin configurar.');
   const response = await fetch(api + '/view-worksheets', {cache: 'no-store', signal: AbortSignal.timeout(10000)});
   if (!response.ok) throw new Error('No se han podido cargar las fichas.');
   const data = await response.json();
   files.replaceChildren(...data.files.map(({id, title, size}) => {
    const item = document.createElement('li');
    const label = document.createElement('strong');
    label.textContent = title;
    const detail = document.createElement('small');
    detail.textContent = 'PDF · ' + (size >= 1024 * 1024 ? sizes.format(size / (1024 * 1024)) + ' MB' : sizes.format(Math.max(1, size / 1024)) + ' KB');
    const download = document.createElement('a');
    download.className = 'btn secondary';
    download.href = api + '/view-worksheets?' + new URLSearchParams({id});
    download.textContent = 'Descargar PDF ↓';
    download.setAttribute('aria-label', 'Descargar PDF de ' + title);
    item.append(label, detail, download);
    return item;
   }));
   status.textContent = data.files.length ? '' : 'Todavía no hay fichas PDF publicadas.';
  } catch {
   status.textContent = 'No se han podido cargar las fichas. Vuelve a intentarlo en unos segundos.';
  }
 }
 load();
 window.addEventListener('pageshow', event => { if (event.persisted) load(); });
})();
