(() => {
 'use strict';
 const width = 2480, height = 1754, margin = 50;
 function createSheet(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#1b344d';
  ctx.lineWidth = 4;
  ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);
  ctx.fillStyle = '#163651';
  ctx.font = 'bold 43px system-ui';
  ctx.fillText(title, 88, 116, width - 176);
  ctx.font = '25px system-ui';
  ctx.fillText(subtitle, 90, 162, width - 180);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 190);
  ctx.lineTo(width - 70, 190);
  ctx.stroke();
  return {canvas, ctx};
 }
 function drawTitleBlock(ctx, fields, reservedWidth = 0) {
  const left = margin + 26, right = width - left, top = height - margin - 219, blockHeight = 164;
  ctx.strokeStyle = '#1b344d';
  ctx.lineWidth = 3;
  ctx.strokeRect(left, top, right - left, blockHeight);
  let column = left + reservedWidth;
  const positions = fields.map(([label, span, value]) => {
   if (column !== left) {
    ctx.beginPath();
    ctx.moveTo(column, top);
    ctx.lineTo(column, top + blockHeight);
    ctx.stroke();
   }
   const cellWidth = span ?? (right - column);
   ctx.font = 'bold 19px system-ui';
   ctx.fillStyle = '#536a81';
   ctx.fillText(label, column + 18, top + 32, cellWidth - 36);
   ctx.font = 'bold 29px system-ui';
   ctx.fillStyle = '#18334c';
   if (value) ctx.fillText(value, column + 18, top + 92, cellWidth - 36);
   const position = column;
   column += cellWidth;
   return position;
  });
  ctx.font = '17px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText('© Francisco José Hallado Fernández', right, top + blockHeight + 22);
  ctx.fillText('Profesor de ESO y Bachillerato', right, top + blockHeight + 42);
  ctx.textAlign = 'left';
  return {left, right, top, height: blockHeight, positions};
 }

 function jpgPage(canvas){
  const data=canvas.toDataURL('image/jpeg',.94).split(',')[1];
  return {bytes:Uint8Array.from(atob(data),char=>char.charCodeAt(0)),width:canvas.width,height:canvas.height};
 }
 function downloadPDF(pages,filename,createdAt){
  const [pageWidth,pageHeight]=[297,210].map(mm=>(mm*72/25.4).toFixed(4));
  const enc=new TextEncoder(),parts=[],offsets=[0];let length=0;
  function add(bytes){parts.push(bytes);length+=bytes.length}
  function txt(t){add(enc.encode(t))}
  function obj(id,content){offsets[id]=length;txt(id+' 0 obj\n'+content+'\nendobj\n')}
  txt('%PDF-1.4\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  const children=pages.map((_,index)=>(3+index*3)+' 0 R').join(' ');
  obj(2,`<< /Type /Pages /Kids [${children}] /Count ${pages.length} >>`);
  const commands=`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ\n`;
  pages.forEach(({bytes,width,height},index)=>{
   const page=3+index*3,image=page+1,stream=page+2;
   obj(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 ${image} 0 R >> >> /Contents ${stream} 0 R >>`);
   offsets[image]=length;
   txt(`${image} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
   add(bytes);txt('\nendstream\nendobj\n');
   obj(stream,'<< /Length '+commands.length+' >>\nstream\n'+commands+'endstream');
  });
  const info=offsets.length;
  const pdfDate=new Date(createdAt).toISOString().slice(0,19).replace(/\D/g,'');
  obj(info,'<< /CreationDate (D:'+pdfDate+'Z) >>');
  const start=length;txt(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for(const offset of offsets.slice(1))txt(String(offset).padStart(10,'0')+' 00000 n \n');
  txt(`trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${start}\n%%EOF`);
  const blob=new Blob(parts,{type:'application/pdf'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),12000);
 }
 window.MADSheetPDF = {width, height, createSheet, drawTitleBlock, jpgPage, downloadPDF};
})();
