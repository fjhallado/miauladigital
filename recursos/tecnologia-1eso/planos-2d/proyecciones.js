import { dimensionAxes, dimensionOffset, distance, entityLimit, point, projectionLayout, rounded, samePoint, validEntity } from './geometria.js?v=3';

const dashed = line => !!line.dash || line.style === 'dash';

export function projectionRevision(exercise) {
  const geometry = window.MADSavedViews.views.map(view => [exercise.grids[view], exercise.lines[view].map(({ a, b, ...style }) => [a.x, a.y, b.x, b.y, dashed(style)])]);
  let hash = 2166136261;
  for (const letter of JSON.stringify(geometry)) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function legacyDimensions(number) {
  try { return JSON.parse(localStorage.getItem(`mad-acotacion-v1:${number}`)); }
  catch { return null; }
}

export function buildProjection(exercise, cellOverride) {
  const { number, grids, lines } = exercise;
  const previous = legacyDimensions(number);
  const oldCell = previous?.millimetres;
  const cell = cellOverride ?? (Number.isFinite(oldCell) && oldCell >= .1 && oldCell <= 10000 ? oldCell : 10);
  const projection = {
    figure: number, cell, revision: projectionRevision(exercise),
    width: Math.max(grids.front.w, grids.top.w), height: Math.max(grids.front.h, grids.side.h),
    depth: Math.max(grids.side.w, grids.top.h)
  };
  const { origins } = projectionLayout(projection);
  const toSheet = (view, p) => point(rounded(origins[view].x + p.x * cell), rounded(origins[view].y - p.y * cell));
  const entities = window.MADSavedViews.views.flatMap(view => lines[view].map(line => ({
    type: 'line', a: toSheet(view, line.a), b: toSheet(view, line.b), ...(dashed(line) && { dash: true })
  }))).filter(validEntity);
  if (Array.isArray(previous?.marks) && cell === (oldCell ?? 10)) {
    const marks = previous.marks.map(mark => convertLegacyMark(mark, lines, toSheet)).filter(Boolean);
    entities.push(...marks.slice(0, Math.max(0, entityLimit - entities.length)));
  }
  if (entities.length > entityLimit) throw new Error('Demasiados trazos en la figura');
  return { title: `Figura ${number} · Vistas diédricas`, entities, projection };
}

function convertLegacyMark(mark, lines, toSheet) {
  if (!mark || !Object.hasOwn(lines, mark.view) || !dimensionAxes.includes(mark.direction) || !Number.isFinite(mark.offset) || Math.abs(mark.offset) > 40) return null;
  const { a, b, view, direction: axis, offset } = mark;
  const visible = lines[view].filter(line => !dashed(line)).flatMap(line => [line.a, line.b]);
  if (!a || !b || samePoint(a, b) || ![a, b].every(p => visible.some(vertex => samePoint(vertex, p)))) return null;
  const length = distance(a, b);
  const normal = axis === 'horizontal' ? point(0, 1) : axis === 'vertical' ? point(-1, 0) : point((a.y - b.y) / length, (b.x - a.x) / length);
  const position = point((a.x + b.x) / 2 + offset * normal.x, (a.y + b.y) / 2 + offset * normal.y);
  const start = toSheet(view, a), end = toSheet(view, b);
  const entity = { type: 'dimension', axis, a: start, b: end, offset: dimensionOffset(axis, start, end, toSheet(view, position)) };
  if (Number.isFinite(mark.value) && mark.value > 0 && mark.value <= 170000) entity.value = mark.value;
  return validEntity(entity) ? entity : null;
}
