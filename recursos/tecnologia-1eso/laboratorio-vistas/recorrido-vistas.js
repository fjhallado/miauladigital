(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const saved = window.MADSavedViews;
 const fixed = window.MADFixedDrawing;
 const originalViews = $('front').closest('.views');
 const references = document.createElement('div');
 references.className = 'saved-views';
 references.hidden = true;
 const canvases = {};
 for (const view of saved.views) {
  const figure = document.createElement('div');
  const label = document.createElement('p');
  label.className = 'viewtitle';
  label.textContent = saved.names[view];
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', saved.names[view] + ' del ejercicio guardado');
  figure.append(label, canvas);
  references.append(figure);
  canvases[view] = canvas;
 }
 originalViews.after(references);
 const options = document.createElement('div');
 options.className = 'saved-exercise';
 options.hidden = true;
 options.innerHTML = '<label for="savedExercise">Ejercicios de Proyectar</label> <select id="savedExercise"></select>' +
  '<p id="savedExerciseStatus" role="status"></p><a class="ficha-action" href="ficha-1.html?modo=proyectar">Ir a Proyectar</a>';
 $('activityDescription').parentElement.append(options);
 const selector = $('savedExercise');
 const notice = $('savedExerciseStatus');
 const picker = $('exerciseFigurePicker');
 const pickerButton = $('newViewExercise');
 let currentExercise = null;
 let usingLibrary = false;
 const routes = {isometric: '#representar', build: '#construccion', identify: '#coleccion-caras', views: '#coleccion-vistas'};

 function drawReference() {
  if (currentExercise && document.body.dataset.training === 'isometric') saved.show(canvases, currentExercise);
 }
 new ResizeObserver(drawReference).observe(references);

 function chooseExercise(exercise) {
  currentExercise = exercise;
  references.hidden = !exercise;
  originalViews.hidden = true;
  document.body.dataset.drawnViews = exercise ? 'active' : 'empty';
  $('isoHeading').textContent = 'Dibuja la perspectiva';
  fixed.setReferenceSize(exercise ? Math.max(...Object.values(exercise.grids).flatMap(({w, h}) => [w, h])) : null);
  $('isoSolution160').hidden = true;
  $('solutionViewExercise').hidden = true;
  notice.textContent = exercise
   ? 'Figura ' + exercise.number + ' de la Ficha 1. Usa tus vistas de referencia para dibujar la perspectiva.'
   : 'Dibuja el alzado, el perfil y la planta en Proyectar para que el ejercicio aparezca aquí.';
  drawReference();
 }

 function loadExercises(requested) {
  const exercises = saved.completed();
  selector.replaceChildren(...exercises.map(exercise => new Option('Figura ' + exercise.number + ' · Ficha 1', exercise.number)));
  selector.disabled = exercises.length === 0;
  if (!exercises.length) selector.add(new Option('Sin ejercicios guardados', ''));
  const chosen = exercises.find(exercise => exercise.number === requested) || exercises[0] || null;
  if (chosen) selector.value = chosen.number;
  return chosen;
 }

 function updateUrl(mode, figure) {
  const url = new URL(location.href);
  url.hash = routes[mode] || '';
  if (figure) url.searchParams.set('figura', figure);
  else url.searchParams.delete('figura');
  history.replaceState(null, '', url);
 }

 function setFigurePicker(open) {
  const show = open && !pickerButton.hidden;
  picker.hidden = !show;
  pickerButton.setAttribute('aria-expanded', String(show));
 }

 pickerButton.addEventListener('click', () => {
  setFigurePicker(picker.hidden);
  if (!picker.hidden) {
   picker.focus({preventScroll: true});
   picker.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
 });

 window.addEventListener('mad-library-figure-selected', () => {
  setFigurePicker(false);
  if (document.body.dataset.training !== 'isometric') return;
  usingLibrary = true;
  currentExercise = null;
  references.hidden = true;
  originalViews.hidden = false;
  delete document.body.dataset.drawnViews;
  fixed.setReferenceSize(null);
  updateUrl('isometric');
 });

 selector.addEventListener('change', () => {
  usingLibrary = false;
  setFigurePicker(false);
  chooseExercise(loadExercises(Number(selector.value)));
  updateUrl('isometric', currentExercise?.number);
 });

 for (const button of document.querySelectorAll('[data-work]')) button.addEventListener('click', () => {
  const mode = button.dataset.work;
  usingLibrary = false;
  currentExercise = null;
  references.hidden = true;
  originalViews.hidden = false;
  delete document.body.dataset.drawnViews;
  setFigurePicker(false);
  options.hidden = mode !== 'isometric';
  if (mode === 'isometric') {
   $('activityTitle').textContent = '03 · Representar en perspectiva';
   $('activityDescription').textContent = 'Reconstruye la pieza a partir de tus vistas en cuadrícula isométrica o caballera.';
   $('activityFeedback').textContent = '';
   chooseExercise(loadExercises(Number(new URLSearchParams(location.search).get('figura'))));
  } else {
   fixed.setReferenceSize(null);
   if (mode !== 'build') setFigurePicker(true);
  }
  updateUrl(mode, currentExercise?.number);
 });

 window.addEventListener('storage', event => {
  if (event.key !== saved.key || usingLibrary || document.body.dataset.training !== 'isometric') return;
  const exercise = loadExercises(currentExercise?.number);
  if (exercise && exercise.number === currentExercise?.number) {
   const gridChanged = JSON.stringify(currentExercise.grids) !== JSON.stringify(exercise.grids);
   if (!gridChanged) {
    currentExercise = exercise;
    drawReference();
    return;
   }
  }
  chooseExercise(exercise);
 });

 function openRoute() {
  const mode = Object.keys(routes).find(key => routes[key] === location.hash);
  if (mode) {
   document.querySelector(`[data-work="${mode}"]`).click();
   if (mode === 'isometric' && currentExercise) options.scrollIntoView({block: 'start'});
   return;
  }
  document.body.dataset.training = 'menu';
  setFigurePicker(false);
 }
 window.addEventListener('hashchange', openRoute);
 openRoute();
})();
