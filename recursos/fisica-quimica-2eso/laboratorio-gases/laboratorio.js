import { bounds, initialState, modes, measure, setControl } from './modelo.js?v=1';
import { makeChamber, makePlot } from './visualizacion.js?v=1';

const $ = id => document.getElementById(id);
const modeInputs = [...document.querySelectorAll('input[name="mode"]')];
const states = Object.fromEntries(Object.keys(modes).map(mode => [mode, initialState(mode)]));
const notebook = Object.fromEntries(Object.keys(modes).map(mode => [mode, []]));
const units = {
 volume: { name: 'Volumen', symbol: 'L', digits: 2 },
 temperature: { name: 'Temperatura', symbol: 'K', digits: 0 },
 pressure: { name: 'Presión', symbol: 'kPa', digits: 1 },
 amount: { name: 'Cantidad de gas', symbol: 'mol', digits: 3 }
};
const adjustText = { volume: 'Mueve el pistón', temperature: 'Enfría o calienta el gas', amount: 'Introduce o retira gas' };

const numberFormats = new Map();
function format(value, digits) {
 if (!numberFormats.has(digits)) numberFormats.set(digits, new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: digits, maximumFractionDigits: digits
 }));
 return numberFormats.get(digits).format(value);
}

function readingText(reading, variable) {
 const { digits, symbol } = units[variable];
 const value = variable === 'amount' ? reading.moles : reading[variable];
 return format(value, digits) + ' ' + symbol;
}

let mode = 'libre';
function modeFromUrl() {
 const key = new URLSearchParams(location.search).get('modo');
 return Object.hasOwn(modes, key) ? key : 'libre';
}

const plot = makePlot($('plot'));
const chamber = makeChamber($('chamber'), format, value => update('volume', value));
const stopMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = stopMotion.matches;
let visible = true;
let frame = 0;
let previousTime;

function animate(time) {
 const delta = previousTime === undefined ? 0 : Math.min(.035, (time - previousTime) / 1000);
 previousTime = time;
 chamber.draw(delta);
 frame = requestAnimationFrame(animate);
}
function syncAnimation() {
 if (visible && !paused && !document.hidden) {
  if (!frame) frame = requestAnimationFrame(animate);
 } else if (frame) {
  cancelAnimationFrame(frame);
  frame = 0;
  previousTime = undefined;
 }
 $('motion').textContent = paused ? 'Reanudar partículas' : 'Pausar partículas';
}

const observer = new IntersectionObserver(([entry]) => {
 visible = entry.isIntersecting;
 syncAnimation();
}, { rootMargin: '80px' });
observer.observe($('chamber'));
document.addEventListener('visibilitychange', syncAnimation);
stopMotion.addEventListener('change', event => {
 paused = event.matches;
 syncAnimation();
});
$('motion').addEventListener('click', () => {
 paused = !paused;
 syncAnimation();
});

function drawGraph(reading) {
 const { x, y } = modes[mode];
 const { min: xMin, max: xMax } = bounds[x];
 const current = { x: reading[x], y: reading[y] };
 const curve = Array.from({ length: 61 }, (_, i) => {
  const pointX = xMin + (xMax - xMin) * i / 60;
  const value = measure({ ...states[mode], [x]: pointX }, mode);
  return { x: pointX, y: value[y] };
 });
 const samples = notebook[mode].filter(sample => mode !== 'libre' ||
  (sample.temperature === reading.temperature && sample.amount === reading.amount))
  .map(sample => ({ x: sample[x], y: sample[y] }));
 const xUnit = units[x].name + ' (' + units[x].symbol + ')';
 const yUnit = units[y].name + ' (' + units[y].symbol + ')';
 const xTicks = x === 'volume' ? [1, 2, 4, 6, 8] : [150, 300, 450, 600];
 plot.draw({ xMin, xMax, xTicks, xUnit, yUnit, current, curve, samples, format });
}

