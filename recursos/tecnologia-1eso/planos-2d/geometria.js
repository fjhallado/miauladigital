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
export const dimensionAxes = ['horizontal', 'vertical', 'aligned'];
const dimensionNames = { horizontal: 'horizontal', vertical: 'vertical', aligned: 'alineada' };

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
  const { type, a, b, r, axis, offset, points, closed, dash, value } = entity;
  if (type === 'polyline') return Array.isArray(points) && points.length >= (closed ? 3 : 2) && points.length <= nodeLimit && points.every(validPoint) && typeof closed === 'boolean';
  if (!validPoint(a)) return false;
  if (type === 'circle') return validCoordinate(r) && r > 0;
  if (!validPoint(b) || samePoint(a, b)) return false;
  if (type === 'line') return dash === undefined || typeof dash === 'boolean';
  if (type === 'rect') return a.x !== b.x && a.y !== b.y;
  if (type === 'dimension') return dimensionAxes.includes(axis) && validCoordinate(offset) && dimensionValue(entity) > 0 && (value === undefined || (validCoordinate(value) && value > 0));
  return false;
}

export function readDrawing(content) {
  const data = JSON.parse(content);
  if (!data || data.format !== 'Mi Aula Digital · Planos 2D' || data.version !== 1 || typeof data.title !== 'string' || data.title.length > 80 || !Array.isArray(data.entities) || data.entities.length > entityLimit || !data.entities.every(validEntity)) {
    throw new Error('Formato de plano incompatible');
  }
  const drawing = { title: data.title.trim() || 'Plano sin título', entities: data.entities };
  if (data.projection !== undefined) {
    const { figure, cell, width, height, depth, revision } = data.projection ?? {};
    if (!Number.isInteger(figure) || figure < 1 || figure > 48 || !validCoordinate(cell) || cell < .1 || cell > 10000 ||
        ![width, height, depth].every(value => Number.isInteger(value) && value >= 2 && value <= 12) ||
        typeof revision !== 'string' || !/^[0-9a-f]{8}$/.test(revision)) throw new Error('Vistas diédricas incompatibles');
    drawing.projection = { figure, cell, width, height, depth, revision };
  }
  return drawing;
}

export function writeDrawing(drawing) {
  return JSON.stringify({ format: 'Mi Aula Digital · Planos 2D', version: 1, ...drawing }, null, 2);
}

export function dimensionValue({ axis, a, b }) {
  if (axis === 'aligned') return distance(a, b);
  return Math.abs(axis === 'horizontal' ? a.x - b.x : a.y - b.y);
}

function dimensionBasis(axis, a, b) {
  if (axis === 'horizontal') return { tangent: point(1, 0), normal: point(0, 1), labelSide: 1 };
  if (axis === 'vertical') return { tangent: point(0, 1), normal: point(1, 0), labelSide: -1 };
  const length = distance(a, b);
  const sign = b.x > a.x || (b.x === a.x && b.y >= a.y) ? 1 : -1;
  const tangent = point((b.x - a.x) * sign / length, (b.y - a.y) * sign / length);
  return { tangent, normal: point(-tangent.y, tangent.x), labelSide: 1 };
}

const dot = (a, b) => a.x * b.x + a.y * b.y;

export const dimensionOffset = (axis, a, b, p) => rounded(dot(p, dimensionBasis(axis, a, b).normal));

