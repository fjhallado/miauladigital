'use strict';
const $ = id => document.getElementById(id);
const lessons = [...document.querySelectorAll('.lesson')];
const storeKey = 'mad-fyq2-tema2-completados-v1';
let current = 1, completed = new Set();
try { const saved = JSON.parse(localStorage.getItem(storeKey)||'[]'); if(Array.isArray(saved)) completed = new Set(saved.filter(x=>Number.isInteger(x)&&x>=1&&x<=5)); }catch{}
function markDone(n) { completed.add(n); try{localStorage.setItem(storeKey,JSON.stringify([...completed]))}catch{}; updateProgress(); }
function updateProgress(){ $('progress-copy').textContent = `${completed.size} de 5 apartados repasados`; $('progress-fill').style.width = `${completed.size*20}%`;document.querySelectorAll('[data-done]').forEach(x=>x.textContent=completed.has(Number(x.dataset.done))?'✓':'○'); }
function changeLesson(n, {scroll = true} = {}) {
 n = Math.max(1, Math.min(5, Number(n) || 1));
 current = n;
 lessons.forEach(lesson => { lesson.hidden = Number(lesson.dataset.lesson) !== n; });
 document.querySelectorAll('[data-go]').forEach(button => {
  const active = Number(button.dataset.go) === n;
  button.classList.toggle('active', active);
  if (active) button.setAttribute('aria-current', 'step');
  else button.removeAttribute('aria-current');
 });
 $('lesson-pos').textContent = `${n} / 5`;
 $('prev-lesson').disabled = n === 1;
 $('next-lesson').textContent = n === 5 ? 'Finalizar repaso ✓' : 'Siguiente apartado →';
 history.replaceState(null, '', `#apartado-${n}`);
 syncGasMotion();
 if (scroll) document.querySelector('.topic-nav').scrollIntoView({behavior:'smooth', block:'start'});
}
document.querySelectorAll('[data-go]').forEach(x=>x.addEventListener('click',()=>changeLesson(x.dataset.go)));
$('start-unit').addEventListener('click',()=>changeLesson(1));$('prev-lesson').addEventListener('click',()=>changeLesson(current-1));$('next-lesson').addEventListener('click',()=>{markDone(current);changeLesson(current===5?1:current+1)});$('print-unit').addEventListener('click',()=>window.print());
updateProgress();

// Densidad en g/cm3. Es la misma magnitud expresada en kg/m3 al multiplicar por 1000.
function density(){const m=Number($('dens-m').value),v=Number($('dens-v').value);if(!(m>0&&v>0&&Number.isFinite(m)&&Number.isFinite(v))){$('dens-result').textContent='Datos inválidos';$('dens-convert').textContent='Introduce valores positivos';$('dens-feedback').textContent='';return;}const d=m/v;$('dens-result').textContent=`${d.toLocaleString('es-ES',{maximumFractionDigits:3})} g/cm³`;$('dens-convert').textContent=`≈ ${(d*1000).toLocaleString('es-ES',{maximumFractionDigits:1})} kg/m³`;
const refs=[{name:'aceite',d:.92},{name:'agua',d:1},{name:'mármol',d:2.7},{name:'hierro',d:7.9}];const nearest=refs.reduce((a,b)=>Math.abs(b.d-d)<Math.abs(a.d-d)?b:a);$('dens-feedback').textContent=Math.abs(nearest.d-d)<.05?`El resultado es parecido a la densidad aproximada del ${nearest.name}.`: 'Compara el resultado con otras sustancias. La densidad, a la misma temperatura, ayuda a identificarlas.';}
['dens-m','dens-v'].forEach(id=>$(id).addEventListener('input',density));density();