function render({ reset = false } = {}) {
 const state = states[mode];
 const active = modes[mode];
 const reading = measure(state, mode);
 const movable = active.controls.includes('volume');
 for (const variable of Object.keys(units)) {
  const { digits } = units[variable];
  const value = variable === 'amount' ? reading.moles : reading[variable];
  $(variable + '-value').textContent = format(value, digits);
 }
 for (const variable of Object.keys(bounds)) {
  const control = $(variable);
  const locked = !active.controls.includes(variable);
  const description = variable === 'volume' && mode === 'charles' ? 'Se ajusta para mantener la presión' : 'Constante en este experimento';
  control.disabled = locked;
  control.closest('.slider').dataset.locked = String(locked);
  control.value = reading[variable];
  control.setAttribute('aria-valuetext', readingText(reading, variable));
  $(variable + '-out').textContent = readingText(reading, variable);
  $(variable + '-state').textContent = locked ? description : adjustText[variable];
 }
 $('pressure-note').textContent = active.pressure;
 $('volume-note').textContent = movable ? 'Ajustable' : mode === 'charles' ? 'Se ajusta automáticamente' : 'Constante';
 $('amount-note').textContent = mode === 'libre' ? 'Ajustable' : 'Constante';
 $('celsius-value').textContent = format(reading.temperature - 273.15, 1) + ' °C' + (reading.amount ? '' : ' · ajuste');
 $('chamber-hint').textContent = movable
  ? 'Arrastra el pistón sobre la cámara o ajusta el volumen con su control.'
  : mode === 'charles' ? 'El pistón se mueve para mantener 100 kPa.' : 'El recipiente permanece fijo en 2,50 L.';
 $('plot-current').textContent = 'Punto actual · ' + readingText(reading, active.x) + ' → ' + readingText(reading, active.y);
 chamber.setReading(reading, movable, reset);
 chamber.draw();
 drawGraph(reading);
}

function update(variable, value) {
 setControl(states[mode], mode, variable, value);
 render();
}
for (const name of Object.keys(bounds)) {
 $(name).addEventListener('input', event => update(name, event.currentTarget.valueAsNumber));
}
$('reset').addEventListener('click', () => {
 states[mode] = initialState(mode);
 render({ reset: true });
 $('record-feedback').textContent = 'Condiciones iniciales restablecidas.';
});

function renderNotebook() {
 const samples = notebook[mode];
 $('recorded').hidden = !samples.length;
 $('record').disabled = samples.length >= 12;
 $('measurements').replaceChildren(...samples.map((sample, index) => {
  const row = document.createElement('tr');
  [index + 1, format(sample.volume, 2), format(sample.temperature, 0),
   format(sample.pressure, 1), format(sample.moles, 3)].forEach((value, column) => {
   const cell = document.createElement(column === 0 ? 'th' : 'td');
   if (column === 0) cell.scope = 'row';
   cell.textContent = value;
   row.append(cell);
  });
  const last = row.insertCell();
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'button remove';
  remove.textContent = '×';
  remove.setAttribute('aria-label', 'Quitar medida ' + (index + 1));
  remove.addEventListener('click', () => {
   samples.splice(index, 1);
   renderNotebook();
   drawGraph(measure(states[mode], mode));
   $('record-feedback').textContent = 'Medida eliminada.';
   const remaining = $('measurements').querySelectorAll('button');
   (remaining[Math.min(index, remaining.length - 1)] ?? $('record')).focus({ preventScroll: true });
  });
  last.append(remove);
  return row;
 }));
}

$('record').addEventListener('click', () => {
 const samples = notebook[mode];
 const reading = measure(states[mode], mode);
 if (samples.some(sample => sample.volume === reading.volume &&
  sample.temperature === reading.temperature && sample.amount === reading.amount)) {
  $('record-feedback').textContent = 'Ya has registrado estas condiciones.';
  return;
 }
 samples.push(reading);
 renderNotebook();
 drawGraph(reading);
 $('record-feedback').textContent = samples.length === 12 ? 'Cuaderno lleno. Quita una medida para añadir otra.' : 'Medida ' + samples.length + ' registrada.';
});

function selectMode(key, updateUrl = true) {
 mode = key;
 const active = modes[mode];
 for (const input of modeInputs) input.checked = input.value === mode;
 $('constant').textContent = active.constant;
 $('mode-intro').textContent = active.introduction;
 $('formula').textContent = active.formula;
 $('law-description').textContent = active.explanation;
 $('plot-title').textContent = units[active.y].name + ' frente a ' + units[active.x].name.toLowerCase();
 $('plot-caption').textContent = mode === 'libre'
  ? 'La curva y sus medidas corresponden a la temperatura y cantidad de gas actuales.'
  : 'La curva muestra la predicción del modelo. Los puntos verdes son tus medidas.';
 $('challenge').textContent = active.challenge;
 $('record-feedback').textContent = notebook[mode].length ? 'Medidas de este experimento.' : 'Registra varias medidas para compararlas.';
 renderNotebook();
 render({ reset: true });
 if (updateUrl) {
  const url = new URL(location.href);
  url.searchParams.set('modo', mode);
  history.replaceState(null, '', url);
 }
}
modeInputs.forEach(input => input.addEventListener('change', () => selectMode(input.value)));
new ResizeObserver(() => drawGraph(measure(states[mode], mode))).observe($('plot'));
selectMode(modeFromUrl(), false);
syncAnimation();
