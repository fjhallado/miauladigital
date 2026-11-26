import {
  anchorsOf, boundsOf, demoDrawing, dimensionAxes, dimensionOffset, dimensionValue,
  distance, entityLimit, exportDrawing, format, hitDistance, moveEntity, nodeLimit,
  point, properties, readDrawing, renderEntity, renderProjection, rounded, samePoint,
  svg, validEntity, writeDrawing
} from './geometria.js?v=4';
import { buildProjection, projectionRevision } from './proyecciones.js?v=4';
import { downloadPlanPDF } from './plano-pdf.js?v=1';

const byId = id => document.getElementById(id);
const canvas = byId('drawing');
const entityLayer = byId('drawing-entities');
const previewLayer = byId('drawing-preview');
const grid = byId('drawing-grid');
const showGrid = byId('show-grid');
const snapGrid = byId('snap-grid');
const gridStep = byId('grid-step');
const title = byId('drawing-title');
const coordinateLabel = byId('drawing-coordinates');
const pdfDialog = byId('pdf-dialog');
const buttons = [...document.querySelectorAll('[data-tool]')];
const storageKey = 'mi-aula-digital.planos-2d.v1';
const url = new URL(location.href);
const inProjectionMode = url.searchParams.get('vistas') === '1';
const exercises = inProjectionMode ? (window.MADSavedViews?.completed() ?? []) : [];
const requestedNumber = Number(url.searchParams.get('figura'));
const requestedFigure = Number.isInteger(requestedNumber) && requestedNumber >= 1 && requestedNumber <= window.MADSavedViews?.practiceFigureCount ? requestedNumber : 0;
const activeExercise = exercises.find(item => item.number === (requestedFigure || recentFigure())) ?? (requestedFigure ? undefined : exercises[0]);
const draftKey = inProjectionMode ? `${storageKey}.figura-${activeExercise?.number ?? requestedFigure}` : storageKey;
const activeRevision = activeExercise && projectionRevision(activeExercise);
const toolInfo = {
  select: ['Seleccionar', 'Pulsa sobre un trazo para consultar sus medidas. Arrástralo para moverlo o recoloca una cota.'],
  pan: ['Mover vista', 'Arrastra el lienzo para recorrer el plano. Usa la rueda o los botones para cambiar el zoom.'],
  line: ['Línea', 'Marca el punto inicial.', 'Marca el extremo de la línea.'],
  polyline: ['Polilínea', 'Marca el primer vértice.', 'Añade vértices. Pulsa Intro o «Terminar polilínea» para acabar. Para cerrar el contorno, vuelve al primer punto.'],
  rect: ['Rectángulo', 'Marca una esquina.', 'Marca la esquina opuesta.'],
  circle: ['Círculo', 'Marca el centro.', 'Marca un punto de la circunferencia para fijar el radio.'],
  horizontal: ['Cota horizontal', 'Marca el primer punto que quieres medir.', 'Marca el segundo punto.', 'Marca la altura a la que irá la línea de cota.'],
  vertical: ['Cota vertical', 'Marca el primer punto que quieres medir.', 'Marca el segundo punto.', 'Marca la posición lateral de la línea de cota.'],
  aligned: ['Cota alineada', 'Marca el primer punto de la arista.', 'Marca el segundo punto de la arista.', 'Marca dónde irá la cota paralela a la arista.']
};
const shortcuts = { v: 'select', m: 'pan', l: 'line', p: 'polyline', r: 'rect', c: 'circle', h: 'horizontal', t: 'vertical', a: 'aligned' };

const blankDrawing = () => ({ title: 'Plano sin título', entities: [] });
let projectionError = false;
let drawing = restoredDrawing();
const history = { previous: [], next: [] };
const view = { center: point(60, 38), zoom: 1, fitted: true, scale: 1, width: 1, height: 1 };
let tool = 'select';
let staged = [];
let selected = -1;
let interaction;
let hovering;