// Visualización conceptual de partículas, sin prometer realismo molecular.
const canvas=$('particles'),pctx=canvas.getContext('2d');let state='solido';
const moving=Array.from({length:35},(_,i)=>({x:30+(i*67)%370,y:30+(i*41)%185,vx:Math.sin(i*7+.2)*1.12,vy:Math.cos(i*9+.3)*.88}));
function particleState(s){state=s;document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===s)));$('state-caption').textContent=({solido:'Las partículas permanecen muy próximas y vibran en torno a posiciones casi fijas.',liquido:'Las partículas siguen próximas, pero pueden desplazarse y deslizarse unas entre otras.',gas:'Las partículas están más separadas y se desplazan de forma caótica, ocupando el recipiente.'})[s];}
document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>particleState(b.dataset.state)));
const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const reduceMotion = motionPreference?.matches ?? false;
let frame=0;
function drawParticles(){frame++; const w=canvas.width,h=canvas.height;pctx.clearRect(0,0,w,h);pctx.fillStyle='#0a2039';pctx.fillRect(0,0,w,h);pctx.lineWidth=2;pctx.strokeStyle='#5c85ad';pctx.strokeRect(15,16,w-30,h-32);pctx.fillStyle='#adcde5';pctx.font='14px system-ui';pctx.fillText(state==='solido'?'Sólido':state==='liquido'?'Líquido':'Gas',30,38);
const s=state;if(s==='liquido'){pctx.fillStyle='#248aba50';pctx.fillRect(17,h-99,w-34,82)}
for(let i=0;i<moving.length;i++){let x,y,p=moving[i];if(s==='solido'){const col=i%7,row=Math.floor(i/7);x=122+col*31+Math.sin(frame*.075+i)*2;y=75+row*30+Math.cos(frame*.08+i)*2;}else if(s==='liquido'){const col=i%9,row=Math.floor(i/9);x=70+col*34+Math.sin(frame*.025+i)*13;y=150+row*21+Math.cos(frame*.04+i)*8;}else{if(!reduceMotion){p.x+=p.vx*1.7;p.y+=p.vy*1.7;if(p.x<32||p.x>w-32)p.vx*=-1;if(p.y<49||p.y>h-30)p.vy*=-1;p.x=Math.max(32,Math.min(w-32,p.x));p.y=Math.max(49,Math.min(h-30,p.y));}x=p.x;y=p.y;}pctx.beginPath();pctx.arc(x,y,s==='gas'?7:9,0,Math.PI*2);pctx.fillStyle=(s==='gas'?'#9edff5':s==='solido'?'#ffcd80':'#84d6e9');pctx.fill();pctx.lineWidth=1;pctx.strokeStyle='#ffffff8a';pctx.stroke();}
if(!reduceMotion)requestAnimationFrame(drawParticles)}particleState('solido');drawParticles();

// Curva cualitativa de calentamiento (agua a presión normal).
const heatShape=[[0,-20],[20,0],[35,0],[60,100],[80,100],[100,130]];
const hx=t=>58+t*6.04,hy=T=>290-(T+20)*(268/150);
$('heat-line').setAttribute('d',heatShape.map(([t,T],i)=>`${i?'L':'M'}${hx(t).toFixed(1)} ${hy(T).toFixed(1)}`).join(' '));
function interpCurve(t){for(let i=0;i<heatShape.length-1;i++){const [x0,y0]=heatShape[i],[x1,y1]=heatShape[i+1];if(t<=x1)return y0+(y1-y0)*(t-x0)/(x1-x0)}return 130}
function heat(){const t=Number($('heat-step').value),T=interpCurve(t);$('heat-progress').textContent=`${t} %`;$('heat-temp').textContent=`${T.toLocaleString('es-ES',{maximumFractionDigits:1})} °C`;
let phase,detail;if(t<20){phase='Hielo sólido';detail='El hielo se calienta y su temperatura aumenta hasta alcanzar el punto de fusión.'}else if(t<35){phase='Fusión · hielo + agua';detail='El hielo se derrite a temperatura constante: la energía permite cambiar de estado.'}else if(t<60){phase='Agua líquida';detail='El agua líquida aumenta su temperatura. También puede evaporarse desde la superficie.'}else if(t<80){phase='Ebullición · agua + vapor';detail='Se forman burbujas en todo el líquido. La temperatura permanece constante durante el cambio.'}else{phase='Vapor de agua';detail='Tras hervir por completo, el vapor sigue aumentando su temperatura.'}
$('heat-phase').textContent=phase;$('heat-explanation').textContent=detail;$('heat-cursor').setAttribute('x1',hx(t));$('heat-cursor').setAttribute('x2',hx(t));$('heat-dot').setAttribute('cx',hx(t));$('heat-dot').setAttribute('cy',hy(T));}
$('heat-step').addEventListener('input',heat);heat();

