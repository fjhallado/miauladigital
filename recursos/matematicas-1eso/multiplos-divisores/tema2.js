"use strict";
const questions=[
['Escribe los divisores positivos de 24 separados por comas.', '1,2,3,4,6,8,12,24','list'],
['¿Cuántos divisores positivos tiene 36?', '9','number'],
['¿Es 45 múltiplo de 9? Escribe sí o no.','sí','yes'],
['¿Es 54 divisible por 6? Escribe sí o no.','sí','yes'],
['¿Es 28 múltiplo de 7? Escribe sí o no.','sí','yes'],
['¿Cuál es el menor múltiplo positivo de 8?','8','number'],
['¿Cuál es el siguiente múltiplo de 5 después de 35?','40','number'],
['¿Cuál es el mayor divisor positivo de 18?','18','number'],
['¿Cuál es el menor divisor positivo de 97?','1','number'],
['¿Es 125 divisible por 5? Escribe sí o no.','sí','yes'],
['¿Es 126 divisible por 9? Escribe sí o no.','sí','yes'],
['¿Es 150 divisible por 10? Escribe sí o no.','sí','yes'],
['¿Es 138 divisible por 2? Escribe sí o no.','sí','yes'],
['¿Es 217 divisible por 3? Escribe sí o no.','no','yes'],
['¿Cuál es el resto al dividir 31 entre 5?','1','number'],
['Completa: 7 × ___ = 56.','8','number'],
['¿Cuál es el segundo múltiplo positivo de 6?','12','number'],
['¿Es 11 divisor de 77? Escribe sí o no.','sí','yes'],
['¿Es 4 divisor de 30? Escribe sí o no.','no','yes'],
['¿Cuál es el menor número positivo divisible por 9 y por 15?','45','number'],
['¿Cuál es el menor número positivo divisible por 7 y por 11?','77','number'],
['Escribe los divisores positivos de 12 separados por comas.','1,2,3,4,6,12','list'],
['¿Es 132 divisible por 4? Escribe sí o no.','sí','yes'],
['¿Qué cifra falta en 34_ para que el número sea divisible por 10?','0','number'],
['¿Cuántos múltiplos positivos de 4 hay entre 1 y 20, incluidos?','5','number']
];
let active=[];
const norm=(s)=>String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function validate(raw, answer, kind){if(kind==='list'){const xs=raw.split(/[,;\s]+/).filter(Boolean).map(Number).sort((a,b)=>a-b);const ys=answer.split(',').map(Number).sort((a,b)=>a-b);return xs.length===ys.length && xs.every((v,i)=>v===ys[i])}return norm(raw)===norm(answer)}
function newRound(){let pool=[...questions.keys()];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}active=pool.slice(0,Number(document.getElementById('quiz-size').value));const host=document.getElementById('quiz-list');host.replaceChildren();active.forEach((index,pos)=>{const wrap=document.createElement('div');wrap.className='quiz-question';const label=document.createElement('label');label.htmlFor='answer-'+pos;label.textContent=(pos+1)+'. '+questions[index][0];const input=document.createElement('input');input.id='answer-'+pos;input.autocomplete='off';input.setAttribute('aria-label','Respuesta a la pregunta '+(pos+1));const feedback=document.createElement('p');feedback.className='quiz-feedback';feedback.id='feedback-'+pos;wrap.append(label,input,feedback);host.append(wrap)});document.getElementById('quiz-result').textContent=''}
document.getElementById('new-quiz').addEventListener('click',newRound);
document.getElementById('check-quiz').addEventListener('click',()=>{let score=0;active.forEach((q,i)=>{const val=document.getElementById('answer-'+i).value;const good=validate(val,questions[q][1],questions[q][2]);if(good)score++;const fb=document.getElementById('feedback-'+i);fb.classList.toggle('good',good);fb.textContent=good?'Correcto.':'Revisa tu respuesta. Solución: '+(questions[q][2]==='yes'?(questions[q][1]==='sí'?'Sí':'No'):questions[q][1].split(',').join(', '))});document.getElementById('quiz-result').textContent='Aciertos: '+score+' de '+active.length});
function readInt(id,max){const n=Number(document.getElementById(id).value);return Number.isSafeInteger(n)&&n>=1&&n<=max?n:null}
document.getElementById('multiple-go').addEventListener('click',()=>{const n=readInt('multiple-n',999);document.getElementById('multiple-out').textContent=n?Array.from({length:12},(_,i)=>n*i).join(' · '):'Introduce un número natural del 1 al 999.'});
document.getElementById('divisor-go').addEventListener('click',()=>{const n=readInt('divisor-n',10000);const ds=[];if(n)for(let i=1;i<=n;i++){if(n%i===0)ds.push(i)}document.getElementById('divisor-out').textContent=n?ds.join(' · '):'Introduce un número natural del 1 al 10000.'});
newRound();document.getElementById('multiple-go').click();document.getElementById('divisor-go').click();