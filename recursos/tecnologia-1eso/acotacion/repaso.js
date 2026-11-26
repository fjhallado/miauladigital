(() => {
 'use strict';

 const questions = [
  ['¿En qué unidad se expresan habitualmente las cotas lineales?',
   ['Centímetros', 'Milímetros', 'Metros'], 1,
   'En los ejercicios, las cotas lineales se expresan en milímetros sin escribir el símbolo «mm».'],
  ['¿Qué tipo de línea se utiliza para dibujar las líneas de cota?',
   ['Continua gruesa', 'Discontinua', 'Continua fina'], 2,
   'La línea continua fina distingue la cota del contorno visible, que es más grueso.'],
  ['¿Cuánto deben sobresalir aproximadamente las líneas auxiliares?',
   ['2 mm', '10 mm', '15 mm'], 0,
   'En clase, prolongamos la auxiliar unos 2 mm más allá de la línea de cota.'],
  ['¿Qué símbolo se utiliza para indicar un diámetro?',
   ['R', 'Ø', '°'], 1,
   'El símbolo Ø precede a la cifra del diámetro.'],
  ['En la acotación en paralelo, ¿dónde comienzan las dimensiones?',
   ['En diferentes orígenes', 'En el centro de la pieza', 'En un mismo origen'], 2,
   'Las cotas en paralelo comparten un mismo origen.'],
  ['¿Dónde deben situarse las cotas menores de una misma zona?',
   ['Más cerca de la pieza', 'Más alejadas de la pieza', 'Siempre dentro de la pieza'], 0,
   'Las cotas parciales se sitúan más cerca del contorno y las totales más lejos.'],
  ['Si una pieza está dibujada a escala 2:1, ¿qué medida debemos escribir?',
   ['El doble de la medida real', 'La medida real', 'La mitad de la medida real'], 1,
   'La cifra indica la dimensión real de la pieza, independientemente de la escala.'],
  ['¿Cuántas flechas tiene normalmente una cota de radio?',
   ['Dos', 'Ninguna', 'Una'], 2,
   'La cota radial lleva una sola flecha que señala el arco.']
 ];
 const quiz = document.getElementById('cot-quiz');
 const root = document.getElementById('quiz-questions');
 const progress = document.getElementById('quiz-progress');
 const result = document.getElementById('quiz-result');

 const items = questions.map(([prompt, options], index) => {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'cot-question';
  const legend = document.createElement('legend');
  legend.textContent = (index + 1) + '. ' + prompt;
  fieldset.append(legend);
  options.forEach((option, position) => {
   const label = document.createElement('label');
   const input = document.createElement('input');
   input.type = 'radio';
   input.name = 'respuesta-' + index;
   input.value = String(position);
   label.append(input, option);
   fieldset.append(label);
  });
  const feedback = document.createElement('p');
  feedback.className = 'cot-feedback';
  feedback.id = 'respuesta-comentario-' + index;
  feedback.hidden = true;
  fieldset.setAttribute('aria-describedby', feedback.id);
  fieldset.append(feedback);
  root.append(fieldset);
  return { fieldset, feedback };
 });

 function updateProgress() {
  const answered = quiz.querySelectorAll('input:checked').length;
  progress.textContent = answered + ' de ' + questions.length + ' respondidas';
 }

 function clearFeedback() {
  result.textContent = '';
  for (const { feedback } of items) {
   feedback.hidden = true;
   feedback.textContent = '';
   delete feedback.dataset.result;
  }
 }

 quiz.addEventListener('change', () => {
  clearFeedback();
  updateProgress();
 });

 quiz.addEventListener('submit', event => {
  event.preventDefault();
  let answered = 0;
  let score = 0;
  items.forEach(({ fieldset, feedback }, i) => {
   const chosen = fieldset.querySelector('input:checked');
   if (!chosen) {
    feedback.textContent = 'Pendiente de responder.';
    feedback.hidden = false;
    return;
   }
   const correct = Number(chosen.value) === questions[i][2];
   answered++;
   score += Number(correct);
   feedback.dataset.result = correct ? 'correct' : 'wrong';
   feedback.textContent = (correct ? 'Correcto. ' : 'Revisa tu respuesta. ') + questions[i][3];
   feedback.hidden = false;
  });
  result.textContent = 'Aciertos: ' + score + ' de ' + questions.length + '.' +
   (answered < questions.length ? ' Quedan ' + (questions.length - answered) + ' sin responder.' : '');
 });

 quiz.addEventListener('reset', () => {
  clearFeedback();
  requestAnimationFrame(updateProgress);
 });

 quiz.hidden = false;
})();
