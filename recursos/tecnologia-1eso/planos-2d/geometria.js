const svgNamespace = 'http://www.w3.org/2000/svg';
const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const drawingLimit = 1000000;
export const entityLimit = 1000;
export const nodeLimit = 2000;
export const format = value => numberFormat.format(value);
export const rounded = value => Math.round(value * 1000) / 1000 || 0;
export const point = (x, y) => ({ x, y });
export const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
export const samePoint = (a, b) => a.x === b.x && a.y === b.y;

export function svg(tag, attributes = {}, label) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (label !== undefined) element.textContent = label;
  return element;
}

export function demoDrawing() {
  return {
    title: 'Placa escalonada',
    entities: [
      { type: 'polyline', points: [point(0, 0), point(120, 0), point(120, 45), point(78, 45), point(78, 75), point(0, 75)], closed: true },
      { type: 'circle', a: point(23, 23), r: 8 },
      { type: 'circle', a: point(23, 52), r: 8 },
      { type: 'dimension', axis: 'horizontal', a: point(0, 0), b: point(120, 0), offset: -16 },
      { type: 'dimension', axis: 'vertical', a: point(0, 0), b: point(0, 75), offset: -16 },
      { type: 'dimension', axis: 'horizontal', a: point(0, 75), b: point(78, 75), offset: 90 },
      { type: 'dimension', axis: 'vertical', a: point(120, 0), b: point(120, 45), offset: 136 }
    ]
  };
}

const validCoordinate = value => Number.isFinite(value) && Math.abs(value) <= drawingLimit;
const validPoint = value => value && validCoordinate(value.x) && validCoordinate(value.y);

export function validEntity(entity) {
  if (!entity || typeof entity !== 'object') return false;
  const { type, a, b, r, axis, offset, points, closed } = entity;
  if (type === 'polyline') return Array.isArray(points) && points.length >= (closed ? 3 : 2) && points.length <= nodeLimit && points.every(validPoint) && typeof closed === 'boolean';
  if (!validPoint(a)) return false;
  if (type === 'circle') return validCoordinate(r) && r > 0;
  if (!validPoint(b) || samePoint(a, b)) return false;
  if (type === 'line') return true;
  if (type === 'rect') return a.x !== b.x && a.y !== b.y;
  if (type === 'dimension') return ['horizontal', 'vertical'].includes(axis) && validCoordinate(offset) && dimensionValue(entity) > 0;
  return false;
}

export function readDrawing(content) {
  const data = JSON.parse(content);
  if (!data || data.format !== 'Mi Aula Digital · Planos 2D' || data.version !== 1 || typeof data.title !== 'string' || data.title.length > 80 || !Array.isArray(data.entities) || data.entities.length > entityLimit || !data.entities.every(validEntity)) {
    throw new Error('Formato de plano incompatible');
  }
  return { title: data.title.trim() || 'Plano sin título', entities: data.entities };
}

export function writeDrawing(drawing) {
  return JSON.stringify({ format: 'Mi Aula Digital · Planos 2D', version: 1, ...drawing }, null, 2);
}

export function dimensionValue({ axis, a, b }) {
  return Math.abs(axis === 'horizontal' ? a.x - b.x : a.y - b.y);
}