function recentFigure() {
  try {
    const saved = localStorage.getItem('mad-ficha1-current');
    return saved === null ? 0 : Number(saved) + 1;
  } catch { return 0; }
}

function restoredDrawing() {
  try {
    const data = localStorage.getItem(draftKey);
    if (data) {
      const draft = readDrawing(data);
      if (!activeExercise || draft.projection?.figure === activeExercise.number) return draft;
    }
  } catch { /* An unavailable store or an outdated draft does not prevent drawing. */ }
  if (activeExercise) {
    try { return buildProjection(activeExercise); }
    catch { projectionError = true; }
  }
  return inProjectionMode ? blankDrawing() : demoDrawing();
}

function storeDrawing() {
  if (activeExercise && drawing.projection?.figure !== activeExercise.number) return;
  try { localStorage.setItem(draftKey, writeDrawing(drawing)); }
  catch { /* The user can still download the project as a file. */ }
}

function message(text = '', error = false) {
  const status = byId('workspace-message');
  status.textContent = text;
  status.toggleAttribute('data-error', error);
}

function useDrawing(next) {
  clearInteraction();
  const changedScale = drawing.projection?.cell !== next.projection?.cell;
  drawing = next;
  if (changedScale) setProjectionStep(next.projection);
  staged = [];
  selected = -1;
  title.value = drawing.title;
  storeDrawing();
  refresh();
}

function setProjectionStep(projection) {
  gridStep.querySelector('[data-projection-step]')?.remove();
  const step = projection?.cell ?? 5;
  if (![...gridStep.options].some(option => Number(option.value) === step)) {
    const option = new Option(`${format(step)} mm`, step);
    option.dataset.projectionStep = '';
    gridStep.append(option);
  }
  gridStep.value = String(step);
  renderGrid();
}

function setupProjectionBar() {
  if (!inProjectionMode) return;
  byId('projection-bar').hidden = false;
  byId('load-views').hidden = true;
  byId('load-example').hidden = true;
  const lab = byId('back-to-lab');
  lab.href = '../laboratorio-vistas/index.html#actividades';
  lab.textContent = 'Laboratorio de vistas';
  const select = byId('projection-figure');
  const unavailable = requestedFigure ? `Figura ${requestedFigure} sin vistas guardadas` : 'Sin figuras guardadas';
  if (!activeExercise) select.append(new Option(unavailable, ''));
  for (const { number } of exercises) select.append(new Option(`Figura ${number} · ${window.MADSavedViews.sheetNumber(number) === 1 ? 'Nivel fácil' : 'Nivel intermedio'}`, number));
  select.value = activeExercise?.number ?? '';
  select.disabled = !exercises.length;
  select.addEventListener('change', () => {
    if (!select.value) return;
    url.searchParams.set('figura', select.value);
    location.assign(url);
  });
  const number = activeExercise?.number || requestedFigure;
  const edit = byId('edit-projection');
  if (number && number <= window.MADSavedViews?.practiceFigureCount) edit.href += `&figura=${number}`;
  if (activeExercise) edit.textContent = 'Editar vistas en Proyectar';
  const help = byId('projection-scale');
  if (!activeExercise) help.textContent = 'Completa el alzado, la planta y el perfil en Proyectar.';
  else if (projectionError) help.textContent = 'La figura supera el límite de trazos de la mesa de dibujo.';
  byId('refresh-projection').addEventListener('click', () => {
    try { newSheet(buildProjection(activeExercise, drawing.projection?.cell), 'Vistas actualizadas. Pulsa Deshacer para recuperar el plano anterior.'); }
    catch { message('No se pudieron importar los trazos de la figura.', true); }
  });
}

function rememberDrawing() {
  history.previous.push(drawing);
  if (history.previous.length > 60) history.previous.shift();
  history.next.length = 0;
}

function commit(next) {
  rememberDrawing();
  useDrawing(next);
}

