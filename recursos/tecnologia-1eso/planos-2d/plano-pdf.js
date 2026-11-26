import { boundsOf, format, renderPrintDrawing, svg } from './geometria.js?v=4';

async function drawPlot(ctx, drawing, area) {
  const { width: sheetWidth, height: sheetHeight } = window.MADSheetPDF;
  const width = area.width * 297 / sheetWidth;
  const height = area.height * 210 / sheetHeight;
  const { left, right, top, bottom } = boundsOf(drawing.entities, drawing.projection);
  const scale = Math.min(20, (width - 18) / Math.max(right - left, .001), (height - 18) / Math.max(top - bottom, .001));
  const x = width / 2 - (left + right) * scale / 2;
  const y = height / 2 + (bottom + top) * scale / 2;
  const plot = svg('svg', { width: area.width, height: area.height, viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none' });
  const drawingLayer = renderPrintDrawing(drawing, { scale, fontSize: 3.3 / scale });
  drawingLayer.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
  plot.append(drawingLayer);
  const source = new Blob([new XMLSerializer().serializeToString(plot)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(source);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    ctx.drawImage(image, area.x, area.y, area.width, area.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  return scale;
}

function scaleLabel(scale) {
  if (scale === 1) return '1:1';
  const ratio = scale > 1 ? `${format(scale)}:1` : `1:${format(1 / scale)}`;
  return `≈ ${ratio}`;
}

async function getFigureStamp(figure) {
  if (!figure) return null;
  try {
    const stamp = await window.MADLamina.request('/view-stamp', { figure });
    if (stamp.figure === figure && Number.isSafeInteger(stamp.createdAt) && typeof stamp.code === 'string' && stamp.code) return stamp;
  } catch { /* The drawing can still be downloaded if the seal service is unavailable. */ }
  return null;
}

export async function downloadPlanPDF(drawing, student, filename) {
  const figure = drawing.projection?.figure;
  const { createSheet, drawTitleBlock, jpgPage, downloadPDF } = window.MADSheetPDF;
  const heading = figure ? 'TECNOLOGÍA · PLANO DE VISTAS DIÉDRICAS' : 'TECNOLOGÍA · PLANO 2D';
  const { canvas, ctx } = createSheet(heading, 'MI AULA DIGITAL / COTAS EN MILÍMETROS');
  const [scale, stamp] = await Promise.all([
    drawPlot(ctx, drawing, { x: 96, y: 217, width: canvas.width - 192, height: 1245 }),
    getFigureStamp(figure)
  ]);
  const createdAt = stamp?.createdAt ?? Date.now();
  const qrWidth = stamp ? 164 : 0;
  const fields = [
    ['ALUMNO / ALUMNA', 530, student.name || '________________________'],
    ['CURSO / GRUPO', 300, [student.course, student.group].filter(Boolean).join(' · ') || '________________'],
    ...(figure ? [['FIGURA', 145, String(figure).padStart(2, '0')]] : []),
    ['ESCALA', 236, scaleLabel(scale)],
    ['FECHA Y HORA DE CREACIÓN', 450, window.MADLamina.formatTime(createdAt)],
    ['PLANO', null, drawing.title]
  ];
  const block = drawTitleBlock(ctx, fields, qrWidth);
  if (stamp) window.MADLamina.drawSeal(ctx, stamp.code, { x: block.left + 7, y: block.top + 4, width: qrWidth - 14, height: block.height - 8 });
  downloadPDF([jpgPage(canvas)], filename, createdAt);
  return figure && !stamp ? 'Plano PDF A4 descargado. El servicio de sellado no estaba disponible.' : 'Plano PDF A4 descargado.';
}
