import { bounds } from './modelo.js?v=2';

export const chamberSize = { width: 760, height: 390 };
const left = 94;
const top = 95;
const bottom = 293;
const pixelsPerLiter = 60;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
export const minimumVisibleVolume = 0.3;
const volumeX = volume => left + volume * pixelsPerLiter;
const rightWall = volume => volumeX(Math.max(minimumVisibleVolume, volume));
const tau = Math.PI * 2;

function box(ctx, x, y, width, height, radius, fill, stroke) {
 ctx.beginPath();
 ctx.roundRect(x, y, width, height, radius);
 ctx.fillStyle = fill;
 ctx.fill();
 if (stroke) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
 }
}

function line(ctx, x1, y1, x2, y2, color, width = 1) {
 ctx.beginPath();
 ctx.moveTo(x1, y1);
 ctx.lineTo(x2, y2);
 ctx.strokeStyle = color;
 ctx.lineWidth = width;
 ctx.stroke();
}

function circle(ctx, x, y, radius, color) {
 ctx.beginPath();
 ctx.arc(x, y, radius, 0, tau);
 ctx.fillStyle = color;
 ctx.fill();
}

function label(ctx, value, x, y, { size = 14, color = '#b3cce7', align = 'center', weight = 600 } = {}) {
 ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
 ctx.textAlign = align;
 ctx.textBaseline = 'middle';
 ctx.fillStyle = color;
 ctx.fillText(value, x, y);
}

function resizeCanvas(canvas, width, height) {
 const density = Math.min(2, window.devicePixelRatio || 1);
 canvas.width = Math.round(width * density);
 canvas.height = Math.round(height * density);
 const ctx = canvas.getContext('2d');
 ctx.setTransform(density, 0, 0, density, 0, 0);
 return ctx;
}

function gauge(ctx, pressure, format) {
 const x = 668, y = 170;
 const scale = [250, 500, 1000, 1600].find(limit => pressure <= limit) ?? 1600;
 const start = Math.PI * 0.75, sweep = Math.PI * 1.5;
 circle(ctx, x, y, 74, '#0c1d34');
 circle(ctx, x, y, 70, '#5a7b9f');
 circle(ctx, x, y, 65, '#162b45');
 for (let mark = 0; mark <= 10; mark++) {
  const angle = start + sweep * mark / 10;
  const inner = mark % 5 === 0 ? 48 : 53;
  line(ctx, x + Math.cos(angle) * inner, y + Math.sin(angle) * inner,
   x + Math.cos(angle) * 58, y + Math.sin(angle) * 58, '#abc8e6', mark % 5 === 0 ? 2.5 : 1);
 }
 const angle = start + sweep * clamp(pressure / scale, 0, 1);
 line(ctx, x, y, x + Math.cos(angle) * 45, y + Math.sin(angle) * 45, '#ffd08a', 3.5);
 circle(ctx, x, y, 5, '#ffd08a');
 label(ctx, 'kPa', x, y + 26, { size: 13 });
 label(ctx, '0', x - 34, y + 44, { size: 12 });
 label(ctx, format(scale, 0), x + 32, y + 44, { size: 12 });
 label(ctx, 'MANÓMETRO', x, 254, { size: 13, color: '#e6f0ff' });
}

function thermometer(ctx, temperature) {
 const x = 47, y = 135, height = 121;
 const fill = temperature / bounds.temperature.max;
 box(ctx, x - 9, y, 18, height, 9, '#0d253d', '#5c85a8');
 circle(ctx, x, y + height - 3, 14, '#23405c');
 box(ctx, x - 4, y + height - (9 + fill * 102), 8, 9 + fill * 102, 4, '#ffa68b');
 circle(ctx, x, y + height - 3, 8, '#ffb099');
 for (let mark = 0; mark < 5; mark++) {
  line(ctx, x + 11, y + 12 + mark * 20, x + 19, y + 12 + mark * 20, '#80a3c0');
 }
 label(ctx, 'K', x, 278, { size: 15, color: '#ffbdab' });
}