// Leyes de los gases con cantidad fija de gas y variable indicada constante.
const laws = {
 boyle: {
  title: 'Ley de Boyle–Mariotte',
  desc: 'A temperatura constante, presión y volumen son inversamente proporcionales.',
  min: 50, max: 400, step: 10, value: 200, unit: 'kPa', label: 'Presión final (kPa)',
  formula: 'p₁ · V₁ = p₂ · V₂',
  visualLabel: 'Representación esquemática de un cilindro con gas y pistón',
  caption: 'El espacio ocupado por el gas cambia según las condiciones.'
 },
 charles: {
  title: 'Ley de Charles',
  desc: 'Al variar la temperatura del aire de un globo, cambia su volumen. En este modelo despreciamos la tensión de la membrana y la presión del gas se mantiene igual a la exterior.',
  min: 240, max: 420, step: 10, value: 360, unit: 'K', label: 'Temperatura final (K)',
  formula: 'V₁ / T₁ = V₂ / T₂',
  visualLabel: 'Globo de aire que cambia de tamaño a presión constante',
  caption: 'Al calentar el aire, sus partículas se mueven más deprisa y el globo se hincha. La presión se mantiene en 100 kPa.'
 },
 gay: {
  title: 'Ley de Gay-Lussac',
  desc: 'El aire está encerrado en un recipiente rígido. Al calentarlo, aumenta la presión absoluta que indica el manómetro y el volumen permanece fijo.',
  min: 250, max: 600, step: 10, value: 450, unit: 'K', label: 'Temperatura final (K)',
  formula: 'p₁ / T₁ = p₂ / T₂',
  visualLabel: 'Recipiente rígido y cerrado con un manómetro para medir la presión',
  caption: 'Al subir la temperatura, las partículas se mueven más deprisa. La presión aumenta en el mismo espacio.'
 }
};
const lawButtons = document.querySelectorAll('[data-law]');
const gasVisuals = document.querySelectorAll('[data-gas-visual]');
const gasInput = $('gas-input');
const gasMotionButton = $('gas-motion');
const thermalParticles = {
 charles: readParticles('gas-balloon-particles'),
 gay: readParticles('gas-tank-particles')
};
let activeLaw = 'boyle';
let balloonScale = 1;
let gasPaused = false, gasFrame = 0, lastGasTime = null;

function readParticles(id) {
 return Array.from($(id).querySelectorAll('circle'), (dot, index) => {
  const angle = 0.6 + index * 2.4;
  return {dot, x: dot.cx.baseVal.value, y: dot.cy.baseVal.value, vx: Math.cos(angle), vy: Math.sin(angle)};
 });
}