function undo() {
  if (!history.previous.length) return;
  history.next.push(drawing);
  useDrawing(history.previous.pop());
  message('Cambio deshecho.');
}

function redo() {
  if (!history.next.length) return;
  history.previous.push(drawing);
  useDrawing(history.next.pop());
  message('Cambio rehecho.');
}

function newSheet(next, note) {
  setTool('select');
  commit(next);
  fitView();
  message(note);
}

function setTool(next) {
  clearInteraction();
  tool = next;
  staged = [];
  selected = -1;
  hovering = undefined;
  canvas.classList.remove('cad-target');
  message();
  refresh();
}

function updatePanel() {
  canvas.dataset.tool = tool;
  byId('active-tool').textContent = toolInfo[tool][0];
  byId('active-icon').setAttribute('href', `#i-${tool === 'pan' ? 'hand' : tool}`);
  byId('tool-hint').textContent = toolInfo[tool][Math.min(staged.length + 1, toolInfo[tool].length - 1)];
  for (const button of buttons) button.setAttribute('aria-pressed', button.dataset.tool === tool);
  byId('finish-polyline').hidden = tool !== 'polyline' || staged.length < 2;
  byId('undo').disabled = !history.previous.length;
  byId('redo').disabled = !history.next.length;
  byId('delete-entity').disabled = selected < 0;
  byId('export-svg').disabled = !drawing.entities.length;
  byId('export-pdf').disabled = !drawing.entities.length;
  byId('entity-count').textContent = `${drawing.entities.length} ${drawing.entities.length === 1 ? 'entidad' : 'entidades'}`;
  if (activeExercise && !projectionError) {
    const projection = drawing.projection;
    const sameFigure = projection?.figure === activeExercise.number;
    const current = sameFigure && projection.revision === activeRevision;
    const scale = sameFigure ? `1 cuadro = ${format(projection.cell)} mm · Sistema europeo` : 'Archivo abierto en la mesa de dibujo';
    byId('projection-scale').textContent = sameFigure && !current ? `${scale}. Hay cambios en Proyectar.` : scale;
    byId('refresh-projection').hidden = current;
  }
  renderProperties(drawing.entities[selected]);
}

function renderProperties(entity) {
  const list = byId('entity-properties');
  list.hidden = !entity;
  byId('empty-selection').hidden = !!entity;
  if (!entity) return;
  const items = properties(entity).flatMap(([term, description]) => {
    const name = document.createElement('dt');
    const value = document.createElement('dd');
    name.textContent = term;
    value.textContent = description;
    return [name, value];
  });
  list.replaceChildren(...items);
}

function dimensions() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width || 1, height: rect.height || 1 };
}

function baseScale({ width, height }) {
  return Math.min(width / 170, height / 126) * (10 / (drawing.projection?.cell ?? 10));
}

function fitView() {
  const size = dimensions();
  view.fitted = true;
  if (drawing.entities.length || drawing.projection) {
    const { left, right, top, bottom } = boundsOf(drawing.entities, drawing.projection);
    const inset = Math.min(65, Math.min(size.width, size.height) * .14);
    const padding = (drawing.projection?.cell ?? 10) * .1;
    const scale = Math.min((size.width - 2 * inset) / (right - left + padding), (size.height - 2 * inset) / (top - bottom + padding));
    view.center = point((left + right) / 2, (bottom + top) / 2);
    view.zoom = Math.min(2, scale / baseScale(size));
  } else {
    view.center = point(60, 38);
    view.zoom = 1;
  }
  renderView();
}