export function makeChamber(canvas, format, onDrag) {
 const { width, height } = chamberSize;
 const ctx = resizeCanvas(canvas, width, height);
 let reading;
 let locked = false;
 let particles = [];
 let flashes = [];
 let pointer = null;
 let offset = 0;

 function spawn() {
  const direction = Math.random() * tau;
  const speed = 46 + Math.random() * 94;
  return {
   x: left + 6 + Math.random() * (rightWall(reading.volume) - left - 12),
   y: top + 6 + Math.random() * (bottom - top - 12),
   vx: Math.cos(direction) * speed,
   vy: Math.sin(direction) * speed,
   color: Math.random() < .27 ? '#b9edff' : '#80c8f8',
   radius: 2.8 + Math.random() * 1.6
  };
 }

 function setReading(next, movable, reset = false) {
  const previous = reading;
  reading = next;
  locked = !movable;
  if (reset) {
   particles = [];
   flashes = [];
  } else if (previous && previous.volume !== next.volume) {
   const ratio = (rightWall(next.volume) - left) / (rightWall(previous.volume) - left);
   particles.forEach(particle => {
    particle.x = clamp(left + (particle.x - left) * ratio, left + 5, rightWall(next.volume) - 5);
   });
   flashes = [];
  }
  while (particles.length < next.amount) particles.push(spawn());
  particles.length = next.amount;
  if (!next.temperature) flashes = [];
  canvas.dataset.drag = String(movable);
 }

 function moveParticles(seconds) {
  const factor = 1.6 * Math.sqrt(reading.temperature / 300);
  const right = rightWall(reading.volume);
  flashes = flashes.filter(hit => {
   hit.age -= seconds;
   return hit.age > 0;
  });
  for (const particle of particles) {
   const { radius } = particle;
   particle.x += particle.vx * factor * seconds;
   particle.y += particle.vy * factor * seconds;
   const minX = left + radius, maxX = right - radius;
   const minY = top + radius, maxY = bottom - radius;
   let hitX = particle.x, hitY = particle.y;
   const wallX = hitX < minX ? left : hitX > maxX ? right : null;
   const wallY = hitY < minY ? top : hitY > maxY ? bottom : null;
   if (wallX !== null) {
    particle.vx *= -1;
    particle.x = clamp(hitX, minX, maxX);
    hitX = wallX;
   }
   if (wallY !== null) {
    particle.vy *= -1;
    particle.y = clamp(hitY, minY, maxY);
    hitY = wallY;
   }
   if (wallX !== null || wallY !== null) {
    flashes.push({ x: clamp(hitX, left, right), y: clamp(hitY, top, bottom), age: .16 });
   }
  }
 }

 function draw(seconds = 0) {
  if (seconds && reading.temperature) moveParticles(seconds);
  const { volume, temperature, pressure, amount } = reading;
  const right = rightWall(volume);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0a1b31';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#1b3049';
  for (let x = 26; x < width; x += 24) {
   for (let y = 22; y < height; y += 24) ctx.fillRect(x, y, 2, 2);
  }

  box(ctx, 82, 81, 505, 226, 17, '#203650', '#6584a7');
  box(ctx, left, top, 480, bottom - top, 6, '#0c243e', '#476584');
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  const glass = ctx.createLinearGradient(0, top, 0, bottom);
  glass.addColorStop(0, '#1b54806b');
  glass.addColorStop(1, '#112e48');
  ctx.fillStyle = glass;
  ctx.fillRect(left, top, right - left, bottom - top);
  for (const particle of particles) {
   circle(ctx, particle.x, particle.y, particle.radius, particle.color);
   circle(ctx, particle.x - 1, particle.y - 1, .9, '#ecf9ff');
  }
  for (const hit of flashes) {
   ctx.globalAlpha = hit.age * 3;
   circle(ctx, hit.x, hit.y, 7 - 20 * hit.age, '#ffd47b');
  }
  ctx.restore();

  const piston = ctx.createLinearGradient(right - 5, 0, right + 9, 0);
  piston.addColorStop(0, '#d3e8f5');
  piston.addColorStop(.56, '#91b4d0');
  piston.addColorStop(1, '#52779f');
  box(ctx, right - 6, 82, 14, 225, 4, piston, '#a3c3dc');
  line(ctx, right + 8, 180, 585, 180, '#7693b3', 10);
  line(ctx, right + 8, 178, 585, 178, '#b4cde2', 2);
  box(ctx, right - 21, 59, 42, 23, 5, locked ? '#495c7a' : '#35658a', '#91b5d3');
  label(ctx, locked ? '—' : '↔', right, 69.5, { color: '#eef6ff', size: 18, weight: 800 });

  line(ctx, 94, 329, 574, 329, '#7b9abc');
  for (let liter = 0; liter <= 8; liter++) {
   const x = volumeX(liter);
   line(ctx, x, 329, x, 336, '#a8c3df');
   label(ctx, String(liter), x, 351, { size: 14, color: '#b7cfea' });
  }
  line(ctx, left, 314, volumeX(volume), 314, '#8ecbfb', 3);
  label(ctx, 'Volumen (L)', 336, 373, { size: 14, color: '#e0edfb' });
  label(ctx, amount ? (locked ? 'CÁMARA DE GAS' : 'PISTÓN MÓVIL') : 'CÁMARA VACÍA',
   94, 42, { size: 14, align: 'left', color: '#b8d4ed', weight: 750 });
  thermometer(ctx, temperature);
  gauge(ctx, pressure, format);
 }

 function point(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * width / bounds.width,
   y: (event.clientY - bounds.top) * height / bounds.height };
 }
 canvas.addEventListener('pointerdown', event => {
  if (locked || !reading || pointer !== null || event.button !== 0) return;
  const { x, y } = point(event);
  if (y < 43 || y > 308 || Math.abs(x - rightWall(reading.volume)) > 23) return;
  pointer = event.pointerId;
  offset = x - rightWall(reading.volume);
  canvas.setPointerCapture(pointer);
 });
 canvas.addEventListener('pointermove', event => {
  if (event.pointerId === pointer && !locked) onDrag((point(event).x - offset - left) / pixelsPerLiter);
 });
 for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(type, event => { if (event.pointerId === pointer) pointer = null; });
 }
 return { setReading, draw };
}

