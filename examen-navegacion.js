(() => {
 'use strict';
 const reason='intento de navegación';
 function watch({active,leave,returnToExam=()=>{}}){
  const end=()=>{if(active())leave(reason);};
  const check=()=>{if(document.hidden)end();};
  document.addEventListener('visibilitychange',()=>{
   if(document.hidden)end();
   else returnToExam();
  });
  window.addEventListener('pagehide',end);
  return check;
 }
 window.MADExamNavigation={reason,watch};
})();
