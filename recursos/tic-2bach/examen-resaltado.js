(()=>{'use strict';
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function markup(text,isCSS){let s=esc(text);if(isCSS){return s.replace(/(\/\*[\s\S]*?\*\/)|([.#]?[\w-]+)(\s*\{)|([\w-]+)(\s*:)|(#(?:[0-9a-fA-F]{3,8})\b)|(\b\d+(?:px|rem|%|vh|vw)\b)/g,(whole,com,selector,brace,prop,col,hex,num)=>com?'<span class="syn-comment">'+whole+'</span>':selector?'<span class="syn-tag">'+selector+'</span>'+brace:prop?'<span class="syn-attr">'+prop+'</span>'+col:hex?'<span class="syn-string">'+hex+'</span>':'<span class="syn-number">'+num+'</span>');}
return s.replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(&gt;)/g,(whole,comment,start,tag,inner,end)=>{if(comment)return '<span class="syn-comment">'+comment+'</span>';let attrs=inner.replace(/([\w:-]+)(\s*=\s*)(&quot;.*?&quot;|"[^"]*"|' + "'[^']*'" + '|[^\s]+)/g,(m,name,eq,value)=>'<span class="syn-attr">'+name+'</span>'+eq+'<span class="syn-string">'+value+'</span>');return '<span class="syn-bracket">'+start+'</span><span class="syn-tag">'+tag+'</span>'+attrs+'<span class="syn-bracket">'+end+'</span>'});}

for(const [id,preId,isCSS] of [['html','htmlSyntax',false],['css','cssSyntax',true]]){
 const editor=document.getElementById(id),pre=document.getElementById(preId);
 const update=()=>{pre.innerHTML=markup(editor.value,isCSS)+'\n';pre.scrollTop=editor.scrollTop;pre.scrollLeft=editor.scrollLeft};
 editor.addEventListener('input',update);
 editor.addEventListener('scroll',()=>{pre.scrollTop=editor.scrollTop;pre.scrollLeft=editor.scrollLeft});
 document.addEventListener('exam-code-refresh',update);
 window.addEventListener('pageshow',update);
 update();
}
})();
