/* Referencias del apartado 03. Las cuadrículas editables siguen en la ficha. */
(() => {
 'use strict';
 const key = 'mad-ficha1-v9';
 const basicFigureCount = 24;
 const practiceFigureCount = 48;
 const sheetNumber = figure => figure <= basicFigureCount ? 1 : 2;
 const views = ['front', 'side', 'top'];
 const names = {front: 'Alzado', side: 'Perfil izquierdo', top: 'Planta'};

 function read() {
  try {
   for (let version = 9; version >= 1; version--) {
    const storageKey = 'mad-ficha1-v' + version;
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) {
     const figures = JSON.parse(raw);
     return {storageKey, figures: Array.isArray(figures) ? figures : []};
    }
   }
  } catch {}
  return {storageKey: null, figures: []};
 }

 function completed() {
  const {figures} = read();
  return figures.slice(0, practiceFigureCount).flatMap((figure, index) => {
   if (!views.every(view => Array.isArray(figure?.lines?.[view]) && figure.lines[view].length)) return [];
   const grids = {};
   for (const view of views) {
    const lines = figure.lines[view];
    if (!lines.every(line => [line?.a, line?.b].every(point => point && ['x', 'y'].every(axis =>
     Number.isInteger(point[axis]) && point[axis] >= 0 && point[axis] <= 12)))) return [];
    const stored = typeof figure.n === 'number' ? figure.n : figure.n?.[view];
    const size = (axis, coord) => {
     const cells = typeof stored === 'number' ? stored : stored?.[axis];
     const extent = lines.reduce((max, {a, b}) => Math.max(max, a[coord], b[coord]), 2);
     return Math.min(12, Math.max(Number.isInteger(cells) ? cells : 4, extent));
    };
    grids[view] = {w: size('w', 'x'), h: size('h', 'y')};
   }
   return [{number: index + 1, grids, lines: figure.lines}];
  });
 }

 function show(canvases, exercise) {
  const dimensions = views.map(view => {
   const canvas = canvases[view];
   return {view, canvas, width: canvas.clientWidth, height: canvas.clientHeight, ...exercise.grids[view]};
  });
  if (dimensions.some(({width, height}) => !width || !height)) return;
  const cell = Math.min(...dimensions.map(({width, height, w, h}) => Math.min((width - 22) / w, (height - 22) / h)));
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  for (const {view, canvas, width, height, w, h} of dimensions) {
   canvas.width = Math.round(width * pixelRatio);
   canvas.height = Math.round(height * pixelRatio);
   const ctx = canvas.getContext('2d');
   ctx.scale(pixelRatio, pixelRatio);
   ctx.fillStyle = '#f9fbff';
   ctx.fillRect(0, 0, width, height);
   const ox = (width - w * cell) / 2, oy = (height - h * cell) / 2;
   const stroke = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(ox + x1 * cell, oy + y1 * cell);
    ctx.lineTo(ox + x2 * cell, oy + y2 * cell);
    ctx.stroke();
   };
   ctx.strokeStyle = '#cfdeec';
   for (let x = 0; x <= w; x++) stroke(x, 0, x, h);
   for (let y = 0; y <= h; y++) stroke(0, y, w, y);
   ctx.lineWidth = 2.3;
   ctx.lineCap = 'round';
   for (const line of exercise.lines[view]) {
    ctx.setLineDash(line.dash || line.style === 'dash' ? [5, 4] : []);
    ctx.strokeStyle = line.dash || line.style === 'dash' ? '#577994' : '#254566';
    stroke(line.a.x, line.a.y, line.b.x, line.b.y);
   }
  }
 }

 window.MADSavedViews = {key, basicFigureCount, practiceFigureCount, sheetNumber, views, names, read, completed, show};
})();