export function makePlot(canvas) {
 const width = 640, height = 300;
 const ctx = resizeCanvas(canvas, width, height);

 function draw({ xMin, xMax, xTicks, xUnit, yUnit, current, curve, samples, format }) {
  const origin = { x: 64, y: 242 }, spanX = 549, spanY = 204;
  const high = Math.max(1, ...curve.map(point => point.y));
  const scale = 10 ** Math.floor(Math.log10(high));
  const tick = ([1, 2, 2.5, 5, 10].map(n => n * scale / 5)).find(n => n * 5 >= high) ?? scale;
  const yMax = 5 * tick;
  const x = value => origin.x + spanX * (value - xMin) / (xMax - xMin);
  const y = value => origin.y - spanY * value / yMax;
  const fontSize = canvas.clientWidth < 410 ? 22 : 16;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d2139';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i <= 5; i++) {
   const val = i * tick;
   line(ctx, origin.x, y(val), origin.x + spanX, y(val), '#294663');
   label(ctx, format(val, Number.isInteger(tick) ? 0 : 1), origin.x - 7, y(val), { size: fontSize, align: 'right' });
  }
  for (const val of xTicks) {
   line(ctx, x(val), origin.y, x(val), origin.y - spanY, '#294663');
   label(ctx, format(val, 0), x(val), origin.y + 19, { size: fontSize });
  }
  line(ctx, origin.x, origin.y - spanY, origin.x, origin.y, '#84a8c8', 1.5);
  line(ctx, origin.x, origin.y, origin.x + spanX, origin.y, '#84a8c8', 1.5);
  label(ctx, yUnit, origin.x, 17, { size: fontSize, align: 'left', color: '#e3f1fc' });
  label(ctx, xUnit, origin.x + spanX / 2, 282, { size: fontSize, color: '#e3f1fc' });
  ctx.beginPath();
  curve.forEach((point, index) => (index ? ctx.lineTo(x(point.x), y(point.y)) : ctx.moveTo(x(point.x), y(point.y))));
  ctx.strokeStyle = '#85ccff';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const sample of samples) circle(ctx, x(sample.x), y(sample.y), 5, '#abf4d9');
  circle(ctx, x(current.x), y(current.y), 8, '#152c4a');
  circle(ctx, x(current.x), y(current.y), 5.5, '#ffcd80');
 }
 return { draw };
}