function renderView() {
  const size = dimensions();
  view.scale = baseScale(size) * view.zoom;
  view.width = size.width / view.scale;
  view.height = size.height / view.scale;
  const x = view.center.x - view.width / 2, y = -view.center.y - view.height / 2;
  canvas.setAttribute('viewBox', `${x} ${y} ${view.width} ${view.height}`);
  const updateField = field => {
    for (const [key, value] of Object.entries({ x, y, width: view.width, height: view.height })) field.setAttribute(key, value);
  };
  updateField(byId('minor-field'));
  updateField(byId('major-field'));
  byId('drawing-axes').setAttribute('d', `M${x} 0H${x + view.width} M0 ${y}V${y + view.height}`);
  renderGrid();
  byId('zoom-percent').textContent = `${Math.round(view.zoom * 100)} %`;
  const wanted = 76 / view.scale;
  const power = 10 ** Math.floor(Math.log10(wanted));
  const rule = [10, 5, 2, 1].map(value => value * power).find(value => value <= wanted) ?? power;
  byId('scale-line').style.width = `${rule * view.scale}px`;
  byId('scale-value').textContent = `${format(rule)} mm`;
  renderEntities();
  renderPreview();
}

function renderGrid() {
  const step = Number(gridStep.value);
  const major = step * Math.max(5, Math.ceil(13 / (step * view.scale)));
  for (const [id, size] of [['minor-grid', step], ['major-grid', major]]) {
    const pattern = byId(id);
    pattern.setAttribute('width', size);
    pattern.setAttribute('height', size);
    pattern.firstElementChild.setAttribute('d', `M${size} 0H0V${size}`);
  }
  byId('minor-field').style.display = step * view.scale < 7 ? 'none' : '';
  byId('drawing-axes').style.display = drawing.projection ? 'none' : '';
  grid.style.display = showGrid.checked ? '' : 'none';
}

function worldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return point(view.center.x + (clientX - rect.left - rect.width / 2) / view.scale, view.center.y - (clientY - rect.top - rect.height / 2) / view.scale);
}

function zoomAt(factor, clientX, clientY) {
  const anchor = clientX === undefined ? view.center : worldPoint(clientX, clientY);
  const zoom = Math.min(18, Math.max(Math.min(.18, view.zoom), view.zoom * factor));
  const ratio = view.zoom / zoom;
  view.center = point(anchor.x + (view.center.x - anchor.x) * ratio, anchor.y + (view.center.y - anchor.y) * ratio);
  view.zoom = zoom;
  view.fitted = false;
  renderView();
}

function gridPoint(p) {
  const step = snapGrid.checked ? Number(gridStep.value) : .001;
  return point(rounded(Math.round(p.x / step) * step), rounded(Math.round(p.y / step) * step));
}

function snapPoint(p) {
  if (!snapGrid.checked) return gridPoint(p);
  const step = Number(gridStep.value);
  let closest = Math.min(8 / view.scale, step * .85);
  let target;
  for (const entity of drawing.entities) {
    if (entity.type === 'dimension') continue;
    for (const anchor of anchorsOf(entity)) {
      const gap = distance(p, anchor);
      if (gap <= closest) {
        closest = gap;
        target = anchor;
      }
    }
  }
  if (tool === 'polyline' && staged.length >= 3 && distance(p, staged[0]) <= closest) return staged[0];
  return target ?? gridPoint(p);
}

function fontSize() {
  if (drawing.projection) return 13.5 / view.scale;
  return Math.min(16, Math.max(.55, 13.5 / view.scale));
}

function entityIndex(p) {
  let threshold = 9 / view.scale;
  let match = -1;
  drawing.entities.forEach((entity, index) => {
    const gap = hitDistance(entity, p, fontSize());
    if (gap <= threshold) {
      match = index;
      threshold = gap;
    }
  });
  return match;
}

function renderEntities() {
  const guides = byId('projection-guides');
  if (drawing.projection) guides.replaceChildren(renderProjection(drawing.projection));
  else if (guides.hasChildNodes()) guides.replaceChildren();
  const live = drawing.entities.map((entity, index) => {
    const updated = index === selected && interaction?.moved ? interaction.moved : entity;
    return renderEntity(updated, { fontSize: fontSize(), selected: index === selected });
  });
  entityLayer.replaceChildren(...live);
}