function dimensionLayout({ axis, a, b, offset }, fontSize) {
  const { tangent, normal, labelSide } = dimensionBasis(axis, a, b);
  const project = (u, v) => point(tangent.x * u + normal.x * v, tangent.y * u + normal.y * v);
  const along = p => dot(p, tangent);
  const across = p => dot(p, normal);
  const arrowsInside = Math.abs(along(a) - along(b)) >= fontSize * 2.2;
  const arrowSize = fontSize * .64;
  const anchors = [a, b].sort((first, second) => along(first) - along(second));
  const ticks = anchors.map(p => project(along(p), offset));
  const extensions = anchors.map(p => {
    const direction = Math.sign(offset - across(p)) || 1;
    const gap = Math.min(fontSize * .28, Math.abs(offset - across(p)));
    return [project(along(p), across(p) + direction * gap), project(along(p), offset + direction * fontSize * .52)];
  });
  const label = project((along(a) + along(b)) / 2, offset + labelSide * fontSize * .39);
  const arrows = ticks.map((p, index) => {
    const direction = (index === 0 ? 1 : -1) * (arrowsInside ? 1 : -1);
    const base = along(p) + direction * arrowSize;
    return [p, project(base, offset + arrowSize * .21), project(base, offset - arrowSize * .21)];
  });
  const line = arrowsInside ? ticks : [project(along(ticks[0]) - arrowSize * 1.25, offset), project(along(ticks[1]) + arrowSize * 1.25, offset)];
  const angle = -Math.atan2(tangent.y, tangent.x) * 180 / Math.PI;
  return { angle, line, extensions, label, arrows };
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

export function projectionLayout({ cell, width, depth, height }) {
  const gap = 2 * cell;
  const mainX = -gap - width * cell;
  const upperY = gap + height * cell;
  const right = gap + depth * cell;
  const bottom = -gap - depth * cell;
  return {
    origins: { front: point(mainX, upperY), side: point(gap, upperY), top: point(mainX, -gap) },
    bounds: { left: mainX - cell, right: right + cell, top: upperY + cell * 2, bottom: bottom - cell * 2 }
  };
}

export function boundsOf(entities, projection) {
  let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
  function include({ x, y }) {
    left = Math.min(left, x);
    right = Math.max(right, x);
    bottom = Math.min(bottom, y);
    top = Math.max(top, y);
  }
  if (projection) {
    const frame = projectionLayout(projection).bounds;
    include(point(frame.left, frame.bottom));
    include(point(frame.right, frame.top));
  }
  for (const entity of entities) {
    anchorsOf(entity).forEach(include);
    if (entity.type === 'dimension') {
      const { line, extensions, label } = dimensionLayout(entity, (projection?.cell ?? 10) * .4);
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
  if (entity.type === 'dimension') return { ...entity, offset: rounded(entity.offset + dimensionOffset(entity.axis, entity.a, entity.b, point(dx, dy))) };
  return { ...entity, a: shift(entity.a), b: shift(entity.b) };
}

export function properties(entity) {
  const mm = value => `${format(value)} mm`;
  let details;
  switch (entity.type) {
    case 'line': return [['Tipo', entity.dash ? 'Arista oculta' : 'Línea'], ['Longitud', mm(distance(entity.a, entity.b))]];
    case 'rect': return [['Tipo', 'Rectángulo'], ['Ancho', mm(Math.abs(entity.a.x - entity.b.x))], ['Alto', mm(Math.abs(entity.a.y - entity.b.y))]];
    case 'circle': return [['Tipo', 'Círculo'], ['Radio', mm(entity.r)], ['Diámetro', mm(2 * entity.r)]];
    case 'dimension': return [['Tipo', `Cota ${dimensionNames[entity.axis]}`], ['Medida', mm(entity.value ?? dimensionValue(entity))]];
    case 'polyline':
      details = segmentsOf(entity.points, entity.closed);
      return [['Tipo', 'Polilínea'], ['Trazado', entity.closed ? 'Cerrado' : 'Abierto'], ['Tramos', details.length], ['Longitud', mm(details.reduce((total, [a, b]) => total + distance(a, b), 0))]];
  }
}

function drawLine(a, b, attributes = {}) {
  return svg('line', { x1: a.x, y1: -a.y, x2: b.x, y2: -b.y, ...attributes });
}

const svgPoints = points => points.map(p => `${p.x},${-p.y}`).join(' ');

export function renderEntity(entity, { fontSize, print = false, scale = 1, preview = false, selected = false } = {}) {
  const dimension = entity.type === 'dimension';
  const color = print ? (dimension ? '#173652' : '#111d2b') : (selected || preview ? '#ffd394' : dimension ? '#96e4ff' : '#dcf1ff');
  const lineWidth = print ? (dimension ? .25 : .45) / scale : (dimension ? 1.15 : 2.15);
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
    if (layout.angle) label.transform = `rotate(${layout.angle} ${x} ${-y})`;
    group.append(svg('text', label, format(entity.value ?? dimensionValue(entity))));
  } else if (entity.type === 'line') {
    if (entity.dash) {
      stroke['stroke-dasharray'] = print ? `${2 / scale} ${1.2 / scale}` : '6 4';
      stroke['stroke-opacity'] = .66;
    }
    group.append(drawLine(entity.a, entity.b, stroke));
  } else if (entity.type === 'circle') {
    const { a, r } = entity;
    group.append(svg('circle', { cx: a.x, cy: -a.y, r, fill: 'none', ...stroke }));
    if (!preview) {
      const arm = Math.min(r * .44, fontSize * .8);
      const centerStroke = { ...stroke, 'stroke-width': print ? .2 / scale : 1, 'stroke-opacity': .58 };
      group.append(drawLine(point(a.x - arm, a.y), point(a.x + arm, a.y), centerStroke), drawLine(point(a.x, a.y - arm), point(a.x, a.y + arm), centerStroke));
    }
  } else {
    const closed = entity.type === 'rect' || entity.closed;
    group.append(svg(closed ? 'polygon' : 'polyline', { points: svgPoints(anchorsOf(entity)), fill: closed && !print ? (selected ? '#fccd8212' : '#93caff09') : 'none', ...stroke }));
  }
  return group;
}

export function renderProjection(projection, { print = false, scale = 1 } = {}) {
  const { bounds } = projectionLayout(projection);
  const group = svg('g', { 'data-projection-guides': '' });
  const line = {
    stroke: print ? '#65839b' : '#70aad1', 'stroke-width': print ? .26 / scale : 1.2,
    'stroke-opacity': .72, 'stroke-dasharray': print ? `${3 / scale} ${1.8 / scale}` : '8 6'
  };
  if (!print) line['vector-effect'] = 'non-scaling-stroke';
  group.append(drawLine(point(bounds.left, 0), point(bounds.right, 0), line));
  group.append(drawLine(point(0, bounds.bottom), point(0, bounds.top), line));
  return group;
}

export function renderPrintDrawing(drawing, { scale = 1, fontSize = (drawing.projection?.cell ?? 10) * .35 } = {}) {
  const content = svg('g');
  if (drawing.projection) content.append(renderProjection(drawing.projection, { print: true, scale }));
  for (const entity of drawing.entities) content.append(renderEntity(entity, { print: true, fontSize, scale }));
  return content;
}

export function exportDrawing(drawing) {
  const { left, right, top, bottom } = boundsOf(drawing.entities, drawing.projection);
  const padding = drawing.projection ? drawing.projection.cell * 1.3 : 13;
  const width = right - left + padding * 2;
  const height = top - bottom + padding * 2;
  const x = left - padding, y = -top - padding;
  const image = svg('svg', { width: `${width}mm`, height: `${height}mm`, viewBox: `${x} ${y} ${width} ${height}`, role: 'img' });
  image.append(svg('title', {}, drawing.title), svg('rect', { x, y, width, height, fill: '#fff' }));
  image.append(renderPrintDrawing(drawing));
  return new XMLSerializer().serializeToString(image);
}
