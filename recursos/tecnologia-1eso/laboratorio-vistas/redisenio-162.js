/* Mi Aula Digital V1.4.62: layout and fixed-grid drawing, without altering validated projections. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const layout=document.querySelector('.layout'), left=layout?.querySelector('section:first-child'),right=layout?.querySelector('section:nth-child(2)');
if(!layout||!left||!right)return;
const full=document.createElement('button');full.id='fullscreenViews';full.type='button';full.textContent='⛶ Pantalla completa';
const help=$('openViewsHelp');help.parentElement.insertBefore(full,help);
full.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else if(layout.requestFullscreen)layout.requestFullscreen()};
document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'⛶ Salir de pantalla completa':'⛶ Pantalla completa';requestAnimationFrame(()=>{isoDraw();refreshOverlays()})});
const sidebar=document.createElement('aside');sidebar.id='identifySide';sidebar.innerHTML='<strong>Identifica las caras</strong><small>Elige una vista y pulsa sobre la figura.</small><div class="side-config" id="identifyConfig"></div>';
layout.insertBefore(sidebar,left);
sidebar.insertBefore($('identifyTools'),sidebar.querySelector('.side-config'));
const config=$('identifyConfig');const tool=$('.toolbar');
const identifySolutionBtn=document.createElement('button');identifySolutionBtn.id='identifySolution160';identifySolutionBtn.type='button';identifySolutionBtn.textContent='◈ Ver solución';sidebar.insertBefore(identifySolutionBtn,sidebar.querySelector('.side-config'));let identifySol=false;
identifySolutionBtn.onclick=()=>{identifySol=!identifySol;window.MADViews160?.identifySolution(identifySol);identifySolutionBtn.textContent=identifySol?'✎ Volver a mi intento':'◈ Ver solución'};
const isoSolutionBtn=document.createElement('button');isoSolutionBtn.type='button';isoSolutionBtn.id='isoSolution160';isoSolutionBtn.textContent='◈ Ver solución';let isoSol=false;

for(const id of ['size','zoom']){const node=$(id);if(node){let label=node.closest('label');config.append(label)}}
const check=$('checkViewExercise');sidebar.insertBefore(check,config);
// Make standard drawing tools part of the drawing panel rather than a detached top strip.
const drawingTools=$('viewDrawingTools');right.insertBefore(drawingTools,right.querySelector('.views')||right.firstChild);
// Fixed grid canvas, independent from the rotatable construction renderer.
const isoWrap=$('iso').parentElement;
const fixed=document.createElement('canvas');fixed.id='fixedIsoSurface';fixed.setAttribute('aria-label','Cuadrícula isométrica interactiva, haz clic para conectar vértices');isoWrap.append(fixed);
const controls=document.createElement('div');controls.id='fixedIsoControls';controls.innerHTML='<button type="button" id="fixedIsoLine" class="selected">━ Continua</button><button type="button" id="fixedIsoDash">┄ Discontinua</button><button type="button" id="fixedIsoErase">⌫ Borrar tramo</button><button type="button" id="fixedIsoUndo">↶ Deshacer</button><button type="button" id="fixedIsoClear">⌫ Limpiar dibujo</button><span id="fixedIsoHint">Pulsa un vértice y mueve el lápiz para ver la línea provisional.</span>';
left.insertBefore(controls,isoWrap);
controls.insertBefore(isoSolutionBtn,controls.querySelector('#fixedIsoUndo'));isoSolutionBtn.onclick=()=>{isoSol=!isoSol;isoSolutionBtn.textContent=isoSol?'✎ Ocultar solución':'◈ Ver solución';isoDraw()};
let isoSegments=[],isoStart=null,isoHover=null,isoEraser=false,isoDashed=false;
$('fixedIsoLine').onclick=()=>{isoDashed=false;$('fixedIsoLine').classList.add('selected');$('fixedIsoDash').classList.remove('selected')};
$('fixedIsoDash').onclick=()=>{isoDashed=true;$('fixedIsoDash').classList.add('selected');$('fixedIsoLine').classList.remove('selected')};
const coordinate=()=>{const n=Number($('size').value)||4,w=fixed.clientWidth,h=fixed.clientHeight,pad=44,unit=Math.max(5,Math.min((w-2*pad)/(n*1.732),(h-2*pad)/(n*2)));return{n,w,h,unit,ox:w/2,oy:h/2}};
function lattice(x,y,z,k){return[k.ox+(y-x)*k.unit*.866,k.oy+(x+y)*k.unit*.5-z*k.unit]}
function nearest(x,y){const k=coordinate();let best=null,dist=1e6;for(let a=0;a<=k.n;a++)for(let b=0;b<=k.n;b++)for(let z=0;z<=k.n;z++){if(a!==k.n&&b!==k.n&&z!==k.n)continue;let [u,v]=lattice(a,b,z,k),d=Math.hypot(u-x,v-y);if(d<dist){dist=d;best={x:a,y:b,z}}}return dist<Math.max(18,k.unit*.5)?best:null}
function isoDraw(){
 if(document.body.dataset.training!=='isometric')return;
 const k=coordinate(),{w,h,n,unit}=k;if(w<10||h<10)return;
 const dpr=Math.min(2,window.devicePixelRatio||1);fixed.width=Math.round(w*dpr);fixed.height=Math.round(h*dpr);
 const g=fixed.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#f9fbff';g.fillRect(0,0,w,h);
 const P=(a,b,c)=>lattice(a,b,c,k);
 // Exact lattice grid: all boundary points coincide with the integer snapping nodes.
 const vertices=[[0,0,n],[n,0,n],[n,0,0],[n,n,0],[0,n,0],[0,n,n]].map(p=>P(...p));
 const edge=(a,b)=>{const A=P(...a),B=P(...b);g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke()};
 g.strokeStyle='#9db5d0';g.lineWidth=1.15;g.setLineDash([4,4]);
 for(let i=0;i<=n;i++){
  edge([0,i,n],[n,i,n]);edge([i,0,n],[i,n,n]); // roof z=n
  edge([0,n,i],[n,n,i]);edge([i,n,0],[i,n,n]); // left visible y=n
  edge([n,0,i],[n,n,i]);edge([n,i,0],[n,i,n]); // side x=n
 }
 g.setLineDash([]);g.beginPath();vertices.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.strokeStyle='#607f9f';g.lineWidth=1.75;g.stroke();
 if(isoSol){
  // An edge belongs to the solution only when it borders a visible external
  // surface. Shared coplanar voxel seams are removed so they never create
  // spurious 3D contours. The same voxel model supplies the three views.
  const active=new Set(window.MADViews160?.getIsoReference()||[]),edges=new Map();
  const edgeKey=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
  const addFace=(pts,normal)=>{for(let i=0;i<4;i++){const a=pts[i],b=pts[(i+1)%4],key=edgeKey(a,b);if(!edges.has(key))edges.set(key,{a,b,normals:[]});edges.get(key).normals.push(normal)}};
  for(const code of active){const [x,y,z]=code.split(',').map(Number);
   if(!active.has(`${x},${y},${z+1}`))addFace([[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]],'top');
   if(!active.has(`${x},${y+1},${z}`))addFace([[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]],'front');
   if(!active.has(`${x+1},${y},${z}`))addFace([[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]],'side');
  }
  g.save();g.strokeStyle='#1778c6';g.lineWidth=3;g.lineCap='round';g.lineJoin='round';g.setLineDash([]);
  for(const e of edges.values()){
   if(e.normals.length>1&&new Set(e.normals).size===1)continue;
   const A=P(...e.a),B=P(...e.b);g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();
  }
  g.restore();
 }
 g.lineJoin='round';g.lineCap='round';g.lineWidth=2.7;g.strokeStyle='#90344d';
 for(const [a,b,dash] of isoSegments){g.setLineDash(dash?[6,5]:[]);let A=P(a.x,a.y,a.z),B=P(b.x,b.y,b.z);g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke()}g.setLineDash([]);
 if(isoStart){const A=P(isoStart.x,isoStart.y,isoStart.z);if(isoHover){const B=P(isoHover.x,isoHover.y,isoHover.z);g.setLineDash([5,4]);g.strokeStyle='#d88520';g.lineWidth=2.5;g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();g.setLineDash([])}g.fillStyle='#df8a12';g.beginPath();g.arc(...A,5,0,Math.PI*2);g.fill()}
 g.save();g.fillStyle='#24547e';g.font='bold 12px system-ui';for(let axis=0;axis<3;axis++){const at=t=>axis===0?P(t,0,0):axis===1?P(0,t,0):P(0,0,t);for(let t=0;t<n;t++){const A=at(t),B=at(t+1);g.beginPath();g.arc((A[0]+B[0])/2,(A[1]+B[1])/2,2.5,0,Math.PI*2);g.fill()}const end=at(n);g.fillText(['X','Y','Z'][axis]+': '+n+' cuadros',Math.max(8,Math.min(w-115,end[0]+8)),Math.max(39,Math.min(h-28,end[1]-8)))}g.restore();g.fillStyle='#536980';g.font='700 13px system-ui';g.fillText('ISOMÉTRICA · DIBUJA AQUÍ',16,25);
 g.fillStyle='#aa3948';g.fillText('← ALZADO',Math.max(12,w-125),h-17);
}
function distanceToSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],m=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/m));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t)}
// Each axis-aligned grid edge is a separate editable segment, even after a long drag.
function isoParts(a,b){let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;const gcd=(u,v)=>v?gcd(v,u%v):u;const steps=gcd(gcd(Math.abs(dx),Math.abs(dy)),Math.abs(dz));if(!steps)return [];return Array.from({length:steps},(_,i)=>[{x:a.x+dx*i/steps,y:a.y+dy*i/steps,z:a.z+dz*i/steps},{x:a.x+dx*(i+1)/steps,y:a.y+dy*(i+1)/steps,z:a.z+dz*(i+1)/steps}])}
function eraseIsoAt(x,y){const k=coordinate();let idx=-1,min=Infinity;isoSegments.forEach(([a,b],i)=>{const d=distanceToSegment([x,y],lattice(a.x,a.y,a.z,k),lattice(b.x,b.y,b.z,k));if(d<min){min=d;idx=i}});if(idx>=0&&min<Math.max(11,k.unit*.22))isoSegments.splice(idx,1)}
$('fixedIsoErase').onclick=()=>{isoEraser=!isoEraser;isoStart=null;$('fixedIsoErase').classList.toggle('selected',isoEraser);$('fixedIsoHint').textContent=isoEraser?'Borrador: pulsa sobre un tramo de cuadrícula para eliminar solo esa arista.':'Pulsa un vértice para empezar y otro para terminar. Botón derecho: soltar lápiz.';isoDraw()};
fixed.addEventListener('pointermove',e=>{const r=fixed.getBoundingClientRect();isoHover=nearest(e.clientX-r.left,e.clientY-r.top);isoDraw()});
fixed.addEventListener('pointerleave',()=>{isoHover=null;isoDraw()});
fixed.addEventListener('pointerdown',e=>{e.preventDefault();if(e.button===2){isoStart=null;isoDraw();return}const r=fixed.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(isoEraser){eraseIsoAt(x,y);isoDraw();return}const pt=nearest(x,y);if(!pt)return;if(isoStart&&(pt.x!==isoStart.x||pt.y!==isoStart.y||pt.z!==isoStart.z)){isoSegments.push(...isoParts(isoStart,pt).map(([a,b])=>[a,b,isoDashed]));isoStart=pt}else isoStart=pt;isoDraw()});
fixed.addEventListener('contextmenu',e=>{e.preventDefault();isoStart=null;isoDraw()});
$('fixedIsoUndo').onclick=()=>{isoSegments.pop();isoStart=null;isoDraw()};$('fixedIsoClear').onclick=()=>{isoSegments=[];isoStart=null;isoDraw()};
// View construction: direct blocks use the previously validated view click engine.
// Pen is drawn on top of the orthographic grids with snap and continuous preview.
const bar=document.createElement('div');bar.id='buildViewTools';bar.innerHTML='<strong>Construir desde las vistas:</strong><button id="bvBlocks" class="selected" type="button">▣ Bloques</button><button id="bvPencil" type="button">✎ Lápiz</button><button id="bvDashed" type="button">┄ Oculta</button><button id="bvErase" type="button">⌫ Borrar tramo</button><button id="bvUndo" type="button">↶ Deshacer línea</button><button id="bvClear" type="button">⌫ Borrar líneas</button><small>Bloques: pulsa una vista. Lápiz: elige punto inicial y final.</small>';
right.insertBefore(bar,right.querySelector('.views')||right.firstChild);
let pencil=false,dashed=false,erasePencil=false;let reconstructed=false;const status=document.createElement('small');status.id='buildReconstructStatus';status.setAttribute('role','status');status.textContent='Dibuja y cierra los contornos de las tres vistas para generar un sólido.';bar.append(status);let pencil3d=[];let lines={front:[],side:[],top:[]};let start={front:null,side:null,top:null};let hover={front:null,side:null,top:null};let history=[];
// Solid reconstruction from three closed orthographic silhouettes (voxel visual hull).
// Internal drafting lines do not change the occupied area: we flood-fill from outside.
function silhouette(type,n){
 const seg=lines[type].filter(x=>!x.dashed),wall=new Set();
 const ek=(x,y,xx,yy)=>[[x,y],[xx,yy]].map(v=>v.join(',')).sort().join('|');
 for(const t of seg){if(Math.abs(t.a.x-t.b.x)+Math.abs(t.a.y-t.b.y)!==1)continue;wall.add(ek(t.a.x,t.a.y,t.b.x,t.b.y))}
 if(!wall.size)return null;
 // Cells with indices -1..n represent inside and outside border.
 const visited=new Set(),q=[[-1,-1]],id=(x,y)=>x+','+y;visited.add(id(-1,-1));
 for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
 const nx=x+dx,ny=y+dy;if(nx< -1||ny< -1||nx>n||ny>n||visited.has(id(nx,ny)))continue;
 // Grid wall between adjacent cell centers.
 let edge;
 if(dx===1)edge=ek(x+1,y,x+1,y+1);
 else if(dx===-1)edge=ek(x,y,x,y+1);
 else if(dy===1)edge=ek(x,y+1,x+1,y+1);
 else edge=ek(x,y,x+1,y);
 if(wall.has(edge))continue;visited.add(id(nx,ny));q.push([nx,ny]);
 }}
 const cells=new Set();for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!visited.has(id(x,y)))cells.add(id(x,y));
 return cells.size?cells:null;
}
function rebuildSolid(){const n=window.MADViews161?.getSize()||Number($('size').value)||4;
 const F=silhouette('front',n),S=silhouette('side',n),T=silhouette('top',n);
 if(!F||!S||!T){reconstructed=false;status.textContent='Completa los contornos cerrados en alzado, perfil y planta para generar el volumen 3D.';return;}
 const result=[];
 for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++){
 // Mirrors follow the original validated European projection mapping.
 if(F.has(`${n-1-x},${n-1-z}`)&&S.has(`${y},${n-1-z}`)&&T.has(`${n-1-x},${y}`))result.push(`${x},${y},${z}`);
 }
 if(result.length&&window.MADViews161?.rebuildFromViews(result)){
 reconstructed=true;status.textContent=`Sólido 3D generado: ${result.length} bloques, caras cerradas y coloreadas. Gira el visor para revisarlo. La reconstrucción es una interpretación de las tres siluetas.`;
 }else{status.textContent='Los contornos no comparten un volumen coherente. Revisa alzado, perfil y planta.';}
}
function setPencil(v){pencil=v;document.body.classList.toggle('build-pencil',v);$('bvPencil').classList.toggle('selected',v);$('bvBlocks').classList.toggle('selected',!v);if(!v){for(const id of Object.keys(start))start[id]=null}refreshOverlays()}
$('bvBlocks').onclick=()=>{erasePencil=false;$('bvErase').classList.remove('selected');setPencil(false)};$('bvPencil').onclick=()=>{erasePencil=false;$('bvErase').classList.remove('selected');setPencil(true)};$('bvErase').onclick=()=>{erasePencil=true;setPencil(true);$('bvErase').classList.add('selected');for(const key of Object.keys(start))start[key]=null};$('bvDashed').onclick=()=>{dashed=!dashed;$('bvDashed').classList.toggle('selected',dashed)};
$('bvUndo').onclick=()=>{const h=history.pop();if(h){const v=lines[h].pop();if(v?.stroke&&window.MADViews158)window.MADViews158.removeStroke(v.stroke.a,v.stroke.b);refreshOverlays();rebuildSolid()}};
$('bvClear').onclick=()=>{for(const arr of Object.values(lines))for(const v of arr)if(v.stroke&&window.MADViews158)window.MADViews158.removeStroke(v.stroke.a,v.stroke.b);pencil3d=[];lines={front:[],side:[],top:[]};history=[];for(const id of Object.keys(start))start[id]=null;status.textContent='Dibuja y cierra los contornos de las tres vistas.';refreshOverlays()};
const ov={};for(const type of ['front','side','top']){const underlying=$(type),wrap=underlying.parentElement,cv=document.createElement('canvas');cv.className='view-pencil-overlay';cv.setAttribute('aria-label','Lápiz de la vista '+type);wrap.append(cv);ov[type]=cv;
function pt(e){const rect=cv.getBoundingClientRect(),n=Number($('size').value)||4;const geo=window.MADViews158?.getViewRect(type);const dim=Math.min(rect.width,rect.height)*.82;const cell=geo?.cell||dim/n,offX=geo?.ox??(rect.width-dim)/2,offY=geo?.oy??(rect.height-dim)/2;let x=Math.round((e.clientX-rect.left-offX)/cell),y=Math.round((e.clientY-rect.top-offY)/cell);return x>=0&&x<=n&&y>=0&&y<=n?{x,y}:null}
cv.addEventListener('pointermove',e=>{if(!pencil)return;hover[type]=pt(e);refreshOverlays()});cv.addEventListener('pointerleave',()=>{hover[type]=null;refreshOverlays()});cv.addEventListener('pointerdown',e=>{if(!pencil)return;e.preventDefault();const q=pt(e);if(!q)return;const a=start[type];if(erasePencil){let index=-1,dist=Infinity;for(let i=0;i<lines[type].length;i++){const s=lines[type][i],dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((q.x-s.a.x)*dx+(q.y-s.a.y)*dy)/l)),d=Math.hypot(q.x-s.a.x-t*dx,q.y-s.a.y-t*dy);if(d<dist){dist=d;index=i}}if(index>=0&&dist<.75){const cut=lines[type].splice(index,1)[0];if(cut.stroke&&window.MADViews158)window.MADViews158.removeStroke(cut.stroke.a,cut.stroke.b)}start[type]=null;rebuildSolid()}else if(a&&(a.x!==q.x||a.y!==q.y)){let dx=q.x-a.x,dy=q.y-a.y;const gcd=(u,v)=>v?gcd(v,u%v):u,n=gcd(Math.abs(dx),Math.abs(dy));for(let i=0;i<n;i++){let from={x:a.x+dx*i/n,y:a.y+dy*i/n},to={x:a.x+dx*(i+1)/n,y:a.y+dy*(i+1)/n};let stroke=window.MADViews158?.addStroke(type,from,to);lines[type].push({a:from,b:to,dashed,stroke});history.push(type);pencil3d.push(stroke)}start[type]=q;rebuildSolid()}else start[type]=q;refreshOverlays()});cv.addEventListener('contextmenu',e=>{e.preventDefault();start[type]=null;refreshOverlays()});}
function refreshOverlays(){if(document.body.dataset.training!=='build')return;for(const type of Object.keys(ov)){const cv=ov[type],r=cv.getBoundingClientRect(),w=r.width,h=r.height;if(!w||!h)continue;const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=w*dpr;cv.height=h*dpr;let g=cv.getContext('2d');g.scale(dpr,dpr);let n=Number($('size').value)||4,geo=window.MADViews158?.getViewRect(type),dim=Math.min(w,h)*.82,cell=geo?.cell||dim/n,ox=geo?.ox??(w-dim)/2,oy=geo?.oy??(h-dim)/2;function place(p){return[ox+p.x*cell,oy+p.y*cell]}for(const s of lines[type]){g.strokeStyle='#ae2446';g.lineWidth=2.8;g.setLineDash(s.dashed?[6,5]:[]);g.beginPath();g.moveTo(...place(s.a));g.lineTo(...place(s.b));g.stroke()}if(pencil&&start[type]){const A=place(start[type]),B=hover[type]?place(hover[type]):A;g.strokeStyle='#f1972c';g.lineWidth=2.5;g.setLineDash([6,4]);g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();g.setLineDash([]);g.fillStyle='#ea8917';g.beginPath();g.arc(...A,5,0,Math.PI*2);g.fill()}}}
// Clear pen state when a new exercise is generated; all mode controls remain in the original engine.
const size=$('size');size.addEventListener('change',()=>{isoSegments=[];isoStart=null;for(const k of Object.keys(lines)){lines[k]=[];start[k]=null}status.textContent='Dibuja los tres contornos completos para crear el sólido.';requestAnimationFrame(()=>{isoDraw();refreshOverlays()})});
for(const b of document.querySelectorAll('[data-work]'))b.addEventListener('click',()=>{if(b.dataset.work==='isometric'){isoSegments=[];isoStart=null;isoSol=false;isoSolutionBtn.textContent='◈ Ver solución'}if(b.dataset.work==='identify'){identifySol=false;identifySolutionBtn.textContent='◈ Ver solución'}if(b.dataset.work!=='build')setPencil(false);requestAnimationFrame(()=>{if(b.dataset.work==='isometric')$('viewHeading').innerHTML='<span class="heading-icon">▦</span> Vistas diédricas de referencia';if(b.dataset.work==='build')$('viewHeading').innerHTML='<span class="heading-icon">▦</span> Construye sobre las vistas';if(b.dataset.work==='views')$('viewHeading').innerHTML='<span class="heading-icon">▦</span> Dibuja alzado, planta y perfil';isoDraw();refreshOverlays()})});
$('newViewExercise').addEventListener('click',()=>{if(document.body.dataset.training==='isometric'){isoSegments=[];isoStart=null;isoSol=false;isoSolutionBtn.textContent='◈ Ver solución';requestAnimationFrame(isoDraw)}else if(document.body.dataset.training==='identify'){identifySol=false;identifySolutionBtn.textContent='◈ Ver solución'}});
let pending=false;const observe=new ResizeObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;isoDraw();refreshOverlays()})});observe.observe(isoWrap);for(const c of Object.values(ov))observe.observe(c.parentElement);
window.addEventListener('resize',()=>{isoDraw();refreshOverlays()});
requestAnimationFrame(()=>{isoDraw();refreshOverlays()});
window.addEventListener('load',()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>{window.MADViews160?.refresh();isoDraw();refreshOverlays()}));if(document.fonts?.ready)document.fonts.ready.then(()=>{window.MADViews160?.refresh();isoDraw();refreshOverlays()})});
})();