function setLaw(key) {
 activeLaw = key;
 const law = laws[key];
 lawButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.law === key)));
 gasVisuals.forEach(group => {
  if (group.dataset.gasVisual === key) group.removeAttribute('display');
  else group.setAttribute('display', 'none');
 });
 $('gas-law-title').textContent = law.title;
 $('gas-law-desc').textContent = law.desc;
 $('gas-input-label').textContent = law.label;
 Object.assign(gasInput, {min: law.min, max: law.max, step: law.step, value: law.value});
 $('gas-formula').textContent = law.formula;
 $('gas-svg').setAttribute('aria-label', law.visualLabel);
 $('gas-visual-caption').textContent = law.caption;
 gasCalc();
 syncGasMotion();
}
function formatGas(value, decimals, unit) {
 return `${value.toLocaleString('es-ES', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})} ${unit}`;
}
function gasCalc() {
 const value = gasInput.valueAsNumber;
 $('gas-input-output').textContent = `${value} ${laws[activeLaw].unit}`;
 let result, initial, steps;
 if (activeLaw === 'boyle') {
  const volume = 400 / value;
  result = formatGas(volume, 2, 'L');
  initial = 'Partimos de 100 kPa y 4 L; T constante';
  steps = `V₂ = (100 × 4) ÷ ${value} = ${result}. Más presión implica menos volumen.`;
  drawBoyle(volume);
 } else if (activeLaw === 'charles') {
  const volume = 2.5 * value / 300;
  result = formatGas(volume, 2, 'L');
  initial = 'Partimos de 300 K y 2,5 L. Presión constante de 100 kPa.';
  steps = `V₂ = (2,5 × ${value}) ÷ 300 = ${result}.`;
  balloonScale = Math.sqrt(volume / 2.5);
  $('gas-balloon').setAttribute('transform', `translate(175 132) scale(${balloonScale})`);
  thermalParticles.charles.forEach(({dot}) => dot.setAttribute('r', 4 / balloonScale));
  $('gas-balloon-volume').textContent = `Volumen · ${result}`;
 } else {
  const pressure = 100 * value / 300;
  result = formatGas(pressure, 1, 'kPa');
  initial = 'Partimos de 300 K y 100 kPa. Volumen constante de 2,5 L.';
  steps = `p₂ = (100 × ${value}) ÷ 300 = ${result}.`;
  // El arco del manómetro representa de 80 a 200 kPa.
  const angle = -100 + (pressure - 80) * 200 / 120;
  $('gas-needle').setAttribute('transform', `rotate(${angle} 258 114)`);
  $('gas-tank-pressure').textContent = `Presión · ${result}`;
 }
 $('gas-result').textContent = result;
 $('gas-conditions').textContent = initial;
 $('gas-step').textContent = steps;
}

function syncGasMotion() {
 cancelAnimationFrame(gasFrame);
 gasFrame = 0;
 lastGasTime = null;
 gasMotionButton.hidden = activeLaw === 'boyle' || !!motionPreference?.matches;
 if (current === 5 && !gasMotionButton.hidden && !gasPaused && !document.hidden) {
  gasFrame = requestAnimationFrame(animateGas);
 }
}

function animateGas(time) {
 const seconds = lastGasTime === null ? 0 : Math.min((time - lastGasTime) / 1000, 0.05);
 lastGasTime = time;
 const inBalloon = activeLaw === 'charles';
 // La rapidez del ejemplo es proporcional a √T. La escala del globo solo modifica su tamaño.
 const distance = 72 * Math.sqrt(gasInput.valueAsNumber / 300) * seconds / (inBalloon ? balloonScale : 1);
 for (const particle of thermalParticles[activeLaw]) {
  particle.x += particle.vx * distance;
  particle.y += particle.vy * distance;
  if (inBalloon) bounceInBalloon(particle);
  else bounceInTank(particle);
  particle.dot.setAttribute('cx', particle.x);
  particle.dot.setAttribute('cy', particle.y);
 }
 gasFrame = requestAnimationFrame(animateGas);
}

function bounceInBalloon(particle) {
 const centerY = -11, limit = 60; // Márgenes para que el punto entero quede dentro del globo.
 const offsetY = particle.y - centerY;
 const radius = Math.hypot(particle.x, offsetY);
 if (radius <= limit) return;
 const nx = particle.x / radius, ny = offsetY / radius;
 const normalSpeed = particle.vx * nx + particle.vy * ny;
 particle.vx -= 2 * normalSpeed * nx;
 particle.vy -= 2 * normalSpeed * ny;
 particle.x = nx * limit;
 particle.y = centerY + ny * limit;
}

