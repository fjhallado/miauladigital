(() => {
 'use strict';
 const script=document.currentScript;
 if(script.hasAttribute('data-solo-ventana')&&window.self!==window.top)return;
 const base=new URL(script.dataset.sitio||'.',script.src);
 const current=new URL(location.href);
 const subject=new URLSearchParams(current.search).get('asignatura');
 const path=current.pathname.startsWith(base.pathname)?current.pathname.slice(base.pathname.length):'';

 const subjects=[
  ['Matemáticas · 1.º ESO','asignaturas/matematicas-1eso.html'],
  ['Física y Química · 1.º ESO','asignaturas/fisica-quimica-1eso.html'],
  ['Tecnología · 1.º ESO','asignaturas/tecnologia-1eso.html'],
  ['Tecnología · 3.º ESO','asignaturas/tecnologia-3eso.html'],
  ['TIC I · 1.º Bachillerato','asignaturas/tic-1bach.html'],
  ['TIC II · 2.º Bachillerato','asignaturas/tic-2bach.html']
 ];
 const labs=[
  ['Física','laboratorios/fisica.html',[
   ['Laboratorio de gases','recursos/fisica-quimica-2eso/laboratorio-gases/index.html'],
   ['FactorLab','recursos/fisica-quimica-2eso/conversiones-compuestas/index.html']
  ]],
  ['Matemáticas','laboratorios/matematicas.html',[
   ['Bingo Matemático','bingo-matematico.html']
  ]],
  ['Química','laboratorios/quimica.html',[
   ['Tabla periódica interactiva','recursos/tabla-periodica/index.html']
  ]],
  ['Tecnología','laboratorios/tecnologia.html',[
   ['Laboratorio de vistas','recursos/tecnologia-1eso/laboratorio-vistas/index.html'],
   ['Mesa de dibujo 2D','recursos/tecnologia-1eso/planos-2d/index.html']
  ]],
  ['Informática','laboratorios/informatica.html',[
   ['Laboratorio HTML y CSS','recursos/tic-2bach/laboratorio.html']
  ]]
 ];
 const games=[
  ['El impostor','juegos/impostor.html'],
  ['Arcade Escolar','juegos/arcade-escolar.html'],
  ['Minijuegos','juegos/recreo.html']
 ];

 function link(label,destination,locked=false){
  const url=new URL(destination,base);
  const active=url.origin===current.origin&&(
   url.pathname===current.pathname&&url.hash===current.hash&&!url.search ||
   path===''&&!current.hash&&destination==='index.html'
  );
  return `<a href="${url.href}"${active?' aria-current="page"':''}>${locked?'<span class="mad-lock" aria-hidden="true">🔒</span> ':''}${label}</a>`;
 }
 function list(links){
  return `<ul>${links.map(entry=>`<li>${link(...entry)}</li>`).join('')}</ul>`;
 }
 function labMenu(){
  return labs.map(([name,destination,links])=>
   `<details class="mad-lab-group" name="mad-lab-group"><summary>Laboratorio de ${name}</summary>${list([['Ver laboratorio de '+name.toLowerCase(),destination],...links])}</details>`
  ).join('');
 }
 function group(label,destination,panel,active){
  return `<li class="mad-menu-group${active?' mad-current-section':''}">
   ${link(label,destination)}
   <details class="mad-dropdown" name="mad-dropdown">
    <summary aria-label="Desplegar ${label}"><span aria-hidden="true"></span></summary>
    <div class="mad-menu-panel">${panel}</div>
   </details>
  </li>`;
 }

 const labSection=script.dataset.seccion==='laboratorio'||path==='laboratorio.html'||path.startsWith('laboratorios/')||
  labs.some(([, ,entries])=>entries.some(([,destination])=>path===destination));
 const assignmentSection=path.startsWith('asignaturas/')||path==='tema.html'&&!!subject||
  /^recursos\/(?:matematicas-|fisica-quimica-|tecnologia-|tic-)/.test(path);
 const gamesSection=script.dataset.seccion==='cafeteria'||path==='cafeteria.html'||path.startsWith('juegos/');
 const header=document.createElement('header');
 header.className='mad-site-header';
 header.innerHTML=`<div class="mad-header-inner">
  <div class="mad-brand">
   <div class="mad-brand-title">${link('Mi Aula Digital','index.html')}
    <a class="mad-youtube" href="https://www.youtube.com/@mi_aula_digital" aria-label="Canal de YouTube de Mi Aula Digital"><span aria-hidden="true"></span></a>
   </div>
   <div class="mad-author"><span>Creada por:</span><span>Francisco José Hallado Fernández</span><span>Profesor de ESO y Bachillerato</span></div>
  </div>
  <button class="mad-mobile-menu" type="button" aria-controls="mad-main-navigation" aria-expanded="false">Menú <span aria-hidden="true">☰</span></button>
  <nav class="mad-main-navigation" id="mad-main-navigation" aria-label="Navegación principal">
   <ul class="mad-primary-links">
    <li>${link('Inicio','index.html')}</li>
    ${group('Asignaturas','index.html#asignaturas',list(subjects),assignmentSection)}
    <li>${link('Cómo funciona','index.html#funcionamiento')}</li>
    ${group('Laboratorio','laboratorio.html',labMenu(),labSection)}
    ${group('Cafetería','cafeteria.html',list(games),gamesSection)}
    <li>${link('Tablón','index.html#tablon')}</li>
    <li>${link('¿Qué es?','acerca.html')}</li>
    <li>${link('Contacto','contacto.html')}</li>
    <li>${link('Otros recursos','otros-recursos.html',true)}</li>
    <li>${link('Profesor','profesor.html',true)}</li>
   </ul>
  </nav>
 </div>`;
 script.before(header);

 const mobile=header.querySelector('.mad-mobile-menu');
 function collapse(){
  for(const dropdown of header.querySelectorAll('details[open]'))dropdown.open=false;
  mobile.setAttribute('aria-expanded','false');
 }
 mobile.addEventListener('click',()=>{
  if(mobile.getAttribute('aria-expanded')==='true')collapse();
  else mobile.setAttribute('aria-expanded','true');
 });
 document.addEventListener('click',event=>{
  if(!header.contains(event.target))collapse();
 });
 header.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const dropdown=event.target.closest('details[open]')||header.querySelector('.mad-dropdown[open]');
  if(dropdown){
   dropdown.open=false;
   dropdown.querySelector('summary').focus();
  }else if(mobile.getAttribute('aria-expanded')==='true'){
   collapse();
   mobile.focus();
  }else return;
  event.preventDefault();
 });
})();
