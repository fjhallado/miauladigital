(()=>{'use strict';
const $=id=>document.getElementById(id);
const M={mg:0.001,g:1,kg:1000};
const V={cm3:1,mL:1,L:1000,dm3:1000,m3:1000000};
const ml={mg:'mg',g:'g',kg:'kg'};
const vl={cm3:'cm³',mL:'mL',L:'L',dm3:'dm³',m3:'m³'};
const U={
 'g/cm3':['g','cm3'],'kg/m3':['kg','m3'],'g/mL':['g','mL'],
 'g/L':['g','L'],'kg/L':['kg','L'],'mg/mL':['mg','mL'],'g/dm3':['g','dm3']
};
const cases=[
 {n:'Densidad de un metal',v:2.5,a:'g/cm3',b:'kg/m3'},
 {n:'Densidad de una sustancia',v:1200,a:'kg/m3',b:'g/cm3'},
 {n:'Masa por litro',v:5,a:'g/L',b:'kg/m3'},
 {n:'Líquido denso',v:0.8,a:'kg/L',b:'g/cm3'},
 {n:'Masa en miligramos',v:2500,a:'mg/mL',b:'g/L'},
 {n:'De g/mL a kg/L',v:1.2,a:'g/mL',b:'kg/L'},
 {n:'Volumen en decímetros',v:750,a:'g/dm3',b:'kg/m3'},
 {n:'Cambio grande de volumen',v:0.002,a:'kg/m3',b:'mg/mL'}
];
const examples=[
 cases[0], cases[1], cases[2], cases[3], cases[4], cases[5], cases[6],
 {n:'Solo cambia la masa',v:1200,a:'g/L',b:'kg/L'},
 {n:'Solo cambia el volumen',v:4,a:'g/cm3',b:'g/L'}
];
// Remove the same-unit example that does not introduce a factor; it is useful as a contrast.
const format=n=>{if(!Number.isFinite(n))return '—';if(n===0)return '0';if(Math.abs(n)<0.000001 || Math.abs(n)>=1000000000)return n.toExponential(3).replace('.',',');return new Intl.NumberFormat('es-ES',{maximumFractionDigits:8}).format(Number(n.toPrecision(11)))};
const label=k=>ml[k]||vl[k]||k;
const pair=k=>U[k];
const dens=k=>`${ml[pair(k)[0]]}/${vl[pair(k)[1]]}`;
const equal=(a,b)=>a===b;
const escape=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function fracHTML(top,bottom,kind=''){return `<span class="v2-fraction ${kind}"><span class="v2-top">${top}</span><span class="v2-bottom">${bottom}</span></span>`}
function numbers(a,b,table){let r=table[a]/table[b];return r>=1?[Number(r.toPrecision(10)),1]:[1,Number((1/r).toPrecision(10))]}
function factorSpec(c,kind){let a=pair(c.a),b=pair(c.b),isMass=kind==='mass';let start=a[isMass?0:1],end=b[isMass?0:1],tab=isMass?M:V;if(equal(start,end))return null;
 let [num,den]=numbers(isMass?start:end,isMass?end:start,tab);
 return {n:num,d:den,nu:isMass?end:start,du:isMass?start:end,kind};}
function data(c){let a=pair(c.a),b=pair(c.b),m=M[a[0]]/M[b[0]],v=V[b[1]]/V[a[1]];return {m:factorSpec(c,'mass'),v:factorSpec(c,'volume'),result:c.v*m*v};}
function showFactor(f){let cls=f.kind==='mass'?'v2-mass':'v2-volume';return fracHTML(`${format(f.n)} <span class="${cls}">${label(f.nu)}</span>`,`${format(f.d)} <span class="${cls}">${label(f.du)}</span>`) }
function showDensity(c,dest=false){let [m,v]=pair(dest?c.b:c.a);return `${format(c.v)} ${fracHTML(`<span class="v2-mass">${label(m)}</span>`,`<span class="v2-volume">${label(v)}</span>`)}`;}
function showTarget(c){let [m,v]=pair(c.b);return fracHTML(`<span class="v2-mass">${label(m)}</span>`,`<span class="v2-volume">${label(v)}</span>`)}
function resultEquation(c){let d=data(c);return `<span>${showDensity(c)}</span> ${d.m?`<span>×</span>${showFactor(d.m)}`:''} ${d.v?`<span>×</span>${showFactor(d.v)}`:''} <span>=</span><strong class="v2-end">${format(d.result)} ${dens(c.b)}</strong>`}
function makeExamples(){let root=$('v2Examples'),area=$('v2ExampleContent');let active=0,crossed=false;examples.forEach((c,i)=>{let b=document.createElement('button');b.type='button';b.textContent=`${i+1}. ${c.n}`;b.onclick=()=>select(i);root.append(b)});
function step3Equation(c,d,ma,vo){
 const tokens=[];
 tokens.push({u:ma,side:'up',kind:'mass'});
 tokens.push({u:vo,side:'down',kind:'volume'});
 if(d.m){tokens.push({u:d.m.nu,side:'up',kind:'mass'});tokens.push({u:d.m.du,side:'down',kind:'mass'});}
 if(d.v){tokens.push({u:d.v.nu,side:'up',kind:'volume'});tokens.push({u:d.v.du,side:'down',kind:'volume'});}
 const ups=new Set(tokens.filter(t=>t.side==='up').map(t=>t.u));
 const downs=new Set(tokens.filter(t=>t.side==='down').map(t=>t.u));
 const cancellable=new Set([...ups].filter(u=>downs.has(u)));
 const unitHTML=(unit,kind)=>{
  const base=kind==='mass'?'v2-mass':'v2-volume';
  const extra=crossed&&cancellable.has(unit)?' v2-cut':'';
  return `<span class="${base}${extra}">${label(unit)}</span>`;
 };
 return `${format(c.v)} ${fracHTML(unitHTML(ma,'mass'),unitHTML(vo,'volume'))}${d.m?` × ${fracHTML(`<span>${format(d.m.n)} ${unitHTML(d.m.nu,'mass')}</span>`,`<span>${format(d.m.d)} ${unitHTML(d.m.du,'mass')}</span>`)}`:''}${d.v?` × ${fracHTML(`<span>${format(d.v.n)} ${unitHTML(d.v.nu,'volume')}</span>`,`<span>${format(d.v.d)} ${unitHTML(d.v.du,'volume')}</span>`)}`:''}`;
}
function render(){Array.from(root.children).forEach((b,j)=>b.classList.toggle('active',active===j));let c=examples[active],d=data(c),ma=pair(c.a)[0],vo=pair(c.a)[1],mb=pair(c.b)[0],vb=pair(c.b)[1];
 area.innerHTML=`<div class="v2-flow"><div class="v2-box"><div class="v2-mini">TENGO</div><div class="v2-large">${showDensity(c)}</div></div><div class="v2-arrow">→</div><div class="v2-box"><div class="v2-mini">QUIERO</div><div class="v2-large">${showTarget(c)}</div></div></div>
 <div class="v2-legend"><span><i class="v2-dot" style="background:#8ee4fa"></i> AZUL · todas las masas (mg, g, kg)</span><span><i class="v2-dot" style="background:#ff9bab"></i> ROSA · todos los volúmenes (mL, L, cm³, dm³, m³)</span></div>
 <div class="v2-step-label">Paso 1 · Masa (${ml[ma]} → ${ml[mb]})</div>
 <p class="v2-note">${d.m?`Quiero quitar <b>${ml[ma]}</b>, que está arriba; por eso coloco <b>${ml[ma]} abajo</b> en el factor. Mi nueva unidad <b>${ml[mb]} queda arriba</b>.`:'La masa ya está en la unidad deseada. No hace falta añadir un factor de masa.'}</p>
 <div class="v2-equation">${d.m?showFactor(d.m):'<span class="v2-end">✓ Misma unidad de masa</span>'}</div>
 <div class="v2-step-label">Paso 2 · Volumen (${vl[vo]} → ${vl[vb]})</div>
 <p class="v2-note">${d.v?`Quiero quitar <b>${vl[vo]}</b>, que está abajo; por eso coloco <b>${vl[vo]} arriba</b> en el factor. Mi nueva unidad <b>${vl[vb]} queda abajo</b>.`:'El volumen ya está en la unidad deseada. No necesito un factor de volumen.'}</p>
 <div class="v2-equation">${d.v?showFactor(d.v):'<span class="v2-end">✓ Mismo volumen</span>'}</div>
 <div class="v2-step-label">Paso 3 · Visualizamos la cancelación</div>
 <div class="v2-example-actions"><button type="button" id="v2ToggleCross">${crossed?'Quitar tachado':'Tachar unidades'}</button><span class="v2-note">Las unidades iguales que se encuentran en el numerador y el denominador se anulan; por tanto, las tachamos. ¡Dale al botón de tachar!</span></div>
 <div class="v2-equation">${step3Equation(c,d,ma,vo)}</div>
 <p class="v2-criteria">${crossed?'Después de tachar, únicamente quedan las unidades que queremos obtener. ':''}Resultado: <strong class="v2-end">${format(d.result)} ${dens(c.b)}</strong>. ${d.v?`Recuerda elevar el factor al cubo cuando conviertas unidades como cm³ y m³.`:''}</p>`;
 let btn=$('v2ToggleCross');if(btn)btn.onclick=()=>{crossed=!crossed;render()};
}
function select(i){active=i;crossed=false;render()}
select(0)}
// V3: edit numerical values inside two color-linked conversion fractions.
let current=0,pairsDone=new Set(),tokenSelected=null;
function inputNumber(value){let n=Number(String(value).trim().replace(/\s/g,'').replace(/,/g,'.'));return Number.isFinite(n)&&n>0?n:null}
function factorInput(kind,side,unit,color){let id=`v3_${kind}_${side}`;return `<div class="v3-half v3-${color}-slot"><label class="v3-when" for="${id}" style="display:none">${side==='n'?'Numerador':'Denominador'} de ${kind==='mass'?'masa':'volumen'}</label><input id="${id}" type="text" inputmode="decimal" autocomplete="off" placeholder="¿número?" aria-label="Número del ${side==='n'?'numerador':'denominador'} del factor de ${kind==='mass'?'masa':'volumen'}; unidad ${label(unit)}"><span class="v3-unit">${label(unit)}</span></div>`}
function factorEditorHTML(f,kind){if(!f)return '';
let topcolor=kind==='mass'?'blue':'red',bottomcolor=kind==='mass'?'blue':'red';
return `<span class="v3-cross">×</span><div class="v3-factor"><div class="v3-factor-name">FACTOR DE ${kind==='mass'?'MASA':'VOLUMEN'}</div>${factorInput(kind,'n',f.nu,topcolor)}<div class="v3-frac-bar"></div>${factorInput(kind,'d',f.du,bottomcolor)}</div>`}
function renderFactorEditor(c){let d=data(c),a=pair(c.a);$('v3FactorEditor').innerHTML=`<div class="v3-equation-start"><span>${format(c.v)}</span><span class="v3-start-frac"><span class="v3-unit v3-start-blue">${label(a[0])}</span><span class="v3-frac-bar"></span><span class="v3-unit v3-start-red">${label(a[1])}</span></span></div>${d.m?factorEditorHTML(d.m,'mass'):'<span class="v3-when">Masa sin cambios ✓</span>'}${d.v?factorEditorHTML(d.v,'volume'):'<span class="v3-when">Volumen sin cambios ✓</span>'}`;
const eq=[];if(d.m)eq.push(`<div class="v3-eqrow"><strong>Masa:</strong> ${format(d.m.n)} ${label(d.m.nu)} = ${format(d.m.d)} ${label(d.m.du)}</div>`);if(d.v)eq.push(`<div class="v3-eqrow"><strong>Volumen:</strong> ${format(d.v.n)} ${label(d.v.nu)} = ${format(d.v.d)} ${label(d.v.du)}</div>`);$('v3Equivalence').innerHTML=eq.length?`<details><summary>¿No recuerdas la equivalencia? Ver una pista numérica</summary>${eq.join('')}<small>Estas igualdades sirven para calcular el numerador y el denominador de los factores. Recuerda: la unidad original se coloca al lado opuesto.</small></details>`:'<p>Las unidades ya coinciden: no necesitas factores adicionales.</p>';}
function loadCase(i){current=i;let c=cases[i];$('v2Case').value=String(i);pairsDone.clear();tokenSelected=null;
 $('v2Prompt').innerHTML=`<div class="v2-box"><div class="v2-mini">DENSIDAD INICIAL</div><div class="v2-large">${showDensity(c)}</div></div><div class="v2-arrow">→</div><div class="v2-box"><div class="v2-mini">DENSIDAD FINAL</div><div class="v2-large">${showTarget(c)}</div></div>`;
 for(const name of ['v2Feedback','v2CancelFeedback','v2FinalFeedback'])$(name).className='feedback hide';$('v2CancelStage').classList.add('hide');$('v2FinalStage').classList.add('hide');$('v2FinalAnswer').value='';$('v2Progress').textContent='Paso 1 de 3 · Completar las fracciones';renderFactorEditor(c);}
function validFactor(f,kind){if(!f)return true;let n=inputNumber($(`v3_${kind}_n`).value),d=inputNumber($(`v3_${kind}_d`).value);if(n===null||d===null)return false;
// Equivalent fractions are accepted; the student need not choose a specific numerical scale.
return Math.abs(n/d-f.n/f.d)<=Math.max(1e-9,Math.abs(f.n/f.d)*1e-6)}
function checkCards(){let c=cases[current],d=data(c),ok=validFactor(d.m,'mass')&&validFactor(d.v,'volume'),fb=$('v2Feedback');fb.className='feedback '+(ok?'good':'bad');fb.innerHTML=ok?'<b>¡Muy bien!</b> Los números mantienen la equivalencia. El azul identifica todas las masas y el rosa todos los volúmenes. Las unidades iguales se cancelan al quedar en lados opuestos de las fracciones. Ahora selecciona las parejas.':'<b>Revisa los números.</b> Cada numerador debe representar la misma cantidad que su denominador con las unidades indicadas. Usa la pista de equivalencias si la necesitas; se aceptan fracciones numéricas equivalentes.';if(ok){buildCancel();$('v2CancelStage').classList.remove('hide');$('v2Progress').textContent='Paso 2 de 3 · Cancelar unidades'}else{$('v2CancelStage').classList.add('hide');$('v2FinalStage').classList.add('hide')}}
function buildCancel(){let c=cases[current],d=data(c),a=pair(c.a),b=pair(c.b),tokens=[{k:'startmass',u:a[0],side:'up',kind:'mass'},{k:'startvolume',u:a[1],side:'down',kind:'volume'}];
 if(d.m)tokens.push({k:'massnum',u:b[0],side:'up',kind:'mass'},{k:'massden',u:a[0],side:'down',kind:'mass'});
 if(d.v)tokens.push({k:'volnum',u:a[1],side:'up',kind:'volume'},{k:'volden',u:b[1],side:'down',kind:'volume'});
 const row=$('v2CancelRow');row.replaceChildren();
 const p=document.createElement('p');p.className='v2-mini';p.textContent='Busca unidades idénticas: una en el numerador y otra en el denominador. Pulsa primero una y después su pareja.';row.append(p);
 const eq=document.createElement('div');eq.className='v2-equation';
 tokens.forEach(t=>{let b=document.createElement('button');b.type='button';b.className=`v2-token ${t.kind==='mass'?'v2-mass':'v2-volume'}`;b.dataset.key=t.k;b.textContent=`${label(t.u)} ${t.side==='up'?'↑':'↓'}`;b.title=`${label(t.u)} en el ${t.side==='up'?'numerador':'denominador'}`;b.onclick=()=>selectToken(t,tokens);eq.append(b)});row.append(eq);
 const note=document.createElement('div');note.className='v2-note';note.id='v2PairHint';note.textContent='Las flechas ↑ y ↓ indican las posiciones de las unidades dentro de las fracciones.';row.append(note);
 pairsDone.clear();tokenSelected=null;}
function selectToken(t,all){if(pairsDone.has(t.k))return;if(!tokenSelected){tokenSelected=t;updateTokenStyles();return}
 if(t.k===tokenSelected.k){tokenSelected=null;updateTokenStyles();return}
 let ok=t.u===tokenSelected.u&&t.side!==tokenSelected.side;let hint=$('v2PairHint');if(ok){pairsDone.add(t.k);pairsDone.add(tokenSelected.k);hint.textContent=`¡Bien! ${label(t.u)} se cancela porque aparece arriba y abajo.`;hint.className='v2-note v2-success'}else{hint.textContent='Esas dos unidades no se pueden cancelar. Busca el mismo símbolo, una vez arriba y otra abajo.';hint.className='v2-note v2-warning'}tokenSelected=null;updateTokenStyles();}
function updateTokenStyles(){document.querySelectorAll('#v2CancelRow .v2-token').forEach(b=>{b.classList.toggle('done',pairsDone.has(b.dataset.key));b.classList.toggle('selected',tokenSelected?.k===b.dataset.key)})}
$('v2CheckFactors').onclick=checkCards;
$('v2CheckCancel').onclick=()=>{let c=cases[current],d=data(c),expected=(d.m?2:0)+(d.v?2:0),ok=pairsDone.size===expected,f=$('v2CancelFeedback');f.className='feedback '+(ok?'good':'bad');f.textContent=ok?'¡Excelente! Has cancelado las unidades iniciales y solo quedan las nuevas.':'Todavía falta alguna pareja. Recuerda que solo se cancela un mismo símbolo que aparezca arriba y abajo.';if(ok){$('v2FinalStage').classList.remove('hide');$('v2Progress').textContent='Paso 3 de 3 · Calcular';$('v2FinalEquation').innerHTML=resultEquation(c).replace(/<strong class="v2-end">[\s\S]*?<\/strong>/,'<strong class="v2-end">?</strong>');}};
function parseSpanish(raw){raw=raw.trim().replace(/\s/g,'');return Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw)}
$('v2FinalCheck').onclick=()=>{let c=cases[current],d=data(c),n=parseSpanish($('v2FinalAnswer').value),ok=$('v2FinalAnswer').value.trim()!==''&&Number.isFinite(n)&&Math.abs(n-d.result)<=Math.max(Math.abs(d.result)*.001,1e-9);let f=$('v2FinalFeedback');f.className='feedback '+(ok?'good':'bad');f.innerHTML=ok?`<b>¡Reto completado!</b> ${format(c.v)} ${dens(c.a)} = <b>${format(d.result)} ${dens(c.b)}</b>.`:`<b>Comprueba la multiplicación.</b> Usa los números de los factores; no sumes las unidades. Si necesitas ayuda, pulsa «Ver solución paso a paso».`};
$('v2Solution').onclick=()=>{let c=cases[current],f=$('v2FinalFeedback');f.className='feedback good';f.innerHTML='<b>Solución desarrollada</b><div class="v2-equation">'+resultEquation(c)+'</div><p class="v2-mini">Multiplica los valores de los numeradores y divide entre los de los denominadores. Las unidades iniciales desaparecen por cancelación.</p>'};
$('v2Reset').onclick=()=>loadCase(current);
$('v2NewCase').onclick=()=>loadCase((current+1)%cases.length);
$('v2Case').addEventListener('change',e=>loadCase(Number(e.target.value)));
for(let i=0;i<cases.length;i++){let o=document.createElement('option');o.value=i;o.textContent=`${i+1}. ${cases[i].n} · ${format(cases[i].v)} ${dens(cases[i].a)} → ${dens(cases[i].b)}`;$('v2Case').append(o)}
makeExamples();loadCase(0);
})();