function bounceInTank(particle) {
 if (particle.x < 71 || particle.x > 180) {
  particle.vx *= -1;
  particle.x = Math.max(71, Math.min(180, particle.x));
 }
 if (particle.y < 85 || particle.y > 185) {
  particle.vy *= -1;
  particle.y = Math.max(85, Math.min(185, particle.y));
 }
}

function drawBoyle(volume) {
 const height = Math.max(50, Math.min(152, volume / 6 * 155)), y = 223 - height;
 $('gas-fill').setAttribute('y', y);
 $('gas-fill').setAttribute('height', height);
 $('gas-piston').setAttribute('y', y - 14);
 $('gas-piston-rod').setAttribute('d', `M175 28V${Math.max(28, y - 14)}`);
 const particles = $('gas-particles');
 particles.replaceChildren();
 for (let i = 0; i < 26; i++) {
  const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  particle.setAttribute('cx', 76 + (i * 67) % 196);
  particle.setAttribute('cy', y + 13 + (i * 41) % Math.max(17, height - 25));
  particle.setAttribute('r', 4.2);
  particle.setAttribute('fill', '#a0e4ff');
  particle.setAttribute('opacity', '.85');
  particles.append(particle);
 }
}
lawButtons.forEach(button => button.addEventListener('click', () => setLaw(button.dataset.law)));
gasInput.addEventListener('input', gasCalc);
gasMotionButton.addEventListener('click', () => {
 gasPaused = !gasPaused;
 gasMotionButton.textContent = gasPaused ? 'Reanudar partículas' : 'Pausar partículas';
 syncGasMotion();
});
document.addEventListener('visibilitychange', syncGasMotion);
motionPreference?.addEventListener('change', syncGasMotion);
setLaw('boyle');
changeLesson((location.hash.match(/apartado-(\d)/)||[])[1]||1,{scroll:false});