function dimensionLayout({ axis, a, b, offset }, fontSize) {
  const horizontal = axis === 'horizontal';
  const project = (along, across) => horizontal ? point(along, across) : point(across, along);
  const along = p => horizontal ? p.x : p.y;
  const across = p => horizontal ? p.y : p.x;
  const arrowsInside = Math.abs(along(a) - along(b)) >= fontSize * 2.2;
  const arrowSize = fontSize * .64;
  const anchors = [a, b].sort((first, second) => along(first) - along(second));
  const ticks = anchors.map(p => project(along(p), offset));
  const extensions = anchors.map(p => {
    const direction = Math.sign(offset - across(p)) || 1;
    const gap = Math.min(fontSize * .28, Math.abs(offset - across(p)));
    return [project(along(p), across(p) + direction * gap), project(along(p), offset + direction * fontSize * .52)];
  });
  const label = project((along(a) + along(b)) / 2, offset + (horizontal ? 1 : -1) * fontSize * .39);
  const arrows = ticks.map((p, index) => {
    const direction = (index === 0 ? 1 : -1) * (arrowsInside ? 1 : -1);
    const base = along(p) + direction * arrowSize;
    return [p, project(base, offset + arrowSize * .21), project(base, offset - arrowSize * .21)];
  });
  const line = arrowsInside ? ticks : [project(along(ticks[0]) - arrowSize * 1.25, offset), project(along(ticks[1]) + arrowSize * 1.25, offset)];
  return { horizontal, line, extensions, label, arrows };
}

export function anchorsOf(entity) {
  switch (entity.type) {
    case 'polyline': return entity.points;
    case 'rect': {
      const { a, b } = entity;
      return [a, point(b.x, a.y), b, point(a.x, b.y)];
    }
    case 'circle': {
      const { a, r } = entity;
      return [a, point(a.x - r, a.y), point(a.x + r, a.y), point(a.x, a.y - r), point(a.x, a.y + r)];
    }
    default: return [entity.a, entity.b];
  }
}

export function boundsOf(entities) {
  let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
  function include({ x, y }) {
    left = Math.min(left, x);
    right = Math.max(right, x);
    bottom = Math.min(bottom, y);
    top = Math.max(top, y);
  }
  for (const entity of entities) {
    anchorsOf(entity).forEach(include);
    if (entity.type === 'dimension') {
      const { line, extensions, label } = dimensionLayout(entity, 4);
      [...line, ...extensions.flat(), label].forEach(include);
    }
  }
  return { left, right, top, bottom };
}

function segmentsOf(points, closed) {
  const segments = points.slice(1).map((p, index) => [points[index], p]);
  if (closed) segments.push([points.at(-1), points[0]]);
  return segments;
}

function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(p, a);
  const along = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return distance(p, point(a.x + along * dx, a.y + along * dy));
}

export function hitDistance(entity, p, fontSize) {
  if (entity.type === 'circle') return Math.abs(distance(p, entity.a) - entity.r);
  if (entity.type === 'dimension') {
    const { line, extensions, label } = dimensionLayout(entity, fontSize);
    return Math.min(segmentDistance(p, ...line), ...extensions.map(s => segmentDistance(p, ...s)), distance(p, label));
  }
  const segments = segmentsOf(anchorsOf(entity), entity.type === 'rect' || entity.closed);
  return Math.min(...segments.map(s => segmentDistance(p, ...s)));
}

export function moveEntity(entity, dx, dy) {
  const shift = p => point(rounded(p.x + dx), rounded(p.y + dy));
  if (entity.type === 'polyline') return { ...entity, points: entity.points.map(shift) };
  if (entity.type === 'circle') return { ...entity, a: shift(entity.a) };
  if (entity.type === 'dimension') return { ...entity, offset: rounded(entity.offset + (entity.axis === 'horizontal' ? dy : dx)) };
  return { ...entity, a: shift(entity.a), b: shift(entity.b) };
}

export function properties(entity) {
  const mm = value => `${format(value)} mm`;
  let details;
  switch (entity.type) {
    case 'line': return [['Tipo', 'Línea'], ['Longitud', mm(distance(entity.a, entity.b))]];
    case 'rect': return [['Tipo', 'Rectángulo'], ['Ancho', mm(Math.abs(entity.a.x - entity.b.x))], ['Alto', mm(Math.abs(entity.a.y - entity.b.y))]];
    case 'circle': return [['Tipo', 'Círculo'], ['Radio', mm(entity.r)], ['Diámetro', mm(2 * entity.r)]];
    case 'dimension': return [['Tipo', `Cota ${entity.axis}`], ['Medida', mm(dimensionValue(entity))]];
    case 'polyline':
      details = segmentsOf(entity.points, entity.closed);
      return [['Tipo', 'Polilínea'], ['Trazado', entity.closed ? 'Cerrado' : 'Abierto'], ['Tramos', details.length], ['Longitud', mm(details.reduce((total, [a, b]) => total + distance(a, b), 0))]];
  }
}