function entityFrom(pointNow) {
  const [a, b] = staged;
  if (tool === 'polyline') {
    const closed = staged.length >= 3 && samePoint(a, pointNow);
    const points = closed || samePoint(staged.at(-1), pointNow) ? staged : [...staged, pointNow];
    return { type: 'polyline', points, closed };
  }
  if (tool === 'circle') return { type: 'circle', a, r: rounded(distance(a, pointNow)) };
  if (dimensionAxes.includes(tool)) {
    return b ? { type: 'dimension', a, b, axis: tool, offset: dimensionOffset(tool, a, b, pointNow) } : { type: 'line', a, b: pointNow };
  }
  return { type: tool, a, b: pointNow };
}

function renderPreview() {
  if (!staged.length || !hovering) {
    previewLayer.replaceChildren();
    return;
  }
  const preview = entityFrom(hovering);
  const markers = staged.map(p => svg('circle', { cx: p.x, cy: -p.y, r: 2.7 / view.scale, fill: '#ffd394' }));
  if (validEntity(preview)) markers.unshift(renderEntity(preview, { fontSize: fontSize(), preview: true }));
  previewLayer.replaceChildren(...markers);
}

function refresh() {
  updatePanel();
  renderEntities();
  renderPreview();
}

function addEntity(entity) {
  if (!validEntity(entity)) {
    message('Marca puntos distintos y adecuados para esta herramienta.', true);
    return;
  }
  if (drawing.entities.length >= entityLimit) {
    message(`Este plano ha alcanzado el límite de ${entityLimit} entidades.`, true);
    return;
  }
  commit({ ...drawing, entities: [...drawing.entities, entity] });
  message('Elemento añadido.');
}

function choosePoint(p) {
  if (tool === 'select' || tool === 'pan') {
    message('Elige una herramienta de dibujo o de cota para marcar un punto.', true);
    return;
  }
  hovering = p;
  message();
  const previous = staged.at(-1);
  if (!previous) {
    staged = [p];
  } else if (tool === 'polyline') {
    const polyline = entityFrom(p);
    if (polyline.closed || polyline.points.length === nodeLimit) addEntity(polyline);
    else staged = polyline.points;
  } else if (dimensionAxes.includes(tool) && staged.length === 1) {
    const different = dimensionValue({ axis: tool, a: previous, b: p }) > 0;
    if (different) staged = [...staged, p];
    else message('El segundo punto debe estar en otra posición en la dirección de la cota.', true);
  } else {
    addEntity(entityFrom(p));
  }
  updatePanel();
  renderPreview();
}

function finishPolyline() {
  if (tool === 'polyline' && staged.length > 1) addEntity({ type: 'polyline', points: staged, closed: false });
}

function deleteSelected() {
  if (selected < 0) return;
  commit({ ...drawing, entities: drawing.entities.filter((_, index) => index !== selected) });
  message('Elemento eliminado.');
}

function clearInteraction() {
  const pointer = interaction?.id;
  interaction = undefined;
  if (pointer !== undefined && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  canvas.classList.remove('cad-dragging');
}

canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || interaction || ![0, 1].includes(event.button)) return;
  if (document.activeElement === title) title.blur();
  event.preventDefault();
  const raw = worldPoint(event.clientX, event.clientY);
  const mode = event.button === 1 ? 'pan' : tool;
  interaction = { id: event.pointerId, mode, raw, x: event.clientX, y: event.clientY, center: view.center };
  canvas.setPointerCapture(event.pointerId);
  if (mode === 'pan') canvas.classList.add('cad-dragging');
  if (mode === 'select') {
    selected = entityIndex(raw);
    refresh();
  }
});

