(()=>{'use strict';
const $=id=>document.getElementById(id);
const mass={kg:{factor:1000,label:'kg'},g:{factor:1,label:'g'},mg:{factor:.001,label:'mg'}};
const vol={m3:{factor:1000000,label:'m³'},L:{factor:1000,label:'L'},dm3:{factor:1000,label:'dm³'},cm3:{factor:1,label:'cm³'},mL:{factor:1,label:'mL'}};
const units={
'g/cm3':{m:'g',v:'cm3',label:'g/cm³'},'kg/m3':{m:'kg',v:'m3',label:'kg/m³'},'g/mL':{m:'g',v:'mL',label:'g/mL'},'g/L':{m:'g',v:'L',label:'g/L'},'kg/L':{m:'kg',v:'L',label:'kg/L'},'mg/mL':{m:'mg',v:'mL',label:'mg/mL'},'g/dm3':{m:'g',v:'dm3',label:'g/dm³'}};
const fmt=x=>{if(!Number.isFinite(x))return '—'; if(x===0)return '0'; if(Math.abs(x)>=1e8 || Math.abs(x)<1e-6)return Number(x.toPrecision(6)).toExponential(3).replace('.',',');return new Intl.NumberFormat('es-ES',{maximumFractionDigits:7}).format(+x.toPrecision(10))};
const frac=(a,b,cls='')=>`<span class="fraction ${cls}"><span class="n">${a}</span><span class="d">${b}</span></span>`;
function calc(value,from,to){let A=units[from],B=units[to];let mratio=mass[A.m].factor/mass[B.m].factor, vr=vol[B.v].factor/vol[A.v].factor;let mn=mratio>=1?mratio:1,md=mratio>=1?1:1/mratio, vn=vr>=1?vr:1,vd=vr>=1?1:1/vr;return {A,B,mratio,vr,mn,md,vn,vd,result:value*mratio*vr};}
function massFactor(o){return frac(`${fmt(o.mn)} ${mass[o.B.m].label}`,`${fmt(o.md)} ${mass[o.A.m].label}`,'factor')}
function volFactor(o){return frac(`${fmt(o.vn)} ${vol[o.A.v].label}`,`${fmt(o.vd)} ${vol[o.B.v].label}`,'factor')}
let learningCrossed=false;
const markedUnit=(unit,kind,crossed)=>`<span class="${kind}${crossed?' crossed':''}">${unit}</span>`;
function renderLearn(){
 let value=Number($('startValue').value);
 if(!Number.isFinite(value)||value<0){
  $('conversionView').textContent='Introduce un valor positivo.';
  $('conversionFactors').textContent='';$('conversionResult').textContent='';return;
 }
 let from=$('startUnit').value,to=$('endUnit').value,o=calc(value,from,to);
 let changeMass=o.A.m!==o.B.m,changeVol=o.A.v!==o.B.v;
 $('conversionView').innerHTML=`${fmt(value)} ${frac(`<span class="mass">${mass[o.A.m].label}</span>`,`<span class="volume">${vol[o.A.v].label}</span>`)} <span style="color:#a2bfdc">→</span> <span style="color:#9be2ff">?</span> ${frac(`<span class="mass">${mass[o.B.m].label}</span>`,`<span class="volume">${vol[o.B.v].label}</span>`)}`;
 let initial=frac(markedUnit(mass[o.A.m].label,'mass',learningCrossed&&changeMass),markedUnit(vol[o.A.v].label,'volume',learningCrossed&&changeVol));
 let massPart=changeMass?` <span>×</span> ${frac(`<span>${fmt(o.mn)} ${markedUnit(mass[o.B.m].label,'mass',false)}</span>`,`<span>${fmt(o.md)} ${markedUnit(mass[o.A.m].label,'mass',learningCrossed)}</span>`,'factor')}`:'';
 let volPart=changeVol?` <span>×</span> ${frac(`<span>${fmt(o.vn)} ${markedUnit(vol[o.A.v].label,'volume',learningCrossed)}</span>`,`<span>${fmt(o.vd)} ${markedUnit(vol[o.B.v].label,'volume',false)}</span>`,'factor')}`:'';
 $('conversionFactors').innerHTML=`${fmt(value)} ${initial}${massPart}${volPart}`;
 $('toggleLearningCross').textContent=learningCrossed?'Quitar tachado':'Tachar unidades';
 $('learningCrossText').textContent=learningCrossed?'Las unidades iniciales se han anulado con sus parejas. Permanecen las unidades de destino y todos los números de los factores.':'Las unidades iguales que aparecen una en el numerador y otra en el denominador se anulan. ¡Pulsa «Tachar unidades» y observa cuáles desaparecen!';
 $('explainMass').innerHTML=!changeMass?'<b>Masa:</b> la unidad no cambia; no necesitamos factor de masa.':`<b>Masa:</b> como «${o.A.m}» está arriba, ponemos «${o.A.m}» <b>abajo</b> en su factor para cancelarla.`;
 $('explainVolume').innerHTML=!changeVol?'<b>Volumen:</b> la unidad no cambia; no necesitamos factor de volumen.':`<b>Volumen:</b> como «${vol[o.A.v].label}» está abajo, la ponemos <b>arriba</b> en su factor para cancelarla. Recuerda que 1 m³ = 1 000 000 cm³ y 1 L = 1 000 cm³.`;
 $('conversionResult').innerHTML=`<span class="result">${fmt(o.result)} ${o.B.label}</span>`;
 $('explainCalculation').textContent=`Operación numérica: ${fmt(value)} × (${fmt(o.mn)} ÷ ${fmt(o.md)}) × (${fmt(o.vn)} ÷ ${fmt(o.vd)}) = ${fmt(o.result)}. Al cancelar las unidades antiguas, solo queda ${o.B.label}.`;
}
$('toggleLearningCross').addEventListener('click',()=>{learningCrossed=!learningCrossed;renderLearn()});
for(let id of ['startValue','startUnit','endUnit'])$(id).addEventListener('input',()=>{learningCrossed=false;renderLearn()});
const tabs=[['tabLearn','learn'],['tabPractice','practice'],['tabChallenge','challenge']];
function showTab(id){for(let [tab,section] of tabs){let active=tab===id;$(tab).setAttribute('aria-selected',String(active));$(section).classList.toggle('hide',!active)}}
for(let [tab] of tabs)$(tab).addEventListener('click',()=>showTab(tab));
let guide={mass:null,volume:null};
const guideChoices={mass:[{n:'1 kg',d:'1 000 g',ok:true},{n:'1 000 g',d:'1 kg',ok:false},{n:'1 g',d:'1 000 kg',ok:false},{n:'1 000 kg',d:'1 g',ok:false}],volume:[{n:'1 000 000 cm³',d:'1 m³',ok:true},{n:'1 m³',d:'1 000 000 cm³',ok:false},{n:'1 cm³',d:'1 000 000 m³',ok:false},{n:'1 000 000 m³',d:'1 cm³',ok:false}]};
function renderChoices(kind){let holder=$(kind==='mass'?'guidedMassOptions':'guidedVolumeOptions');holder.replaceChildren();guideChoices[kind].forEach((f,i)=>{let b=document.createElement('button');b.className='choice';b.type='button';b.setAttribute('aria-pressed',String(guide[kind]===i));b.innerHTML=frac(f.n,f.d);b.onclick=()=>{guide[kind]=i;renderChoices(kind)};holder.append(b)})}
$('guidedCheck').onclick=()=>{let f=$('guidedFeedback');f.classList.remove('hide','good','bad');let okay=guide.mass===0&&guide.volume===0;f.classList.add(okay?'good':'bad');f.innerHTML=okay?'<b>¡Perfecto! Has colocado los dos factores.</b> 2,5 × (1 ÷ 1 000) × (1 000 000 ÷ 1) = <b>2 500 kg/m³</b>. Los gramos y los cm³ se han cancelado.':'<b>Revisa la posición de las unidades.</b> Como g está en el numerador inicial, debe ir abajo en el primer factor. Como cm³ está en el denominador inicial, debe ir arriba en el segundo. Puedes corregir tus elecciones e intentarlo otra vez.'};
$('guidedReset').onclick=()=>{guide={mass:null,volume:null};$('guidedFeedback').classList.add('hide');renderChoices('mass');renderChoices('volume')};
const problems=[
[2.5,'g/cm3','kg/m3'],[1200,'kg/m3','g/cm3'],[0.85,'g/mL','kg/m3'],[1800,'g/L','kg/m3'],[0.012,'kg/L','g/L'],
[750,'mg/mL','g/cm3'],[1.6,'g/cm3','g/L'],[2400,'g/dm3','kg/m3'],[0.9,'kg/L','g/cm3'],[3200,'kg/m3','mg/mL'],
[4.75,'g/cm3','kg/L'],[0.065,'g/mL','g/dm3'],[350,'g/L','mg/mL'],[1.25,'kg/L','kg/m3'],[0.006,'g/cm3','g/L'],[880,'kg/m3','g/mL']
];
let quiz=[],i=0,points=0,checked=false;
const shuffle=(arr)=>{arr=arr.slice();for(let j=arr.length-1;j>0;j--){let k=Math.floor(Math.random()*(j+1));[arr[j],arr[k]]=[arr[k],arr[j]]}return arr};
function startQuiz(){quiz=shuffle(problems).slice(0,10);i=0;points=0;checked=false;$('finalScore').classList.add('hide');$('checkAnswer').classList.remove('hide');$('answer').disabled=false;renderQuestion()}
function renderQuestion(){checked=false;let [value,from,to]=quiz[i];$('questionValue').textContent=`${fmt(value)} ${units[from].label} → ${units[to].label}`;$('destination').textContent=units[to].label;$('roundLabel').textContent=`Ejercicio ${i+1}/10`;$('scoreLabel').textContent=`${points} puntos`;$('difficultyLabel').textContent=i<3?'NIVEL 1 · APRENDIZ':i<7?'NIVEL 2 · EXPLORADOR':'NIVEL 3 · EXPERTO';$('bar').style.width=`${i*10}%`;$('answer').value='';$('answer').disabled=false;$('answer').focus();$('challengeFeedback').classList.add('hide');$('nextQuestion').classList.add('hide');$('checkAnswer').classList.remove('hide')}
function checkQuiz(){if(checked)return;let raw=$('answer').value.trim().replace(/\s/g,'');if(!raw){$('challengeFeedback').className='feedback bad';$('challengeFeedback').textContent='Escribe primero un resultado.';return}let normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;let value=Number(normalized);if(!Number.isFinite(value)){ $('challengeFeedback').className='feedback bad';$('challengeFeedback').textContent='Introduce un número, por ejemplo 2,5 o 2500.';return}
 checked=true;let [start,from,to]=quiz[i],o=calc(start,from,to),correct=Math.abs(value-o.result)<=Math.max(1e-8,Math.abs(o.result)*.002);if(correct)points++;let fb=$('challengeFeedback');fb.className='feedback '+(correct?'good':'bad');fb.innerHTML=`<b>${correct?'¡Bien hecho! +1 punto':'Vamos a corregirlo juntos.'}</b><p style="margin:8px 0">${fmt(start)} ${units[from].label} × ${massFactor(o)} × ${volFactor(o)} = <b>${fmt(o.result)} ${units[to].label}</b>.</p><span class="small">Primero cancelamos la unidad de masa; después la unidad de volumen. Los factores son equivalentes a 1.</span>`;$('answer').disabled=true;$('scoreLabel').textContent=`${points} puntos`;$('checkAnswer').classList.add('hide');$('nextQuestion').classList.remove('hide');$('nextQuestion').textContent=i===9?'Ver resultado final →':'Siguiente ejercicio →';$('bar').style.width=`${(i+1)*10}%`;
}
function next(){if(i===9){$('finalScore').classList.remove('hide');$('finalScore').innerHTML=`<span class="result">${points}/10</span><h3>${points>=8?'¡Experto en conversiones!':points>=5?'¡Buen progreso!':'Sigue practicando, vas por buen camino'}</h3><p class="sub">Has completado el reto. Puedes repetirlo con otras conversiones. Esta puntuación solo se muestra en tu navegador y no se envía al profesor.</p>`;$('nextQuestion').classList.add('hide');$('answer').disabled=true;return}i++;renderQuestion()}
$('checkAnswer').addEventListener('click',checkQuiz);$('answer').addEventListener('keydown',e=>{if(e.key==='Enter'){if(!checked)checkQuiz();else next()}});$('nextQuestion').addEventListener('click',next);$('restart').addEventListener('click',startQuiz);
renderLearn();renderChoices('mass');renderChoices('volume');startQuiz();
})();
