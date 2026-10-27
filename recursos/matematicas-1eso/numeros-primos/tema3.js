'use strict';
const $=id=>document.getElementById(id);
const isPrime=n=>Number.isInteger(n)&&n>=2&&Array.from({length:Math.floor(Math.sqrt(n))-1},(_,i)=>i+2).every(d=>n%d!==0);
$('prime-go').onclick=()=>{const n=Number($('prime-n').value),o=$('prime-out');if(!Number.isInteger(n)||n<1||n>10000){o.textContent='Introduce un número entero entre 1 y 10000.';return}if(n===1){o.textContent='1 no es primo ni compuesto.';return}if(isPrime(n))o.textContent=`${n} es primo: únicamente tiene los divisores 1 y ${n}.`;else{let d=2;while(n%d!==0)d++;o.textContent=`${n} es compuesto: ${n} = ${d} × ${n/d}.`}};
function factors(n){const out=[];for(let d=2;d*d<=n;d++)while(n%d===0){out.push(d);n/=d}if(n>1)out.push(n);return out}
$('factor-go').onclick=()=>{const n=Number($('factor-n').value),o=$('factor-out');o.replaceChildren();if(!Number.isInteger(n)||n<2||n>10000){o.textContent='Introduce un número entero entre 2 y 10000.';return}
const f=factors(n),counts=new Map();f.forEach(x=>counts.set(x,(counts.get(x)||0)+1));
const wrap=document.createElement('div');wrap.className='factor-result';const headline=document.createElement('strong');headline.textContent=`Divisiones sucesivas para ${n}`;wrap.append(headline);
const tab=document.createElement('table');tab.className='factor-ladder';const tbody=document.createElement('tbody');let value=n;for(const d of f){const tr=document.createElement('tr');const a=document.createElement('td'),b=document.createElement('td');a.textContent=value;b.textContent=d;tr.append(a,b);tbody.append(tr);value/=d}const last=document.createElement('tr');const a=document.createElement('td'),b=document.createElement('td');a.textContent='1';b.textContent='';last.append(a,b);tbody.append(last);tab.append(tbody);wrap.append(tab);
const result=document.createElement('p');result.className='factor-equation';const plain=document.createTextNode(`${n} = `);result.append(plain);let first=true;for(const [base,exp] of counts){if(!first)result.append(document.createTextNode(' · '));result.append(document.createTextNode(String(base)));if(exp>1){const sup=document.createElement('sup');sup.textContent=exp;result.append(sup)}first=false}wrap.append(result);o.append(wrap)};

