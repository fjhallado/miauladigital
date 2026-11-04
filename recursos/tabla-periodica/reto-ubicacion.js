/* Mi Aula Digital · V1.4.15 · Reto de ubicación. Usa la selección del laboratorio. */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
const startButton=byId('ubicacion-iniciar'),restartButton=byId('ubicacion-reiniciar'),numberCheck=byId('ubicacion-ver-numeros');
const board=byId('ubicacion-tabla'),game=byId('ubicacion-juego'),symbol=byId('ubicacion-simbolo'),step=byId('ubicacion-progreso'),points=byId('ubicacion-puntos'),message=byId('ubicacion-mensaje'),result=byId('ubicacion-resultado');
const MAX=118;
let questions=[],current=0,mistakes=0,complete=false,placed=new Set(),wrongTimeout=0;
const byNumber=new Map(elements.map(e=>[e.n,e]));
function shuffle(pool){const a=[...pool];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeCell(el){const btn=document.createElement('button');btn.type='button';btn.className='placement-cell';btn.style.gridColumn=String(el.g+1);btn.style.gridRow=String(el.p<=7?el.p+1:el.p+2);btn.dataset.number=String(el.n);btn.title='Casilla vacía: grupo '+el.g+', '+(el.p>7?'serie inferior':'período '+el.p);btn.setAttribute('aria-label',btn.title);btn.addEventListener('click',()=>choose(el.n));return btn}
const cells=new Map();
function createBoard(){board.replaceChildren();const corner=document.createElement('span');corner.className='placement-axis corner';corner.textContent='G / P';corner.style.gridRow='1';corner.style.gridColumn='1';board.append(corner);
for(let g=1;g<=18;g++){const h=document.createElement('span');h.className='placement-axis';h.textContent=g;h.style.gridRow='1';h.style.gridColumn=String(g+1);h.title='Grupo '+g+': '+groupNames[g-1];board.append(h)}
for(let p=1;p<=9;p++){let marker=document.createElement('span');marker.className='placement-axis';marker.textContent=p<=7?p:p===8?'La–Lu':'Ac–Lr';marker.title=p<=7?'Período '+p:p===8?'Lantánidos':'Actínidos';marker.style.gridColumn='1';marker.style.gridRow=String(p<=7?p+1:p+2);board.append(marker)}
for(const e of elements){const cell=makeCell(e);cells.set(e.n,cell);board.append(cell)}
}
function render(){for(const e of elements){const b=cells.get(e.n),isPlaced=placed.has(e.n),inGame=questions.some(item=>item.n===e.n);b.classList.toggle('placed',isPlaced);b.classList.toggle('eligible',!isPlaced&&inGame);b.classList.toggle('inactive',!isPlaced&&!inGame);b.textContent=isPlaced?e.symbol:(numberCheck.checked?String(e.n):'');b.setAttribute('aria-label',isPlaced?`${e.name} colocado en grupo ${e.g}`:`Casilla vacía: grupo ${e.g}, ${e.p>7?'serie inferior':'período '+e.p}`);b.disabled=complete||isPlaced}}
function updatePrompt(){if(current>=questions.length){finish();return}const e=questions[current];symbol.textContent=e.symbol;step.textContent=`Elemento ${current+1} de ${questions.length}`;points.textContent=`${current} aciertos · ${mistakes} errores`;message.textContent='Pulsa la posición en la tabla donde colocarías '+e.symbol+'.';message.className='placement-message';render()}
function choose(number){if(complete||!questions.length||current>=questions.length)return;const target=questions[current],cell=cells.get(number);if(placed.has(number))return;
if(number!==target.n){mistakes++;message.textContent='Esa no es su posición. Inténtalo de nuevo: '+target.symbol+'.';message.className='placement-message bad';cell.classList.remove('placement-wrong');void cell.offsetWidth;cell.classList.add('placement-wrong');clearTimeout(wrongTimeout);wrongTimeout=setTimeout(()=>cell.classList.remove('placement-wrong'),600);points.textContent=`${current} aciertos · ${mistakes} errores`;return}
placed.add(number);cell.classList.add('placement-success');current++;if(current>=questions.length){finish();return}updatePrompt()}
function finish(){complete=true;render();symbol.textContent='✓';step.textContent='Reto completado';points.textContent=`${current} colocados · ${mistakes} errores`;message.textContent='¡Has completado el reto! Puedes repetirlo con otros símbolos o cambiar los grupos.';message.className='placement-message good';result.textContent=`Resultado: ${current} de ${questions.length} elementos colocados. Intentos incorrectos: ${mistakes}.`;restartButton.disabled=false}
function start(){const pool=filteredElements();if(!pool.length){game.hidden=true;result.textContent='Selecciona grupos o familias que contengan elementos del nivel elegido.';return}const qty=Math.min(pool.length,Number(byId('cantidad').value)||10);questions=shuffle(pool).slice(0,qty);current=0;mistakes=0;complete=false;placed=new Set();game.hidden=false;restartButton.disabled=false;result.textContent='';render();updatePrompt();startButton.textContent='↻ Nuevo reto';game.scrollIntoView({behavior:'smooth',block:'nearest'})}
startButton.addEventListener('click',start);restartButton.addEventListener('click',start);numberCheck.addEventListener('change',render);
createBoard();
})();