canvas.addEventListener('pointermove', event => {
  if (!event.isPrimary) return;
  const raw = worldPoint(event.clientX, event.clientY);
  const mode = interaction?.mode ?? tool;
  const drawingTool = mode !== 'pan' && mode !== 'select';
  hovering = drawingTool ? snapPoint(raw) : raw;
  coordinateLabel.textContent = `X ${format(hovering.x)} · Y ${format(hovering.y)}`;
  if (interaction && mode === 'pan') {
    view.fitted = false;
    view.center = point(interaction.center.x + (interaction.x - event.clientX) / view.scale, interaction.center.y + (event.clientY - interaction.y) / view.scale);
    renderView();
  } else if (interaction && mode === 'select' && selected >= 0) {
    const entity = drawing.entities[selected];
    const { x, y } = gridPoint(point(raw.x - interaction.raw.x, raw.y - interaction.raw.y));
    if (x || y) {
      const moved = moveEntity(entity, x, y);
      interaction.moved = validEntity(moved) ? moved : undefined;
    } else {
      interaction.moved = undefined;
    }
    renderEntities();
    renderProperties(interaction.moved ?? entity);
  } else if (mode === 'select') {
    canvas.classList.toggle('cad-target', entityIndex(raw) >= 0);
  } else if (drawingTool) {
    renderPreview();
  }
});

canvas.addEventListener('pointerup', event => {
  if (interaction?.id !== event.pointerId) return;
  const { mode, moved, x, y } = interaction;
  clearInteraction();
  if (mode === 'select' && moved) {
    const index = selected;
    const entities = drawing.entities.map((entity, i) => i === index ? moved : entity);
    if (JSON.stringify(entities[index]) !== JSON.stringify(drawing.entities[index])) {
      commit({ ...drawing, entities });
      selected = index;
      message('Posición actualizada.');
    }
    refresh();
  } else if (mode !== 'pan' && mode !== 'select' && Math.hypot(event.clientX - x, event.clientY - y) < 9) {
    choosePoint(snapPoint(worldPoint(event.clientX, event.clientY)));
  }
});

function cancelPointer() {
  if (!interaction) return;
  clearInteraction();
  refresh();
}

canvas.addEventListener('pointercancel', cancelPointer);
canvas.addEventListener('lostpointercapture', cancelPointer);
canvas.addEventListener('pointerleave', () => {
  if (interaction) return;
  hovering = undefined;
  coordinateLabel.textContent = 'X — · Y —';
  renderPreview();
});
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  if (!event.deltaY || interaction) return;
  zoomAt(event.deltaY < 0 ? 1.16 : 1 / 1.16, event.clientX, event.clientY);
}, { passive: false });

for (const button of buttons) button.addEventListener('click', () => setTool(button.dataset.tool));
function newBlank() {
  newSheet(blankDrawing(), 'Plano nuevo. Pulsa Deshacer si quieres recuperar el anterior.');
}

byId('new-drawing').addEventListener('click', () => {
  if (inProjectionMode) location.assign('index.html?nuevo=1');
  else newBlank();
});
byId('load-example').addEventListener('click', () => newSheet(demoDrawing(), 'Plano de ejemplo cargado.'));
byId('undo').addEventListener('click', undo);
byId('redo').addEventListener('click', redo);
byId('delete-entity').addEventListener('click', deleteSelected);
byId('finish-polyline').addEventListener('click', finishPolyline);
byId('zoom-in').addEventListener('click', () => zoomAt(1.24));
byId('zoom-out').addEventListener('click', () => zoomAt(1 / 1.24));
byId('fit-view').addEventListener('click', fitView);
showGrid.addEventListener('change', renderGrid);
gridStep.addEventListener('change', renderGrid);

byId('exact-point').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  choosePoint(point(Number(data.get('x')), Number(data.get('y'))));
});

function renameDrawing() {
  const name = title.value.trim() || 'Plano sin título';
  if (name !== drawing.title) {
    rememberDrawing();
    drawing = { ...drawing, title: name };
    storeDrawing();
    updatePanel();
  }
  title.value = name;
}