// Desafío independiente: selección de números primos sobre una tabla de 1 a 100.
const allPrimes=Array.from({length:100},(_,i)=>i+1).filter(isPrime);
let challengeRequired=5,challengeSelected=new Set(),challengeLocked=false;
function renderChallenge(){const grid=document.getElementById('prime-challenge-grid');grid.replaceChildren();for(let n=1;n<=100;n++){const button=document.createElement('button');button.type='button';button.className='prime-cell challenge-cell';button.textContent=n;button.setAttribute('aria-pressed',String(challengeSelected.has(n)));if(n===1)button.classList.add('one');if(challengeSelected.has(n))button.classList.add('picked');if(challengeLocked){button.disabled=true;if(challengeSelected.has(n))button.classList.add(isPrime(n)?'hit':'mistake');else if(challengeRequired===25&&isPrime(n))button.classList.add('missed')}button.onclick=()=>{if(challengeLocked)return;if(challengeSelected.has(n))challengeSelected.delete(n);else if(challengeSelected.size<challengeRequired)challengeSelected.add(n);renderChallenge()};grid.append(button)}document.getElementById('prime-challenge-count').textContent=`${challengeSelected.size} / ${challengeRequired} seleccionados`}
function startChallenge(){const mode=document.getElementById('prime-challenge-mode').value;challengeRequired=mode==='all'?25:mode==='random'?Math.floor(Math.random()*16)+5:Number(mode);challengeSelected=new Set();challengeLocked=false;document.getElementById('prime-challenge-prompt').textContent=mode==='all'?'Selecciona TODOS los 25 números primos del 1 al 100.':`Selecciona ${challengeRequired} números primos entre 1 y 100.`;document.getElementById('prime-challenge-feedback').textContent='';renderChallenge()}
document.getElementById('prime-challenge-new').onclick=startChallenge;document.getElementById('prime-challenge-mode').onchange=startChallenge;
document.getElementById('prime-challenge-clear').onclick=()=>{challengeSelected=new Set();challengeLocked=false;document.getElementById('prime-challenge-feedback').textContent='';renderChallenge()};
document.getElementById('prime-challenge-check').onclick=()=>{if(challengeSelected.size!==challengeRequired){document.getElementById('prime-challenge-feedback').textContent=`Selecciona exactamente ${challengeRequired} números antes de corregir (llevas ${challengeSelected.size}).`;return}challengeLocked=true;const wrong=[...challengeSelected].filter(n=>!isPrime(n));const correct=challengeSelected.size-wrong.length;document.getElementById('prime-challenge-feedback').textContent=wrong.length===0?`¡Perfecto! Has seleccionado ${challengeRequired} números primos correctamente.`:`Has acertado ${correct} de ${challengeRequired}. No son primos: ${wrong.join(', ')}. Pulsa «Borrar selección» para repetir.`;renderChallenge()};
const questions=[
['¿Cuál es el único número primo par?',['2','4','6'],'2','Todo número par mayor que 2 es divisible entre 2.'],
['¿Cuál de estos números es primo?',['13','15','21'],'13','13 solo tiene los divisores 1 y 13.'],
['¿Qué número no es primo ni compuesto?',['1','2','3'],'1','1 tiene un único divisor positivo.'],
['¿Cuál es compuesto?',['17','19','21'],'21','21 = 3 × 7.'],
['¿Cuántos divisores positivos tiene un número primo?',['2','3','1'],'2','Los divisores son 1 y el propio número.'],
['¿Cuál es el siguiente primo después de 7?',['11','9','10'],'11','9 y 10 son compuestos.'],
['¿Qué procedimiento elimina múltiplos para encontrar primos?',['Criba de Eratóstenes','Tabla pitagórica','Regla de Laplace'],'Criba de Eratóstenes','La criba elimina los múltiplos de los primos encontrados.'],
['¿Cuál de estos números es primo?',['97','91','95'],'97','91 = 7 × 13 y 95 es múltiplo de 5.'],
['¿Cuál es la descomposición de 42?',['2 · 3 · 7','2 · 2 · 7','3 · 3 · 7'],'2 · 3 · 7','42 ÷ 2 = 21; 21 ÷ 3 = 7.'],
['¿Cuál es la descomposición de 75?',['3 · 5²','5 · 5²','3² · 5'],'3 · 5²','75 = 3 × 25 = 3 × 5².'],
['¿Cuál es la descomposición de 60?',['2² · 3 · 5','2 · 3² · 5','2³ · 5'],'2² · 3 · 5','60 ÷ 2 ÷ 2 ÷ 3 ÷ 5 = 1.'],
['¿Cuál es primo entre estos números?',['29','27','33'],'29','27 es múltiplo de 3 y 33 también.'],
['¿Cuántos primos hay entre 1 y 100?',['25','20','30'],'25','La criba hasta 100 deja 25 primos.'],
['¿Cuál es el menor número compuesto?',['4','2','1'],'4','4 = 2 × 2 y tiene 3 divisores.'],
['¿Qué conjunto corresponde a D(75)?',['1, 3, 5, 15, 25, 75','1, 3, 5, 10, 15, 75','1, 5, 15, 25, 75'],'1, 3, 5, 15, 25, 75','75 = 3 × 5².'],
['¿Cuál es el conjunto de divisores comunes de 18 y 24?',['1, 2, 3, 6','1, 2, 6, 9','2, 3, 6, 12'],'1, 2, 3, 6','Son los divisores que aparecen en ambos conjuntos.'],
['¿Qué regla indica divisibilidad entre 2?',['Termina en cifra par','La suma de cifras es múltiplo de 2','Termina en 5'],'Termina en cifra par','Acabar en 0, 2, 4, 6 u 8.'],
['¿Cuál es divisible entre 3?',['102','101','103'],'102','1 + 0 + 2 = 3.'],
['¿Cuál es divisible entre 5?',['265','262','263'],'265','Termina en 0 o en 5.'],
['¿224 es divisible entre 7?',['Sí','No','Solo entre 2'],'Sí','22 − 2 × 4 = 14, múltiplo de 7.'],
['¿812 es divisible entre 7?',['Sí','No','Solo entre 4'],'Sí','81 − 2 × 2 = 77, múltiplo de 7.'],
['¿4327 es divisible entre 11?',['No','Sí','Solo si acaba en 7'],'No','(7 + 3) − (2 + 4) = 4.'],
['¿Qué regla sirve para comprobar divisibilidad entre 11?',['Restar sumas de cifras alternas','Sumar todas sus cifras','Comprobar la última cifra'],'Restar sumas de cifras alternas','La diferencia debe ser 0 o múltiplo de 11.'],
['¿Qué número es divisible entre 6?',['132','125','133'],'132','132 es divisible entre 2 y entre 3.'],
['¿Por qué 35 no es primo?',['Porque 5 × 7 = 35','Porque es impar','Porque acaba en 5 y 5 es primo'],'Porque 5 × 7 = 35','Tiene más divisores que 1 y 35.'],
['¿Cuál es la factorización de 36?',['2² · 3²','2 · 3²','2³ · 3'],'2² · 3²','36 = 4 × 9.'],
['En la criba hasta 100, ¿con qué primo terminamos de tachar múltiplos?',['7','11','13'],'7','11 × 11 = 121, que supera 100.'],
['¿Cuál es un primo de una sola cifra?',['5','9','1'],'5','5 tiene exactamente dos divisores.'],
['¿Cuál NO es primo?',['49','47','43'],'49','49 = 7 × 7.'],
['¿Cuál es la factorización de 18?',['2 · 3²','2² · 3','3 · 6'],'2 · 3²','18 = 2 × 9 = 2 × 3².']
];
let round=[];
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function newQuiz(){round=shuffle(questions).slice(0,Number($('quiz-size').value));$('quiz-list').innerHTML='';$('quiz-result').textContent='';round.forEach(([q,answers],idx)=>{const article=document.createElement('article');article.className='tool-card quiz-question';const title=document.createElement('h3');title.textContent=`${idx+1}. ${q}`;article.append(title);const shuffled=shuffle(answers);shuffled.forEach((value,k)=>{const lab=document.createElement('label');lab.style.display='block';lab.style.margin='9px 0';const input=document.createElement('input');input.type='radio';input.name='q'+idx;input.value=value;input.style.width='auto';lab.append(input,document.createTextNode(' '+value));article.append(lab)});const feedback=document.createElement('p');feedback.className='quiz-feedback';feedback.setAttribute('aria-live','polite');article.append(feedback);$('quiz-list').append(article)})}
$('new-quiz').onclick=newQuiz;startChallenge();
$('check-quiz').onclick=()=>{let score=0;round.forEach((item,i)=>{const selected=document.querySelector(`input[name="q${i}"]:checked`);const ok=selected&&selected.value===item[2];if(ok)score++;const fb=$('quiz-list').children[i].querySelector('.quiz-feedback');fb.textContent=(ok?'✓ Correcto. ':'✗ '+(!selected?'Sin respuesta. ':'Incorrecto. '))+item[3]+' Respuesta: '+item[2];fb.style.color=ok?'#85eebc':'#ffc7bb'});$('quiz-result').textContent=`Has acertado ${score} de ${round.length} preguntas.`};newQuiz();
