'use strict';
const $=id=>document.getElementById(id);
const isPrime=n=>Number.isInteger(n)&&n>=2&&Array.from({length:Math.floor(Math.sqrt(n))-1},(_,i)=>i+2).every(d=>n%d!==0);
let stage=0;
function sieve(){const grid=$('criba-grid');grid.innerHTML='';const bases=[2,3,5,7];for(let n=1;n<=100;n++){const cell=document.createElement('div');cell.className='prime-cell';cell.textContent=n;if(n===1)cell.classList.add('one');else if(bases.slice(0,stage).some(b=>n!==b&&n%b===0))cell.classList.add('crossed');else if(bases.slice(0,stage).includes(n)||stage===4&&isPrime(n))cell.classList.add('selected');grid.append(cell)}$('criba-next').disabled=stage===4;$('criba-status').textContent=stage===0?'Paso inicial: comenzamos con los números del 1 al 100 (el 1 no es primo).':stage===4?'Criba completada: quedan 25 números primos entre 1 y 100.':`Paso ${stage}: hemos conservado el ${bases[stage-1]} y descartado sus múltiplos.`}
$('criba-next').onclick=()=>{stage=Math.min(4,stage+1);sieve()};$('criba-reset').onclick=()=>{stage=0;sieve()};sieve();