title.value = drawing.title;
title.addEventListener('change', renameDrawing);
title.addEventListener('keydown', event => { if (event.key === 'Enter') title.blur(); });

const drawingFile = byId('drawing-file');
byId('open-drawing').addEventListener('click', () => drawingFile.click());
drawingFile.addEventListener('change', async () => {
  const file = drawingFile.files[0];
  drawingFile.value = '';
  if (!file) return;
  if (file.size > 3000000) {
    message('El archivo supera los 3 MB. Abre un plano más pequeño.', true);
    return;
  }
  try {
    const imported = readDrawing(await file.text());
    const note = activeExercise && imported.projection?.figure !== activeExercise.number ? ' Guarda una copia para conservar tus cambios.' : '';
    newSheet(imported, `Plano abierto: ${file.name}.${note}`);
  }
  catch { message('No se pudo abrir ese archivo. Selecciona un plano JSON guardado desde este editor.', true); }
});

function drawingFilename(extension) {
  const safeTitle = drawing.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
  return `${safeTitle}.${extension}`;
}

function download(content, mime, extension) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = drawingFilename(extension);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveDrawing() {
  renameDrawing();
  download(writeDrawing(drawing), 'application/json', 'json');
  message('Plano descargado en JSON. Puedes editarlo de nuevo con Abrir.');
}

byId('save-drawing').addEventListener('click', saveDrawing);
byId('export-svg').addEventListener('click', () => {
  if (!drawing.entities.length) return;
  renameDrawing();
  download(exportDrawing(drawing), 'image/svg+xml', 'svg');
  message('Plano exportado como imagen SVG.');
});

const pdfStatus = byId('pdf-status');
const pdfSubmit = byId('confirm-pdf');
const pdfCancel = byId('cancel-pdf');
byId('export-pdf').addEventListener('click', () => {
  renameDrawing();
  pdfStatus.textContent = '';
  pdfDialog.showModal();
});
pdfCancel.addEventListener('click', () => pdfDialog.close());
pdfDialog.addEventListener('cancel', event => { if (pdfSubmit.disabled) event.preventDefault(); });
byId('pdf-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!drawing.entities.length || pdfSubmit.disabled) return;
  const values = new FormData(event.currentTarget);
  const student = Object.fromEntries([...values].map(([key, value]) => [key, value.trim()]));
  pdfSubmit.disabled = pdfCancel.disabled = true;
  pdfStatus.textContent = 'Preparando el plano…';
  try {
    message(await downloadPlanPDF(drawing, student, drawingFilename('pdf')));
    pdfDialog.close();
  } catch {
    pdfStatus.textContent = 'No se pudo generar el plano. Vuelve a pulsar Descargar PDF.';
  } finally {
    pdfSubmit.disabled = pdfCancel.disabled = false;
  }
});

document.addEventListener('keydown', event => {
  if (pdfDialog.open || event.defaultPrevented || event.target.closest('input, select, textarea, [contenteditable]')) return;
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    }
    if (key === 'y') { event.preventDefault(); redo(); }
    if (key === 's') { event.preventDefault(); saveDrawing(); }
    return;
  }
  if (event.altKey) return;
  if (key === 'escape') {
    clearInteraction();
    staged = [];
    selected = -1;
    refresh();
    message();
  }
  if (shortcuts[key]) setTool(shortcuts[key]);
  if (key === 'delete') deleteSelected();
  if (key === 'enter' && !event.target.closest('button, a, summary')) finishPolyline();
});

new ResizeObserver(() => {
  if (view.fitted) fitView();
  else renderView();
}).observe(canvas);

setupProjectionBar();
if (drawing.projection) setProjectionStep(drawing.projection);
if (!inProjectionMode && url.searchParams.get('nuevo') === '1') {
  url.searchParams.delete('nuevo');
  window.history.replaceState(null, '', url);
  newBlank();
} else {
  refresh();
  fitView();
}