function drawLine(a, b, attributes = {}) {
  return svg('line', { x1: a.x, y1: -a.y, x2: b.x, y2: -b.y, ...attributes });
}

const svgPoints = points => points.map(p => `${p.x},${-p.y}`).join(' ');

export function renderEntity(entity, { fontSize, print = false, preview = false, selected = false } = {}) {
  const dimension = entity.type === 'dimension';
  const color = print ? (dimension ? '#173652' : '#111d2b') : (selected || preview ? '#ffd394' : dimension ? '#96e4ff' : '#dcf1ff');
  const lineWidth = print ? (dimension ? .25 : .45) : (dimension ? 1.15 : 2.15);
  const stroke = { stroke: color, 'stroke-width': lineWidth, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
  if (!print) stroke['vector-effect'] = 'non-scaling-stroke';
  if (preview) stroke['stroke-dasharray'] = '5 4';
  const group = svg('g', { 'data-entity': entity.type });
  if (dimension) {
    const layout = dimensionLayout(entity, fontSize);
    for (const line of layout.extensions) group.append(drawLine(...line, { ...stroke, 'stroke-opacity': .66 }));
    group.append(drawLine(...layout.line, stroke));
    for (const arrow of layout.arrows) group.append(svg('polygon', { points: svgPoints(arrow), fill: color }));
    const { x, y } = layout.label;
    const label = {
      x, y: -y, 'font-size': fontSize, fill: color, 'text-anchor': 'middle', 'font-weight': 700,
      'font-family': 'ui-monospace, Consolas, monospace', 'paint-order': 'stroke',
      stroke: print ? '#fff' : '#102039', 'stroke-width': fontSize * .26, 'stroke-linejoin': 'round'
    };
    if (!layout.horizontal) label.transform = `rotate(-90 ${x} ${-y})`;
    group.append(svg('text', label, format(dimensionValue(entity))));
  } else if (entity.type === 'line') {
    group.append(drawLine(entity.a, entity.b, stroke));
  } else if (entity.type === 'circle') {
    const { a, r } = entity;
    group.append(svg('circle', { cx: a.x, cy: -a.y, r, fill: 'none', ...stroke }));
    if (!preview) {
      const arm = Math.min(r * .44, fontSize * .8);
      const centerStroke = { ...stroke, 'stroke-width': print ? .2 : 1, 'stroke-opacity': .58 };
      group.append(drawLine(point(a.x - arm, a.y), point(a.x + arm, a.y), centerStroke), drawLine(point(a.x, a.y - arm), point(a.x, a.y + arm), centerStroke));
    }
  } else {
    const closed = entity.type === 'rect' || entity.closed;
    group.append(svg(closed ? 'polygon' : 'polyline', { points: svgPoints(anchorsOf(entity)), fill: closed && !print ? (selected ? '#fccd8212' : '#93caff09') : 'none', ...stroke }));
  }
  return group;
}

export function exportDrawing(drawing) {
  const { left, right, top, bottom } = boundsOf(drawing.entities);
  const padding = 13;
  const width = right - left + padding * 2;
  const height = top - bottom + padding * 2;
  const x = left - padding, y = -top - padding;
  const image = svg('svg', { width: `${width}mm`, height: `${height}mm`, viewBox: `${x} ${y} ${width} ${height}`, role: 'img' });
  image.append(svg('title', {}, drawing.title), svg('rect', { x, y, width, height, fill: '#fff' }));
  for (const entity of drawing.entities) image.append(renderEntity(entity, { print: true, fontSize: 3.5 }));
  return new XMLSerializer().serializeToString(image);
}
