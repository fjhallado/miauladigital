(()=>{
'use strict';
const WIDTH=1240,HEIGHT=1754,MARGIN=96,BODY_WIDTH=WIDTH-2*MARGIN;
const printDate=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'});
const labels={simbolos:'Símbolo',nombres:'Nombre',ubicacion:'Ubicación'};
const b64=bytes=>Uint8Array.from(atob(bytes),character=>character.charCodeAt(0));

function lines(ctx,text,width){
 const result=[];
 for(const paragraph of String(text).split(/\r?\n/)){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   const combined=line?line+' '+word:word;
   if(ctx.measureText(combined).width<=width){line=combined;continue}
   if(line)result.push(line);
   line='';
   for(const character of word){
    if(line&&ctx.measureText(line+character).width>width){result.push(line);line=''}
    line+=character;
   }
  }
  result.push(line);
 }
 return result;
}

function pdfImages(images){
 const encoder=new TextEncoder(),parts=[],offsets=[0];
 let size=0;
 function put(bytes){parts.push(bytes);size+=bytes.length}
 function text(value){put(encoder.encode(value))}
 function object(id,value){offsets[id]=size;text(id+' 0 obj\n'+value+'\nendobj\n')}
 text('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 const children=images.map((_,index)=>(3+index*3)+' 0 R').join(' ');
 object(2,'<< /Type /Pages /Kids ['+children+'] /Count '+images.length+' >>');
 images.forEach((image,index)=>{
  const page=3+index*3;
  object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im '+(page+1)+' 0 R >> >> /Contents '+(page+2)+' 0 R >>');
  offsets[page+1]=size;
  text((page+1)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+WIDTH+' /Height '+HEIGHT+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.length+' >>\nstream\n');
  put(image);
  text('\nendstream\nendobj\n');
  const command='q\n595.28 0 0 841.89 0 0 cm\n/Im Do\nQ\n';
  object(page+2,'<< /Length '+command.length+' >>\nstream\n'+command+'endstream');
 });
 const xref=size;
 text('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
 for(const offset of offsets.slice(1))text(String(offset).padStart(10,'0')+' 00000 n \n');
 text('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
 return new Blob(parts,{type:'application/pdf'});
}

function question(reportItem){
 if(reportItem.pregunta)return reportItem.pregunta;
 if(reportItem.tipo==='simbolos')return '¿Cuál es el símbolo del '+reportItem.elemento+'?';
 if(reportItem.tipo==='nombres')return '¿Cómo se llama el elemento '+reportItem.simbolo+'?';
 if(reportItem.tipo==='ubicacion')return '¿Dónde colocarías '+reportItem.simbolo+' en la tabla periódica?';
 return labels[reportItem.tipo]||'Pregunta';
}

function create(report){
 const canvas=document.createElement('canvas');
 canvas.width=WIDTH;
 canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d');
 const images=[];
 let y=0,page=0;
 function text(value,at,size,color,weight='normal',indent=0){
  ctx.fillStyle=color;
  ctx.font=weight+' '+size+'px system-ui,sans-serif';
  ctx.fillText(value,MARGIN+indent,at);
 }
 function finishPage(){
  text('Mi Aula Digital  ·  Página '+page,1660,23,'#465b73');
  images.push(b64(canvas.toDataURL('image/jpeg',.93).split(',')[1]));
 }
 function nextPage(){
  if(page)finishPage();
  page++;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle='#15385b';ctx.fillRect(0,0,WIDTH,20);
  text('MI AULA DIGITAL',108,26,'#235b8f','bold');
  text('Examen de Tabla Periódica',173,51,'#142c49','bold');
  ctx.font='31px system-ui,sans-serif';
  y=234;
  for(const line of lines(ctx,'Alumno: '+report.alumno,BODY_WIDTH)){
   text(line,y,31,'#142c49');y+=42;
  }
  text('Nota: '+Number(report.nota).toFixed(2).replace('.',',')+' / 10  ·  Aciertos: '+report.aciertos+' / '+report.preguntas,y,27,'#142c49');
  y+=42;
  if(Number.isFinite(Date.parse(report.fin)))text('Finalizado el '+printDate.format(new Date(report.fin))+' (hora peninsular)',y,25,'#465b73');
  y+=70;
 }
 function renderRow(value,style){
  ctx.font=style.weight+' '+style.size+'px system-ui,sans-serif';
  return lines(ctx,value,BODY_WIDTH-style.indent).map(line=>({line,...style}));
 }
 nextPage();
 for(const r of report.respuestas){
  const heading={size:32,color:'#16385d',weight:'bold',indent:0,height:46};
  const body={size:29,color:'#21354a',weight:'normal',indent:18,height:42};
  const correction={...body,color:r.correcta?'#17613c':'#8d3527'};
  const rows=[
   ...renderRow(r.numero+'. '+question(r),heading),
   ...renderRow('Tu respuesta: '+r.respuesta,body),
   ...renderRow('Solución: '+r.solucion,body),
   ...renderRow(r.correcta?'Correcta':'Incorrecta',correction)
  ];
  const block=rows.reduce((total,row)=>total+row.height,0);
  if(y+Math.min(block,210)>1550)nextPage();
  for(const row of rows){
   if(y>1570)nextPage();
   text(row.line,y,row.size,row.color,row.weight,row.indent);
   y+=row.height;
  }
  y+=22;
 }
 finishPage();
 return pdfImages(images);
}
window.MAD_PERIODIC_PDF={create};
})();
