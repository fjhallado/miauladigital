(() => {
 'use strict';
 const saved=window.MADSavedViews;
 const $=id=>document.getElementById(id);
 const views=['front','side','top'];
 const names=saved.names;
 const modes={horizontal:'Horizontal',vertical:'Vertical',aligned:'Alineada'};
 const axes={front:{horizontal:'anchura',vertical:'altura'},side:{horizontal:'profundidad',vertical:'altura'},top:{horizontal:'anchura',vertical:'profundidad'}};
 const defaultStatus='Selecciona el primer vértice, o pulsa una línea de cota para elegirla.';
 const format=new Intl.NumberFormat('es-ES',{maximumFractionDigits:2,useGrouping:false});
 const canvases=Object.fromEntries(views.map(view=>[view,document.querySelector('[data-dimension-view="'+view+'"]')]));
 const figureSelect=$('dim-figure'), mode=$('dim-mode'), scale=$('dim-scale'), list=$('dim-list'), value=$('dim-value');
 const work=$('dim-work'), status=$('dim-status'), results=$('dim-results');
 const geometry={}, boards={}, keyboard={};
 let exercise=null, marks=[], millimetres=10, selected=-1, draft=null, preview=null, frame=0;
 const pointKey=p=>p.x+','+p.y;
 const same=(a,b)=>a.x===b.x&&a.y===b.y;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const dot=(a,b)=>a.x*b.x+a.y*b.y;
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const add=(a,b,factor=1)=>({x:a.x+b.x*factor,y:a.y+b.y*factor});
 const sub=(a,b)=>add(a,b,-1);
 const dashed=line=>line.dash||line.style==='dash';
 const inRange=(number,min,max)=>Number.isFinite(number)&&number>=min&&number<=max;
 const exact=(a,b)=>Math.abs(a-b)<.015;
 const round=value=>Math.round(value*100)/100;
 const announce=text=>{status.textContent=text;};

 function readGeometry(lines){
  const solid=lines.filter(line=>!dashed(line)), nodes=new Map();
  function connect(a,b){
   const key=pointKey(a);
   if(!nodes.has(key))nodes.set(key,{point:a,neighbours:new Map()});
   nodes.get(key).neighbours.set(pointKey(b),b);
  }
  for(const {a,b} of solid)if(!same(a,b)){connect(a,b);connect(b,a);}
  const points=[...nodes.values()].filter(({point,neighbours})=>{
   if(neighbours.size!==2)return true;
   const [a,b]=[...neighbours.values()].map(other=>sub(other,point));
   return cross(a,b)!==0||dot(a,b)>=0;
  }).map(node=>node.point).sort((a,b)=>a.y-b.y||a.x-b.x);
  const bounds=points.length?{
   left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),
   top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))
  }:null;
  return {solid,points,bounds};
 }

 function layout(mark){
  const {a,b,direction,offset}=mark;
  const delta=sub(b,a);
  const length=direction==='horizontal'?Math.abs(delta.x):direction==='vertical'?Math.abs(delta.y):distance(a,b);
  if(length===0)return null;
  const unit=direction==='horizontal'?{x:1,y:0}:direction==='vertical'?{x:0,y:1}:{x:delta.x/length,y:delta.y/length};
  const normal={x:-unit.y,y:unit.x};
  const middle=add(a,delta,.5), center=add(middle,normal,offset);
  const ends=[a,b].map(point=>add(center,unit,dot(sub(point,middle),unit)));
  const sign=dot(sub(ends[1],ends[0]),unit)<0?-1:1;
  return {ends,normal,middle,center,length,tangent:{x:unit.x*sign,y:unit.y*sign}};
 }
 const measurement=mark=>round(layout(mark).length*millimetres);
 const label=mark=>format.format(mark.value??measurement(mark));
 const describe=mark=>names[mark.view]+' · '+modes[mark.direction]+' · '+label(mark)+' mm';

 function recordKey(number){return 'mad-acotacion-v1:'+number;}
 function store(){
  try{
   localStorage.setItem(recordKey(exercise.number),JSON.stringify({millimetres,marks}));
   $('dim-saved').textContent='Las cotas se guardan en este navegador.';
  }catch{$('dim-saved').textContent='El navegador no ha podido guardar los últimos cambios.';}
 }
 function load(number){
  let draftRecord;
  try{draftRecord=JSON.parse(localStorage.getItem(recordKey(number)));}catch{}
  millimetres=inRange(draftRecord?.millimetres,.1,10000)?draftRecord.millimetres:10;
  const candidates=Array.isArray(draftRecord?.marks)?draftRecord.marks:[];
  marks=candidates.filter(mark=>Object.hasOwn(geometry,mark?.view)&&Object.hasOwn(modes,mark.direction)&&
   inRange(mark.offset,-40,40)&&[mark.a,mark.b].every(point=>point&&geometry[mark.view].points.some(other=>same(other,point)))&&
   layout(mark)&&(mark.value==null||inRange(mark.value,.01,170000)));
  scale.value=millimetres;
  return candidates.length!==marks.length;
 }
 function refreshFigures(){
  const exercises=saved.completed();
  const previous=exercise?.number??Number(new URLSearchParams(location.search).get('figura'));
  const next=exercises.find(item=>item.number===previous)??exercises[0];
  figureSelect.replaceChildren(...exercises.map(item=>new Option('Figura '+item.number,item.number)));
  work.hidden=!next;
  $('dim-empty').hidden=!!next;
  const unchanged=next&&exercise&&JSON.stringify([next.number,next.grids,next.lines])===JSON.stringify([exercise.number,exercise.grids,exercise.lines]);
  if(next&&!unchanged)selectFigure(next);
  if(!next)exercise=null;
  if(next)figureSelect.value=String(next.number);
 }
 function selectFigure(next){
  exercise=next;
  selected=-1;draft=null;preview=null;
  for(const view of views){
   geometry[view]=readGeometry(next.lines[view]);
   delete keyboard[view];
  }
  const changed=load(next.number);
  $('dim-edit').href='ficha-1.html?modo=proyectar&figura='+next.number;
  const url=new URL(location.href);
  url.searchParams.set('figura',next.number);
  history.replaceState(null,'',url);
  announce(changed?'Las vistas han cambiado. Se recuperaron las cotas cuyos vértices siguen en el dibujo.':defaultStatus);
  refreshControls();
  redraw();
 }
 function refreshControls(){
  $('dim-cancel').disabled=!draft;
  $('dim-undo').disabled=marks.length===0;
  list.replaceChildren(new Option('Selecciona una cota',''),...marks.map((mark,i)=>new Option(describe(mark),i)));
  list.disabled=marks.length===0;
  list.value=selected<0?'':String(selected);
  const mark=marks[selected];
  value.value=mark?(mark.value??measurement(mark)):'';
  for(const id of ['dim-value','dim-apply','dim-delete'])$(id).disabled=!mark;
  results.hidden=true;
 }
 function chooseMark(index){
  selected=index;
  refreshControls();
  if(marks[index])announce('Cota seleccionada. Puedes cambiar su cifra o quitarla en «Cotas de la figura».');
  redraw();
 }
 function changeMarks(text){
  store();
  refreshControls();
  announce(text);
  redraw();
 }
 function cancel(){
  if(!draft)return;
  draft=null;preview=null;
  $('dim-cancel').disabled=true;
  announce(defaultStatus);
  redraw();
 }

 function redraw(){
  if(frame)return;
  frame=requestAnimationFrame(()=>{
   frame=0;
   if(!exercise)return;
   const sizes=views.map(view=>{
    const c=canvases[view];
    return {view,width:c.clientWidth,height:c.clientHeight,grid:exercise.grids[view]};
   });
   if(sizes.some(item=>!item.width||!item.height))return;
   const cell=Math.min(...sizes.map(({width,height,grid})=>Math.min((width-18)/(grid.w+5),(height-18)/(grid.h+5))));
   for(const {view,width,height,grid} of sizes){
    const center={x:(width-grid.w*cell)/2,y:(height-grid.h*cell)/2};
    const project=p=>add(center,p,cell);
    boards[view]={width,height,cell,center,project};
    renderBoard(view,grid);
   }
  });
 }
 function pen(ctx,a,b){
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 function renderBoard(view,grid){
  const canvas=canvases[view], {width,height,project}=boards[view];
  const ratio=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){
   canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  }
  const ctx=canvas.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.clearRect(0,0,width,height);
  ctx.strokeStyle='#dce8f4';ctx.lineWidth=1;
  for(let x=0;x<=grid.w;x++)pen(ctx,project({x,y:0}),project({x,y:grid.h}));
  for(let y=0;y<=grid.h;y++)pen(ctx,project({x:0,y}),project({x:grid.w,y}));
  ctx.lineWidth=2;
  ctx.lineCap='round';
  for(const line of exercise.lines[view]){
   ctx.strokeStyle=dashed(line)?'#657b93':'#193650';
   ctx.setLineDash(dashed(line)?[5,4]:[]);
   pen(ctx,project(line.a),project(line.b));
  }
  ctx.setLineDash([]);
  for(const [i,mark] of marks.entries())if(mark.view===view)paintDimension(ctx,mark,project,i===selected?'#964a12':'#106595');
  if(draft?.view===view){
   for(const point of [draft.a,draft.b].filter(Boolean))paintPoint(ctx,project(point),'#b15d14',5);
   if(draft.b&&preview?.view===view){
    const mark=atOffset(draft,preview.point);
    if(canPlace(mark,boards[view]))paintDimension(ctx,mark,project,'#8e4d16',true);
   }
  }
  const candidate=preview?.view===view&&!draft?.b?nearestVertex(view,preview.point):null;
  if(candidate)paintPoint(ctx,project(candidate),'#0e70a6',4);
  if(keyboard[view]&&document.activeElement===canvas)paintPoint(ctx,project(keyboard[view]),'#7b439e',3);
 }
 function paintPoint(ctx,point,color,radius){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.fill();
 }
 function arrow(ctx,end,unit){
  const base=add(end,unit,7), side={x:-unit.y,y:unit.x};
  const left=add(base,side,2.7),right=add(base,side,-2.7);
  ctx.beginPath();ctx.moveTo(end.x,end.y);ctx.lineTo(left.x,left.y);ctx.lineTo(right.x,right.y);ctx.closePath();ctx.fill();
 }
 function paintDimension(ctx,mark,project,color,ghost=false){
  const shape=layout(mark), {tangent:dir,normal}=shape;
  const ends=shape.ends.map(project);
  ctx.save();
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.25;
  ctx.setLineDash(ghost?[4,3]:[]);
  for(const [i,p] of [mark.a,mark.b].entries()){
   const origin=project(p),end=ends[i],sign=dot(sub(end,origin),normal)<0?-1:1;
   pen(ctx,add(origin,normal,2*sign),add(end,normal,5*sign));
  }
  const short=distance(...ends)<22;
  pen(ctx,add(ends[0],dir,short?-9:0),add(ends[1],dir,short?9:0));
  ctx.setLineDash([]);
  const turn=short?-1:1;
  arrow(ctx,ends[0],{x:dir.x*turn,y:dir.y*turn});
  arrow(ctx,ends[1],{x:-dir.x*turn,y:-dir.y*turn});
  const center=project(shape.center);
  let rotation=Math.atan2(dir.y,dir.x);
  if(rotation>=Math.PI/2)rotation-=Math.PI;
  if(rotation< -Math.PI/2)rotation+=Math.PI;
  ctx.translate(center.x,center.y);ctx.rotate(rotation);
  ctx.textAlign='center';ctx.font='600 12px system-ui,sans-serif';
  const text=label(mark);
  ctx.strokeStyle='#f7fbff';ctx.lineWidth=3;
  ctx.strokeText(text,0,-5);ctx.fillText(text,0,-5);
  ctx.restore();
 }
 function atOffset(mark,point){
  const base=layout({...mark,offset:0});
  return {...mark,offset:round(dot(sub(point,base.middle),base.normal))};
 }
 function canPlace(mark,board){
  return Math.abs(mark.offset)>=.28&&layout(mark).ends.map(board.project).every(p=>p.x>=12&&p.x<=board.width-12&&p.y>=16&&p.y<=board.height-12);
 }
 function nearestVertex(view,point){
  const limit=Math.max(.3,12/boards[view].cell);
  let nearest=null, best=limit;
  for(const candidate of geometry[view].points){
   const separation=distance(candidate,point);
   if(separation<=best){nearest=candidate;best=separation;}
  }
  return nearest;
 }
 function segmentDistance(p,a,b){
  const change=sub(b,a);
  const t=Math.max(0,Math.min(1,dot(sub(p,a),change)/dot(change,change)));
  return distance(p,add(a,change,t));
 }
 function activate(view,point){
  if(draft?.view!==view)cancel();
  if(draft?.b){
   const mark=atOffset(draft,point);
   if(!canPlace(mark,boards[view])){announce('Separa la cota de sus vértices y deja espacio para las dos flechas.');return;}
   marks.push(mark);
   selected=marks.length-1;draft=null;preview=null;
   changeMarks(describe(mark)+' guardada.');
   return;
  }
  const end=nearestVertex(view,point);
  if(!end){
   const index=marks.findIndex(mark=>mark.view===view&&segmentDistance(point,...layout(mark).ends)<8/boards[view].cell);
   if(!draft&&index>=0){chooseMark(index);return;}
   announce('Pulsa un vértice de una arista continua en '+names[view].toLowerCase()+'.');
   return;
  }
  if(!draft){
   draft={view,a:end,direction:mode.value,offset:0};
   $('dim-cancel').disabled=false;
   announce(names[view]+' · Selecciona el segundo vértice.');
  }else{
   const next={...draft,b:end};
   if(!layout(next)){announce('Elige un segundo vértice que dé una medida en la dirección seleccionada.');return;}
   draft=next;
   const guide=layout(next);
   keyboard[view]=add(guide.middle,guide.normal,1);
   announce(names[view]+' · Pulsa donde quieras colocar la línea de cota.');
  }
  redraw();
 }
 function clickPoint(view,event){
  const rect=canvases[view].getBoundingClientRect(), {center,cell}=boards[view];
  return {x:(event.clientX-rect.left-center.x)/cell,y:(event.clientY-rect.top-center.y)/cell};
 }
 const directions={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
 function keyboardMove(view,direction,current){
  if(draft?.view===view&&draft.b)return add(current,direction,.45);
  const candidate=geometry[view].points.filter(p=>dot(sub(p,current),direction)>0)
   .sort((a,b)=>distance(current,a)-distance(current,b))[0];
  return candidate??current;
 }
 for(const [view,canvas] of Object.entries(canvases)){
  canvas.addEventListener('click',event=>{if(exercise&&boards[view])activate(view,clickPoint(view,event));});
  canvas.addEventListener('pointermove',event=>{if(exercise&&boards[view]){preview={view,point:clickPoint(view,event)};redraw();}});
  canvas.addEventListener('pointerleave',()=>{if(preview?.view===view){preview=null;redraw();}});
  canvas.addEventListener('focus',()=>{keyboard[view]??=geometry[view]?.points[0];redraw();});
  canvas.addEventListener('blur',redraw);
  canvas.addEventListener('keydown',event=>{
   if(!exercise||!boards[view])return;
   if(event.key==='Escape'){event.preventDefault();cancel();return;}
   const point=keyboard[view]??geometry[view].points[0];
   if(!point)return;
   if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(view,point);return;}
   const direction=directions[event.key];
   if(!direction)return;
   event.preventDefault();
   keyboard[view]=keyboardMove(view,direction,point);
   preview={view,point:keyboard[view]};
   redraw();
  });
  new ResizeObserver(redraw).observe(canvas);
 }

 function crosses([a,b],[c,d]){
  const ab=sub(b,a), cd=sub(d,c), ac=sub(c,a);
  const denom=cross(ab,cd);
  if(Math.abs(denom)<.0001){
   if(Math.abs(cross(ac,ab))>.0001)return false;
   const coord=Math.abs(ab.x)>Math.abs(ab.y)?'x':'y';
   return Math.min(Math.max(a[coord],b[coord]),Math.max(c[coord],d[coord]))-
    Math.max(Math.min(a[coord],b[coord]),Math.min(c[coord],d[coord]))>.01;
  }
  const t=cross(ac,cd)/denom,u=cross(ac,ab)/denom;
  return t>.001&&t<.999&&u>.001&&u<.999;
 }
 function placement(data,direction,bounds){
  if(!bounds||direction==='aligned')return null;
  const horizontal=direction==='horizontal', axis=horizontal?'x':'y';
  const [first,last]=horizontal?[bounds.top,bounds.bottom]:[bounds.left,bounds.right];
  const offset=data.center[horizontal?'y':'x'];
  if(offset>=first&&offset<=last)return null;
  const span=data.ends.map(end=>end[axis]).sort((a,b)=>a-b);
  return {span,side:offset<first?-1:1,gap:Math.min(Math.abs(offset-first),Math.abs(offset-last))};
 }
 function review(){
  const issues=[], seen=new Set(), totals=new Set();
  const dimensions=marks.map(layout);
  for(const [i,mark] of marks.entries()){
   const name='Cota '+(i+1)+' ('+names[mark.view]+')';
   const data=dimensions[i], {solid,bounds}=geometry[mark.view];
   const expected=measurement(mark);
   if(mark.value!=null&&!exact(mark.value,expected))issues.push(name+' · La cifra escrita '+label(mark)+' debería ser '+format.format(expected)+' mm según la escala.');
   if(bounds&&data.center.x>bounds.left&&data.center.x<bounds.right&&data.center.y>bounds.top&&data.center.y<bounds.bottom)
    issues.push(name+' · Prueba a colocar la línea fuera de la pieza.');
   if(solid.some(({a,b})=>crosses(data.ends,[a,b])))
    issues.push(name+' · La línea de cota cruza una arista visible.');
   const extensions=[mark.a,mark.b].map((point,index)=>[point,data.ends[index]]);
   if(marks.slice(0,i).some((other,j)=>{
    if(other.view!==mark.view)return false;
    const earlier=dimensions[j].ends;
    const earlierExtensions=[other.a,other.b].map((point,index)=>[point,earlier[index]]);
    return crosses(data.ends,earlier)||extensions.some(line=>crosses(line,earlier))||earlierExtensions.some(line=>crosses(data.ends,line));
   }))
    issues.push(name+' · La línea de cota cruza o se solapa con otra cota.');
   const local=placement(data,mark.direction,bounds);
   if(local&&marks.some((other,j)=>{
    if(j===i||other.view!==mark.view||other.direction!==mark.direction||dimensions[j].length<=data.length)return false;
    const outer=placement(dimensions[j],other.direction,bounds);
    return outer&&outer.side===local.side&&outer.span[0]<=local.span[0]&&outer.span[1]>=local.span[1]&&outer.gap<local.gap;
   }))issues.push(name+' · Acerca la cota parcial a la pieza y deja la mayor más lejos.');
   const key=[mark.view,mark.direction,...[pointKey(mark.a),pointKey(mark.b)].sort()].join(':');
   if(seen.has(key))issues.push(name+' · Esta misma medida ya está acotada en la vista.');
   seen.add(key);
   const axis=axes[mark.view][mark.direction];
   if(axis&&bounds){
    const full=mark.direction==='horizontal'?bounds.right-bounds.left:bounds.bottom-bounds.top;
    if(exact(full,data.length)&&full>0){
     if(totals.has(axis))issues.push(name+' · Revisa si ya has indicado la '+axis+' total.');
     totals.add(axis);
    }
   }
  }
  const missing=['anchura','altura','profundidad'].filter(axis=>!totals.has(axis));
  if(missing.length)issues.push('Comprueba si están indicadas estas medidas totales: '+missing.join(', ')+'.');
  if(!issues.length)issues.push('Las comprobaciones básicas están completas. Usa los criterios de acotación para revisar las medidas de los detalles.');
  $('dim-issues').replaceChildren(...issues.map(text=>{
   const item=document.createElement('li');item.textContent=text;return item;
  }));
  results.hidden=false;
  results.focus();
 }

 figureSelect.addEventListener('change',()=>{
  const next=saved.completed().find(item=>item.number===Number(figureSelect.value));
  if(next)selectFigure(next);
 });
 mode.addEventListener('change',cancel);
 scale.addEventListener('change',()=>{
  if(!scale.checkValidity()||!inRange(scale.valueAsNumber,.1,10000)){
   scale.value=millimetres;announce('Indica una escala válida en milímetros por cuadrado.');return;
  }
  millimetres=scale.valueAsNumber;
  changeMarks('Escala actualizada a '+format.format(millimetres)+' mm por cuadrado.');
 });
 list.addEventListener('change',()=>chooseMark(list.value===''?-1:Number(list.value)));
 $('dim-apply').addEventListener('click',()=>{
  if(!marks[selected]||!value.checkValidity()||!inRange(value.valueAsNumber,.01,170000)){
   announce('Indica una cifra válida en milímetros.');return;
  }
  marks[selected].value=round(value.valueAsNumber);
  changeMarks('Cifra actualizada. Pulsa «Revisar cotas» para comprobarla.');
 });
 $('dim-delete').addEventListener('click',()=>{
  if(selected<0)return;
  marks.splice(selected,1);selected=-1;changeMarks('Cota eliminada.');
 });
 $('dim-undo').addEventListener('click',()=>{
  if(!marks.length)return;
  marks.pop();selected=-1;changeMarks('Se ha retirado la última cota.');
 });
 $('dim-cancel').addEventListener('click',cancel);
 $('dim-review').addEventListener('click',review);
 window.addEventListener('storage',event=>{if(event.key===null||/^mad-ficha1-v\d+$/.test(event.key))refreshFigures();});
 window.addEventListener('pageshow',refreshFigures);
 refreshFigures();
})();