const quizData={
1:[['¿Cuál de estos ejemplos es materia?',['La luz','El aire','La alegría'],1,'El aire tiene masa y ocupa espacio, aunque sea invisible.'],['¿Qué caracteriza a la materia?',['Tener masa y volumen','Tener color','Estar siempre en estado sólido'],0,'La materia se reconoce porque tiene masa y ocupa un volumen.'],['¿Qué es una sustancia?',['Una medida del volumen','Una clase de materia','Un cambio de estado'],1,'Una sustancia es un tipo de materia; los objetos pueden estar hechos de varias sustancias.']],
2:[['¿Cuál es una propiedad específica de una sustancia?',['La masa','El volumen','La densidad'],2,'La densidad permite distinguir sustancias.'],['Una muestra de 60 g ocupa 20 cm³. ¿Cuál es su densidad?',['3 g/cm³','80 g/cm³','0,33 g/cm³'],0,'d = m / V = 60 / 20 = 3 g/cm³.'],['Un objeto irregular desplaza agua de 18 mL a 24 mL. ¿Cuál es su volumen?',['42 cm³','6 cm³','24 cm³'],1,'24 − 18 = 6 mL, y 1 mL equivale a 1 cm³.'],['¿En qué unidad del SI expresamos la masa?',['Litro','Kilogramo','Metro cúbico'],1,'La unidad del Sistema Internacional para la masa es el kilogramo (kg).']],
3:[['¿Qué estado conserva su forma y su volumen?',['Sólido','Líquido','Gas'],0,'En un sólido las partículas vibran pero mantienen posiciones casi fijas.'],['¿En qué estado pueden las partículas desplazarse con libertad por todo el recipiente?',['Sólido','Líquido','Gas'],2,'Las partículas del gas están muy separadas y se mueven libremente.'],['¿Por qué un gas se puede comprimir más que un líquido?',['Porque no tiene partículas','Porque sus partículas están más separadas','Porque siempre está frío'],1,'Los espacios entre partículas del gas permiten disminuir mucho su volumen.']],
4:[['El paso de sólido a líquido se denomina…',['Condensación','Fusión','Solidificación'],1,'La fusión transforma un sólido en líquido.'],['¿En qué consiste la sublimación?',['Gas a líquido','Líquido a sólido','Sólido a gas sin pasar por líquido'],2,'La sublimación es el paso directo de sólido a gas.'],['¿Cuándo puede producirse la evaporación de un líquido?',['Solo al hervir','A cualquier temperatura','Solo a 0 °C'],1,'La evaporación ocurre en la superficie a diferentes temperaturas.'],['¿Por qué aparece un tramo horizontal en una curva de calentamiento?',['La temperatura disminuye siempre','Se detiene el suministro de energía','La energía se emplea en un cambio de estado'],2,'En una sustancia pura a presión constante la temperatura se mantiene mientras ocurre el cambio.']],
5:[['En la ley de Boyle, si la presión se duplica a temperatura constante…',['El volumen se reduce a la mitad','El volumen se duplica','La temperatura se duplica'],0,'El producto p × V se mantiene constante.'],['Para aplicar las leyes de Charles y Gay-Lussac debemos expresar T en…',['Grados Celsius','Kelvin','Litros'],1,'Se necesita la temperatura absoluta, expresada en K.'],['Si un gas se calienta a volumen constante, su presión…',['Disminuye necesariamente','No cambia nunca','Aumenta'],2,'A volumen fijo, la presión aumenta con la temperatura absoluta.'],['Si a presión constante pasamos de 300 K a 450 K, el volumen…',['Se multiplica por 1,5','Se reduce a la mitad','Se hace cero'],0,'V₂/V₁ = T₂/T₁ = 450/300 = 1,5.']]};
const quizHistory={};
function renderQuizzes(){document.querySelectorAll('[data-quiz]').forEach(root=>{const id=Number(root.dataset.quiz),questions=quizData[id];root.replaceChildren();questions.forEach(([q,answers],qi)=>{const field=document.createElement('div');field.className='quiz-question';const text=document.createElement('p');text.textContent=`${qi+1}. ${q}`;field.append(text);const container=document.createElement('div');container.className='quiz-choices';answers.forEach((ans,ai)=>{const lab=document.createElement('label'),inp=document.createElement('input');inp.type='radio';inp.name=`quiz${id}q${qi}`;inp.value=ai;lab.append(inp,document.createTextNode(ans));container.append(lab)});field.append(container);root.append(field)});const actions=document.createElement('div');actions.className='quiz-actions';const btn=document.createElement('button');btn.type='button';btn.className='primary';btn.textContent='Comprobar respuestas';const box=document.createElement('div');box.className='quiz-result';box.hidden=true;box.setAttribute('role','status');btn.addEventListener('click',()=>{const answers=[];for(let qi=0;qi<questions.length;qi++){const checked=root.querySelector(`input[name="quiz${id}q${qi}"]:checked`);if(!checked){box.hidden=false;box.dataset.good='false';box.textContent='Responde todas las preguntas antes de comprobar.';return;}answers.push(Number(checked.value))}const correct=answers.filter((v,i)=>v===questions[i][2]).length;box.hidden=false;box.dataset.good=String(correct===questions.length);box.replaceChildren();const summary=document.createElement('strong');summary.textContent=`Resultado: ${correct} de ${questions.length} respuestas correctas.`;box.append(summary);questions.forEach((q,i)=>{const text=document.createElement('p');text.className='quiz-explain '+(answers[i]===q[2]?'quiz-correct':'quiz-wrong');text.textContent=`${i+1}. ${answers[i]===q[2]?'✓ Correcto':'✗ Repasa'} · ${q[3]}`;box.append(text)});if(correct===questions.length)markDone(id);});actions.append(btn,box);root.append(actions);});}
renderQuizzes();
