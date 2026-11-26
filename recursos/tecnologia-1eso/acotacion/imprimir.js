(() => {
 'use strict';
 const button = document.getElementById('imprimir-teoria');
 button.addEventListener('click', () => window.print());
 button.hidden = false;
})();
